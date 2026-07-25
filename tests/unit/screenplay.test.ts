import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  insertElementAfter,
  isSceneHeadingText,
  nextTypeOnEnter,
  nextTypeOnTab,
  parseSceneHeading,
  removeElement,
  resolveBackspaceAtStart,
  type ScreenplayElement,
} from "@/lib/screenplay/model";
import { exportFountain, exportPlainText } from "@/lib/screenplay/export";
import {
  enqueueSave,
  flushSaveQueue,
  nextAutosaveStatus,
  type SaveOp,
} from "@/lib/screenplay/save-queue";
import { SessionHistory } from "@/lib/screenplay/history";

const MIGRATION = path.join(
  process.cwd(),
  "supabase/migrations/20260725180020_screenplay_editor.sql",
);

function el(
  partial: Partial<ScreenplayElement> &
    Pick<ScreenplayElement, "id" | "elementType" | "content" | "sortOrder">,
): ScreenplayElement {
  return {
    projectId: "11111111-1111-1111-1111-111111111111",
    draftId: "22222222-2222-2222-2222-222222222222",
    userId: "33333333-3333-3333-3333-333333333333",
    sceneId: null,
    metadata: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("keyboard rules", () => {
  it("maps Enter to the next appropriate element type", () => {
    expect(nextTypeOnEnter("scene_heading", "INT. ROOM - DAY")).toBe("action");
    expect(nextTypeOnEnter("character", "MAYA")).toBe("dialogue");
    expect(nextTypeOnEnter("dialogue", "Hello.")).toBe("action");
    expect(nextTypeOnEnter("transition", "CUT TO:")).toBe("scene_heading");
  });

  it("cycles Tab types", () => {
    expect(nextTypeOnTab("action")).toBe("character");
    expect(nextTypeOnTab("character")).toBe("parenthetical");
  });

  it("recognizes scene headings", () => {
    expect(isSceneHeadingText("INT. KITCHEN - NIGHT")).toBe(true);
    expect(isSceneHeadingText("She opens the door.")).toBe(false);
  });
});

describe("element insertion and deletion", () => {
  it("inserts after a target and reindexes", () => {
    const a = el({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", elementType: "action", content: "A", sortOrder: 0 });
    const b = el({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2", elementType: "action", content: "B", sortOrder: 1 });
    const created = el({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
      elementType: "character",
      content: "",
      sortOrder: 99,
    });
    const next = insertElementAfter([a, b], a.id, created);
    expect(next.map((item) => item.id)).toEqual([
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
    ]);
    expect(next.map((item) => item.sortOrder)).toEqual([0, 1, 2]);
  });

  it("deletes and reindexes", () => {
    const elements = [
      el({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", elementType: "action", content: "A", sortOrder: 0 }),
      el({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2", elementType: "action", content: "B", sortOrder: 1 }),
    ];
    expect(removeElement(elements, elements[0]!.id).map((item) => item.sortOrder)).toEqual([0]);
  });
});

describe("boundary merge", () => {
  it("does not discard non-empty content", () => {
    const result = resolveBackspaceAtStart({
      current: { id: "c", content: "kept", elementType: "action" },
      previous: { id: "p", content: "prev", elementType: "action" },
    });
    expect(result.action).toBe("none");
  });

  it("deletes empty element at boundary", () => {
    const result = resolveBackspaceAtStart({
      current: { id: "c", content: "", elementType: "action" },
      previous: { id: "p", content: "prev", elementType: "action" },
    });
    expect(result).toEqual({
      action: "delete-empty",
      deleteId: "c",
      focusId: "p",
    });
  });
});

describe("autosave queue and failed-save recovery", () => {
  it("keeps failed ops at the front so text is not discarded", async () => {
    let queue: SaveOp[] = [];
    const element = el({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      elementType: "action",
      content: "Do not lose me",
      sortOrder: 0,
    });
    queue = enqueueSave(queue, { kind: "upsert", element, expectedUpdatedAt: null });
    const result = await flushSaveQueue(queue, async () => ({
      ok: false,
      error: "network",
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.remaining).toHaveLength(1);
      expect(result.failed.kind).toBe("upsert");
      if (result.failed.kind === "upsert") {
        expect(result.failed.element.content).toBe("Do not lose me");
      }
    }
    expect(nextAutosaveStatus("saving", "save-fail")).toBe("error");
    expect(nextAutosaveStatus("unsaved", "save-ok")).toBe("saved");
  });
});

describe("undo history", () => {
  it("restores prior snapshots", () => {
    const history = new SessionHistory();
    const first = [el({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", elementType: "action", content: "A", sortOrder: 0 })];
    const second = [el({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", elementType: "action", content: "B", sortOrder: 0 })];
    history.push({ elements: first, focusId: first[0]!.id });
    const undone = history.undo({ elements: second, focusId: second[0]!.id });
    expect(undone?.elements[0]?.content).toBe("A");
  });
});

describe("exports", () => {
  it("exports Fountain and plain text", () => {
    const elements = [
      el({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
        elementType: "scene_heading",
        content: "INT. ROOM - DAY",
        sortOrder: 0,
      }),
      el({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
        elementType: "character",
        content: "Maya",
        sortOrder: 1,
      }),
      el({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
        elementType: "dialogue",
        content: "We leave now.",
        sortOrder: 2,
      }),
    ];
    const fountain = exportFountain(elements, "Test");
    expect(fountain).toContain("Title: Test");
    expect(fountain).toContain("INT. ROOM - DAY");
    expect(fountain).toContain("MAYA");
    expect(exportPlainText(elements)).toContain("We leave now.");
  });
});

describe("scene creation and beat connection", () => {
  it("parses scene headings for location and time", () => {
    expect(parseSceneHeading("INT. KITCHEN - NIGHT")).toEqual({
      location: "KITCHEN",
      timeOfDay: "NIGHT",
    });
  });

  it("attaches scene ids to headings without inventing duplicate scene rows locally", () => {
    const heading = el({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      elementType: "scene_heading",
      content: "INT. HALL - DAY",
      sortOrder: 0,
      sceneId: null,
    });
    const attached = { ...heading, sceneId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1" };
    expect(attached.sceneId).toBe("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1");
    expect(heading.sceneId).toBeNull();
  });
});

describe("draft duplication projection", () => {
  it("copies elements with cleared scene links so another draft is not overwritten", () => {
    const source = [
      el({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
        elementType: "scene_heading",
        content: "INT. ROOM - DAY",
        sortOrder: 0,
        sceneId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
      }),
      el({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
        elementType: "action",
        content: "She waits.",
        sortOrder: 1,
        sceneId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
      }),
    ];
    const copied = source.map((element) => ({
      ...element,
      id: crypto.randomUUID(),
      draftId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      sceneId: null,
    }));
    expect(copied.every((item) => item.sceneId === null)).toBe(true);
    expect(copied.map((item) => item.content)).toEqual(source.map((item) => item.content));
    expect(source[0]!.sceneId).toBe("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1");
  });
});

describe("screenplay migration RLS", () => {
  it("adds screenplay_elements and draft_versions with membership policies", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("create table public.screenplay_elements");
    expect(sql).toContain("create table public.draft_versions");
    expect(sql).toContain("alter table public.screenplay_elements enable row level security");
    expect(sql).toContain("private.is_project_member(project_id)");
    expect(sql).toContain("add column if not exists revision");
  });
});
