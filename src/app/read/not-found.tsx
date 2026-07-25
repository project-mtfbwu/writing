import Link from "next/link";

export default function ReadNotFound() {
  return (
    <main className="missing-page">
      <h1 className="font-serif text-3xl">Missing chapter or book</h1>
      <p className="mt-3 text-muted">
        That reading path does not exist in the content manifest. Return to the library and choose
        a valid book or chapter.
      </p>
      <p className="mt-6">
        <Link href="/read" className="text-accent underline-offset-2 hover:underline">
          Back to library
        </Link>
      </p>
    </main>
  );
}
