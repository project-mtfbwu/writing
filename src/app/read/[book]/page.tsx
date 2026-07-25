import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBookChapters,
  loadContentManifest,
} from "@/lib/reader/catalog";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ book: string }>;
};

export default async function BookIndexPage({ params }: PageProps) {
  const { book: bookId } = await params;
  const manifest = await loadContentManifest();
  const book = manifest.books.find((item) => item.id === bookId);
  if (!book) {
    notFound();
  }

  const chapters = getBookChapters(manifest, bookId);
  const first = chapters[0];

  return (
    <main className="book-index-page">
      <p className="text-sm uppercase tracking-[0.14em] text-muted">
        <Link href="/read" className="hover:text-foreground">
          Library
        </Link>
      </p>
      <h1>{book.title}</h1>
      <p>
        {chapters.length} chapters. Open the first chapter to enter Book Mode, or jump from the
        contents list.
      </p>
      {first ? (
        <p className="mb-8">
          <Link
            href={`/read/${bookId}/${first.slug}`}
            className="inline-block border border-border bg-surface px-4 py-2 text-sm text-foreground hover:border-accent hover:bg-accent-soft"
          >
            Start reading
          </Link>
        </p>
      ) : null}
      <ol className="chapter-index">
        {chapters.map((chapter, index) => (
          <li key={chapter.id}>
            <Link href={`/read/${bookId}/${chapter.slug}`}>
              <span className="block text-xs uppercase tracking-[0.08em] text-muted">
                Chapter {index + 1}
                {chapter.partTitle ? ` · ${chapter.partTitle}` : ""}
              </span>
              <span className="font-serif text-lg">{chapter.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
