import type { ContentManifest } from "@/types/content";
import { getAtlasConcept, getConceptLessons, listAtlasConcepts } from "@/lib/atlas/catalog";
import type { RelatedItem } from "@/lib/library/related";

/**
 * Reading → learning / atlas bridges from explicit concept links only.
 */
export function getStudyBridges(
  manifest: ContentManifest,
  concepts: Array<{ label: string; target: string; resolved: boolean }>,
): RelatedItem[] {
  const items: RelatedItem[] = [];
  const seen = new Set<string>();

  for (const link of concepts) {
    if (!link.resolved) continue;
    const atlas =
      getAtlasConcept(link.target) ||
      listAtlasConcepts().find(
        (concept) =>
          concept.title.toLowerCase() === link.label.toLowerCase() ||
          concept.aliases.some((alias) => alias.toLowerCase() === link.target.toLowerCase()),
      );
    if (!atlas) continue;

    const atlasHref = `/atlas/${atlas.id}`;
    if (!seen.has(atlasHref)) {
      seen.add(atlasHref);
      items.push({ label: `Atlas: ${atlas.title}`, href: atlasHref, target: atlas.id });
    }

    const lessons = getConceptLessons(atlas);
    for (const lesson of lessons.slice(0, 2)) {
      const href = `/learn/screenwriting-craft/${lesson.slug}`;
      if (seen.has(href)) continue;
      seen.add(href);
      items.push({
        label: `Lesson: ${lesson.title}`,
        href,
        target: lesson.id,
      });
    }
  }

  void manifest;
  return items;
}
