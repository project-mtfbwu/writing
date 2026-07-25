"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  createUserDataStore,
  exportNotesAsMarkdown,
  type Bookmark,
  type Note,
  type RecentItem,
} from "@/lib/storage";
import { loadReadingPosition } from "@/lib/reader/persistence";

type LibraryUserPanelProps = {
  books: Array<{
    id: string;
    title: string;
    chapterCount: number;
    chapterSlugs: string[];
  }>;
};

export function LibraryUserPanel({ books }: LibraryUserPanelProps) {
  const store = useMemo(() => createUserDataStore(), []);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const frame = window.requestAnimationFrame(async () => {
      const [nextBookmarks, nextNotes, nextRecent] = await Promise.all([
        store.listBookmarks(),
        store.listNotes(),
        store.listRecent(),
      ]);
      if (!active) return;
      setBookmarks(nextBookmarks);
      setNotes(nextNotes);
      setRecent(nextRecent);

      const nextProgress: Record<string, number> = {};
      for (const book of books) {
        const position = loadReadingPosition(book.id);
        if (!position) continue;
        const chapterIndex = Math.max(0, book.chapterSlugs.indexOf(position.chapterSlug));
        const base = book.chapterCount === 0 ? 0 : chapterIndex / book.chapterCount;
        const within = position.scrollProgress / Math.max(book.chapterCount, 1);
        nextProgress[book.id] = Math.min(1, base + within);
      }
      setProgress(nextProgress);
      setReady(true);
    });
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, [store, books]);

  async function removeBookmark(id: string) {
    await store.removeBookmark(id);
    setBookmarks(await store.listBookmarks());
  }

  async function removeNote(id: string) {
    await store.removeNote(id);
    setNotes(await store.listNotes());
  }

  function downloadNotes() {
    const markdown = exportNotesAsMarkdown(notes);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "writing-notes.md";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!ready) {
    return <p className="library-meta">Loading local library state…</p>;
  }

  return (
    <div className="library-user-panels">
      <section>
        <h2>Reading progress</h2>
        <ul className="library-plain-list">
          {books.map((book) => (
            <li key={book.id} className="library-row">
              <span>{book.title}</span>
              <span className="library-meta">
                {progress[book.id] != null
                  ? `${Math.round((progress[book.id] ?? 0) * 100)}%`
                  : "Not started"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Recently opened</h2>
        <ul className="library-plain-list">
          {recent.map((item) => (
            <li key={`${item.bookId}:${item.chapterId}:${item.openedAt}`}>
              <Link href={item.href}>
                {item.bookTitle} · {item.chapterTitle}
              </Link>
            </li>
          ))}
          {recent.length === 0 ? <li className="library-meta">Nothing recent yet.</li> : null}
        </ul>
      </section>

      <section>
        <h2>Bookmarks</h2>
        <ul className="library-plain-list">
          {bookmarks.map((bookmark) => (
            <li key={bookmark.id} className="library-row">
              <Link href={bookmark.href}>
                {bookmark.bookTitle} · {bookmark.sectionTitle ?? bookmark.chapterTitle}
              </Link>
              <button type="button" onClick={() => removeBookmark(bookmark.id)}>
                Remove
              </button>
            </li>
          ))}
          {bookmarks.length === 0 ? <li className="library-meta">No bookmarks yet.</li> : null}
        </ul>
      </section>

      <section>
        <div className="library-row">
          <h2>Notes</h2>
          {notes.length > 0 ? (
            <button type="button" onClick={downloadNotes}>
              Export Markdown
            </button>
          ) : null}
        </div>
        <ul className="library-plain-list">
          {notes.map((note) => (
            <li key={note.id} className="library-note">
              <Link href={note.href}>
                {note.bookTitle} · {note.sectionTitle ?? note.chapterTitle}
              </Link>
              <p>{note.body || "(empty)"}</p>
              <button type="button" onClick={() => removeNote(note.id)}>
                Delete
              </button>
            </li>
          ))}
          {notes.length === 0 ? <li className="library-meta">No notes yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}
