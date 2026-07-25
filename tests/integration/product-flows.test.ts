import { describe, expect, it } from "vitest";
import { projectStructureOrder, type Beat, type Scene } from "@/lib/beats/order";
import { getStudyBridges } from "@/lib/library/bridges";
import { projectToMarkdownSummary, findingsToMarkdown } from "@/lib/export/project-export";
import { PRIMARY_NAV } from "@/lib/navigation";
import { loadContentManifest } from "@/lib/reader/catalog";
import { getAtlasConcept } from "@/lib/atlas/catalog";

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
    povOwner: "",
    sceneObjective: "",
    whyNow: "",
    obstacle: "",
    tactics: "",
    turnDescription: "",
    chargeIn: "",
    chargeOut: "",
    object: "",
    lightSource: "",
    environment: "",
    backgroundLife: "",
    register: "",
    deletionTestResult: "",
    longDraft: "",
    dialogueNotes: "",
    setupsProvided: "",
    payoffsSupported: "",
    characterDecisionsSupported: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("primary navigation", () => {
  it("includes Home Read Learn Atlas Write Test Reference", () => {
    expect(PRIMARY_NAV.map((item) => item.label)).toEqual([
      "Home",
      "Read",
      "Learn",
      "Atlas",
      "Write",
      "Test",
      "Reference",
    ]);
  });
});

describe("beat and screenplay order agreement", () => {
  it("uses the same projectStructureOrder projection", () => {
    const beats = [
      beat({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", sortOrder: 0, name: "A" }),
      beat({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2", sortOrder: 1, name: "B" }),
    ];
    const scenes = [
      scene({
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
        beatId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
        sortOrder: 0,
        heading: "B1",
      }),
      scene({
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
        beatId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
        sortOrder: 0,
        heading: "A1",
      }),
    ];
    const projection = projectStructureOrder(beats, scenes);
    expect(projection.screenplayScenes.map((item) => item.heading)).toEqual(["A1", "B1"]);
  });
});

describe("reading to learning bridges", () => {
  it("opens atlas and lessons from resolved concept links", () => {
    const scene = getAtlasConcept("scene");
    expect(scene).not.toBeNull();
    const bridges = getStudyBridges({} as never, [
      { label: "Scene", target: "scene", resolved: true },
    ]);
    expect(bridges.some((item) => item.href.startsWith("/atlas/"))).toBe(true);
    expect(bridges.some((item) => item.href.includes("/learn/"))).toBe(true);
  });
});

describe("export helpers", () => {
  it("builds markdown without inventing a score", () => {
    const markdown = projectToMarkdownSummary({
      project: { title: "Demo" },
      beats: [],
      scenes: [],
      elements: [],
      findings: [{ rule_id: "no-turn", explanation: "Missing turn", status: "open" }],
      exerciseAttempts: [],
      notesMarkdown: "",
      exportedAt: "2026-07-25T00:00:00.000Z",
    });
    expect(markdown).toContain("# Demo");
    expect(markdown).not.toMatch(/overall score/i);
    expect(findingsToMarkdown([{ rule_id: "no-turn", explanation: "x", status: "open" }])).toContain(
      "no-turn",
    );
  });
});

describe("reference source indexes", () => {
  it("keeps canonical books available for /reference links", async () => {
    const manifest = await loadContentManifest();
    expect(manifest.books.some((book) => book.id === "complete-session-script-to-cut")).toBe(true);
    expect(manifest.books.some((book) => book.id === "screenwriting-syllabus")).toBe(true);
  });
});
