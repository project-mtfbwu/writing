import { z } from "zod";
import {
  ExerciseAttemptSchema,
  LearningProgressStateSchema,
  LessonProgressSchema,
  type ExerciseAttempt,
  type LearningProgressState,
  type LessonProgress,
} from "@/types/learning";
import { CONTENT_VERSION } from "@/types/learning";
import { readStorageRaw, writeStorageRaw } from "@/lib/storage/local";

export const LEARNING_PROGRESS_KEY = "writing.learning.progress.v1";

export function emptyLearningProgress(contentVersion = CONTENT_VERSION): LearningProgressState {
  return LearningProgressStateSchema.parse({
    contentVersion,
    lessons: [],
    attempts: [],
    playheadLessonId: null,
  });
}

export function loadLearningProgress(): LearningProgressState {
  try {
    const raw = readStorageRaw(LEARNING_PROGRESS_KEY);
    if (!raw) return emptyLearningProgress();
    const parsed = LearningProgressStateSchema.parse(JSON.parse(raw));
    if (parsed.contentVersion !== CONTENT_VERSION) {
      // Keep records that still match the active content version.
      return {
        ...emptyLearningProgress(),
        attempts: parsed.attempts.filter((attempt) => attempt.contentVersion === CONTENT_VERSION),
        lessons: parsed.lessons.filter((lesson) => lesson.contentVersion === CONTENT_VERSION),
        playheadLessonId: parsed.playheadLessonId,
      };
    }
    return parsed;
  } catch {
    return emptyLearningProgress();
  }
}

export function saveLearningProgress(state: LearningProgressState): void {
  writeStorageRaw(
    LEARNING_PROGRESS_KEY,
    JSON.stringify(LearningProgressStateSchema.parse(state)),
  );
}

export function getLessonProgress(
  state: LearningProgressState,
  lessonId: string,
): LessonProgress | null {
  return state.lessons.find((lesson) => lesson.lessonId === lessonId) ?? null;
}

export function upsertLessonProgress(
  state: LearningProgressState,
  progress: LessonProgress,
): LearningProgressState {
  const parsed = LessonProgressSchema.parse(progress);
  const lessons = state.lessons.filter((lesson) => lesson.lessonId !== parsed.lessonId);
  return {
    ...state,
    contentVersion: CONTENT_VERSION,
    lessons: [...lessons, parsed],
    playheadLessonId: parsed.lessonId,
  };
}

export function appendAttempt(
  state: LearningProgressState,
  attempt: ExerciseAttempt,
): LearningProgressState {
  const parsed = ExerciseAttemptSchema.parse(attempt);
  return {
    ...state,
    attempts: [...state.attempts, parsed],
  };
}

export function serializeLearningProgress(state: LearningProgressState): string {
  return JSON.stringify(LearningProgressStateSchema.parse(state));
}

export function deserializeLearningProgress(raw: string): LearningProgressState | null {
  try {
    return LearningProgressStateSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export const LearningStoreSchema = z.object({
  progress: LearningProgressStateSchema,
});
