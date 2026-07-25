"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Course, Lesson, LessonProgress, Track } from "@/types/learning";
import { LearningTimeline } from "@/components/learning/LearningTimeline";
import { getLessonProgress, loadLearningProgress } from "@/lib/learning/progress";

type CourseMapProps = {
  course: Course;
  tracks: Track[];
  lessons: Lesson[];
};

export function CourseMap({ course, tracks, lessons }: CourseMapProps) {
  const [progressByLesson, setProgressByLesson] = useState<
    Record<string, LessonProgress | undefined>
  >({});
  const [playheadLessonId, setPlayheadLessonId] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const state = loadLearningProgress();
      const map: Record<string, LessonProgress | undefined> = {};
      for (const lesson of lessons) {
        map[lesson.id] = getLessonProgress(state, lesson.id) ?? undefined;
      }
      setProgressByLesson(map);
      setPlayheadLessonId(state.playheadLessonId);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [lessons]);

  const firstLesson = useMemo(() => lessons[0] ?? null, [lessons]);

  return (
    <main className="learn-course">
      <header className="learn-course__header">
        <p className="learn-kicker">
          <Link href="/learn">Learn</Link>
        </p>
        <h1>{course.title}</h1>
        <p>{course.summary}</p>
        {firstLesson ? (
          <p>
            <Link
              className="learn-cta"
              href={`/learn/${course.slug}/${playheadLessonId ? lessons.find((l) => l.id === playheadLessonId)?.slug ?? firstLesson.slug : firstLesson.slug}`}
            >
              {playheadLessonId ? "Resume playhead" : "Start course"}
            </Link>
          </p>
        ) : null}
      </header>

      <LearningTimeline
        course={course}
        tracks={tracks}
        lessons={lessons}
        progressByLesson={progressByLesson}
        playheadLessonId={playheadLessonId}
      />
    </main>
  );
}
