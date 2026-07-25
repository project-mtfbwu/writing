"use client";

import Link from "next/link";
import type { Course, Lesson, LessonProgress, PassId, Track } from "@/types/learning";
import { PASS_ORDER } from "@/lib/learning/catalog";

type LearningTimelineProps = {
  course: Course;
  tracks: Track[];
  lessons: Lesson[];
  progressByLesson: Record<string, LessonProgress | undefined>;
  playheadLessonId: string | null;
};

function cellStatus(
  lesson: Lesson,
  progress: LessonProgress | undefined,
): "available" | "completed" | "repeatable" {
  if (progress && progress.completionCount > 0) {
    return lesson.cadence === "repeat-every-draft" ? "repeatable" : "completed";
  }
  return "available";
}

export function LearningTimeline({
  course,
  tracks,
  lessons,
  progressByLesson,
  playheadLessonId,
}: LearningTimelineProps) {
  return (
    <section className="learn-timeline" aria-label="Learning timeline">
      <div className="learn-timeline__scroll">
        <table className="learn-timeline__table">
          <thead>
            <tr>
              <th scope="col">Track</th>
              {PASS_ORDER.map((passId) => (
                <th key={passId} scope="col">
                  {course.passLabels[passId as PassId]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tracks.map((track) => (
              <tr key={track.id} data-reference={track.isReference ? "true" : "false"}>
                <th scope="row">
                  <span className="learn-timeline__track-title">{track.title}</span>
                  <span className="learn-timeline__track-sub">{track.subtitle}</span>
                  {track.isReference ? (
                    <span className="learn-pill learn-pill--ref">Reference</span>
                  ) : null}
                </th>
                {PASS_ORDER.map((passId) => {
                  const cellLessons = lessons.filter(
                    (lesson) => lesson.trackId === track.id && lesson.passId === passId,
                  );
                  return (
                    <td key={passId} className="learn-cell">
                      {cellLessons.length === 0 ? (
                        <span className="learn-cell__empty">—</span>
                      ) : (
                        <ul className="learn-cell__stack">
                          {cellLessons.map((lesson) => {
                            const progress = progressByLesson[lesson.id];
                            const status = cellStatus(lesson, progress);
                            const isPlayhead = lesson.id === playheadLessonId;
                            return (
                              <li
                                key={lesson.id}
                                className={`learn-cell__item learn-cell--${status}${isPlayhead ? " is-playhead" : ""}`}
                              >
                                <Link
                                  href={`/learn/${course.slug}/${lesson.slug}`}
                                  className="learn-cell__link"
                                >
                                  <span className="learn-cell__title">{lesson.title}</span>
                                  <span className="learn-cell__meta">
                                    {lesson.cadence === "repeat-every-draft"
                                      ? "Repeat every draft"
                                      : "Learn once"}
                                    {lesson.evidenceLabels.length > 0
                                      ? ` · ${lesson.evidenceLabels.join(" ")}`
                                      : ""}
                                    {progress && progress.completionCount > 0
                                      ? ` · ×${progress.completionCount}`
                                      : ""}
                                  </span>
                                  {isPlayhead ? (
                                    <span className="learn-playhead">Playhead</span>
                                  ) : null}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="learn-timeline__legend">
        Rows are tracks. Columns are passes. The playhead marks your current lesson. Scene Craft
        blocks can be completed more than once.
      </p>
    </section>
  );
}
