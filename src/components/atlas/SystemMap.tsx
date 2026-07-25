import Link from "next/link";
import type { AtlasConcept, AtlasModule, AtlasRelationship, AtlasZoomLevel } from "@/types/atlas";
import { loadAtlasConfig } from "@/lib/atlas/catalog";

type SystemMapProps = {
  concepts: AtlasConcept[];
  relationships: AtlasRelationship[];
  modules: AtlasModule[];
  zoom: AtlasZoomLevel;
};

export function SystemMap({ concepts, relationships, modules, zoom }: SystemMapProps) {
  const config = loadAtlasConfig();
  const hierarchy = config.hierarchyIds
    .map((id) => concepts.find((concept) => concept.id === id))
    .filter((concept): concept is AtlasConcept => Boolean(concept));

  return (
    <section className="atlas-system" aria-label="System map">
      <div className="atlas-system__map" role="group" aria-label="Hierarchy map">
        <h2>Core hierarchy</h2>
        <p className="atlas-muted">
          Zoomable concept map (list + links). Graph drawing is optional; this outline is the
          accessible source of truth.
        </p>

        {(zoom === "whole-system" || zoom === "concept") && (
          <ol className="atlas-system__hierarchy">
            {hierarchy.map((concept, index) => (
              <li key={concept.id}>
                <span className="atlas-system__level">L{index}</span>
                <Link href={`/atlas/${concept.id}`}>{concept.title}</Link>
                {concept.formulaLevel ? (
                  <span className="atlas-pill">Formula L{concept.formulaLevel}</span>
                ) : null}
                {concept.evidenceLabels.map((label) => (
                  <span key={label} className="atlas-pill atlas-pill--evidence">
                    {label}
                  </span>
                ))}
              </li>
            ))}
          </ol>
        )}

        {(zoom === "track" || zoom === "whole-system") && (
          <div className="atlas-system__tracks">
            <h3>Tracks</h3>
            <ul>
              {(Object.keys(config.trackRowLabels) as Array<keyof typeof config.trackRowLabels>).map(
                (track) => (
                  <li key={track}>
                    <strong>{config.trackRowLabels[track]}</strong>
                    <span>
                      {concepts
                        .filter((concept) => concept.trackRows.includes(track))
                        .map((concept) => concept.title)
                        .join(", ") || "—"}
                    </span>
                  </li>
                ),
              )}
            </ul>
          </div>
        )}

        {(zoom === "module" || zoom === "whole-system") && (
          <div className="atlas-system__modules">
            <h3>Modules</h3>
            <ul>
              {modules.map((module) => (
                <li key={module.id}>
                  <strong>{module.title}</strong>
                  <span>
                    {module.conceptIds
                      .map((id) => concepts.find((concept) => concept.id === id)?.title ?? id)
                      .join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {zoom === "project-application" && (
          <div className="atlas-system__project">
            <h3>Project application (placeholder)</h3>
            <p>
              Project persistence is not built yet. Each concept page lists the future project check
              it will drive.
            </p>
            <ul>
              {hierarchy.map((concept) => (
                <li key={concept.id}>
                  <Link href={`/atlas/${concept.id}`}>{concept.title}</Link>
                  <span>{concept.projectCheckPlaceholder}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <aside className="atlas-system__relations" aria-label="Visible relationships">
        <h2>Relationships</h2>
        <p className="atlas-muted">Only explicit, typed, hierarchical, or reviewed edges.</p>
        <ul>
          {relationships.map((rel) => (
            <li key={rel.id}>
              <p>{rel.description}</p>
              <p className="atlas-muted">
                <Link href={`/atlas/${rel.fromId}`}>{rel.fromId}</Link>
                {" → "}
                <Link href={`/atlas/${rel.toId}`}>{rel.toId}</Link>
                {" · "}
                {rel.kind} · {rel.source}
              </p>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}
