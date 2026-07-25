import Link from "next/link";

export default function LearnNotFound() {
  return (
    <main className="missing-page">
      <h1 className="font-serif text-3xl">Lesson or course not found</h1>
      <p className="mt-3 text-muted">
        That learning path is not in the curriculum configuration.
      </p>
      <p className="mt-6">
        <Link href="/learn" className="text-accent underline-offset-2 hover:underline">
          Back to Learn
        </Link>
      </p>
    </main>
  );
}
