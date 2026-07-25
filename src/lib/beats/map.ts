import type { Beat, Scene } from "@/lib/beats/order";
import type { Tables } from "@/types/database";

export function mapBeatRow(row: Tables<"beats">): Beat {
  return {
    id: row.id,
    projectId: row.project_id,
    draftId: row.draft_id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    colorKey: row.color_key,
    sortOrder: row.sort_order,
    templateKey: row.template_key,
    targetPercentage: row.target_percentage === null ? null : Number(row.target_percentage),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSceneRow(row: Tables<"scenes">): Scene {
  return {
    id: row.id,
    projectId: row.project_id,
    draftId: row.draft_id,
    userId: row.user_id,
    beatId: row.beat_id,
    heading: row.heading,
    summary: row.summary,
    location: row.location,
    timeOfDay: row.time_of_day,
    sortOrder: row.sort_order,
    status: row.status,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    povOwner: row.pov_owner ?? "",
    sceneObjective: row.scene_objective ?? "",
    whyNow: row.why_now ?? "",
    obstacle: row.obstacle ?? "",
    tactics: row.tactics ?? "",
    turnDescription: row.turn_description ?? "",
    chargeIn: row.charge_in ?? "",
    chargeOut: row.charge_out ?? "",
    object: row.object ?? "",
    lightSource: row.light_source ?? "",
    environment: row.environment ?? "",
    backgroundLife: row.background_life ?? "",
    register: row.register ?? "",
    deletionTestResult: row.deletion_test_result ?? "",
    longDraft: row.long_draft ?? "",
    dialogueNotes: row.dialogue_notes ?? "",
    setupsProvided: row.setups_provided ?? "",
    payoffsSupported: row.payoffs_supported ?? "",
    characterDecisionsSupported: row.character_decisions_supported ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type SceneCardView = {
  heading: string;
  summary: string;
  chargeIn: "incomplete" | string;
  chargeOut: "incomplete" | string;
  turnStatus: "incomplete" | "present" | "missing";
  objectStatus: "incomplete" | "present" | "missing";
  estimatedPages: "incomplete" | number;
  warningCount: number;
};

/** Neutral incomplete states for fields not yet analyzed — never invent analysis. */
export function sceneCardView(scene: Scene): SceneCardView {
  const meta = scene.metadata;
  const chargeIn =
    scene.chargeIn ||
    (typeof meta.chargeIn === "string" && meta.chargeIn ? meta.chargeIn : "");
  const chargeOut =
    scene.chargeOut ||
    (typeof meta.chargeOut === "string" && meta.chargeOut ? meta.chargeOut : "");
  return {
    heading: scene.heading || "Untitled scene",
    summary: scene.summary || "No summary yet",
    chargeIn: chargeIn || "incomplete",
    chargeOut: chargeOut || "incomplete",
    turnStatus: scene.turnDescription
      ? "present"
      : meta.turnStatus === "present" || meta.turnStatus === "missing"
        ? meta.turnStatus
        : "incomplete",
    objectStatus: scene.object
      ? "present"
      : meta.objectStatus === "present" || meta.objectStatus === "missing"
        ? meta.objectStatus
        : "incomplete",
    estimatedPages: typeof meta.estimatedPages === "number" ? meta.estimatedPages : "incomplete",
    warningCount: typeof meta.warningCount === "number" ? meta.warningCount : 0,
  };
}
