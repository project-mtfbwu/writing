import type { Tables } from "@/types/database";
import type { MicroBeat, SceneLabFields } from "@/lib/scene-lab/model";

export function mapSceneLabFields(row: Tables<"scenes">): SceneLabFields {
  return {
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
  };
}

export function mapMicroBeatRow(row: Tables<"micro_beats">): MicroBeat {
  return {
    id: row.id,
    projectId: row.project_id,
    sceneId: row.scene_id,
    userId: row.user_id,
    sortOrder: row.sort_order,
    actionTactic: row.action_tactic,
    reactionResistance: row.reaction_resistance,
    adjustment: row.adjustment,
    loadOrAbsorb: row.load_or_absorb,
    elementRangeStart: row.element_range_start,
    elementRangeEnd: row.element_range_end,
    durationEstimateSeconds: row.duration_estimate_seconds,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function emptySceneLabFields(): SceneLabFields {
  return {
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
  };
}
