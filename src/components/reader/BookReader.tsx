"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Chapter, ConceptLink, ContentBlock, Section } from "@/types/content";
import { filterBlocksForDepth, showsConnectedConcepts } from "@/lib/reader/modes";
import { escapeRawMarkdown } from "@/lib/reader/persistence";
import { useReader } from "@/components/reader/ReaderProvider";
import { ReaderControls } from "@/components/reader/ReaderControls";
import { ContentsRail } from "@/components/reader/ContentsRail";
import { StudyRail } from "@/components/reader/StudyRail";
import { BlockRenderer } from "@/components/reader/BlockRenderer";

export type ChapterPayload = {
  chapter: Chapter;
  blocks: ContentBlock[];
  sections: Section[];
  concepts: ConceptLink[];
};

type BookReaderProps = {
  bookId: string;
  bookTitle: string;
  chapters: Chapter[];
  current: ChapterPayload;
  previous: Chapter | null;
  next: Chapter | null;
  chapterIndex: number;
  rawMarkdown: string;
  continuousChapters?: ChapterPayload[];
};

export function BookReader({
  bookId,
  bookTitle,
  chapters,
  current,
  previous,
  next,
  chapterIndex,
  rawMarkdown,
  continuousChapters,
}: BookReaderProps) {
  const { preferences, updatePosition, position, ready } = useReader();
  const [tocOpen, setTocOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const restoredRef = useRef(false);

  const payloads = preferences.continuousBook && continuousChapters?.length
    ? continuousChapters
    : [current];

  const chapterProgress = chapters.length === 0 ? 0 : (chapterIndex + 1) / chapters.length;
  const bookProgress = chapterProgress;

  const continueHref = useMemo(() => {
    if (!position || position.bookId !== bookId) return null;
    if (position.chapterSlug === current.chapter.slug) return null;
    return `/read/${bookId}/${position.chapterSlug}`;
  }, [position, bookId, current.chapter.slug]);

  useEffect(() => {
    if (!ready || restoredRef.current) return;
    if (!position || position.bookId !== bookId || position.chapterSlug !== current.chapter.slug) {
      restoredRef.current = true;
      return;
    }
    if (position.sectionId) {
      const el =
        document.querySelector<HTMLElement>(`[data-section-id="${position.sectionId}"]`) ??
        document.getElementById(position.sectionId);
      if (el) {
        el.scrollIntoView({ block: "start" });
        restoredRef.current = true;
        return;
      }
    }
    if (articleRef.current && position.scrollProgress > 0) {
      const max = articleRef.current.scrollHeight - window.innerHeight;
      window.scrollTo({ top: Math.max(0, max * position.scrollProgress) });
    }
    restoredRef.current = true;
  }, [ready, position, bookId, current.chapter.slug]);

  useEffect(() => {
    const onScroll = () => {
      const article = articleRef.current;
      if (!article) return;

      const sectionNodes = Array.from(
        article.querySelectorAll<HTMLElement>("[data-section-id]"),
      );
      let nearestSection: string | null = null;
      let best = Number.POSITIVE_INFINITY;
      for (const node of sectionNodes) {
        const top = Math.abs(node.getBoundingClientRect().top - 96);
        if (top < best) {
          best = top;
          nearestSection = node.dataset.sectionId ?? node.id ?? null;
        }
      }

      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const scrollProgress = Math.min(1, Math.max(0, window.scrollY / max));

      updatePosition({
        bookId,
        chapterId: current.chapter.id,
        chapterSlug: current.chapter.slug,
        sectionId: nearestSection,
        scrollProgress,
        depth: preferences.depth,
        updatedAt: new Date().toISOString(),
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [bookId, current.chapter.id, current.chapter.slug, preferences.depth, updatePosition]);

  const focusClass = preferences.focusMode ? "is-focus" : "";

  return (
    <div className={`book-reader ${focusClass}`} data-depth={preferences.depth}>
      <ReaderControls
        bookId={bookId}
        bookTitle={bookTitle}
        chapters={chapters}
        currentChapterSlug={current.chapter.slug}
        continueHref={continueHref}
      />

      <div className="book-reader__frame">
        <ContentsRail
          bookId={bookId}
          chapters={chapters}
          currentChapterId={current.chapter.id}
          sections={current.sections}
          open={tocOpen}
          onToggle={() => setTocOpen((value) => !value)}
        />

        <article ref={articleRef} className="reading-column" aria-label="Reading column">
          <header className="reading-column__header">
            {current.chapter.partTitle ? (
              <p className="reading-column__part">{current.chapter.partTitle}</p>
            ) : null}
            <h1 className="reading-column__title">{current.chapter.title}</h1>
            <p className="reading-column__meta print:hidden">
              Chapter {chapterIndex + 1} of {chapters.length}
            </p>
          </header>

          {preferences.depth === "raw" ? (
            <pre
              className="reader-raw"
              tabIndex={0}
              dangerouslySetInnerHTML={{ __html: escapeRawMarkdown(rawMarkdown) }}
            />
          ) : (
            payloads.map((payload) => {
              const blocks = filterBlocksForDepth(payload.blocks, preferences.depth);
              return (
                <section
                  key={payload.chapter.id}
                  className="reading-chapter"
                  aria-labelledby={`chapter-${payload.chapter.slug}`}
                >
                  {preferences.continuousBook && payload.chapter.id !== current.chapter.id ? (
                    <h2 id={`chapter-${payload.chapter.slug}`} className="reader-h2">
                      {payload.chapter.title}
                    </h2>
                  ) : null}
                  {blocks.map((block) => (
                    <BlockRenderer key={block.id} block={block} depth={preferences.depth} />
                  ))}
                </section>
              );
            })
          )}

          <nav className="chapter-nav print:hidden" aria-label="Chapter navigation">
            {previous ? (
              <Link href={`/read/${bookId}/${previous.slug}`} className="chapter-nav__link">
                <span>Previous</span>
                <strong>{previous.title}</strong>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/read/${bookId}/${next.slug}`}
                className="chapter-nav__link chapter-nav__link--next"
              >
                <span>Next</span>
                <strong>{next.title}</strong>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </article>

        <StudyRail
          depth={preferences.depth}
          concepts={showsConnectedConcepts(preferences.depth) ? current.concepts : []}
          chapterProgress={chapterProgress}
          bookProgress={bookProgress}
          open={studyOpen}
          onToggle={() => setStudyOpen((value) => !value)}
        />
      </div>
    </div>
  );
}
