import {
  BOOKMARKS_KEY,
  NOTES_KEY,
  RECENT_KEY,
  BookmarkSchema,
  NoteSchema,
  RecentItemSchema,
  type Note,
  type UserDataStore,
} from "@/lib/storage/types";

/** Shared localStorage JSON helpers (bookmarks, notes, learning progress). */
export function readStorageRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageRaw(key: string, value: string): void {
  if (typeof window === "undefined") return;
  // Never store complete books — only lightweight user records.
  window.localStorage.setItem(key, value);
}

function readList<T>(key: string, schema: { parse: (value: unknown) => T }): T[] {
  try {
    const raw = readStorageRaw(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => schema.parse(item));
  } catch {
    return [];
  }
}

function writeList<T>(key: string, items: T[]): void {
  writeStorageRaw(key, JSON.stringify(items));
}

export function createLocalUserDataStore(): UserDataStore {
  return {
    async listBookmarks() {
      return readList(BOOKMARKS_KEY, BookmarkSchema);
    },
    async upsertBookmark(bookmark) {
      const parsed = BookmarkSchema.parse(bookmark);
      const current = readList(BOOKMARKS_KEY, BookmarkSchema).filter((item) => item.id !== parsed.id);
      writeList(BOOKMARKS_KEY, [parsed, ...current]);
    },
    async removeBookmark(id) {
      writeList(
        BOOKMARKS_KEY,
        readList(BOOKMARKS_KEY, BookmarkSchema).filter((item) => item.id !== id),
      );
    },
    async listNotes() {
      return readList(NOTES_KEY, NoteSchema);
    },
    async upsertNote(note) {
      const parsed = NoteSchema.parse(note);
      const current = readList(NOTES_KEY, NoteSchema).filter((item) => item.id !== parsed.id);
      writeList(NOTES_KEY, [parsed, ...current]);
    },
    async removeNote(id) {
      writeList(
        NOTES_KEY,
        readList(NOTES_KEY, NoteSchema).filter((item) => item.id !== id),
      );
    },
    async listRecent() {
      return readList(RECENT_KEY, RecentItemSchema);
    },
    async pushRecent(item) {
      const parsed = RecentItemSchema.parse(item);
      const current = readList(RECENT_KEY, RecentItemSchema).filter(
        (entry) => !(entry.bookId === parsed.bookId && entry.chapterId === parsed.chapterId),
      );
      writeList(RECENT_KEY, [parsed, ...current].slice(0, 20));
    },
  };
}

/** Future Supabase-backed store can implement the same UserDataStore interface. */
export function createUserDataStore(): UserDataStore {
  return createLocalUserDataStore();
}

export function exportNotesAsMarkdown(notes: Note[]): string {
  const sorted = [...notes].sort((a, b) => a.bookTitle.localeCompare(b.bookTitle) || a.updatedAt.localeCompare(b.updatedAt));
  const lines = ["# Writing notes", ""];
  for (const note of sorted) {
    lines.push(`## ${note.bookTitle}`);
    lines.push("");
    lines.push(`- Chapter: ${note.chapterTitle}`);
    if (note.sectionTitle) lines.push(`- Section: ${note.sectionTitle}`);
    lines.push(`- Link: ${note.href}`);
    lines.push(`- Updated: ${note.updatedAt}`);
    lines.push("");
    lines.push(note.body.trim() || "_(empty note)_");
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

export function clearAnonymousLocalProgress(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(BOOKMARKS_KEY);
  window.localStorage.removeItem(NOTES_KEY);
  window.localStorage.removeItem(RECENT_KEY);
  window.localStorage.removeItem("writing.learning.progress.v1");
  window.localStorage.removeItem("writing.reader.preferences.v1");
  window.localStorage.removeItem("writing.reader.position.v1");
}

export function bookmarkIdForTarget(input: {
  bookId: string;
  chapterId: string;
  sectionId?: string | null;
  headingId?: string | null;
}): string {
  return ["bookmark", input.bookId, input.chapterId, input.sectionId ?? "chapter", input.headingId ?? "root"].join(":");
}

export function noteIdForTarget(input: {
  bookId: string;
  chapterId: string;
  sectionId?: string | null;
  headingId?: string | null;
}): string {
  return ["note", input.bookId, input.chapterId, input.sectionId ?? "chapter", input.headingId ?? "root"].join(":");
}
