import { notFound } from "next/navigation";
import { BookReader } from "@/components/reader/BookReader";
import { ReaderProvider } from "@/components/reader/ReaderProvider";
import {
  getBookChapters,
  getChapterBlocks,
  getChapterBySlug,
  getChapterSections,
  readSourceMarkdown,
  loadContentManifest,
} from "@/lib/reader/catalog";
import type { ChapterPayload } from "@/components/reader/BookReader";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ book: string; chapter: string }>;
};

export default async function ChapterReaderPage({ params }: PageProps) {
  const { book: bookId, chapter: chapterSlug } = await params;
  const manifest = await loadContentManifest();
  const book = manifest.books.find((item) => item.id === bookId);
  if (!book) {
    notFound();
  }

  const chapters = getBookChapters(manifest, bookId);
  const chapter = getChapterBySlug(manifest, bookId, chapterSlug);
  if (!chapter) {
    notFound();
  }

  const chapterIndex = chapters.findIndex((item) => item.id === chapter.id);
  const previous = chapterIndex > 0 ? chapters[chapterIndex - 1]! : null;
  const next = chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1]! : null;

  const toPayload = (item: (typeof chapters)[number]): ChapterPayload => {
    const blocks = getChapterBlocks(manifest, item);
    const sections = getChapterSections(manifest, item);
    const blockIdSet = new Set(item.blockIds);
    const concepts = manifest.conceptLinks.filter(
      (link) => link.sourceBlockId && blockIdSet.has(link.sourceBlockId),
    );
    return { chapter: item, blocks, sections, concepts };
  };

  const current = toPayload(chapter);
  const continuousChapters = chapters.map(toPayload);

  const document = manifest.documents.find((item) => item.id === bookId);
  const rawMarkdown = document ? readSourceMarkdown(document.relativePath) : "";

  return (
    <ReaderProvider bookId={bookId}>
      <BookReader
        bookId={bookId}
        bookTitle={book.title}
        chapters={chapters}
        current={current}
        previous={previous}
        next={next}
        chapterIndex={Math.max(0, chapterIndex)}
        rawMarkdown={rawMarkdown}
        continuousChapters={continuousChapters}
      />
    </ReaderProvider>
  );
}
