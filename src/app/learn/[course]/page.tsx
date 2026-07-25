import { notFound } from "next/navigation";
import {
  getCourseBySlug,
  getCourseLessons,
  getCourseTracks,
} from "@/lib/learning/catalog";
import { CourseMap } from "@/components/learning/CourseMap";

type PageProps = {
  params: Promise<{ course: string }>;
};

export default async function CoursePage({ params }: PageProps) {
  const { course: courseSlug } = await params;
  const course = getCourseBySlug(courseSlug);
  if (!course) notFound();

  const tracks = getCourseTracks(course);
  const lessons = getCourseLessons(course);

  return <CourseMap course={course} tracks={tracks} lessons={lessons} />;
}
