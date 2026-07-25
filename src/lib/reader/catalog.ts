import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  ContentManifestSchema,
  type Book,
  type Chapter,
  type ContentBlock,
  type ContentManifest,
  type Section,
} from "@/types/content";
import {
  GENERATED_MANIFEST_RELATIVE,
  getContinuousBlocks,
  buildContentManifest,
} from "@/lib/content/parse";

export async function loadContentManifest(): Promise<ContentManifest> {
  const manifestPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    GENERATED_MANIFEST_RELATIVE,
  );
  if (existsSync(manifestPath)) {
    const raw = readFileSync(manifestPath, "utf8");
    return ContentManifestSchema.parse(JSON.parse(raw));
  }
  return buildContentManifest(/* turbopackIgnore: true */ process.cwd());
}

export function getBookOrThrow(manifest: ContentManifest, bookId: string): Book {
  const book = manifest.books.find((item) => item.id === bookId);
  if (!book) {
    throw new Error(`Book not found: ${bookId}`);
  }
  return book;
}

export function getBookChapters(manifest: ContentManifest, bookId: string): Chapter[] {
  const book = manifest.books.find((item) => item.id === bookId);
  if (!book) return [];
  return book.chapterIds
    .map((id) => manifest.chapters.find((chapter) => chapter.id === id))
    .filter((chapter): chapter is Chapter => Boolean(chapter))
    .sort((a, b) => a.order - b.order);
}

export function getChapterBySlug(
  manifest: ContentManifest,
  bookId: string,
  chapterSlug: string,
): Chapter | null {
  return (
    getBookChapters(manifest, bookId).find((chapter) => chapter.slug === chapterSlug) ?? null
  );
}

export function getChapterBlocks(manifest: ContentManifest, chapter: Chapter): ContentBlock[] {
  return chapter.blockIds
    .map((id) => manifest.blocks.find((block) => block.id === id))
    .filter((block): block is ContentBlock => Boolean(block));
}

export function getChapterSections(manifest: ContentManifest, chapter: Chapter): Section[] {
  return chapter.sectionIds
    .map((id) => manifest.sections.find((section) => section.id === id))
    .filter((section): section is Section => Boolean(section))
    .sort((a, b) => a.order - b.order);
}

export function getBookProgress(
  chapters: Chapter[],
  currentChapterId: string,
): { chapterIndex: number; chapterProgress: number; bookProgress: number } {
  const chapterIndex = Math.max(
    0,
    chapters.findIndex((chapter) => chapter.id === currentChapterId),
  );
  const chapterProgress = chapters.length === 0 ? 0 : (chapterIndex + 1) / chapters.length;
  return {
    chapterIndex,
    chapterProgress,
    bookProgress: chapterProgress,
  };
}

export function readSourceMarkdown(relativePath: string): string {
  const absolute = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    relativePath,
  );
  return readFileSync(absolute, "utf8");
}

export { getContinuousBlocks };
