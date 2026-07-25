import { notFound } from "next/navigation";
import { ConceptPageView } from "@/components/atlas";
import {
  collectConceptEvidence,
  getAtlasConcept,
  getConceptExercises,
  getConceptLessons,
  getConceptRelationships,
  getConnectedConcepts,
  loadConceptSourceSnippets,
  loadTopicExcerpts,
  listAtlasConcepts,
} from "@/lib/atlas/catalog";
import { loadContentManifest } from "@/lib/reader/catalog";

type PageProps = {
  params: Promise<{ conceptId: string }>;
};

export function generateStaticParams() {
  return listAtlasConcepts().flatMap((concept) => [
    { conceptId: concept.id },
    ...concept.aliases
      .filter((alias) => alias.includes("-") || !alias.includes(" "))
      .map((alias) => ({ conceptId: alias })),
  ]);
}

export default async function AtlasConceptPage({ params }: PageProps) {
  const { conceptId } = await params;
  const concept = getAtlasConcept(conceptId);
  if (!concept) notFound();

  const manifest = await loadContentManifest();
  const relationships = getConceptRelationships(concept.id);
  const snippets = loadConceptSourceSnippets(manifest, concept);
  const eli5 = loadTopicExcerpts(manifest, "33-the-eli5s-collected", concept.eli5Topics);
  const secretSauce = loadTopicExcerpts(
    manifest,
    "32-every-secret-sauce-collected",
    concept.secretSauceTopics,
  );

  return (
    <ConceptPageView
      concept={concept}
      relationships={relationships}
      snippets={snippets}
      eli5={eli5}
      secretSauce={secretSauce}
      lessons={getConceptLessons(concept)}
      exercises={getConceptExercises(concept)}
      evidenceLabels={collectConceptEvidence(manifest, concept)}
      connected={getConnectedConcepts(concept.id).map((item) => ({
        id: item.concept.id,
        title: item.concept.title,
        description: item.relationship.description,
        source: item.relationship.source,
      }))}
    />
  );
}
