"use client";

import Link from "next/link";
import type { Chapter } from "@/types/content";
import { useReader } from "@/components/reader/ReaderProvider";
import type { Appearance, FontSize, LineWidth, ReadingDepth } from "@/lib/reader/modes";

const DEPTHS: { id: ReadingDepth; label: string }[] = [
  { id: "clean", label: "Clean" },
  { id: "explained", label: "Explained" },
  { id: "study", label: "Study" },
  { id: "everything", label: "Everything" },
  { id: "raw", label: "Raw Markdown" },
];

type ReaderControlsProps = {
  bookId: string;
  bookTitle: string;
  chapters: Chapter[];
  currentChapterSlug?: string;
  continueHref?: string | null;
};

export function ReaderControls({
  bookId,
  bookTitle,
  chapters,
  currentChapterSlug,
  continueHref,
}: ReaderControlsProps) {
  const { preferences, setPreferences } = useReader();

  return (
    <div className="reader-controls print:hidden" role="region" aria-label="Reader controls">
      <div className="reader-controls__row">
        <Link href="/read" className="reader-controls__link">
          Library
        </Link>
        <span className="reader-controls__sep" aria-hidden>
          /
        </span>
        <Link href={`/read/${bookId}`} className="reader-controls__link">
          {bookTitle}
        </Link>
        {continueHref ? (
          <Link href={continueHref} className="reader-controls__continue">
            Return to last position
          </Link>
        ) : null}
      </div>

      <div className="reader-controls__grid">
        <label className="reader-field">
          <span>Mode</span>
          <select
            value={preferences.depth}
            onChange={(event) =>
              setPreferences({ depth: event.target.value as ReadingDepth })
            }
          >
            {DEPTHS.map((depth) => (
              <option key={depth.id} value={depth.id}>
                {depth.label}
              </option>
            ))}
          </select>
        </label>

        <label className="reader-field">
          <span>Chapter</span>
          <select
            value={currentChapterSlug ?? ""}
            onChange={(event) => {
              const slug = event.target.value;
              if (slug) {
                window.location.href = `/read/${bookId}/${slug}`;
              }
            }}
          >
            <option value="" disabled>
              Select chapter
            </option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.slug}>
                {chapter.partTitle ? `${chapter.partTitle}: ` : ""}
                {chapter.title}
              </option>
            ))}
          </select>
        </label>

        <label className="reader-field">
          <span>Font size</span>
          <select
            value={preferences.fontSize}
            onChange={(event) =>
              setPreferences({ fontSize: event.target.value as FontSize })
            }
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">Extra large</option>
          </select>
        </label>

        <label className="reader-field">
          <span>Line width</span>
          <select
            value={preferences.lineWidth}
            onChange={(event) =>
              setPreferences({ lineWidth: event.target.value as LineWidth })
            }
          >
            <option value="narrow">Narrow</option>
            <option value="default">Default</option>
            <option value="wide">Wide</option>
          </select>
        </label>

        <label className="reader-field">
          <span>Appearance</span>
          <select
            value={preferences.appearance}
            onChange={(event) =>
              setPreferences({ appearance: event.target.value as Appearance })
            }
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>

        <label className="reader-check">
          <input
            type="checkbox"
            checked={preferences.focusMode}
            onChange={(event) => setPreferences({ focusMode: event.target.checked })}
          />
          <span>Focus mode</span>
        </label>

        <label className="reader-check">
          <input
            type="checkbox"
            checked={preferences.continuousBook}
            onChange={(event) => setPreferences({ continuousBook: event.target.checked })}
          />
          <span>Continuous book</span>
        </label>
      </div>
    </div>
  );
}
