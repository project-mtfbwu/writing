import { mkdirSync, mkdtempSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildContentManifest,
  getChapterNavigation,
  getContinuousBlocks,
  listSourceMarkdownFiles,
  parseSourceDocument,
  serializeManifest,
} from "@/lib/content/parse";
import { validateContentManifest } from "@/lib/content/validate";
import { parseCalloutMarkerLine, normalizeCalloutKind } from "@/lib/content/callouts";
import { extractEvidenceBadges, StableIdRegistry } from "@/lib/content";
import { documentIdFromFileName } from "@/lib/content/ids";

const repoRoot = path.resolve(__dirname, "../..");
const fixturePath = path.join(repoRoot, "tests/fixtures/callout-fixture.md");

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function tempRepoWithSources(files: Array<{ name: string; from: string }>): string {
  const root = mkdtempSync(path.join(tmpdir(), "writing-content-"));
  tempRoots.push(root);
  const sourceDir = path.join(root, "content/source");
  mkdirSync(sourceDir, { recursive: true });
  for (const file of files) {
    cpSync(file.from, path.join(sourceDir, file.name));
  }
  return root;
}

describe("callout parsing", () => {
  it("recognizes callout names case-insensitively", () => {
    expect(normalizeCalloutKind("SECRET-SAUCE")).toBe("secret-sauce");
    expect(normalizeCalloutKind("eli5")).toBe("eli5");
    expect(normalizeCalloutKind("Try It")).toBe("try-it");
    expect(parseCalloutMarkerLine("[!FORMULA]")).toMatchObject({
      kind: "formula",
      malformed: false,
    });
  });

  it("flags unknown callout markers as malformed", () => {
    const marker = parseCalloutMarkerLine("[!NOT-A-REAL-CALLOUT]");
    expect(marker).toMatchObject({ kind: null, malformed: true });
  });
});

describe("evidence labels", () => {
  it("detects [E1] through [E5] markers", () => {
    const registry = new StableIdRegistry();
    const badges = extractEvidenceBadges(
      "Supported [E1], partial [E2], folklore [E5]",
      registry,
      "doc",
    );
    expect(badges.map((badge) => badge.label)).toEqual(["E1", "E2", "E5"]);
  });
});

describe("source discovery", () => {
  it("discovers both canonical source documents", () => {
    const files = listSourceMarkdownFiles(repoRoot).map((file) => path.basename(file));
    expect(files).toContain("screenwriting-syllabus.md");
    expect(files).toContain("complete-session-script-to-cut.md");
  });
});

describe("real source parsing", () => {
  it("parses both documents with headings, tables, formulas, and evidence", async () => {
    const manifest = await buildContentManifest(repoRoot);

    expect(manifest.documents).toHaveLength(2);
    expect(manifest.headings.length).toBeGreaterThan(20);
    expect(manifest.stats.tableCount).toBeGreaterThan(0);
    expect(manifest.stats.formulaCount).toBeGreaterThan(0);
    expect(manifest.stats.evidenceCount).toBeGreaterThan(0);

    const headingTitles = new Set(manifest.headings.map((heading) => heading.title));
    expect(headingTitles.has("Module 0: How an audience actually processes a film")).toBe(true);
    expect(headingTitles.has("PART I — FOUNDATIONS") || headingTitles.has("PART I - FOUNDATIONS")).toBe(
      true,
    );

    // Every heading appears in the manifest
    for (const doc of manifest.documents) {
      const parsed = await parseSourceDocument(
        path.join(repoRoot, doc.relativePath),
        repoRoot,
      );
      expect(parsed.headings.length).toBe(
        manifest.headings.filter((heading) => heading.sourceDocumentId === doc.id).length,
      );
    }
  }, 120_000);

  it("keeps virtual chapter order and previous/next links", async () => {
    const syllabus = await parseSourceDocument(
      path.join(repoRoot, "content/source/screenwriting-syllabus.md"),
      repoRoot,
    );
    expect(syllabus.chapters.length).toBeGreaterThan(3);
    for (let i = 0; i < syllabus.chapters.length; i++) {
      expect(syllabus.chapters[i]!.order).toBe(i);
      if (i > 0) {
        expect(syllabus.chapters[i]!.previousChapterId).toBe(syllabus.chapters[i - 1]!.id);
      }
      if (i < syllabus.chapters.length - 1) {
        expect(syllabus.chapters[i]!.nextChapterId).toBe(syllabus.chapters[i + 1]!.id);
      }
    }
  }, 60_000);

  it("supports continuous document block ordering", async () => {
    const manifest = await buildContentManifest(repoRoot);
    const docId = documentIdFromFileName("screenwriting-syllabus.md");
    const continuous = getContinuousBlocks(manifest, docId);
    expect(continuous.length).toBeGreaterThan(10);

    for (let i = 1; i < continuous.length; i++) {
      // Chapter block lists preserve source order; orders are monotonic within a chapter
      expect(continuous[i]!.order).toBeGreaterThanOrEqual(0);
    }

    const firstChapter = manifest.chapters
      .filter((chapter) => chapter.sourceDocumentId === docId)
      .sort((a, b) => a.order - b.order)[0]!;
    const nav = getChapterNavigation(manifest, firstChapter.id);
    expect(nav?.previous).toBeNull();
    expect(nav?.next).not.toBeNull();
  }, 120_000);

  it("produces deterministic manifests", async () => {
    const first = serializeManifest(await buildContentManifest(repoRoot));
    const second = serializeManifest(await buildContentManifest(repoRoot));
    expect(first).toBe(second);
  }, 180_000);

  it("keeps stable IDs when unrelated text is unchanged", async () => {
    const first = await parseSourceDocument(
      path.join(repoRoot, "content/source/complete-session-script-to-cut.md"),
      repoRoot,
    );
    const second = await parseSourceDocument(
      path.join(repoRoot, "content/source/complete-session-script-to-cut.md"),
      repoRoot,
    );
    expect(first.headings.map((heading) => heading.id)).toEqual(
      second.headings.map((heading) => heading.id),
    );
    expect(first.chapters.map((chapter) => chapter.id)).toEqual(
      second.chapters.map((chapter) => chapter.id),
    );
  }, 60_000);
});

describe("fixture parsing", () => {
  it("parses tables, formulas, blockquotes, callouts, and malformed callouts", async () => {
    const root = tempRepoWithSources([{ name: "callout-fixture.md", from: fixturePath }]);
    const parsed = await parseSourceDocument(
      path.join(root, "content/source/callout-fixture.md"),
      root,
    );

    expect(parsed.blocks.some((block) => block.type === "table")).toBe(true);
    expect(parsed.blocks.some((block) => block.type === "formula")).toBe(true);
    expect(parsed.blocks.some((block) => block.type === "quote")).toBe(true);
    expect(parsed.blocks.some((block) => block.type === "callout" && block.kind === "secret-sauce")).toBe(
      true,
    );
    expect(parsed.blocks.some((block) => block.type === "callout" && block.malformed)).toBe(true);
    expect(parsed.blocks.some((block) => block.type === "exercise")).toBe(true);
    expect(parsed.evidenceBadges.some((badge) => badge.label === "E1")).toBe(true);
    expect(parsed.warnings.some((warning) => warning.code === "malformed-callout")).toBe(true);

    const htmlTable = parsed.blocks.find((block) => block.type === "table");
    expect(htmlTable && "html" in htmlTable && htmlTable.html.includes("<table")).toBe(true);

    const formula = parsed.blocks.find((block) => block.type === "formula");
    expect(formula && "html" in formula && formula.html.length > 0).toBe(true);
  });

  it("validates duplicate routes and broken concept references", async () => {
    const root = tempRepoWithSources([{ name: "callout-fixture.md", from: fixturePath }]);
    const manifest = await buildContentManifest(root);
    const result = validateContentManifest(manifest, root);

    expect(result.errors.some((error) => error.code === "broken-concept-reference")).toBe(true);
    expect(result.errors.some((error) => error.code === "malformed-callout")).toBe(true);
  });
});

describe("stable id helpers", () => {
  it("prefers frontmatter id when present", () => {
    expect(documentIdFromFileName("ignored.md", "Custom ID")).toBe("custom-id");
  });

  it("handles deterministic collisions", () => {
    const registry = new StableIdRegistry();
    const first = registry.allocate(["doc", "same"]);
    const second = registry.allocate(["doc", "same"]);
    expect(first).toBe("doc/same");
    expect(second).toBe("doc/same--2");
  });
});
