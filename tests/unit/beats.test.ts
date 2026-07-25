import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  applyOrderedIds,
  filterTemplateBeatsToInsert,
  projectStructureOrder,
  scenesAfterBeatDelete,
  type Beat,
  type Scene,
} from "@/lib/beats/order";
import { SYSTEM_BEAT_TEMPLATES, getSystemTemplate } from "@/lib/beats/templates";
import { sceneCardView } from "@/lib/beats/map";

const MIGRATION = path.join(
  process.cwd(),
  "supabase/migrations/20260725175442_beats_and_scenes.sql",
);

function beat(partial: Partial<Beat> & Pick<Beat, "id" | "sortOrder" | "name">): Beat {
  return {
    projectId: "11111111-1111-1111-1111-111111111111",
    draftId: "22222222-2222-2222-2222-222222222222",
    userId: "33333333-3333-3333-3333-333333333333",
    description: "",
    colorKey: "neutral",
    templateKey: null,
    targetPercentage: null,
    metadata: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function scene(
  partial: Partial<Scene> & Pick<Scene, "id" | "sortOrder" | "heading" | "beatId">,
): Scene {
  return {
    projectId: "11111111-1111-1111-1111-111111111111",
    draftId: "22222222-2222-2222-2222-222222222222",
    userId: "33333333-3333-3333-3333-333333333333",
    summary: "",
    location: "",
    timeOfDay: "",
    status: "idea",
    metadata: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("canonical structure ordering", () => {
  it("orders assigned scenes by beat then scene, with unassigned last", () => {
    const beats = [
      beat({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2", sortOrder: 1, name: "Act II" }),
      beat({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", sortOrder: 0, name: "Act I" }),
    ];
    const scenes = [
      scene({
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4",
        beatId: null,
        sortOrder: 0,
        heading: "Unassigned A",
      }),
      scene({
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
        beatId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
        sortOrder: 0,
        heading: "Act II scene",
      }),
      scene({
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
        beatId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
        sortOrder: 1,
        heading: "Act I B",
      }),
      scene({
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb0",
        beatId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
        sortOrder: 0,
        heading: "Act I A",
      }),
    ];

    const projection = projectStructureOrder(beats, scenes);
    expect(projection.lanes.map((lane) => lane.beat.name)).toEqual(["Act I", "Act II"]);
    expect(projection.lanes[0]?.scenes.map((item) => item.heading)).toEqual(["Act I A", "Act I B"]);
    expect(projection.screenplayScenes.map((item) => item.heading)).toEqual([
      "Act I A",
      "Act I B",
      "Act II scene",
      "Unassigned A",
    ]);
  });

  it("moves scenes to Unassigned when a beat is deleted", () => {
    const scenes = [
      scene({
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
        beatId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
        sortOrder: 0,
        heading: "Keep me",
      }),
    ];
    const next = scenesAfterBeatDelete(scenes, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1");
    expect(next[0]?.beatId).toBeNull();
    expect(next[0]?.heading).toBe("Keep me");
  });
});

describe("reorder conflicts and optimistic rollback", () => {
  it("detects stale concurrent reorder versions", () => {
    const items = [
      beat({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
        sortOrder: 0,
        name: "A",
        updatedAt: "t1",
      }),
      beat({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
        sortOrder: 1,
        name: "B",
        updatedAt: "t2",
      }),
    ];
    const conflict = applyOrderedIds(
      items,
      ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"],
      {
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1": "stale",
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2": "t2",
      },
    );
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.reason).toBe("stale-version");
  });

  it("applies ordered ids for successful optimistic commit", () => {
    const items = [
      beat({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
        sortOrder: 0,
        name: "A",
        updatedAt: "t1",
      }),
      beat({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
        sortOrder: 1,
        name: "B",
        updatedAt: "t2",
      }),
    ];
    const result = applyOrderedIds(
      items,
      ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"],
      {
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1": "t1",
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2": "t2",
      },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items.map((item) => item.id)).toEqual([
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      ]);
      expect(result.items.map((item) => item.sortOrder)).toEqual([0, 1]);
    }
  });
});

describe("templates", () => {
  it("exposes typed system templates with evidence notes", () => {
    expect(SYSTEM_BEAT_TEMPLATES.map((template) => template.key)).toEqual([
      "blank",
      "three-act",
      "eight-sequence",
      "save-the-cat",
    ]);
    expect(getSystemTemplate("save-the-cat")?.evidenceStatus).toBe("E5");
    expect(getSystemTemplate("three-act")?.craftNote.toLowerCase()).toContain("not a scientific law");
  });

  it("prevents duplicate template beats on second apply", () => {
    const existing = [
      beat({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
        sortOrder: 0,
        name: "Act I",
        templateKey: "three-act:act-1",
      }),
    ];
    const template = getSystemTemplate("three-act")!;
    const first = filterTemplateBeatsToInsert(existing, template.beats);
    expect(first.map((item) => item.templateKey)).toEqual([
      "three-act:act-2",
      "three-act:act-3",
    ]);
    const afterAll = [
      ...existing,
      ...first.map((item, index) =>
        beat({
          id: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa${index + 2}`,
          sortOrder: index + 1,
          name: item.templateKey,
          templateKey: item.templateKey,
        }),
      ),
    ];
    expect(filterTemplateBeatsToInsert(afterAll, template.beats)).toEqual([]);
  });
});

describe("scene card incomplete states", () => {
  it("does not invent analysis fields", () => {
    const view = sceneCardView(
      scene({
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
        beatId: null,
        sortOrder: 0,
        heading: "INT. KITCHEN — NIGHT",
      }),
    );
    expect(view.chargeIn).toBe("incomplete");
    expect(view.turnStatus).toBe("incomplete");
    expect(view.estimatedPages).toBe("incomplete");
    expect(view.warningCount).toBe(0);
  });
});

describe("beats migration RLS", () => {
  it("creates beats/scenes/templates with membership RLS and ON DELETE SET NULL", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("create table public.beats");
    expect(sql).toContain("create table public.scenes");
    expect(sql).toContain("create table public.beat_templates");
    expect(sql).toContain("alter table public.beats enable row level security");
    expect(sql).toContain("alter table public.scenes enable row level security");
    expect(sql).toContain("beat_id uuid references public.beats (id) on delete set null");
    expect(sql).toContain("unique (draft_id, template_key)");
    expect(sql).toContain("private.is_project_member(project_id)");
  });
});
