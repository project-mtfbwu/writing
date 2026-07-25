import { projectStructureOrder, type Beat, type Scene } from "@/lib/beats/order";
import type { SceneLabFields } from "@/lib/scene-lab/model";

export type DeletionImpact = {
  removedSceneId: string;
  projectionWithoutScene: ReturnType<typeof projectStructureOrder>;
  setupsLost: string[];
  payoffsWeakened: string[];
  characterDecisionsUnsupported: string[];
  beatGaps: string[];
  /** Honest empty-state copy when no explicit links exist. */
  emptyMessage: string | null;
};

function linesFrom(text: string): string[] {
  return text
    .split(/\n|;|\|/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Temporarily remove a scene from structural projection and report only
 * explicit dependency links. Never claims the scene is useless when data is missing.
 */
export function evaluateDeletionTest(input: {
  sceneId: string;
  scenes: Scene[];
  beats: Beat[];
  fields: Pick<
    SceneLabFields,
    "setupsProvided" | "payoffsSupported" | "characterDecisionsSupported"
  >;
}): DeletionImpact {
  const remaining = input.scenes.filter((scene) => scene.id !== input.sceneId);
  const projectionWithoutScene = projectStructureOrder(input.beats, remaining);
  const removed = input.scenes.find((scene) => scene.id === input.sceneId);

  const setupsLost = linesFrom(input.fields.setupsProvided);
  const payoffsWeakened = linesFrom(input.fields.payoffsSupported);
  const characterDecisionsUnsupported = linesFrom(input.fields.characterDecisionsSupported);

  const beatGaps: string[] = [];
  if (removed?.beatId) {
    const beat = input.beats.find((item) => item.id === removed.beatId);
    const stillInBeat = remaining.filter((scene) => scene.beatId === removed.beatId);
    if (beat && stillInBeat.length === 0) {
      beatGaps.push(`Beat “${beat.name}” would have no scenes after removal.`);
    }
  }

  const hasAny =
    setupsLost.length > 0 ||
    payoffsWeakened.length > 0 ||
    characterDecisionsUnsupported.length > 0 ||
    beatGaps.length > 0;

  return {
    removedSceneId: input.sceneId,
    projectionWithoutScene,
    setupsLost,
    payoffsWeakened,
    characterDecisionsUnsupported,
    beatGaps,
    emptyMessage: hasAny
      ? null
      : "No explicit dependency was found.",
  };
}
