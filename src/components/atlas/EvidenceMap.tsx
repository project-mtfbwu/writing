import Link from "next/link";
import type { AtlasConcept } from "@/types/atlas";
import type { EvidenceLabel } from "@/types/content";
import { EVIDENCE_DEFINITIONS } from "@/lib/reader/modes";

type EvidenceMapProps = {
  groups: Record<EvidenceLabel, AtlasConcept[]>;
};

const ORDER: EvidenceLabel[] = ["E1", "E2", "E3", "E4", "E5"];

export function EvidenceMap({ groups }: EvidenceMapProps) {
  return (
    <section className="atlas-evidence" aria-label="Evidence map">
      <h2>Evidence Map</h2>
      <p className="atlas-muted">Concepts grouped by E1–E5 using source labels and section badges.</p>
      <div className="atlas-evidence__grid">
        {ORDER.map((label) => (
          <article key={label}>
            <h3>
              {label}{" "}
              <span className="atlas-muted">{EVIDENCE_DEFINITIONS[label].meaning}</span>
            </h3>
            {groups[label].length === 0 ? (
              <p className="atlas-muted">No mapped concepts.</p>
            ) : (
              <ul>
                {groups[label].map((concept) => (
                  <li key={concept.id}>
                    <Link href={`/atlas/${concept.id}`}>{concept.title}</Link>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
