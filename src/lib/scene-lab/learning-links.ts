import { getCourseBySlug, loadCurriculum } from "@/lib/learning/catalog";
import { getAtlasConcept, getConceptExercises, getConceptLessons } from "@/lib/atlas/catalog";
import type { SourceLocation } from "@/types/atlas";

export type LearningLink = {
  atlasConceptId: string;
  lessonId: string;
  exerciseId: string;
  bookId: string;
  chapterSlug: string;
  sectionId: string | null;
  headingId: string | null;
  sourceLabel: string;
  eli5Topic: string;
};

const RULE_CONCEPT: Record<string, string> = {
  "no-pov-owner": "scene",
  "no-objective": "scene",
  "no-why-now": "scene",
  "no-obstacle": "scene",
  "no-turn": "scene",
  "charge-in-equals-charge-out": "scene",
  "no-object": "scene",
  "no-light-source": "image",
  "fewer-than-three-micro-beats": "micro-beat",
  "unusually-high-micro-beat-count": "micro-beat",
  "no-load-absorb-variation": "load-absorb",
  "forbidden-interiority-words": "image",
  "long-action-paragraphs": "image",
  "no-scene-heading": "scene",
  "no-beat-assignment": "story-beat",
  "deletion-test-not-completed": "scene",
  "dialogue-cut-tag": "line",
};

function pickSource(conceptId: string): SourceLocation | null {
  const concept = getAtlasConcept(conceptId);
  if (!concept) return null;
  return (
    concept.sourceLocations.find((location) => location.role === "definition") ??
    concept.sourceLocations.find((location) => location.role === "formula") ??
    concept.sourceLocations.find((location) => location.role === "explanation") ??
    concept.sourceLocations[0] ??
    null
  );
}

/** Resolve transparent learning links for a rule. Never invents source text. */
export function learningLinkForRule(ruleId: string): LearningLink {
  const conceptId = RULE_CONCEPT[ruleId] ?? "scene";
  const concept = getAtlasConcept(conceptId) ?? getAtlasConcept("scene");
  const source =
    ruleId === "forbidden-interiority-words"
      ? ({
          bookId: "complete-session-script-to-cut",
          chapterSlug: "17-the-scene-build-sequence-the-loop",
          sectionId: null,
          headingId: null,
          label: "Scene-build sequence — camera test",
          role: "explanation" as const,
        } satisfies SourceLocation)
      : pickSource(concept?.id ?? "scene");

  const lessons = concept ? getConceptLessons(concept) : [];
  const exercises = concept ? getConceptExercises(concept) : [];

  return {
    atlasConceptId: concept?.id ?? conceptId,
    lessonId: lessons[0]?.id ?? "",
    exerciseId: exercises[0]?.id ?? "",
    bookId: source?.bookId ?? "",
    chapterSlug: source?.chapterSlug ?? "",
    sectionId: source?.sectionId ?? null,
    headingId: source?.headingId ?? null,
    sourceLabel: source?.label ?? concept?.title ?? "Source",
    eli5Topic: concept?.eli5Topics[0] ?? "",
  };
}

export function lessonHref(lessonId: string): string | null {
  if (!lessonId) return null;
  const curriculum = loadCurriculum();
  const lesson = curriculum.lessons.find((item) => item.id === lessonId);
  const course = getCourseBySlug("screenwriting-craft");
  if (!lesson || !course) return "/learn/screenwriting-craft";
  return `/learn/${course.slug}/${lesson.slug}`;
}

export function exerciseHref(exerciseId: string): string | null {
  if (!exerciseId) return null;
  return `/learn/screenwriting-craft?exercise=${encodeURIComponent(exerciseId)}`;
}

export function atlasHref(conceptId: string): string {
  return `/atlas/${encodeURIComponent(conceptId)}`;
}
