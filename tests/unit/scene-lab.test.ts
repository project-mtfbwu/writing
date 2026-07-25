import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  projectStructureOrder,
  type Beat,
  type Scene,
} from "@/lib/beats/order";
import { evaluateDeletionTest } from "@/lib/scene-lab/deletion";
import { emptySceneLabFields } from "@/lib/scene-lab/map";
import { CAMERA_TEST_TERMS, SCENE_LAB_STEPS } from "@/lib/scene-lab/model";
import { runSceneReviewRules } from "@/lib/scene-lab/rules";
import { learningLinkForRule } from "@/lib/scene-lab/learning-links";

const MIGRATION = path.join(
  process.cwd(),
  "supabase/migrations/20260725190030_scene_lab.sql",
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

describe("Scene Lab sequence", () => {
  it("keeps the exact eleven-step order", () => {
    expect(SCENE_LAB_STEPS.map((step) => step.title)).toEqual([
      "Write the scene logline",
      "Set the charge",
      "Choose the object",
      "Choose the location and light source",
      "Find the turn",
      "Write it too long",
      "Delete the first and last speech",
      "Apply the dialogue cuts",
      "Camera-test every action line",
      "Map micro-beats with Load/Absorb",
      "Run the deletion test",
    ]);
  });
});

describe("deterministic review rules", () => {
  it("flags missing card fields and same charge without inventing a score", () => {
    const findings = runSceneReviewRules({
      heading: "",
      beatId: null,
      summary: "",
      location: "",
      fields: {
        ...emptySceneLabFields(),
        chargeIn: "hope",
        chargeOut: "hope",
      },
      microBeats: [],
    });
    const ids = findings.map((item) => item.ruleId);
    expect(ids).toContain("no-pov-owner");
    expect(ids).toContain("no-objective");
    expect(ids).toContain("no-why-now");
    expect(ids).toContain("no-obstacle");
    expect(ids).toContain("no-turn");
    expect(ids).toContain("charge-in-equals-charge-out");
    expect(ids).toContain("no-object");
    expect(ids).toContain("no-light-source");
    expect(ids).toContain("fewer-than-three-micro-beats");
    expect(ids).toContain("no-scene-heading");
    expect(ids).toContain("no-beat-assignment");
    expect(ids).toContain("deletion-test-not-completed");
    expect(JSON.stringify(findings)).not.toMatch(/score|overall rating/i);
  });

  it("camera-tests interiority words as suggestions linked to source", () => {
    const findings = runSceneReviewRules({
      heading: "INT. ROOM - DAY",
      beatId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      summary: "",
      location: "ROOM",
      fields: {
        ...emptySceneLabFields(),
        povOwner: "Maya",
        sceneObjective: "Leave",
        whyNow: "Train",
        obstacle: "Guard",
        turnDescription: "She stays",
        chargeIn: "fear",
        chargeOut: "resolve",
        object: "ticket",
        lightSource: "neon",
        deletionTestResult: "checked",
        longDraft: "She realizes the truth and feels cold.",
      },
      microBeats: [
        {
          id: "cccccccc-cccc-cccc-cccc-ccccccccccc1",
          projectId: "11111111-1111-1111-1111-111111111111",
          sceneId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
          userId: "33333333-3333-3333-3333-333333333333",
          sortOrder: 0,
          actionTactic: "a",
          reactionResistance: "b",
          adjustment: "c",
          loadOrAbsorb: "Load",
          elementRangeStart: null,
          elementRangeEnd: null,
          durationEstimateSeconds: null,
          notes: "",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "cccccccc-cccc-cccc-cccc-ccccccccccc2",
          projectId: "11111111-1111-1111-1111-111111111111",
          sceneId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
          userId: "33333333-3333-3333-3333-333333333333",
          sortOrder: 1,
          actionTactic: "a",
          reactionResistance: "b",
          adjustment: "c",
          loadOrAbsorb: "Absorb",
          elementRangeStart: null,
          elementRangeEnd: null,
          durationEstimateSeconds: null,
          notes: "",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "cccccccc-cccc-cccc-cccc-ccccccccccc3",
          projectId: "11111111-1111-1111-1111-111111111111",
          sceneId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
          userId: "33333333-3333-3333-3333-333333333333",
          sortOrder: 2,
          actionTactic: "a",
          reactionResistance: "b",
          adjustment: "c",
          loadOrAbsorb: "Load",
          elementRangeStart: null,
          elementRangeEnd: null,
          durationEstimateSeconds: null,
          notes: "",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    const camera = findings.filter((item) => item.ruleId === "forbidden-interiority-words");
    expect(camera.length).toBeGreaterThan(0);
    expect(camera.every((item) => item.severity === "suggestion")).toBe(true);
    expect(camera[0]?.explanation).toMatch(/not an unquestionable law/i);
    expect(CAMERA_TEST_TERMS).toContain("realizes");
    const link = learningLinkForRule("forbidden-interiority-words");
    expect(link.bookId).toBeTruthy();
    expect(link.chapterSlug).toBeTruthy();
    expect(link.atlasConceptId).toBe("image");
  });

  it("flags missing Load/Absorb variation", () => {
    const micro = [0, 1, 2].map((index) => ({
      id: `cccccccc-cccc-cccc-cccc-ccccccccccc${index}`,
      projectId: "11111111-1111-1111-1111-111111111111",
      sceneId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
      userId: "33333333-3333-3333-3333-333333333333",
      sortOrder: index,
      actionTactic: "a",
      reactionResistance: "b",
      adjustment: "c",
      loadOrAbsorb: "Load" as const,
      elementRangeStart: null,
      elementRangeEnd: null,
      durationEstimateSeconds: null,
      notes: "",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }));
    const findings = runSceneReviewRules({
      heading: "INT. ROOM - DAY",
      beatId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      summary: "",
      location: "",
      fields: {
        ...emptySceneLabFields(),
        povOwner: "A",
        sceneObjective: "B",
        whyNow: "C",
        obstacle: "D",
        turnDescription: "E",
        chargeIn: "in",
        chargeOut: "out",
        object: "cup",
        lightSource: "window",
        deletionTestResult: "done",
      },
      microBeats: micro,
    });
    expect(findings.map((item) => item.ruleId)).toContain("no-load-absorb-variation");
  });
});

describe("deletion test honesty", () => {
  it("says no explicit dependency was found when links are empty", () => {
    const beats = [beat({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", sortOrder: 0, name: "Act I" })];
    const scenes = [
      scene({
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
        beatId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
        sortOrder: 0,
        heading: "INT. A",
      }),
      scene({
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
        beatId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
        sortOrder: 1,
        heading: "INT. B",
      }),
    ];
    const impact = evaluateDeletionTest({
      sceneId: scenes[0]!.id,
      scenes,
      beats,
      fields: emptySceneLabFields(),
    });
    expect(impact.emptyMessage).toBe("No explicit dependency was found.");
    expect(impact.projectionWithoutScene.screenplayScenes.map((item) => item.id)).toEqual([
      scenes[1]!.id,
    ]);
    expect(projectStructureOrder(beats, scenes).screenplayScenes).toHaveLength(2);
  });

  it("reports explicit setups and beat gaps only when present", () => {
    const beats = [beat({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", sortOrder: 0, name: "Midpoint" })];
    const scenes = [
      scene({
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
        beatId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
        sortOrder: 0,
        heading: "INT. ONLY",
      }),
    ];
    const impact = evaluateDeletionTest({
      sceneId: scenes[0]!.id,
      scenes,
      beats,
      fields: {
        ...emptySceneLabFields(),
        setupsProvided: "Gun on mantel",
        payoffsSupported: "Act III reveal",
      },
    });
    expect(impact.emptyMessage).toBeNull();
    expect(impact.setupsLost).toEqual(["Gun on mantel"]);
    expect(impact.payoffsWeakened).toEqual(["Act III reveal"]);
    expect(impact.beatGaps[0]).toMatch(/Midpoint/);
  });
});

describe("scene lab migration", () => {
  it("extends scenes and adds micro_beats / review tables with RLS", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("add column if not exists pov_owner");
    expect(sql).toContain("create table public.micro_beats");
    expect(sql).toContain("create table public.scene_review_runs");
    expect(sql).toContain("create table public.scene_review_findings");
    expect(sql).toContain("alter table public.micro_beats enable row level security");
    expect(sql).toContain("status in ('open', 'accepted', 'dismissed', 'deferred')");
    expect(sql).not.toContain("overall_score");
  });
});
