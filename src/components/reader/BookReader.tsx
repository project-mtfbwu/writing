"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Chapter, ConceptLink, ContentBlock, Section } from "@/types/content";
import {
  filterBlocksForDepth,
  ReadingDepthSchema,
  showsConnectedConcepts,
  type ReadingDepth,
} from "@/lib/reader/modes";
import { escapeRawMarkdown } from "@/lib/reader/persistence";
import { createUserDataStore } from "@/lib/storage";
import type { RelatedItem } from "@/lib/library/related";
import { useReader } from "@/components/reader/ReaderProvider";
import { ReaderControls } from "@/components/reader/ReaderControls";
import { ContentsRail } from "@/components/reader/ContentsRail";
import { StudyRail } from "@/components/reader/StudyRail";
import { BlockRenderer } from "@/components/reader/BlockRenderer";
import { SectionTools } from "@/components/library/SectionTools";

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
  related?: RelatedItem[];
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
  related = [],
}: BookReaderProps) {
  const { preferences, setPreferences, updatePosition, position, ready } = useReader();
  const searchParams = useSearchParams();
  const [tocOpen, setTocOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const restoredRef = useRef(false);
  const store = useMemo(() => createUserDataStore(), []);

  const payloads =
    preferences.continuousBook && continuousChapters?.length ? continuousChapters : [current];

  const chapterProgress = chapters.length === 0 ? 0 : (chapterIndex + 1) / chapters.length;
  const bookProgress = chapterProgress;

  const continueHref = useMemo(() => {
    if (!position || position.bookId !== bookId) return null;
    if (position.chapterSlug === current.chapter.slug) return null;
    return `/read/${bookId}/${position.chapterSlug}`;
  }, [position, bookId, current.chapter.slug]);

  const activeSection = useMemo(() => {
    const sectionParam = searchParams.get("section");
    if (sectionParam) {
      return (
        current.sections.find(
          (section) => section.id === sectionParam || section.headingId === sectionParam,
        ) ?? null
      );
    }
    return current.sections[0] ?? null;
  }, [searchParams, current.sections]);

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (!modeParam) return;
    const parsed = ReadingDepthSchema.safeParse(modeParam);
    if (parsed.success && parsed.data !== preferences.depth) {
      setPreferences({ depth: parsed.data as ReadingDepth });
    }
  }, [searchParams, preferences.depth, setPreferences]);

  useEffect(() => {
    void store.pushRecent({
      bookId,
      bookTitle,
      chapterId: current.chapter.id,
      chapterSlug: current.chapter.slug,
      chapterTitle: current.chapter.title,
      sectionId: activeSection?.id ?? null,
      href: `/read/${bookId}/${current.chapter.slug}`,
      openedAt: new Date().toISOString(),
      depth: preferences.depth,
    });
  }, [
    store,
    bookId,
    bookTitle,
    current.chapter.id,
    current.chapter.slug,
    current.chapter.title,
    activeSection?.id,
    preferences.depth,
  ]);

  useEffect(() => {
    if (!ready || restoredRef.current) return;

    const sectionParam = searchParams.get("section");
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    const targetId = hash || sectionParam;

    if (targetId) {
      const el =
        document.getElementById(decodeURIComponent(targetId)) ??
        document.querySelector<HTMLElement>(
          `[data-section-id="${CSS.escape(decodeURIComponent(targetId))}"]`,
        );
      if (el) {
        el.scrollIntoView({ block: "start" });
        restoredRef.current = true;
        return;
      }
    }

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
  }, [ready, position, bookId, current.chapter.slug, searchParams]);

  useEffect(() => {
    const onScroll = () => {
      const article = articleRef.current;
      if (!article) return;

      const sectionNodes = Array.from(article.querySelectorAll<HTMLElement>("[data-section-id]"));
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

          <SectionTools
            target={{
              bookId,
              bookTitle,
              chapterId: current.chapter.id,
              chapterSlug: current.chapter.slug,
              chapterTitle: current.chapter.title,
              sectionId: activeSection?.id ?? null,
              sectionTitle: activeSection?.title ?? null,
              headingId: activeSection?.headingId ?? current.chapter.headingId,
            }}
          />

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
          related={related}
          chapterProgress={chapterProgress}
          bookProgress={bookProgress}
          open={studyOpen}
          onToggle={() => setStudyOpen((value) => !value)}
        />
      </div>
    </div>
  );
}
