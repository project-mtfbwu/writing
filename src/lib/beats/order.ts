import { z } from "zod";

export const BeatColorKeySchema = z.enum([
  "neutral",
  "setup",
  "confrontation",
  "resolution",
  "character",
  "theme",
]);
export type BeatColorKey = z.infer<typeof BeatColorKeySchema>;

export const SceneStatusSchema = z.enum(["idea", "outlined", "drafted", "polished"]);
export type SceneStatus = z.infer<typeof SceneStatusSchema>;

export const BeatSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  draftId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  colorKey: BeatColorKeySchema,
  sortOrder: z.number().int(),
  templateKey: z.string().nullable(),
  targetPercentage: z.number().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Beat = z.infer<typeof BeatSchema>;

export const SceneSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  draftId: z.string().uuid(),
  userId: z.string().uuid(),
  beatId: z.string().uuid().nullable(),
  heading: z.string(),
  summary: z.string(),
  location: z.string(),
  timeOfDay: z.string(),
  sortOrder: z.number().int(),
  status: SceneStatusSchema,
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Scene = z.infer<typeof SceneSchema>;

export const UNASSIGNED_LANE_ID = "unassigned" as const;

export type OrderedBeatLane = {
  beat: Beat;
  scenes: Scene[];
};

export type StructureProjection = {
  /** Beats sorted by sortOrder, each with scenes sorted by sortOrder. */
  lanes: OrderedBeatLane[];
  /** Scenes with null beat_id, sorted by sortOrder. */
  unassigned: Scene[];
  /**
   * Canonical flat order for screenplay / outline / navigator:
   * assigned scenes in beat order then scene order, then unassigned.
   */
  screenplayScenes: Scene[];
};

function bySortOrder<T extends { sortOrder: number; id: string }>(a: T, b: T): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.id.localeCompare(b.id);
}

/**
 * One canonical ordering model for beat board, scene navigator,
 * screenplay projection, and project outline.
 */
export function projectStructureOrder(beats: Beat[], scenes: Scene[]): StructureProjection {
  const sortedBeats = [...beats].sort(bySortOrder);
  const assignedByBeat = new Map<string, Scene[]>();
  const unassigned: Scene[] = [];

  for (const scene of scenes) {
    if (!scene.beatId) {
      unassigned.push(scene);
      continue;
    }
    const list = assignedByBeat.get(scene.beatId) ?? [];
    list.push(scene);
    assignedByBeat.set(scene.beatId, list);
  }

  const lanes: OrderedBeatLane[] = sortedBeats.map((beat) => ({
    beat,
    scenes: (assignedByBeat.get(beat.id) ?? []).sort(bySortOrder),
  }));

  // Orphaned assigned scenes (beat deleted race / stale id) join Unassigned.
  for (const [beatId, orphanScenes] of assignedByBeat) {
    if (sortedBeats.some((beat) => beat.id === beatId)) continue;
    unassigned.push(...orphanScenes);
  }

  unassigned.sort(bySortOrder);

  const screenplayScenes = [
    ...lanes.flatMap((lane) => lane.scenes),
    ...unassigned,
  ];

  return { lanes, unassigned, screenplayScenes };
}

/** Recompute contiguous sort_order values after a local reorder. */
export function reindexSortOrders<T extends { id: string; sortOrder: number }>(
  items: T[],
): T[] {
  return items.map((item, index) => ({ ...item, sortOrder: index }));
}

export type ReorderConflict = {
  ok: false;
  reason: "stale-version" | "missing-item";
};

export type ReorderOk<T> = { ok: true; items: T[] };

/**
 * Apply an ordered id list onto items. Fails if the expected version stamp mismatches
 * or an id is missing — used for optimistic rollback / concurrent conflict handling.
 */
export function applyOrderedIds<T extends { id: string; sortOrder: number; updatedAt: string }>(
  items: T[],
  orderedIds: string[],
  expectedUpdatedAtById: Record<string, string>,
): ReorderOk<T> | ReorderConflict {
  for (const id of orderedIds) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return { ok: false, reason: "missing-item" };
    if (expectedUpdatedAtById[id] && expectedUpdatedAtById[id] !== item.updatedAt) {
      return { ok: false, reason: "stale-version" };
    }
  }
  if (orderedIds.length !== items.length) {
    return { ok: false, reason: "missing-item" };
  }
  const byId = new Map(items.map((item) => [item.id, item]));
  const next = orderedIds.map((id, index) => {
    const item = byId.get(id)!;
    return { ...item, sortOrder: index };
  });
  return { ok: true, items: next };
}

export function scenesAfterBeatDelete(scenes: Scene[], deletedBeatId: string): Scene[] {
  return scenes.map((scene) =>
    scene.beatId === deletedBeatId
      ? { ...scene, beatId: null }
      : scene,
  );
}

export function filterTemplateBeatsToInsert(
  existing: Beat[],
  templateBeats: Array<{ templateKey: string }>,
): Array<{ templateKey: string }> {
  const present = new Set(
    existing.map((beat) => beat.templateKey).filter((key): key is string => Boolean(key)),
  );
  return templateBeats.filter((beat) => !present.has(beat.templateKey));
}
