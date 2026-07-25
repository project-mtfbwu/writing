import { notFound } from "next/navigation";
import {
  getAdjacentLessons,
  getLessonBySlug,
  getLessonExercises,
  getTrackForLesson,
} from "@/lib/learning/catalog";
import { LessonPlayer } from "@/components/learning/LessonPlayer";

type PageProps = {
  params: Promise<{ course: string; lesson: string }>;
};

export default async function LessonPage({ params }: PageProps) {
  const { course: courseSlug, lesson: lessonSlug } = await params;
  const found = getLessonBySlug(courseSlug, lessonSlug);
  if (!found) notFound();

  const { course, lesson } = found;
  const track = getTrackForLesson(lesson);
  const exercises = getLessonExercises(lesson);
  const { previous, next } = getAdjacentLessons(course, lesson.id);

  return (
    <LessonPlayer
      course={course}
      lesson={lesson}
      track={track}
      exercises={exercises}
      previousSlug={previous?.slug ?? null}
      nextSlug={next?.slug ?? null}
    />
  );
}
