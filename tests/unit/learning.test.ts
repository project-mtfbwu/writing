import { describe, expect, it, beforeEach } from "vitest";
import {
  getCourseBySlug,
  getCourseLessons,
  getCourseTracks,
  getLessonBySlug,
  getLessonExercises,
  loadCurriculum,
} from "@/lib/learning/catalog";
import { gradeExercise, isLessonComplete } from "@/lib/learning/exercises";
import {
  deserializeLearningProgress,
  emptyLearningProgress,
  loadLearningProgress,
  saveLearningProgress,
  serializeLearningProgress,
  upsertLessonProgress,
} from "@/lib/learning/progress";
import { CONTENT_VERSION } from "@/types/learning";

describe("curriculum configuration", () => {
  it("loads a typed course with parallel tracks and source refs", () => {
    const curriculum = loadCurriculum();
    expect(curriculum.courses).toHaveLength(1);

    const course = getCourseBySlug("screenwriting-craft");
    expect(course).not.toBeNull();

    const tracks = getCourseTracks(course!);
    expect(tracks.map((track) => track.kind)).toEqual([
      "audience",
      "story",
      "architecture",
      "character",
      "scene-craft",
      "language",
      "script-to-cut",
    ]);
    expect(tracks.some((track) => track.isReference)).toBe(true);

    const lessons = getCourseLessons(course!);
    expect(lessons.length).toBeGreaterThan(8);
    for (const lesson of lessons) {
      expect(lesson.sourceRefs.length).toBeGreaterThan(0);
      expect(lesson.steps.map((step) => step.kind)).toEqual([
        "see",
        "notice",
        "fix",
        "feedback",
        "apply",
        "save",
        "retest",
      ]);
      // No duplicated lesson body copy — only structural prompts + source refs.
      expect(lesson.sourceRefs.every((ref) => ref.bookId && ref.chapterSlug)).toBe(true);
    }

    const repeatable = lessons.filter((lesson) => lesson.cadence === "repeat-every-draft");
    expect(repeatable.length).toBeGreaterThan(0);
  });

  it("resolves lessons and reusable exercises", () => {
    const found = getLessonBySlug("screenwriting-craft", "seven-question-scene-card");
    expect(found?.lesson.evidenceLabels.length).toBeGreaterThan(0);
    const exercises = getLessonExercises(found!.lesson);
    expect(exercises.length).toBeGreaterThan(0);
    expect(new Set(exercises.map((exercise) => exercise.type)).size).toBeGreaterThan(0);
  });
});

describe("exercise engines", () => {
  const course = getCourseBySlug("screenwriting-craft")!;
  const lessons = getCourseLessons(course);
  const allExercises = lessons.flatMap((lesson) => getLessonExercises(lesson));

  it("grades multiple choice and multi-select", () => {
    const evidence = allExercises.find((exercise) => exercise.id === "ex-evidence-labels")!;
    expect(gradeExercise(evidence, { type: "option", optionId: "e4" }).passed).toBe(true);
    expect(gradeExercise(evidence, { type: "option", optionId: "e1" }).passed).toBe(false);

    const logline = allExercises.find((exercise) => exercise.id === "ex-logline-parts")!;
    expect(
      gradeExercise(logline, {
        type: "options",
        optionIds: ["inciting", "protagonist", "goal", "obstacle"],
      }).passed,
    ).toBe(true);
  });

  it("grades reorder, charge, turn, rewrite, dialogue, load/absorb, compare", () => {
    const reorder = allExercises.find((exercise) => exercise.id === "ex-reorder-story-beats")!;
    expect(
      gradeExercise(reorder, {
        type: "order",
        optionIds: ["inciting", "midpoint", "all-is-lost", "climax"],
      }).passed,
    ).toBe(true);

    const charge = allExercises.find((exercise) => exercise.id === "ex-classify-charge")!;
    expect(gradeExercise(charge, { type: "option", optionId: "plus-minus" }).passed).toBe(true);

    const turn = allExercises.find((exercise) => exercise.id === "ex-identify-turn")!;
    expect(gradeExercise(turn, { type: "option", optionId: "sit" }).passed).toBe(true);

    const rewrite = allExercises.find((exercise) => exercise.id === "ex-internal-to-visible")!;
    expect(
      gradeExercise(rewrite, {
        type: "text",
        text: "He takes the long route past the shop.",
      }).passed,
    ).toBe(true);

    const dialogue = allExercises.find((exercise) => exercise.id === "ex-dialogue-cut")!;
    expect(gradeExercise(dialogue, { type: "option", optionId: "emotion" }).passed).toBe(true);

    const short = allExercises.find((exercise) => exercise.id === "ex-short-want")!;
    expect(
      gradeExercise(short, {
        type: "text",
        text: "She must escape the compound before dawn.",
      }).passed,
    ).toBe(true);

    const load = allExercises.find((exercise) => exercise.id === "ex-load-absorb")!;
    expect(gradeExercise(load, { type: "option", optionId: "absorb" }).passed).toBe(true);

    const compare = allExercises.find((exercise) => exercise.id === "ex-compare-bad-better")!;
    expect(
      gradeExercise(compare, {
        type: "options",
        optionIds: ["objects", "subtext", "behaviour"],
      }).passed,
    ).toBe(true);
  });

  it("does not complete lessons from video alone", () => {
    expect(
      isLessonComplete({
        requiredExerciseIds: ["ex-a", "ex-b"],
        completedExerciseIds: [],
        videoCompleted: true,
      }),
    ).toBe(false);
    expect(
      isLessonComplete({
        requiredExerciseIds: ["ex-a", "ex-b"],
        completedExerciseIds: ["ex-a", "ex-b"],
        videoCompleted: false,
      }),
    ).toBe(true);
  });
});

describe("learning progress storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists progress across reload and supports repeatable completions", () => {
    const initial = emptyLearningProgress();
    const withLesson = upsertLessonProgress(initial, {
      lessonId: "lesson-scene-card",
      contentVersion: CONTENT_VERSION,
      courseId: "course-screenwriting-craft",
      completedExerciseIds: ["ex-classify-charge", "ex-identify-turn"],
      completedStepIds: [],
      videoPositionSeconds: 12,
      videoCompleted: true,
      completionCount: 1,
      completedAt: "2026-07-25T00:00:00.000Z",
      updatedAt: "2026-07-25T00:00:00.000Z",
    });
    saveLearningProgress(withLesson);

    const reloaded = loadLearningProgress();
    expect(reloaded.lessons[0]?.completionCount).toBe(1);
    expect(reloaded.lessons[0]?.videoCompleted).toBe(true);
    expect(reloaded.lessons[0]?.completedExerciseIds).toContain("ex-classify-charge");

    const secondDraft = upsertLessonProgress(reloaded, {
      ...reloaded.lessons[0]!,
      completionCount: 2,
      completedExerciseIds: ["ex-classify-charge", "ex-identify-turn"],
      updatedAt: "2026-07-25T01:00:00.000Z",
    });
    expect(secondDraft.lessons[0]?.completionCount).toBe(2);

    const raw = serializeLearningProgress(secondDraft);
    expect(deserializeLearningProgress(raw)?.lessons[0]?.completionCount).toBe(2);
    expect(raw.includes("# THE SCREENWRITING SYLLABUS")).toBe(false);
  });
});
