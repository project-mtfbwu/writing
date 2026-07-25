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
  return {
    heading: scene.heading || "Untitled scene",
    summary: scene.summary || "No summary yet",
    chargeIn: typeof meta.chargeIn === "string" && meta.chargeIn ? meta.chargeIn : "incomplete",
    chargeOut:
      typeof meta.chargeOut === "string" && meta.chargeOut ? meta.chargeOut : "incomplete",
    turnStatus:
      meta.turnStatus === "present" || meta.turnStatus === "missing"
        ? meta.turnStatus
        : "incomplete",
    objectStatus:
      meta.objectStatus === "present" || meta.objectStatus === "missing"
        ? meta.objectStatus
        : "incomplete",
    estimatedPages: typeof meta.estimatedPages === "number" ? meta.estimatedPages : "incomplete",
    warningCount: typeof meta.warningCount === "number" ? meta.warningCount : 0,
  };
}
