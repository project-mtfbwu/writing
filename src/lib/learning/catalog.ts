import { CurriculumSchema, type Course, type Curriculum, type Exercise, type Lesson, type Module, type Track } from "@/types/learning";
import { screenwritingCurriculum } from "@/data/learning/screenwriting-course";

let cached: Curriculum | null = null;

export function loadCurriculum(): Curriculum {
  if (!cached) {
    cached = CurriculumSchema.parse(screenwritingCurriculum);
  }
  return cached;
}

export function listCourses(): Course[] {
  return loadCurriculum().courses;
}

export function getCourseBySlug(slug: string): Course | null {
  return listCourses().find((course) => course.slug === slug) ?? null;
}

export function getCourseTracks(course: Course): Track[] {
  const curriculum = loadCurriculum();
  return course.trackIds
    .map((id) => curriculum.tracks.find((track) => track.id === id))
    .filter((track): track is Track => Boolean(track))
    .sort((a, b) => a.order - b.order);
}

export function getCourseModules(course: Course): Module[] {
  const curriculum = loadCurriculum();
  return course.moduleIds
    .map((id) => curriculum.modules.find((module) => module.id === id))
    .filter((module): module is Module => Boolean(module));
}

export function getCourseLessons(course: Course): Lesson[] {
  const curriculum = loadCurriculum();
  return course.lessonIds
    .map((id) => curriculum.lessons.find((lesson) => lesson.id === id))
    .filter((lesson): lesson is Lesson => Boolean(lesson));
}

export function getLessonBySlug(courseSlug: string, lessonSlug: string): {
  course: Course;
  lesson: Lesson;
} | null {
  const course = getCourseBySlug(courseSlug);
  if (!course) return null;
  const lesson = getCourseLessons(course).find((item) => item.slug === lessonSlug) ?? null;
  if (!lesson) return null;
  return { course, lesson };
}

export function getExercise(exerciseId: string): Exercise | null {
  return loadCurriculum().exercises.find((exercise) => exercise.id === exerciseId) ?? null;
}

export function getLessonExercises(lesson: Lesson): Exercise[] {
  return lesson.exerciseIds
    .map((id) => getExercise(id))
    .filter((exercise): exercise is Exercise => Boolean(exercise));
}

export function getTrackForLesson(lesson: Lesson): Track | null {
  return loadCurriculum().tracks.find((track) => track.id === lesson.trackId) ?? null;
}

export function getAdjacentLessons(course: Course, lessonId: string): {
  previous: Lesson | null;
  next: Lesson | null;
} {
  const lessons = getCourseLessons(course);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  return {
    previous: index > 0 ? lessons[index - 1]! : null,
    next: index >= 0 && index < lessons.length - 1 ? lessons[index + 1]! : null,
  };
}

export const PASS_ORDER = ["pass-1", "pass-2", "pass-3", "pass-4"] as const;
