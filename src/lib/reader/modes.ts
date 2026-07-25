import { z } from "zod";
import type { CalloutKind, ContentBlock, EvidenceLabel } from "@/types/content";

export const ReadingDepthSchema = z.enum([
  "clean",
  "explained",
  "study",
  "everything",
  "raw",
]);
export type ReadingDepth = z.infer<typeof ReadingDepthSchema>;

export const AppearanceSchema = z.enum(["light", "dark", "system"]);
export type Appearance = z.infer<typeof AppearanceSchema>;

export const FontSizeSchema = z.enum(["sm", "md", "lg", "xl"]);
export type FontSize = z.infer<typeof FontSizeSchema>;

export const LineWidthSchema = z.enum(["narrow", "default", "wide"]);
export type LineWidth = z.infer<typeof LineWidthSchema>;

export const ReaderPreferencesSchema = z.object({
  depth: ReadingDepthSchema.default("explained"),
  focusMode: z.boolean().default(false),
  fontSize: FontSizeSchema.default("md"),
  lineWidth: LineWidthSchema.default("default"),
  appearance: AppearanceSchema.default("system"),
  continuousBook: z.boolean().default(false),
});
export type ReaderPreferences = z.infer<typeof ReaderPreferencesSchema>;

export const ReadingPositionSchema = z.object({
  bookId: z.string().min(1),
  chapterId: z.string().min(1),
  chapterSlug: z.string().min(1),
  sectionId: z.string().nullable().default(null),
  scrollProgress: z.number().min(0).max(1).default(0),
  depth: ReadingDepthSchema.default("explained"),
  updatedAt: z.string().min(1),
});
export type ReadingPosition = z.infer<typeof ReadingPositionSchema>;

/** Source evidence definitions from the syllabus Evidence Status Key. */
export const EVIDENCE_DEFINITIONS: Record<
  EvidenceLabel,
  { label: EvidenceLabel; meaning: string }
> = {
  E1: {
    label: "E1",
    meaning: "Empirically supported — replicated experimental or corpus evidence",
  },
  E2: {
    label: "E2",
    meaning: "Partially supported — real mechanism, contested detail or thin replication",
  },
  E3: {
    label: "E3",
    meaning: "Descriptive scholarship — rigorous textual/historical analysis, not experimental",
  },
  E4: {
    label: "E4",
    meaning: "Craft heuristic — no empirical basis. Often works. Not evidence",
  },
  E5: {
    label: "E5",
    meaning: "Folklore — widely repeated, actively disputed or disproven",
  },
};

const CLEAN_BLOCK_TYPES = new Set([
  "paragraph",
  "list",
  "table",
  "code",
  "quote",
  "formula",
  "heading",
  "thematic-break",
]);

const EXPLAINED_CALLOUTS = new Set<CalloutKind>([
  "secret-sauce",
  "eli5",
  "real-world",
  "definition",
  "bad",
  "better",
]);

const STUDY_CALLOUTS = new Set<CalloutKind>([
  ...EXPLAINED_CALLOUTS,
  "evidence",
  "try-it",
  "common-mistake",
  "source",
  "formula",
]);

export function defaultReaderPreferences(): ReaderPreferences {
  return ReaderPreferencesSchema.parse({});
}

export function showsEvidenceBadges(depth: ReadingDepth): boolean {
  return depth === "study" || depth === "everything";
}

export function showsConnectedConcepts(depth: ReadingDepth): boolean {
  return depth === "study" || depth === "everything";
}

export function filterBlocksForDepth(
  blocks: ContentBlock[],
  depth: ReadingDepth,
): ContentBlock[] {
  if (depth === "raw" || depth === "everything") {
    return blocks;
  }

  return blocks.filter((block) => {
    if (CLEAN_BLOCK_TYPES.has(block.type)) {
      return true;
    }

    if (block.type === "exercise") {
      return depth === "study";
    }

    if (block.type === "callout") {
      if (depth === "clean") {
        return false;
      }
      if (depth === "explained") {
        return EXPLAINED_CALLOUTS.has(block.kind);
      }
      if (depth === "study") {
        return STUDY_CALLOUTS.has(block.kind);
      }
    }

    if (block.type === "formula") {
      return true;
    }

    return depth !== "clean";
  });
}

export const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: "1rem",
  md: "1.125rem",
  lg: "1.25rem",
  xl: "1.375rem",
};

export const LINE_WIDTH_MAP: Record<LineWidth, string> = {
  narrow: "62ch",
  default: "70ch",
  wide: "78ch",
};

export const PREFERENCES_STORAGE_KEY = "writing.reader.preferences.v1";
export const POSITION_STORAGE_KEY = "writing.reader.position.v1";
