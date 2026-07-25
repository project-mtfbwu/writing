"use client";

import Link from "next/link";
import type { Chapter, Section } from "@/types/content";

type ContentsRailProps = {
  bookId: string;
  chapters: Chapter[];
  currentChapterId?: string;
  sections?: Section[];
  open: boolean;
  onToggle: () => void;
};

export function ContentsRail({
  bookId,
  chapters,
  currentChapterId,
  sections = [],
  open,
  onToggle,
}: ContentsRailProps) {
  return (
    <aside className="reader-rail reader-rail--toc print:hidden" aria-label="Book contents">
      <button type="button" className="reader-rail__mobile-toggle md:hidden" onClick={onToggle}>
        {open ? "Hide contents" : "Contents"}
      </button>
      <div className={`reader-rail__panel ${open ? "is-open" : ""}`} data-rail="toc">
        <p className="reader-rail__heading">Contents</p>
        <nav>
          <ol className="reader-toc">
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <Link
                  href={`/read/${bookId}/${chapter.slug}`}
                  className={
                    chapter.id === currentChapterId
                      ? "reader-toc__link is-active"
                      : "reader-toc__link"
                  }
                  aria-current={chapter.id === currentChapterId ? "page" : undefined}
                >
                  {chapter.title}
                </Link>
                {chapter.id === currentChapterId && sections.length > 0 ? (
                  <ol className="reader-toc__sections">
                    {sections.map((section) => (
                      <li key={section.id}>
                        <a href={`#${section.headingId}`} className="reader-toc__section-link">
                          {section.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </aside>
  );
}
