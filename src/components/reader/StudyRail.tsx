"use client";

import { EVIDENCE_DEFINITIONS, type ReadingDepth } from "@/lib/reader/modes";
import type { ConceptLink } from "@/types/content";

type StudyRailProps = {
  depth: ReadingDepth;
  concepts: ConceptLink[];
  chapterProgress: number;
  bookProgress: number;
  open: boolean;
  onToggle: () => void;
};

export function StudyRail({
  depth,
  concepts,
  chapterProgress,
  bookProgress,
  open,
  onToggle,
}: StudyRailProps) {
  const showStudy = depth === "study" || depth === "everything";

  return (
    <aside className="reader-rail reader-rail--study print:hidden" aria-label="Study rail">
      <button type="button" className="reader-rail__mobile-toggle md:hidden" onClick={onToggle}>
        {open ? "Hide study" : "Study"}
      </button>
      <div className={`reader-rail__panel ${open ? "is-open" : ""}`} data-rail="study">
        <p className="reader-rail__heading">Progress</p>
        <div className="reader-progress" aria-label="Chapter progress">
          <div className="reader-progress__track">
            <div
              className="reader-progress__fill"
              style={{ width: `${Math.round(chapterProgress * 100)}%` }}
            />
          </div>
          <p className="reader-progress__label">
            Chapter {Math.round(chapterProgress * 100)}%
          </p>
        </div>
        <div className="reader-progress" aria-label="Book progress">
          <div className="reader-progress__track">
            <div
              className="reader-progress__fill"
              style={{ width: `${Math.round(bookProgress * 100)}%` }}
            />
          </div>
          <p className="reader-progress__label">Book {Math.round(bookProgress * 100)}%</p>
        </div>

        {showStudy ? (
          <>
            <p className="reader-rail__heading">Evidence key</p>
            <ul className="reader-evidence-key">
              {Object.values(EVIDENCE_DEFINITIONS).map((item) => (
                <li key={item.label}>
                  <strong>{item.label}</strong>
                  <span>{item.meaning}</span>
                </li>
              ))}
            </ul>

            <p className="reader-rail__heading">Connected concepts</p>
            {concepts.length === 0 ? (
              <p className="reader-rail__empty">No linked concepts in this chapter.</p>
            ) : (
              <ul className="reader-concepts">
                {concepts.map((concept) => (
                  <li key={concept.id}>
                    <span>{concept.label}</span>
                    {!concept.resolved ? (
                      <span className="reader-rail__empty"> unresolved</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="reader-rail__empty">
            Switch to Study or Everything mode for evidence labels and concept links.
          </p>
        )}
      </div>
    </aside>
  );
}
