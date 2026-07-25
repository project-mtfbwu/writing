"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  lessonProgressKey,
  planAnonymousMigration,
  type MigrationPlan,
} from "@/lib/projects/migration";
import type { Bookmark, Note } from "@/lib/storage/types";
import type { LearningProgressState } from "@/types/learning";

export async function migrateAnonymousUserDataAction(input: {
  bookmarks: Bookmark[];
  notes: Note[];
  progress: LearningProgressState;
}): Promise<{ error: string | null; plan: MigrationPlan | null; migrated: boolean }> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured.", plan: null, migrated: false };
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required.", plan: null, migrated: false };

  const [{ data: remoteBookmarks }, { data: remoteNotes }, { data: remoteLessons }, { data: remoteAttempts }] =
    await Promise.all([
      supabase.from("bookmarks").select("id").eq("user_id", user.id),
      supabase.from("reader_notes").select("id").eq("user_id", user.id),
      supabase.from("lesson_progress").select("lesson_id, content_version").eq("user_id", user.id),
      supabase.from("exercise_attempts").select("id").eq("user_id", user.id),
    ]);

  const plan = planAnonymousMigration({
    localBookmarks: input.bookmarks,
    remoteBookmarkIds: (remoteBookmarks ?? []).map((row) => row.id),
    localNotes: input.notes,
    remoteNoteIds: (remoteNotes ?? []).map((row) => row.id),
    localProgress: input.progress,
    remoteLessonKeys: (remoteLessons ?? []).map((row) =>
      lessonProgressKey(row.lesson_id, row.content_version),
    ),
    remoteAttemptIds: (remoteAttempts ?? []).map((row) => row.id),
  });

  if (plan.bookmarksToInsert.length > 0) {
    const { error } = await supabase.from("bookmarks").upsert(
      plan.bookmarksToInsert.map((item) => ({
        id: item.id,
        user_id: user.id,
        book_id: item.bookId,
        book_title: item.bookTitle,
        chapter_id: item.chapterId,
        chapter_slug: item.chapterSlug,
        chapter_title: item.chapterTitle,
        section_id: item.sectionId,
        section_title: item.sectionTitle,
        heading_id: item.headingId,
        href: item.href,
        created_at: item.createdAt,
      })),
    );
    if (error) return { error: error.message, plan, migrated: false };
  }

  if (plan.notesToInsert.length > 0) {
    const { error } = await supabase.from("reader_notes").upsert(
      plan.notesToInsert.map((item) => ({
        id: item.id,
        user_id: user.id,
        book_id: item.bookId,
        book_title: item.bookTitle,
        chapter_id: item.chapterId,
        chapter_slug: item.chapterSlug,
        chapter_title: item.chapterTitle,
        section_id: item.sectionId,
        section_title: item.sectionTitle,
        heading_id: item.headingId,
        href: item.href,
        body: item.body,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      })),
    );
    if (error) return { error: error.message, plan, migrated: false };
  }

  if (plan.lessonsToUpsert.length > 0) {
    const { error } = await supabase.from("lesson_progress").upsert(
      plan.lessonsToUpsert.map((lesson) => ({
        user_id: user.id,
        content_version: lesson.contentVersion,
        course_id: lesson.courseId,
        lesson_id: lesson.lessonId,
        completed_exercise_ids: lesson.completedExerciseIds,
        completed_step_ids: lesson.completedStepIds,
        video_position_seconds: lesson.videoPositionSeconds,
        video_completed: lesson.videoCompleted,
        completion_count: lesson.completionCount,
        completed_at: lesson.completedAt,
        updated_at: lesson.updatedAt,
      })),
      { onConflict: "user_id,lesson_id,content_version" },
    );
    if (error) return { error: error.message, plan, migrated: false };
  }

  if (plan.attemptsToInsert.length > 0) {
    const { error } = await supabase.from("exercise_attempts").upsert(
      plan.attemptsToInsert.map((attempt) => ({
        id: attempt.id,
        user_id: user.id,
        content_version: attempt.contentVersion,
        course_id: attempt.courseId,
        lesson_id: attempt.lessonId,
        exercise_id: attempt.exerciseId,
        response: attempt.response as never,
        passed: attempt.passed,
        feedback: attempt.feedback,
        attempt_number: attempt.attemptNumber,
        original_answer: attempt.response as never,
        created_at: attempt.createdAt,
      })),
    );
    if (error) return { error: error.message, plan, migrated: false };
  }

  return { error: null, plan, migrated: true };
}
