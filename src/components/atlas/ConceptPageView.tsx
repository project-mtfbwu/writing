import Link from "next/link";
import type { AtlasConcept, AtlasRelationship } from "@/types/atlas";
import type { EvidenceLabel } from "@/types/content";
import type { Exercise, Lesson } from "@/types/learning";
import type { LoadedSnippet, TopicExcerpt } from "@/lib/atlas/catalog";
import { sourceLocationHref } from "@/lib/atlas/catalog";
import { ConceptEverythingCard, type ConceptEverythingModel } from "@/components/atlas/EverythingView";

type ConceptPageProps = {
  concept: AtlasConcept;
  relationships: AtlasRelationship[];
  snippets: LoadedSnippet[];
  eli5: TopicExcerpt[];
  secretSauce: TopicExcerpt[];
  lessons: Lesson[];
  exercises: Exercise[];
  evidenceLabels: EvidenceLabel[];
  connected: ConceptEverythingModel["connected"];
};

export function ConceptPageView({
  concept,
  relationships,
  snippets,
  eli5,
  secretSauce,
  lessons,
  exercises,
  evidenceLabels,
  connected,
}: ConceptPageProps) {
  const model: ConceptEverythingModel = {
    concept,
    snippets,
    eli5,
    secretSauce,
    lessons,
    exercises,
    connected,
    evidenceLabels,
  };

  return (
    <main className="atlas atlas-concept-page">
      <header className="atlas__header">
        <p className="atlas__kicker">
          <Link href="/atlas">Atlas</Link> · Concept
        </p>
        <h1>{concept.title}</h1>
        <p className="atlas__lede">{concept.summary}</p>
        <p className="atlas-muted">
          Evidence: {evidenceLabels.join(" · ") || "none listed"} · Tracks:{" "}
          {concept.trackRows.join(", ")}
        </p>
      </header>

      <section className="atlas-concept-meta" aria-label="Concept navigation">
        <h2>Source locations</h2>
        <ul>
          {concept.sourceLocations.map((location) => (
            <li key={location.label + location.chapterSlug}>
              <Link href={sourceLocationHref(location)}>{location.label}</Link>
            </li>
          ))}
        </ul>

        <h2>Related concepts</h2>
        {relationships.length === 0 ? (
          <p className="atlas-muted">No reviewed relationships.</p>
        ) : (
          <ul>
            {relationships.map((rel) => (
              <li key={rel.id}>
                {rel.description}
                <span className="atlas-muted">
                  {" "}
                  ({rel.source}: {rel.fromId} → {rel.toId})
                </span>
              </li>
            ))}
          </ul>
        )}

        <h2>Course lesson</h2>
        {lessons.length === 0 ? (
          <p className="atlas-muted">No lesson linked.</p>
        ) : (
          <ul>
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/learn/screenwriting-craft/${lesson.slug}`}>{lesson.title}</Link>
              </li>
            ))}
          </ul>
        )}

        <h2>Relevant exercises</h2>
        {exercises.length === 0 ? (
          <p className="atlas-muted">No exercises linked.</p>
        ) : (
          <ul>
            {exercises.map((exercise) => (
              <li key={exercise.id}>
                <span className="atlas-pill">{exercise.type}</span> {exercise.prompt}
              </li>
            ))}
          </ul>
        )}

        <h2>Future project checks</h2>
        <p className="atlas-placeholder">{concept.projectCheckPlaceholder}</p>

        <h2>Project entities</h2>
        <ul>
          <li>
            <Link href="/projects">Open Write / projects</Link>
          </li>
          <li>
            <Link href="/test">Open Test / Scene Lab hub</Link>
          </li>
        </ul>

        <h2>Review findings</h2>
        <p className="atlas-muted">
          Findings are stored per project in Scene Lab. Open Test → Scene Lab, run a review, then
          follow each finding’s source / lesson / exercise links back here.
        </p>
      </section>

      <ConceptEverythingCard model={model} />
    </main>
  );
}
