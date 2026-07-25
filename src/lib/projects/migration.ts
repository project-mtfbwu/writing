import type { LearningProgressState } from "@/types/learning";
import type { Bookmark, Note } from "@/lib/storage/types";

export type MigrationPlan = {
  bookmarksToInsert: Bookmark[];
  notesToInsert: Note[];
  lessonsToUpsert: LearningProgressState["lessons"];
  attemptsToInsert: LearningProgressState["attempts"];
};

/**
 * Merge anonymous local data into remote records without duplicating by id.
 * Existing remote ids win; local-only rows are kept for insert/upsert.
 */
export function planAnonymousMigration(input: {
  localBookmarks: Bookmark[];
  remoteBookmarkIds: string[];
  localNotes: Note[];
  remoteNoteIds: string[];
  localProgress: LearningProgressState;
  remoteLessonKeys: string[];
  remoteAttemptIds: string[];
}): MigrationPlan {
  const remoteBookmarks = new Set(input.remoteBookmarkIds);
  const remoteNotes = new Set(input.remoteNoteIds);
  const remoteLessons = new Set(input.remoteLessonKeys);
  const remoteAttempts = new Set(input.remoteAttemptIds);

  return {
    bookmarksToInsert: input.localBookmarks.filter((item) => !remoteBookmarks.has(item.id)),
    notesToInsert: input.localNotes.filter((item) => !remoteNotes.has(item.id)),
    lessonsToUpsert: input.localProgress.lessons.filter(
      (lesson) => !remoteLessons.has(`${lesson.lessonId}::${lesson.contentVersion}`),
    ),
    attemptsToInsert: input.localProgress.attempts.filter(
      (attempt) => !remoteAttempts.has(attempt.id),
    ),
  };
}

export function lessonProgressKey(lessonId: string, contentVersion: string): string {
  return `${lessonId}::${contentVersion}`;
}
