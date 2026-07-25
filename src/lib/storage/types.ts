import { z } from "zod";
import { ReadingDepthSchema } from "@/lib/reader/modes";

export const BookmarkSchema = z.object({
  id: z.string().min(1),
  bookId: z.string().min(1),
  bookTitle: z.string().min(1),
  chapterId: z.string().min(1),
  chapterSlug: z.string().min(1),
  chapterTitle: z.string().min(1),
  sectionId: z.string().nullable(),
  sectionTitle: z.string().nullable(),
  headingId: z.string().nullable(),
  href: z.string().min(1),
  createdAt: z.string().min(1),
});
export type Bookmark = z.infer<typeof BookmarkSchema>;

export const NoteSchema = z.object({
  id: z.string().min(1),
  bookId: z.string().min(1),
  bookTitle: z.string().min(1),
  chapterId: z.string().min(1),
  chapterSlug: z.string().min(1),
  chapterTitle: z.string().min(1),
  sectionId: z.string().nullable(),
  sectionTitle: z.string().nullable(),
  headingId: z.string().nullable(),
  href: z.string().min(1),
  body: z.string(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type Note = z.infer<typeof NoteSchema>;

export const RecentItemSchema = z.object({
  bookId: z.string().min(1),
  bookTitle: z.string().min(1),
  chapterId: z.string().min(1),
  chapterSlug: z.string().min(1),
  chapterTitle: z.string().min(1),
  sectionId: z.string().nullable().optional(),
  href: z.string().min(1),
  openedAt: z.string().min(1),
  depth: ReadingDepthSchema.optional(),
});
export type RecentItem = z.infer<typeof RecentItemSchema>;

export type UserDataStore = {
  listBookmarks(): Promise<Bookmark[]>;
  upsertBookmark(bookmark: Bookmark): Promise<void>;
  removeBookmark(id: string): Promise<void>;
  listNotes(): Promise<Note[]>;
  upsertNote(note: Note): Promise<void>;
  removeNote(id: string): Promise<void>;
  listRecent(): Promise<RecentItem[]>;
  pushRecent(item: RecentItem): Promise<void>;
};

export const BOOKMARKS_KEY = "writing.library.bookmarks.v1";
export const NOTES_KEY = "writing.library.notes.v1";
export const RECENT_KEY = "writing.library.recent.v1";
