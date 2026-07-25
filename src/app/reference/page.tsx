import Link from "next/link";
import { loadContentManifest } from "@/lib/reader/catalog";

/**
 * Reference index — links into source chapters. Does not rewrite material.
 */
export default async function ReferencePage() {
  const manifest = await loadContentManifest();

  const links = [
    {
      title: "All formulas",
      href: "/atlas?view=formulas",
      note: "Formula stack view; source chapter 14 remains canonical.",
    },
    {
      title: "All Secret Sauce",
      href: "/read/complete-session-script-to-cut/32-every-secret-sauce-collected",
      note: "Source chapter 32 — collected Secret Sauce.",
    },
    {
      title: "All ELI5 explanations",
      href: "/read/complete-session-script-to-cut/33-the-eli5s-collected",
      note: "Source chapter 33 — collected ELI5s.",
    },
    {
      title: "Evidence key",
      href: "/read/screenwriting-syllabus/evidence-status-key",
      note: "Syllabus evidence-status key.",
    },
    {
      title: "Terminology",
      href: "/read/complete-session-script-to-cut/1-the-terminology",
      note: "Source chapter 1 — terminology.",
    },
    {
      title: "Reading list",
      href: "/read/complete-session-script-to-cut/34-reading-list",
      note: "Source chapter 34 — reading list.",
    },
  ];

  return (
    <main className="reference-page">
      <header>
        <h1>Reference</h1>
        <p className="atlas-muted">
          Indexes into the Markdown source. Nothing here rewrites the books.
        </p>
      </header>

      <section aria-label="Reference indexes">
        <ul className="reference-page__list">
          {links.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.title}</Link>
              <p className="atlas-muted">{item.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Source documents">
        <h2>Source documents</h2>
        <ul>
          {manifest.books.map((book) => (
            <li key={book.id}>
              <Link href={book.route}>{book.title}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
