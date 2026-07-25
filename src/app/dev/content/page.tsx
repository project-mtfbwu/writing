import { notFound } from "next/navigation";
import {
  buildContentManifest,
  SOURCE_ROOT_RELATIVE,
} from "@/lib/content/parse";

export const dynamic = "force-dynamic";

export default async function DevContentPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const manifest = await buildContentManifest(process.cwd());

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-muted">Development</p>
        <h1 className="font-serif text-4xl text-foreground">Content engine</h1>
        <p className="text-muted">
          Parsed from <code>{SOURCE_ROOT_RELATIVE}</code> without modifying source Markdown.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <Stat label="Documents" value={manifest.stats.documentCount} />
        <Stat label="Chapters" value={manifest.stats.chapterCount} />
        <Stat label="Headings" value={manifest.stats.headingCount} />
        <Stat label="Evidence markers" value={manifest.stats.evidenceCount} />
        <Stat label="Tables" value={manifest.stats.tableCount} />
        <Stat label="Code blocks" value={manifest.stats.codeBlockCount} />
        <Stat label="Formulas" value={manifest.stats.formulaCount} />
        <Stat label="Warnings" value={manifest.stats.warningCount} />
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Source documents</h2>
        <ul className="space-y-4">
          {manifest.documents.map((doc) => (
            <li key={doc.id} className="border border-border bg-surface p-4">
              <p className="font-medium text-foreground">{doc.title}</p>
              <p className="text-sm text-muted">{doc.relativePath}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted sm:grid-cols-4">
                <div>
                  <dt>Chapters</dt>
                  <dd className="text-foreground">{doc.chapterCount}</dd>
                </div>
                <div>
                  <dt>Headings</dt>
                  <dd className="text-foreground">{doc.headingCount}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd className="text-foreground">{doc.evidenceCount}</dd>
                </div>
                <div>
                  <dt>Tables</dt>
                  <dd className="text-foreground">{doc.tableCount}</dd>
                </div>
                <div>
                  <dt>Code/Formula</dt>
                  <dd className="text-foreground">{doc.codeBlockCount}</dd>
                </div>
                <div>
                  <dt>Callouts</dt>
                  <dd className="text-foreground">{doc.calloutCount}</dd>
                </div>
                <div>
                  <dt>Warnings</dt>
                  <dd className="text-foreground">{doc.warningCount}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl">Parsing warnings</h2>
        {manifest.warnings.length === 0 ? (
          <p className="text-muted">No warnings.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {manifest.warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`} className="border border-border bg-surface px-3 py-2">
                <span className="font-medium text-foreground">{warning.code}</span>
                <span className="text-muted"> — {warning.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border bg-surface px-4 py-3">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-2xl text-foreground">{value}</p>
    </div>
  );
}
