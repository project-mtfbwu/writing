import {
  AtlasConfigSchema,
  AtlasViewSchema,
  type AtlasConcept,
  type AtlasConfig,
  type AtlasMatrixColumn,
  type AtlasMatrixCell,
  type AtlasModule,
  type AtlasRelationship,
  type AtlasTrackRow,
  type AtlasView,
  type SourceLocation,
} from "@/types/atlas";
import { atlasConfig } from "@/data/atlas/system";
import type { ContentBlock, ContentManifest, EvidenceLabel } from "@/types/content";
import { buildReaderDeepLink } from "@/lib/library/related";
import { getCourseBySlug, getLessonExercises, loadCurriculum } from "@/lib/learning/catalog";
import type { Exercise, Lesson } from "@/types/learning";

let cached: AtlasConfig | null = null;

export function loadAtlasConfig(): AtlasConfig {
  if (!cached) {
    cached = AtlasConfigSchema.parse(atlasConfig);
    validateAtlasIntegrity(cached);
  }
  return cached;
}

function validateAtlasIntegrity(config: AtlasConfig): void {
  const ids = new Set(config.concepts.map((concept) => concept.id));
  for (const id of config.hierarchyIds) {
    if (!ids.has(id)) {
      throw new Error(`Atlas hierarchy references missing concept: ${id}`);
    }
  }
  for (const rel of config.relationships) {
    if (!ids.has(rel.fromId) || !ids.has(rel.toId)) {
      throw new Error(`Atlas relationship ${rel.id} points at missing concept`);
    }
  }
  for (const cell of config.matrixCells) {
    for (const conceptId of cell.conceptIds) {
      if (!ids.has(conceptId)) {
        throw new Error(`Atlas matrix cell references missing concept: ${conceptId}`);
      }
    }
  }
}

export function listAtlasConcepts(): AtlasConcept[] {
  return [...loadAtlasConfig().concepts].sort((a, b) => a.hierarchyOrder - b.hierarchyOrder);
}

export function getAtlasConcept(conceptId: string): AtlasConcept | null {
  const normalized = conceptId.trim().toLowerCase();
  return (
    loadAtlasConfig().concepts.find(
      (concept) =>
        concept.id === normalized ||
        concept.aliases.some((alias) => alias.toLowerCase() === normalized),
    ) ?? null
  );
}

export function getConceptRelationships(conceptId: string): AtlasRelationship[] {
  return loadAtlasConfig().relationships.filter(
    (rel) => rel.fromId === conceptId || rel.toId === conceptId,
  );
}

export function getConnectedConcepts(conceptId: string): Array<{
  concept: AtlasConcept;
  relationship: AtlasRelationship;
  direction: "from" | "to";
}> {
  const config = loadAtlasConfig();
  const results: Array<{
    concept: AtlasConcept;
    relationship: AtlasRelationship;
    direction: "from" | "to";
  }> = [];
  for (const relationship of getConceptRelationships(conceptId)) {
    const otherId = relationship.fromId === conceptId ? relationship.toId : relationship.fromId;
    const concept = config.concepts.find((item) => item.id === otherId);
    if (!concept) continue;
    results.push({
      concept,
      relationship,
      direction: relationship.fromId === conceptId ? "from" : "to",
    });
  }
  return results;
}

export function listAtlasModules(): AtlasModule[] {
  return loadAtlasConfig().modules;
}

export function listMatrixCells(): AtlasMatrixCell[] {
  return loadAtlasConfig().matrixCells;
}

export function getTrackRows(): AtlasTrackRow[] {
  return Object.keys(loadAtlasConfig().trackRowLabels) as AtlasTrackRow[];
}

export function getMatrixColumns(): AtlasMatrixColumn[] {
  return Object.keys(loadAtlasConfig().matrixColumnLabels) as AtlasMatrixColumn[];
}

export function parseAtlasView(value: string | string[] | undefined): AtlasView {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = AtlasViewSchema.safeParse(raw ?? "system");
  return parsed.success ? parsed.data : "system";
}

export function sourceLocationHref(location: SourceLocation): string {
  return buildReaderDeepLink({
    bookId: location.bookId,
    chapterSlug: location.chapterSlug,
    sectionId: location.sectionId ?? null,
    headingId: location.headingId ?? location.sectionId ?? null,
  });
}

export function getConceptLessons(concept: AtlasConcept): Lesson[] {
  const course = getCourseBySlug("screenwriting-craft");
  if (!course) return [];
  const curriculum = loadCurriculum();
  return concept.lessonIds
    .map((id) => curriculum.lessons.find((lesson) => lesson.id === id))
    .filter((lesson): lesson is Lesson => Boolean(lesson));
}

export function getConceptExercises(concept: AtlasConcept): Exercise[] {
  const lessons = getConceptLessons(concept);
  const fromLessons = lessons.flatMap((lesson) => getLessonExercises(lesson));
  const curriculum = loadCurriculum();
  const extras = concept.exerciseIds
    .map((id) => curriculum.exercises.find((exercise) => exercise.id === id))
    .filter((exercise): exercise is Exercise => Boolean(exercise));
  const seen = new Set<string>();
  const merged: Exercise[] = [];
  for (const exercise of [...fromLessons, ...extras]) {
    if (seen.has(exercise.id)) continue;
    seen.add(exercise.id);
    merged.push(exercise);
  }
  return merged;
}

export type LoadedSnippet = {
  role: SourceLocation["role"];
  label: string;
  href: string;
  blocks: ContentBlock[];
};

/**
 * Load only the blocks for a concept's source locations — not the whole rendered book UI tree.
 */
export function loadConceptSourceSnippets(
  manifest: ContentManifest,
  concept: AtlasConcept,
): LoadedSnippet[] {
  return concept.sourceLocations.map((location) => ({
    role: location.role,
    label: location.label,
    href: sourceLocationHref(location),
    blocks: loadLocationBlocks(manifest, location),
  }));
}

export function loadLocationBlocks(
  manifest: ContentManifest,
  location: SourceLocation,
): ContentBlock[] {
  if (location.sectionId) {
    const section = manifest.sections.find((item) => item.id === location.sectionId);
    if (section) {
      return section.blockIds
        .map((id) => manifest.blocks.find((block) => block.id === id))
        .filter((block): block is ContentBlock => Boolean(block));
    }
  }

  const chapter = manifest.chapters.find(
    (item) =>
      item.sourceDocumentId === location.bookId && item.slug === location.chapterSlug,
  );
  if (!chapter) return [];

  // Cap chapter-level loads so atlas pages stay lean.
  return chapter.blockIds
    .map((id) => manifest.blocks.find((block) => block.id === id))
    .filter((block): block is ContentBlock => Boolean(block))
    .slice(0, 24);
}

export type TopicExcerpt = {
  topic: string;
  text: string;
  href: string;
};

export function loadTopicExcerpts(
  manifest: ContentManifest,
  chapterSlug: string,
  topics: string[],
): TopicExcerpt[] {
  if (topics.length === 0) return [];
  const chapter = manifest.chapters.find((item) => item.slug === chapterSlug);
  if (!chapter) return [];
  const blocks = chapter.blockIds
    .map((id) => manifest.blocks.find((block) => block.id === id))
    .filter((block): block is ContentBlock => Boolean(block));

  const excerpts: TopicExcerpt[] = [];
  for (const topic of topics) {
    const index = blocks.findIndex(
      (block) =>
        (block.type === "paragraph" || block.type === "quote") &&
        "text" in block &&
        block.text.toLowerCase().includes(topic.toLowerCase()),
    );
    if (index < 0) continue;
    const matched = blocks[index]!;
    const following: string[] = [];
    if ("text" in matched && typeof matched.text === "string") {
      following.push(matched.text);
    }
    for (let offset = 1; offset <= 2; offset += 1) {
      const next = blocks[index + offset];
      if (!next || !("text" in next) || typeof next.text !== "string") break;
      if (next.type === "paragraph" && /^(On |The )/.test(next.text) && offset > 0) break;
      following.push(next.text);
    }
    excerpts.push({
      topic,
      text: following.join("\n\n"),
      href: buildReaderDeepLink({
        bookId: chapter.sourceDocumentId,
        chapterSlug: chapter.slug,
      }),
    });
  }
  return excerpts;
}

export function collectConceptEvidence(
  manifest: ContentManifest,
  concept: AtlasConcept,
): EvidenceLabel[] {
  const labels = new Set<EvidenceLabel>(concept.evidenceLabels);
  for (const location of concept.sourceLocations) {
    for (const block of loadLocationBlocks(manifest, location)) {
      for (const badge of block.evidenceBadges) {
        labels.add(badge.label);
      }
    }
  }
  return [...labels].sort();
}

export function formulasByLevel(manifest: ContentManifest): Array<{
  level: number;
  title: string;
  conceptId: string | null;
  formulas: Array<{ text: string; href: string }>;
  href: string;
}> {
  const concepts = listAtlasConcepts();
  const chapter = manifest.chapters.find((item) => item.slug === "14-the-formulas");
  if (!chapter) return [];

  return chapter.sectionIds.map((sectionId, index) => {
    const section = manifest.sections.find((item) => item.id === sectionId);
    const level = index + 1;
    const concept = concepts.find((item) => item.formulaLevel === level) ?? null;
    const formulas =
      section?.blockIds
        .map((id) => manifest.blocks.find((block) => block.id === id))
        .filter((block): block is ContentBlock => Boolean(block && block.type === "formula"))
        .map((block) => ({
          text: "text" in block ? block.text : "",
          href: buildReaderDeepLink({
            bookId: chapter.sourceDocumentId,
            chapterSlug: chapter.slug,
            sectionId: section.id,
            headingId: section.headingId,
          }),
        })) ?? [];

    return {
      level,
      title: section?.title ?? `Level ${level}`,
      conceptId: concept?.id ?? null,
      formulas,
      href: buildReaderDeepLink({
        bookId: chapter.sourceDocumentId,
        chapterSlug: chapter.slug,
        sectionId: section?.id,
        headingId: section?.headingId,
      }),
    };
  });
}

export function evidenceGroupedConcepts(
  manifest: ContentManifest,
): Record<EvidenceLabel, AtlasConcept[]> {
  const groups: Record<EvidenceLabel, AtlasConcept[]> = {
    E1: [],
    E2: [],
    E3: [],
    E4: [],
    E5: [],
  };
  for (const concept of listAtlasConcepts()) {
    for (const label of collectConceptEvidence(manifest, concept)) {
      groups[label].push(concept);
    }
  }
  return groups;
}

/** Explicit manifest conceptLinks that resolve to atlas concepts (currently often empty). */
export function explicitAtlasEdgesFromManifest(
  manifest: ContentManifest,
): Array<{ fromLabel: string; toConceptId: string; href: string }> {
  const concepts = listAtlasConcepts();
  const edges: Array<{ fromLabel: string; toConceptId: string; href: string }> = [];
  for (const link of manifest.conceptLinks) {
    if (!link.resolved) continue;
    const match = concepts.find(
      (concept) =>
        concept.id === link.target ||
        concept.aliases.includes(link.target) ||
        concept.title.toLowerCase() === link.label.toLowerCase(),
    );
    if (!match) continue;
    edges.push({
      fromLabel: link.label,
      toConceptId: match.id,
      href: `/atlas/${match.id}`,
    });
  }
  return edges;
}
