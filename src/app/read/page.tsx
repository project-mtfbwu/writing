import Link from "next/link";
import { loadContentManifest } from "@/lib/reader/catalog";

export const dynamic = "force-dynamic";

export default async function ReadLibraryPage() {
  const manifest = await loadContentManifest();

  return (
    <main className="library-page">
      <p className="text-sm uppercase tracking-[0.14em] text-muted">Library</p>
      <h1>Read</h1>
      <p>Choose a book. Markdown stays the source of truth; Book Mode is one projection.</p>
      <ul className="library-list">
        {manifest.books.map((book) => {
          const doc = manifest.documents.find((item) => item.id === book.id);
          return (
            <li key={book.id}>
              <Link href={book.route}>
                <strong className="font-serif text-xl">{book.title}</strong>
                <span className="mt-1 block text-sm text-muted">
                  {book.chapterIds.length} chapters
                  {doc ? ` · ${doc.headingCount} headings` : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-8">
        <Link href="/" className="text-accent underline-offset-2 hover:underline">
          Back to Writing
        </Link>
      </p>
    </main>
  );
}
