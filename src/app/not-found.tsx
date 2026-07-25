import Link from "next/link";

export default function NotFound() {
  return (
    <main className="project-page">
      <h1>Not found</h1>
      <p className="atlas-muted">That route does not exist.</p>
      <Link href="/">Home</Link>
    </main>
  );
}
