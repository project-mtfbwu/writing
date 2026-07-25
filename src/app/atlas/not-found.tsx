import Link from "next/link";

export default function AtlasNotFound() {
  return (
    <main className="atlas">
      <h1>Concept not found</h1>
      <p>
        That concept id is not in the reviewed atlas map.{" "}
        <Link href="/atlas">Return to atlas</Link>.
      </p>
    </main>
  );
}
