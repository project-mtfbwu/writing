import type { ConceptLink, ContentManifest } from "@/types/content";

export type RelatedItem = {
  label: string;
  href: string;
  target: string;
};

/**
 * Related content from explicit concept references only.
 * Returns an empty list when no resolved relationships exist.
 */
export function getRelatedContent(
  manifest: ContentManifest,
  opts: {
    bookId: string;
    chapterId: string;
    blockIds: string[];
  },
): RelatedItem[] {
  const blockIdSet = new Set(opts.blockIds);
  const links = manifest.conceptLinks.filter(
    (link) =>
      link.resolved &&
      link.sourceBlockId &&
      blockIdSet.has(link.sourceBlockId),
  );

  const items: RelatedItem[] = [];
  const seen = new Set<string>();

  for (const link of links) {
    const heading = manifest.headings.find(
      (item) => item.slug === link.target || item.id.endsWith(`/${link.target}`),
    );
    if (!heading) continue;

    const chapter = manifest.chapters.find(
      (item) =>
        item.sourceDocumentId === heading.sourceDocumentId &&
        (item.headingId === heading.id ||
          item.sectionIds.some((sectionId) => {
            const section = manifest.sections.find((entry) => entry.id === sectionId);
            return section?.headingId === heading.id;
          })),
    );
    if (!chapter) continue;

    const href = `/read/${chapter.sourceDocumentId}/${chapter.slug}?section=${encodeURIComponent(
      heading.id,
    )}#${encodeURIComponent(heading.id)}`;
    if (seen.has(href)) continue;
    seen.add(href);
    items.push({
      label: link.label,
      target: link.target,
      href,
    });
  }

  // Also surface reverse links: other blocks pointing at headings in this chapter
  const chapterHeadingIds = new Set(
    [
      ...manifest.headings.filter((heading) => {
        const chapter = manifest.chapters.find((item) => item.id === opts.chapterId);
        return chapter && heading.sourceDocumentId === chapter.sourceDocumentId;
      }),
    ]
      .filter((heading) => {
        const chapter = manifest.chapters.find((item) => item.id === opts.chapterId);
        if (!chapter) return false;
        return (
          heading.id === chapter.headingId ||
          chapter.sectionIds.some((sectionId) => {
            const section = manifest.sections.find((entry) => entry.id === sectionId);
            return section?.headingId === heading.id;
          })
        );
      })
      .map((heading) => heading.slug),
  );

  const reverse = manifest.conceptLinks.filter(
    (link: ConceptLink) => link.resolved && chapterHeadingIds.has(link.target),
  );

  for (const link of reverse) {
    if (!link.sourceBlockId) continue;
    const block = manifest.blocks.find((item) => item.id === link.sourceBlockId);
    if (!block?.chapterId || block.chapterId === opts.chapterId) continue;
    const chapter = manifest.chapters.find((item) => item.id === block.chapterId);
    if (!chapter) continue;
    const href = `/read/${chapter.sourceDocumentId}/${chapter.slug}`;
    if (seen.has(href)) continue;
    seen.add(href);
    items.push({
      label: `${link.label} (mentioned in ${chapter.title})`,
      target: link.target,
      href,
    });
  }

  return items.sort((a, b) => a.label.localeCompare(b.label));
}

export function buildReaderDeepLink(opts: {
  bookId: string;
  chapterSlug: string;
  sectionId?: string | null;
  headingId?: string | null;
  mode?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts.sectionId) params.set("section", opts.sectionId);
  if (opts.mode) params.set("mode", opts.mode);
  const query = params.toString();
  const hash = opts.headingId ? `#${encodeURIComponent(opts.headingId)}` : "";
  return `/read/${opts.bookId}/${opts.chapterSlug}${query ? `?${query}` : ""}${hash}`;
}
