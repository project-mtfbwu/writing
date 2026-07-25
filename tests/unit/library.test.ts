import { describe, expect, it, beforeEach } from "vitest";
import { buildContentManifest } from "@/lib/content/parse";
import { buildSearchIndex, searchIndex, tokenizeQuery } from "@/lib/search";
import { buildReaderDeepLink, getRelatedContent } from "@/lib/library/related";
import {
  bookmarkIdForTarget,
  createLocalUserDataStore,
  exportNotesAsMarkdown,
  noteIdForTarget,
} from "@/lib/storage";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");

describe("search index", () => {
  it("covers complete source and groups results by type", async () => {
    const manifest = await buildContentManifest(repoRoot);
    const index = buildSearchIndex(manifest);

    expect(index.documentCount).toBeGreaterThan(100);
    expect(index.documents.some((doc) => doc.contentType === "heading")).toBe(true);
    expect(index.documents.some((doc) => doc.contentType === "paragraph")).toBe(true);
    expect(index.documents.some((doc) => doc.contentType === "formula")).toBe(true);
    expect(index.documents.some((doc) => doc.contentType === "evidence")).toBe(true);

    const queries = ["scene turn", "show don't tell", "Load Absorb", "E1", "dialogue", "object rule"];
    for (const query of queries) {
      const grouped = searchIndex(index, query);
      const total = Object.values(grouped).reduce((sum, list) => sum + (list?.length ?? 0), 0);
      expect(total, `expected hits for "${query}"`).toBeGreaterThan(0);
      for (const [type, results] of Object.entries(grouped)) {
        expect(type.length).toBeGreaterThan(0);
        for (const result of results ?? []) {
          expect(result.bookId).toBeTruthy();
          expect(result.chapterSlug).toBeTruthy();
          expect(result.href).toMatch(new RegExp(`^/read/${result.bookId}`));
          expect(result.matchedText.length).toBeGreaterThan(0);
        }
      }
    }
  }, 120_000);

  it("builds deterministic indexes", async () => {
    const manifest = await buildContentManifest(repoRoot);
    const first = JSON.stringify(buildSearchIndex(manifest));
    const second = JSON.stringify(buildSearchIndex(manifest));
    expect(first).toBe(second);
  }, 120_000);

  it("tokenizes evidence queries", () => {
    expect(tokenizeQuery("E1 dialogue")).toEqual(["e1", "dialogue"]);
  });
});

describe("deep links", () => {
  it("encodes book, chapter, section, and optional mode", () => {
    expect(
      buildReaderDeepLink({
        bookId: "screenwriting-syllabus",
        chapterSlug: "the-scene",
        sectionId: "sec-1",
        headingId: "heading-1",
        mode: "study",
      }),
    ).toBe(
      "/read/screenwriting-syllabus/the-scene?section=sec-1&mode=study#heading-1",
    );
  });
});

describe("related content", () => {
  it("returns empty when no explicit relationships exist", async () => {
    const manifest = await buildContentManifest(repoRoot);
    const chapter = manifest.chapters[0]!;
    const related = getRelatedContent(manifest, {
      bookId: chapter.sourceDocumentId,
      chapterId: chapter.id,
      blockIds: chapter.blockIds,
    });
    // Current sources do not use [[concept]] links, so related should be empty.
    expect(related).toEqual([]);
  }, 60_000);
});

describe("bookmarks and notes storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists bookmarks and notes across reload semantics", async () => {
    const store = createLocalUserDataStore();
    const bookmark = {
      id: bookmarkIdForTarget({
        bookId: "book-a",
        chapterId: "ch-1",
        sectionId: "sec-1",
        headingId: "h-1",
      }),
      bookId: "book-a",
      bookTitle: "Book A",
      chapterId: "ch-1",
      chapterSlug: "chapter-one",
      chapterTitle: "Chapter One",
      sectionId: "sec-1",
      sectionTitle: "Section One",
      headingId: "h-1",
      href: "/read/book-a/chapter-one?section=sec-1#h-1",
      createdAt: "2026-07-25T00:00:00.000Z",
    };

    await store.upsertBookmark(bookmark);
    expect(await store.listBookmarks()).toHaveLength(1);

    const note = {
      id: noteIdForTarget({
        bookId: "book-a",
        chapterId: "ch-1",
        sectionId: "sec-1",
        headingId: "h-1",
      }),
      bookId: "book-a",
      bookTitle: "Book A",
      chapterId: "ch-1",
      chapterSlug: "chapter-one",
      chapterTitle: "Chapter One",
      sectionId: "sec-1",
      sectionTitle: "Section One",
      headingId: "h-1",
      href: "/read/book-a/chapter-one?section=sec-1#h-1",
      body: "Remember the object rule.",
      createdAt: "2026-07-25T00:00:00.000Z",
      updatedAt: "2026-07-25T00:00:00.000Z",
    };
    await store.upsertNote(note);

    // Simulate reload with a fresh store instance reading the same localStorage.
    const reloaded = createLocalUserDataStore();
    expect(await reloaded.listBookmarks()).toEqual([bookmark]);
    expect(await reloaded.listNotes()).toEqual([note]);

    await reloaded.removeBookmark(bookmark.id);
    expect(await reloaded.listBookmarks()).toHaveLength(0);
  });

  it("exports notes as Markdown", () => {
    const markdown = exportNotesAsMarkdown([
      {
        id: "note:1",
        bookId: "book-a",
        bookTitle: "Book A",
        chapterId: "ch-1",
        chapterSlug: "chapter-one",
        chapterTitle: "Chapter One",
        sectionId: "sec-1",
        sectionTitle: "Section One",
        headingId: "h-1",
        href: "/read/book-a/chapter-one",
        body: "A private observation.",
        createdAt: "2026-07-25T00:00:00.000Z",
        updatedAt: "2026-07-25T00:00:00.000Z",
      },
    ]);

    expect(markdown).toContain("# Writing notes");
    expect(markdown).toContain("## Book A");
    expect(markdown).toContain("A private observation.");
    expect(markdown).toContain("/read/book-a/chapter-one");
  });

  it("does not store complete book payloads", async () => {
    const store = createLocalUserDataStore();
    await store.upsertBookmark({
      id: "bookmark:tiny",
      bookId: "book-a",
      bookTitle: "Book A",
      chapterId: "ch-1",
      chapterSlug: "chapter-one",
      chapterTitle: "Chapter One",
      sectionId: null,
      sectionTitle: null,
      headingId: null,
      href: "/read/book-a/chapter-one",
      createdAt: "2026-07-25T00:00:00.000Z",
    });
    const raw = window.localStorage.getItem("writing.library.bookmarks.v1") ?? "";
    expect(raw.includes("# THE SCREENWRITING SYLLABUS")).toBe(false);
    expect(raw.length).toBeLessThan(2_000);
  });
});
