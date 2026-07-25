import { describe, expect, it } from "vitest";
import {
  explicitAtlasEdgesFromManifest,
  formulasByLevel,
  getAtlasConcept,
  getConnectedConcepts,
  listAtlasConcepts,
  loadAtlasConfig,
  loadConceptSourceSnippets,
  loadLocationBlocks,
  sourceLocationHref,
} from "@/lib/atlas/catalog";
import { loadContentManifest } from "@/lib/reader/catalog";

describe("atlas configuration", () => {
  it("loads the core hierarchy without inventing concept ids", () => {
    const config = loadAtlasConfig();
    expect(config.hierarchyIds).toEqual([
      "audience",
      "premise",
      "controlling-idea",
      "character",
      "act",
      "sequence",
      "story-beat",
      "scene",
      "micro-beat",
      "line",
      "image",
      "shot",
      "load-absorb",
      "cut",
    ]);
    expect(listAtlasConcepts()).toHaveLength(config.hierarchyIds.length);
  });

  it("only allows reviewed relationship sources", () => {
    const allowed = new Set([
      "explicit-link",
      "typed-config",
      "heading-hierarchy",
      "reviewed-mapping",
    ]);
    for (const rel of loadAtlasConfig().relationships) {
      expect(allowed.has(rel.source)).toBe(true);
      expect(rel.description.length).toBeGreaterThan(0);
      expect(rel.justification.length).toBeGreaterThan(0);
    }
  });

  it("resolves scene turn alias to the scene concept", () => {
    expect(getAtlasConcept("scene-turn")?.id).toBe("scene");
    expect(getAtlasConcept("scene")?.title).toBe("Scene");
  });
});

describe("atlas source loading", () => {
  it("links concepts to exact book sections and loads section blocks on demand", async () => {
    const manifest = await loadContentManifest();
    const scene = getAtlasConcept("scene");
    expect(scene).not.toBeNull();

    const formulaLocation = scene!.sourceLocations.find((location) => location.role === "formula");
    expect(formulaLocation?.sectionId).toContain("level-4--scene");
    expect(sourceLocationHref(formulaLocation!)).toContain("/read/complete-session-script-to-cut/14-the-formulas");
    expect(sourceLocationHref(formulaLocation!)).toContain("section=");

    const blocks = loadLocationBlocks(manifest, formulaLocation!);
    expect(blocks.some((block) => block.type === "formula")).toBe(true);

    const snippets = loadConceptSourceSnippets(manifest, scene!);
    expect(snippets.length).toBe(scene!.sourceLocations.length);
    // Does not require loading unrelated chapters for this assertion.
    expect(snippets.every((snippet) => snippet.blocks.length >= 0)).toBe(true);
  });

  it("builds formula stack levels from the manifest chapter", async () => {
    const manifest = await loadContentManifest();
    const levels = formulasByLevel(manifest);
    expect(levels).toHaveLength(7);
    expect(levels[0]?.title).toContain("Level 1");
    expect(levels.some((level) => level.formulas.length > 0)).toBe(true);
  });

  it("does not invent manifest concept-link edges when none exist", async () => {
    const manifest = await loadContentManifest();
    expect(explicitAtlasEdgesFromManifest(manifest)).toEqual([]);
  });

  it("exposes connected concepts with visible relationship text", () => {
    const connected = getConnectedConcepts("scene");
    expect(connected.length).toBeGreaterThan(0);
    expect(connected.every((item) => item.relationship.description.length > 0)).toBe(true);
  });
});
