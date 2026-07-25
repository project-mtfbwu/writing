"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AtlasConcept, AtlasRelationship } from "@/types/atlas";

type ConceptOutlineProps = {
  concepts: AtlasConcept[];
  relationships: AtlasRelationship[];
  heading?: string;
};

export function ConceptOutline({
  concepts,
  relationships,
  heading = "Searchable concept list",
}: ConceptOutlineProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return concepts;
    return concepts.filter(
      (concept) =>
        concept.title.toLowerCase().includes(needle) ||
        concept.id.includes(needle) ||
        concept.summary.toLowerCase().includes(needle) ||
        concept.aliases.some((alias) => alias.toLowerCase().includes(needle)),
    );
  }, [concepts, query]);

  return (
    <section className="atlas-outline" aria-label={heading}>
      <h2>{heading}</h2>
      <label className="atlas-outline__search">
        <span>Search concepts</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. scene turn, Load / Absorb"
        />
      </label>
      <ol className="atlas-outline__list">
        {filtered.map((concept) => {
          const edges = relationships.filter(
            (rel) => rel.fromId === concept.id || rel.toId === concept.id,
          );
          return (
            <li key={concept.id}>
              <Link href={`/atlas/${concept.id}`}>{concept.title}</Link>
              <p>{concept.summary}</p>
              {edges.length > 0 ? (
                <ul className="atlas-outline__edges">
                  {edges.map((edge) => (
                    <li key={edge.id}>{edge.description}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>
      {filtered.length === 0 ? <p className="atlas-muted">No concepts match.</p> : null}
    </section>
  );
}
