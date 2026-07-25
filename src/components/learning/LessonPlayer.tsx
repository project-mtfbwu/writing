"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Course, Exercise, Lesson, LessonProgress, Track } from "@/types/learning";
import { CONTENT_VERSION } from "@/types/learning";
import {
  appendAttempt,
  getLessonProgress,
  loadLearningProgress,
  saveLearningProgress,
  upsertLessonProgress,
} from "@/lib/learning/progress";
import { isLessonComplete, type ExerciseResponse } from "@/lib/learning/exercises";
import { VideoPlaceholder } from "@/components/learning/VideoPlaceholder";
import { ExercisePanel } from "@/components/learning/ExercisePanel";

type LessonPlayerProps = {
  course: Course;
  lesson: Lesson;
  track: Track | null;
  exercises: Exercise[];
  previousSlug: string | null;
  nextSlug: string | null;
};

export function LessonPlayer({
  course,
  lesson,
  track,
  exercises,
  previousSlug,
  nextSlug,
}: LessonPlayerProps) {
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [activeExerciseId, setActiveExerciseId] = useState(exercises[0]?.id ?? "");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const state = loadLearningProgress();
      const existing = getLessonProgress(state, lesson.id);
      const base: LessonProgress =
        existing ??
        {
          lessonId: lesson.id,
          contentVersion: CONTENT_VERSION,
          courseId: course.id,
          completedExerciseIds: [],
          completedStepIds: [],
          videoPositionSeconds: 0,
          videoCompleted: false,
          completionCount: 0,
          completedAt: null,
          updatedAt: new Date().toISOString(),
        };
      const nextState = upsertLessonProgress(state, base);
      saveLearningProgress(nextState);
      setProgress(base);
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [course.id, lesson.id]);

  const activeExercise = useMemo(
    () => exercises.find((exercise) => exercise.id === activeExerciseId) ?? exercises[0] ?? null,
    [exercises, activeExerciseId],
  );

  const persist = useCallback(
    (next: LessonProgress, attempt?: Parameters<typeof appendAttempt>[1]) => {
      let state = loadLearningProgress();
      if (attempt) {
        state = appendAttempt(state, attempt);
      }
      state = upsertLessonProgress(state, next);
      saveLearningProgress(state);
      setProgress(next);
    },
    [],
  );

  const onVideoPosition = useCallback(
    (seconds: number) => {
      if (!progress) return;
      persist({
        ...progress,
        videoPositionSeconds: seconds,
        updatedAt: new Date().toISOString(),
      });
    },
    [persist, progress],
  );

  const onVideoCompleted = useCallback(() => {
    if (!progress) return;
    persist({
      ...progress,
      videoCompleted: true,
      updatedAt: new Date().toISOString(),
    });
  }, [persist, progress]);

  function markStep(stepId: string) {
    if (!progress) return;
    const completedStepIds = progress.completedStepIds.includes(stepId)
      ? progress.completedStepIds
      : [...progress.completedStepIds, stepId];
    persist({
      ...progress,
      completedStepIds,
      updatedAt: new Date().toISOString(),
    });
  }

  function handleExerciseResult(input: {
    passed: boolean;
    feedback: string;
    response: ExerciseResponse;
  }) {
    if (!progress || !activeExercise) return;
    const attemptNumber =
      loadLearningProgress().attempts.filter(
        (attempt) => attempt.lessonId === lesson.id && attempt.exerciseId === activeExercise.id,
      ).length + 1;

    const completedExerciseIds =
      input.passed && !progress.completedExerciseIds.includes(activeExercise.id)
        ? [...progress.completedExerciseIds, activeExercise.id]
        : progress.completedExerciseIds;

    let next: LessonProgress = {
      ...progress,
      completedExerciseIds,
      updatedAt: new Date().toISOString(),
    };

    const allExercisesDone = isLessonComplete({
      requiredExerciseIds: lesson.exerciseIds,
      completedExerciseIds,
      videoCompleted: next.videoCompleted,
    });

    if (
      allExercisesDone &&
      lesson.cadence === "learn-once" &&
      next.completionCount === 0
    ) {
      next = {
        ...next,
        completionCount: 1,
        completedAt: new Date().toISOString(),
      };
    }

    persist(next, {
      id: `attempt:${lesson.id}:${activeExercise.id}:${attemptNumber}`,
      contentVersion: CONTENT_VERSION,
      courseId: course.id,
      lessonId: lesson.id,
      exerciseId: activeExercise.id,
      response: input.response,
      passed: input.passed,
      feedback: input.feedback,
      attemptNumber,
      createdAt: new Date().toISOString(),
    });
  }

  function restartRepeatableDraft() {
    if (!progress || lesson.cadence !== "repeat-every-draft") return;
    if (progress.completionCount < 1) return;
    persist({
      ...progress,
      completedExerciseIds: [],
      completedStepIds: [],
      videoCompleted: false,
      videoPositionSeconds: 0,
      updatedAt: new Date().toISOString(),
    });
  }

  function completeRepeatableDraft() {
    if (!progress || lesson.cadence !== "repeat-every-draft") return;
    const allDone = isLessonComplete({
      requiredExerciseIds: lesson.exerciseIds,
      completedExerciseIds: progress.completedExerciseIds,
      videoCompleted: progress.videoCompleted,
    });
    if (!allDone) return;
    persist({
      ...progress,
      completionCount: progress.completionCount + 1,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  if (!ready || !progress) {
    return <p className="learn-meta">Loading lesson progress…</p>;
  }

  return (
    <div className="learn-player">
      <aside className="learn-player__nav print:hidden" aria-label="Course navigation">
        <p className="learn-kicker">
          <Link href="/learn">Learn</Link> /{" "}
          <Link href={`/learn/${course.slug}`}>{course.title}</Link>
        </p>
        <h2>{lesson.title}</h2>
        <p className="learn-meta">
          {track?.title ?? "Track"}
          {" · "}
          {lesson.cadence === "repeat-every-draft" ? "Repeat every draft" : "Learn once"}
        </p>
        {lesson.evidenceLabels.length > 0 ? (
          <p className="learn-evidence">
            {lesson.evidenceLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </p>
        ) : null}

        <ol className="learn-steps">
          {lesson.steps.map((step) => (
            <li key={step.id}>
              <button type="button" onClick={() => markStep(step.id)}>
                <strong>{step.title}</strong>
                <span>{step.prompt}</span>
                {progress.completedStepIds.includes(step.id) ? " ✓" : ""}
              </button>
              {step.exerciseId ? (
                <button
                  type="button"
                  className="learn-steps__jump"
                  onClick={() => setActiveExerciseId(step.exerciseId!)}
                >
                  Open exercise
                </button>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="learn-player__adjacent">
          {previousSlug ? (
            <Link href={`/learn/${course.slug}/${previousSlug}`}>Previous lesson</Link>
          ) : (
            <span />
          )}
          {nextSlug ? (
            <Link href={`/learn/${course.slug}/${nextSlug}`}>Next lesson</Link>
          ) : (
            <span />
          )}
        </div>
      </aside>

      <div className="learn-player__main">
        <VideoPlaceholder
          key={lesson.id}
          transcript={lesson.video.transcript}
          markers={lesson.video.markers}
          initialPosition={progress.videoPositionSeconds}
          onPosition={onVideoPosition}
          onCompleted={onVideoCompleted}
        />

        <section className="learn-source" aria-label="Source content">
          <h3>Explanation (source)</h3>
          <p className="learn-meta">
            Lessons do not duplicate Markdown. Open the canonical sections:
          </p>
          <ul>
            {lesson.sourceRefs.map((ref) => (
              <li key={`${ref.bookId}:${ref.chapterSlug}`}>
                <Link href={`/read/${ref.bookId}/${ref.chapterSlug}`}>{ref.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="learn-player__exercise" aria-label="Exercise column">
        {exercises.length > 1 ? (
          <div className="learn-exercise-tabs">
            {exercises.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                className={exercise.id === activeExercise?.id ? "is-active" : ""}
                onClick={() => setActiveExerciseId(exercise.id)}
              >
                {exercise.type}
                {progress.completedExerciseIds.includes(exercise.id) ? " ✓" : ""}
              </button>
            ))}
          </div>
        ) : null}

        {activeExercise ? (
          <ExercisePanel
            key={activeExercise.id}
            exercise={activeExercise}
            onResult={handleExerciseResult}
            courseId={course.id}
            lessonId={lesson.id}
            contentVersion={CONTENT_VERSION}
            attemptNumber={
              (progress.completedExerciseIds.includes(activeExercise.id) ? 1 : 0) + 1
            }
          />
        ) : (
          <p className="learn-meta">No exercises configured.</p>
        )}

        <p className="learn-meta">
          Completions: {progress.completionCount}
          {progress.videoCompleted ? " · video finished (not sufficient alone)" : ""}
        </p>

        {lesson.cadence === "repeat-every-draft" ? (
          <div className="learn-repeat-actions">
            <button
              type="button"
              onClick={completeRepeatableDraft}
              disabled={
                !isLessonComplete({
                  requiredExerciseIds: lesson.exerciseIds,
                  completedExerciseIds: progress.completedExerciseIds,
                  videoCompleted: progress.videoCompleted,
                })
              }
            >
              Save draft completion
            </button>
            <button
              type="button"
              onClick={restartRepeatableDraft}
              disabled={progress.completionCount < 1}
            >
              Start next draft loop
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
