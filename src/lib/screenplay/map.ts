import type { Tables } from "@/types/database";
import type { ScreenplayElement, ScreenplayElementType } from "@/lib/screenplay/model";

export function mapElementRow(row: Tables<"screenplay_elements">): ScreenplayElement {
  return {
    id: row.id,
    projectId: row.project_id,
    draftId: row.draft_id,
    sceneId: row.scene_id,
    userId: row.user_id,
    elementType: row.element_type as ScreenplayElementType,
    content: row.content,
    sortOrder: row.sort_order,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createLocalElement(input: {
  id: string;
  projectId: string;
  draftId: string;
  userId: string;
  elementType: ScreenplayElementType;
  content?: string;
  sceneId?: string | null;
  sortOrder?: number;
}): ScreenplayElement {
  const now = new Date().toISOString();
  return {
    id: input.id,
    projectId: input.projectId,
    draftId: input.draftId,
    sceneId: input.sceneId ?? null,
    userId: input.userId,
    elementType: input.elementType,
    content: input.content ?? "",
    sortOrder: input.sortOrder ?? 0,
    metadata: {},
    createdAt: now,
    updatedAt: now,
  };
}
