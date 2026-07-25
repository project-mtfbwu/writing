import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assemblePremisePreview } from "@/lib/projects/premise";
import { planAnonymousMigration } from "@/lib/projects/migration";
import { CONTENT_VERSION } from "@/types/learning";

const MIGRATION = path.join(
  process.cwd(),
  "supabase/migrations/20260725174901_initial_user_data.sql",
);

describe("premise preview", () => {
  it("assembles preview only from entered fields", () => {
    const preview = assemblePremisePreview({
      title: "Test",
      format: "feature",
      genre: "drama",
      tone: "dry",
      protagonist: "flawed clerk",
      incitingIncident: "the ledger vanishes",
      goal: "recover it before dawn",
      stakes: "lose the shop",
      obstacle: "his brother holds the key",
      controllingIdea: "Ambition destroys a man when he sacrifices family for proof.",
    });
    expect(preview).toContain("When the ledger vanishes");
    expect(preview).toContain("Controlling idea:");
    expect(preview.includes("AI")).toBe(false);
  });
});

describe("anonymous migration planning", () => {
  it("skips ids that already exist remotely", () => {
    const plan = planAnonymousMigration({
      localBookmarks: [
        {
          id: "bookmark:a",
          bookId: "b",
          bookTitle: "B",
          chapterId: "c",
          chapterSlug: "c",
          chapterTitle: "C",
          sectionId: null,
          sectionTitle: null,
          headingId: null,
          href: "/read/b/c",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "bookmark:b",
          bookId: "b",
          bookTitle: "B",
          chapterId: "d",
          chapterSlug: "d",
          chapterTitle: "D",
          sectionId: null,
          sectionTitle: null,
          headingId: null,
          href: "/read/b/d",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      remoteBookmarkIds: ["bookmark:a"],
      localNotes: [],
      remoteNoteIds: [],
      localProgress: {
        contentVersion: CONTENT_VERSION,
        playheadLessonId: null,
        lessons: [
          {
            lessonId: "lesson-scene-card",
            contentVersion: CONTENT_VERSION,
            courseId: "course-screenwriting-craft",
            completedExerciseIds: ["ex-a"],
            completedStepIds: [],
            videoPositionSeconds: 0,
            videoCompleted: false,
            completionCount: 1,
            completedAt: null,
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        attempts: [
          {
            id: "attempt:1",
            contentVersion: CONTENT_VERSION,
            courseId: "course",
            lessonId: "lesson",
            exerciseId: "ex",
            response: { type: "option", optionId: "x" },
            passed: true,
            feedback: "ok",
            attemptNumber: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
      remoteLessonKeys: [`lesson-scene-card::${CONTENT_VERSION}`],
      remoteAttemptIds: ["attempt:1"],
    });

    expect(plan.bookmarksToInsert.map((item) => item.id)).toEqual(["bookmark:b"]);
    expect(plan.lessonsToUpsert).toHaveLength(0);
    expect(plan.attemptsToInsert).toHaveLength(0);
  });
});

describe("RLS migration", () => {
  it("enables RLS and ownership policies on every user table", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    const tables = [
      "profiles",
      "projects",
      "project_members",
      "premises",
      "characters",
      "drafts",
      "lesson_progress",
      "bookmarks",
      "reader_notes",
      "exercise_attempts",
      "review_findings",
    ];

    for (const table of tables) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }

    expect(sql).toContain("using (user_id = auth.uid())");
    expect(sql).toContain("private.is_project_member");
    expect(sql).toContain("private.is_project_owner");
    expect(sql).toContain("create schema if not exists private");
    expect(sql.toLowerCase()).not.toContain("create policy \"anon");
    // Books / educational Markdown must not be copied into Supabase.
    expect(sql).not.toMatch(/create table public\.(books|chapters|content_blocks)/i);
  });
});
