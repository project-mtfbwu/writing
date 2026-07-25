import Link from "next/link";
import { listCourses } from "@/lib/learning/catalog";

export default function LearnIndexPage() {
  const courses = listCourses();

  return (
    <main className="learn-index">
      <p className="learn-kicker">Guided learning</p>
      <h1>Learn</h1>
      <p>
        Parallel tracks across four passes. Audience Evidence stays on as the reference track.
        Scene Craft lessons repeat every draft.
      </p>
      <ul className="learn-index__list">
        {courses.map((course) => (
          <li key={course.id}>
            <Link href={`/learn/${course.slug}`}>
              <strong>{course.title}</strong>
              <span>{course.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="learn-meta">
        <Link href="/">Home</Link> · <Link href="/library">Library</Link> ·{" "}
        <Link href="/read">Read</Link>
      </p>
    </main>
  );
}
