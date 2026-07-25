import {
  ConceptOutline,
  AtlasShell,
  SystemMap,
  TrackMatrix,
  FormulaStack,
  EvidenceMap,
  EverythingView,
} from "@/components/atlas";
import {
  evidenceGroupedConcepts,
  formulasByLevel,
  getConceptExercises,
  getConceptLessons,
  getConnectedConcepts,
  listAtlasConcepts,
  listAtlasModules,
  listMatrixCells,
  loadAtlasConfig,
  loadConceptSourceSnippets,
  loadTopicExcerpts,
  collectConceptEvidence,
  parseAtlasView,
} from "@/lib/atlas/catalog";
import { loadContentManifest } from "@/lib/reader/catalog";
import type { AtlasZoomLevel } from "@/types/atlas";
import { AtlasZoomLevelSchema } from "@/types/atlas";

type PageProps = {
  searchParams: Promise<{ view?: string; zoom?: string }>;
};

function parseZoom(value: string | undefined): AtlasZoomLevel {
  const parsed = AtlasZoomLevelSchema.safeParse(value ?? "whole-system");
  return parsed.success ? parsed.data : "whole-system";
}

export default async function AtlasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const view = parseAtlasView(params.view);
  const zoom = parseZoom(params.zoom);
  const config = loadAtlasConfig();
  const concepts = listAtlasConcepts();
  const modules = listAtlasModules();
  const cells = listMatrixCells();

  const manifest =
    view === "formulas" || view === "evidence" || view === "everything"
      ? await loadContentManifest()
      : null;

  return (
    <AtlasShell
      activeView={view}
      zoom={zoom}
      searchSlot={
        <ConceptOutline concepts={concepts} relationships={config.relationships} />
      }
    >
      {view === "system" ? (
        <SystemMap
          concepts={concepts}
          relationships={config.relationships}
          modules={modules}
          zoom={zoom}
        />
      ) : null}

      {view === "matrix" ? <TrackMatrix concepts={concepts} cells={cells} /> : null}

      {view === "formulas" && manifest ? (
        <FormulaStack levels={formulasByLevel(manifest)} />
      ) : null}

      {view === "evidence" && manifest ? (
        <EvidenceMap groups={evidenceGroupedConcepts(manifest)} />
      ) : null}

      {view === "everything" && manifest ? (
        <EverythingView
          items={concepts.map((concept) => ({
            concept,
            snippets: loadConceptSourceSnippets(manifest, concept),
            eli5: loadTopicExcerpts(manifest, "33-the-eli5s-collected", concept.eli5Topics),
            secretSauce: loadTopicExcerpts(
              manifest,
              "32-every-secret-sauce-collected",
              concept.secretSauceTopics,
            ),
            lessons: getConceptLessons(concept),
            exercises: getConceptExercises(concept),
            connected: getConnectedConcepts(concept.id).map((item) => ({
              id: item.concept.id,
              title: item.concept.title,
              description: item.relationship.description,
              source: item.relationship.source,
            })),
            evidenceLabels: collectConceptEvidence(manifest, concept),
          }))}
        />
      ) : null}
    </AtlasShell>
  );
}
