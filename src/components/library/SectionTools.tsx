"use client";

import { useEffect, useMemo, useState } from "react";
import {
  bookmarkIdForTarget,
  createUserDataStore,
  noteIdForTarget,
  type Bookmark,
  type Note,
} from "@/lib/storage";
import { buildReaderDeepLink } from "@/lib/library/related";

type SectionTarget = {
  bookId: string;
  bookTitle: string;
  chapterId: string;
  chapterSlug: string;
  chapterTitle: string;
  sectionId: string | null;
  sectionTitle: string | null;
  headingId: string | null;
};

type SectionToolsProps = {
  target: SectionTarget;
};

export function SectionTools({ target }: SectionToolsProps) {
  const store = useMemo(() => createUserDataStore(), []);
  const bookmarkId = bookmarkIdForTarget(target);
  const noteId = noteIdForTarget(target);
  const href = buildReaderDeepLink(target);

  const [bookmarked, setBookmarked] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [savedBody, setSavedBody] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const frame = window.requestAnimationFrame(async () => {
      const [bookmarks, notes] = await Promise.all([store.listBookmarks(), store.listNotes()]);
      if (!active) return;
      setBookmarked(bookmarks.some((item) => item.id === bookmarkId));
      const existing = notes.find((item) => item.id === noteId);
      setNoteBody(existing?.body ?? "");
      setSavedBody(existing?.body ?? "");
      setReady(true);
    });
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, [store, bookmarkId, noteId]);

  async function toggleBookmark() {
    if (bookmarked) {
      await store.removeBookmark(bookmarkId);
      setBookmarked(false);
      return;
    }
    const bookmark: Bookmark = {
      id: bookmarkId,
      bookId: target.bookId,
      bookTitle: target.bookTitle,
      chapterId: target.chapterId,
      chapterSlug: target.chapterSlug,
      chapterTitle: target.chapterTitle,
      sectionId: target.sectionId,
      sectionTitle: target.sectionTitle,
      headingId: target.headingId,
      href,
      createdAt: new Date().toISOString(),
    };
    await store.upsertBookmark(bookmark);
    setBookmarked(true);
  }

  async function saveNote() {
    const now = new Date().toISOString();
    const existing = (await store.listNotes()).find((item) => item.id === noteId);
    const note: Note = {
      id: noteId,
      bookId: target.bookId,
      bookTitle: target.bookTitle,
      chapterId: target.chapterId,
      chapterSlug: target.chapterSlug,
      chapterTitle: target.chapterTitle,
      sectionId: target.sectionId,
      sectionTitle: target.sectionTitle,
      headingId: target.headingId,
      href,
      body: noteBody,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (!noteBody.trim()) {
      await store.removeNote(noteId);
      setSavedBody("");
      return;
    }
    await store.upsertNote(note);
    setSavedBody(noteBody);
  }

  if (!ready) return null;

  return (
    <div className="section-tools print:hidden">
      <button type="button" onClick={toggleBookmark}>
        {bookmarked ? "Remove bookmark" : "Bookmark section"}
      </button>
      <label className="section-tools__note">
        <span>Private note</span>
        <textarea
          value={noteBody}
          onChange={(event) => setNoteBody(event.target.value)}
          rows={3}
          placeholder="Write a private note for this section…"
        />
      </label>
      <div className="section-tools__actions">
        <button type="button" onClick={saveNote} disabled={noteBody === savedBody}>
          {noteBody.trim() ? "Save note" : "Clear note"}
        </button>
        <a href={href}>Jump to source</a>
      </div>
    </div>
  );
}
