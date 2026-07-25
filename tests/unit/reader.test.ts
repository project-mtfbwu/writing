import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  EVIDENCE_DEFINITIONS,
  filterBlocksForDepth,
  type ReadingDepth,
} from "@/lib/reader/modes";
import {
  deserializeReadingPosition,
  escapeRawMarkdown,
  serializeReadingPosition,
} from "@/lib/reader/persistence";
import {
  getBookChapters,
  getChapterBySlug,
  getContinuousBlocks,
  loadContentManifest,
} from "@/lib/reader/catalog";
import type { ContentBlock } from "@/types/content";

const repoRoot = path.resolve(__dirname, "../..");

function sampleBlocks(): ContentBlock[] {
  const base = {
    order: 0,
    sourceDocumentId: "doc",
    evidenceBadges: [],
  };
  return [
    { ...base, id: "h", type: "heading", depth: 2, title: "Title", headingId: "h1" },
    { ...base, id: "p", type: "paragraph", text: "Hello [E1]", html: "<p>Hello [E1]</p>" },
    { ...base, id: "t", type: "table", headers: ["A"], rows: [["1"]], html: "<table></table>" },
    {
      ...base,
      id: "f",
      type: "formula",
      text: "A = B",
      html: "<pre>A = B</pre>",
      source: "code",
    },
    {
      ...base,
      id: "ss",
      type: "callout",
      kind: "secret-sauce",
      text: "Insight",
      html: "<p>Insight</p>",
      malformed: false,
    },
    {
      ...base,
      id: "ex",
      type: "exercise",
      text: "Try this",
      html: "<p>Try this</p>",
      prompt: "Try this",
    },
    {
      ...base,
      id: "cm",
      type: "callout",
      kind: "common-mistake",
      text: "Mistake",
      html: "<p>Mistake</p>",
      malformed: false,
    },
    {
      ...base,
      id: "eli5",
      type: "callout",
      kind: "eli5",
      text: "Simple",
      html: "<p>Simple</p>",
      malformed: false,
    },
  ];
}

describe("mode filtering", () => {
  it("filters blocks by reading depth", () => {
    const blocks = sampleBlocks();
    const clean = filterBlocksForDepth(blocks, "clean");
    expect(clean.map((block) => block.id)).toEqual(["h", "p", "t", "f"]);

    const explained = filterBlocksForDepth(blocks, "explained");
    expect(explained.map((block) => block.id)).toContain("ss");
    expect(explained.map((block) => block.id)).toContain("eli5");
    expect(explained.map((block) => block.id)).not.toContain("ex");
    expect(explained.map((block) => block.id)).not.toContain("cm");

    const study = filterBlocksForDepth(blocks, "study");
    expect(study.map((block) => block.id)).toContain("ex");
    expect(study.map((block) => block.id)).toContain("cm");

    const everything = filterBlocksForDepth(blocks, "everything");
    expect(everything).toHaveLength(blocks.length);

    const raw = filterBlocksForDepth(blocks, "raw" as ReadingDepth);
    expect(raw).toHaveLength(blocks.length);
  });
});

describe("evidence badge definitions", () => {
  it("uses syllabus definitions", () => {
    expect(EVIDENCE_DEFINITIONS.E1.meaning).toContain("Empirically supported");
    expect(EVIDENCE_DEFINITIONS.E2.meaning).toContain("Partially supported");
    expect(EVIDENCE_DEFINITIONS.E3.meaning).toContain("Descriptive scholarship");
    expect(EVIDENCE_DEFINITIONS.E4.meaning).toContain("Craft heuristic");
    expect(EVIDENCE_DEFINITIONS.E5.meaning).toContain("Folklore");
  });
});

describe("reading position serialization", () => {
  it("round-trips position payloads", () => {
    const raw = serializeReadingPosition({
      bookId: "screenwriting-syllabus",
      chapterId: "chapter-1",
      chapterSlug: "how-to-read-this",
      sectionId: "section-a",
      scrollProgress: 0.42,
      depth: "study",
      updatedAt: "2026-07-25T00:00:00.000Z",
    });
    const parsed = deserializeReadingPosition(raw);
    expect(parsed).toMatchObject({
      bookId: "screenwriting-syllabus",
      chapterSlug: "how-to-read-this",
      scrollProgress: 0.42,
      depth: "study",
    });
  });

  it("rejects invalid payloads", () => {
    expect(deserializeReadingPosition("{bad")).toBeNull();
    expect(deserializeReadingPosition(JSON.stringify({ bookId: "" }))).toBeNull();
  });
});

describe("raw Markdown safety", () => {
  it("escapes HTML in raw source display", () => {
    expect(escapeRawMarkdown(`<script>alert("x")</script> & '"<>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;&quot;&lt;&gt;",
    );
  });
});

describe("print-only classes", () => {
  it("defines print stylesheet rules for reader chrome", () => {
    const css = readFileSync(path.join(repoRoot, "src/app/globals.css"), "utf8");
    expect(css).toContain("@media print");
    expect(css).toContain(".reader-controls");
    expect(css).toContain(".reader-rail");
    expect(css).toContain("page-break-inside: avoid");
    expect(css).toContain(".print-only");
  });
});

describe("catalog navigation", () => {
  it("keeps continuous reading order and chapter navigation", async () => {
    const manifest = await loadContentManifest();
    expect(manifest.books.length).toBeGreaterThanOrEqual(2);

    for (const book of manifest.books) {
      const chapters = getBookChapters(manifest, book.id);
      expect(chapters.length).toBeGreaterThan(0);

      for (let i = 0; i < chapters.length; i++) {
        expect(chapters[i]!.order).toBe(i);
        if (i > 0) {
          expect(chapters[i]!.previousChapterId).toBe(chapters[i - 1]!.id);
        }
        if (i < chapters.length - 1) {
          expect(chapters[i]!.nextChapterId).toBe(chapters[i + 1]!.id);
        }
      }

      const continuous = getContinuousBlocks(manifest, book.id);
      expect(continuous.length).toBeGreaterThan(0);

      // Continuous block order follows chapter order
      const firstChapterBlocks = new Set(chapters[0]!.blockIds);
      const firstContinuous = continuous.find((block) => firstChapterBlocks.has(block.id));
      expect(firstContinuous).toBeTruthy();
    }
  });

  it("handles missing chapters", async () => {
    const manifest = await loadContentManifest();
    const book = manifest.books[0]!;
    expect(getChapterBySlug(manifest, book.id, "does-not-exist-chapter")).toBeNull();
    expect(getChapterBySlug(manifest, "missing-book", "anything")).toBeNull();
  });
});
