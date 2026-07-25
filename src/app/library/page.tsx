import Link from "next/link";
import { loadContentManifest, getBookChapters } from "@/lib/reader/catalog";
import { loadSearchIndex } from "@/lib/search/load";
import { LibrarySearch } from "@/components/library/LibrarySearch";
import { LibraryUserPanel } from "@/components/library/LibraryUserPanel";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function LibraryPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const [manifest, searchIndex] = await Promise.all([
    loadContentManifest(),
    loadSearchIndex(),
  ]);

  return (
    <main className="library-shell">
      <header className="library-shell__header">
        <p className="library-kicker">Library</p>
        <h1>Writing library</h1>
        <p>
          Browse both source books, search locally, and keep bookmarks and notes on this device.
        </p>
        <p className="library-meta">
          <Link href="/read">Book Mode</Link>
          {" · "}
          <Link href="/">Home</Link>
        </p>
      </header>

      <LibrarySearch index={searchIndex} initialQuery={q ?? ""} />

      <section className="library-bookshelf" aria-label="Source books">
        <h2>Source books</h2>
        <div className="library-bookshelf__list">
          {manifest.books.map((book) => {
            const doc = manifest.documents.find((item) => item.id === book.id);
            const chapters = getBookChapters(manifest, book.id);
            const parts = Array.from(
              new Set(chapters.map((chapter) => chapter.partTitle).filter(Boolean)),
            ) as string[];

            return (
              <article key={book.id} className="library-book">
                <div className="library-book__meta">
                  <h3>
                    <Link href={book.route}>{book.title}</Link>
                  </h3>
                  <p className="library-meta">
                    {doc?.fileName ?? book.id}
                    {" · "}
                    {chapters.length} chapters
                    {" · "}
                    Raw Markdown available
                  </p>
                  {parts.length > 0 ? (
                    <p className="library-meta">Parts / tracks: {parts.join(" · ")}</p>
                  ) : null}
                </div>

                <details className="library-tree">
                  <summary>Chapter tree</summary>
                  <ol>
                    {chapters.map((chapter) => (
                      <li key={chapter.id}>
                        <Link href={`/read/${book.id}/${chapter.slug}`}>
                          {chapter.partTitle ? (
                            <span className="library-meta">{chapter.partTitle} · </span>
                          ) : null}
                          {chapter.title}
                          {/module/i.test(chapter.title) ? (
                            <span className="library-pill">module</span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ol>
                </details>
              </article>
            );
          })}
        </div>
      </section>

      <LibraryUserPanel
        books={manifest.books.map((book) => {
          const chapters = getBookChapters(manifest, book.id);
          return {
            id: book.id,
            title: book.title,
            chapterCount: chapters.length,
            chapterSlugs: chapters.map((chapter) => chapter.slug),
          };
        })}
      />
    </main>
  );
}
