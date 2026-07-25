"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import type { SearchIndex, SearchContentType } from "@/types/search";
import { searchIndex } from "@/lib/search";

const TYPE_LABELS: Record<SearchContentType, string> = {
  title: "Titles",
  heading: "Headings",
  paragraph: "Paragraphs",
  formula: "Formulas",
  "secret-sauce": "Secret Sauce",
  eli5: "ELI5",
  "real-world": "Real-world examples",
  evidence: "Evidence",
  exercise: "Exercises",
  reference: "References",
  table: "Tables",
  quote: "Quotes",
  definition: "Definitions",
  other: "Other",
};

const TYPE_ORDER: SearchContentType[] = [
  "title",
  "heading",
  "formula",
  "secret-sauce",
  "eli5",
  "real-world",
  "evidence",
  "exercise",
  "definition",
  "reference",
  "paragraph",
  "table",
  "quote",
  "other",
];

type LibrarySearchProps = {
  index: SearchIndex;
  initialQuery?: string;
};

export function LibrarySearch({ index, initialQuery = "" }: LibrarySearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const deferred = useDeferredValue(query);
  const grouped = useMemo(() => searchIndex(index, deferred), [index, deferred]);
  const total = Object.values(grouped).reduce((sum, list) => sum + (list?.length ?? 0), 0);

  return (
    <section className="library-search" aria-label="Library search">
      <label className="library-search__label">
        <span>Search the library</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="scene turn, Load Absorb, E1, object rule…"
          className="library-search__input"
        />
      </label>

      {deferred.trim() ? (
        <div className="library-search__results">
          <p className="library-meta">{total} result{total === 1 ? "" : "s"}</p>
          {TYPE_ORDER.map((type) => {
            const results = grouped[type];
            if (!results?.length) return null;
            return (
              <div key={type} className="library-search__group">
                <h3>{TYPE_LABELS[type]}</h3>
                <ul>
                  {results.slice(0, 25).map((result) => (
                    <li key={result.id}>
                      <Link href={result.href}>
                        <span className="library-search__match">{result.matchedText}</span>
                        <span className="library-meta">
                          {result.bookTitle} · {result.chapterTitle}
                          {result.sectionTitle ? ` · ${result.sectionTitle}` : ""}
                          {result.evidenceLabel ? ` · ${result.evidenceLabel}` : ""}
                          {" · "}
                          {result.contentType}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {total === 0 ? <p className="library-meta">No matches.</p> : null}
        </div>
      ) : (
        <p className="library-meta">
          Local index — titles, headings, prose, formulas, callouts, evidence, and exercises.
        </p>
      )}
    </section>
  );
}
