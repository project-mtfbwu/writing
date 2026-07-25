import { z } from "zod";

export const EvidenceLabelSchema = z.enum(["E1", "E2", "E3", "E4", "E5"]);
export type EvidenceLabel = z.infer<typeof EvidenceLabelSchema>;

export const CalloutKindSchema = z.enum([
  "secret-sauce",
  "eli5",
  "real-world",
  "evidence",
  "formula",
  "bad",
  "better",
  "try-it",
  "common-mistake",
  "definition",
  "source",
]);
export type CalloutKind = z.infer<typeof CalloutKindSchema>;

export const EvidenceBadgeSchema = z.object({
  id: z.string().min(1),
  label: EvidenceLabelSchema,
  raw: z.string().min(1),
  blockId: z.string().min(1).optional(),
  offset: z.number().int().nonnegative().optional(),
});
export type EvidenceBadge = z.infer<typeof EvidenceBadgeSchema>;

export const ConceptLinkSchema = z.object({
  id: z.string().min(1),
  target: z.string().min(1),
  label: z.string().min(1),
  resolved: z.boolean(),
  sourceBlockId: z.string().min(1).optional(),
});
export type ConceptLink = z.infer<typeof ConceptLinkSchema>;

export const HeadingSchema = z.object({
  id: z.string().min(1),
  depth: z.number().int().min(1).max(6),
  title: z.string().min(1),
  slug: z.string().min(1),
  path: z.array(z.string().min(1)).min(1),
  sourceDocumentId: z.string().min(1),
  sourceHeading: z.string().min(1),
  order: z.number().int().nonnegative(),
});
export type Heading = z.infer<typeof HeadingSchema>;

const BlockBaseSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  sourceDocumentId: z.string().min(1),
  chapterId: z.string().min(1).optional(),
  sectionId: z.string().min(1).optional(),
  evidenceBadges: z.array(EvidenceBadgeSchema).default([]),
});

export const ParagraphBlockSchema = BlockBaseSchema.extend({
  type: z.literal("paragraph"),
  text: z.string(),
  html: z.string(),
});
export type ParagraphBlock = z.infer<typeof ParagraphBlockSchema>;

export const ListBlockSchema = BlockBaseSchema.extend({
  type: z.literal("list"),
  ordered: z.boolean(),
  items: z.array(z.string()),
  html: z.string(),
});
export type ListBlock = z.infer<typeof ListBlockSchema>;

export const TableBlockSchema = BlockBaseSchema.extend({
  type: z.literal("table"),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  html: z.string(),
});
export type TableBlock = z.infer<typeof TableBlockSchema>;

export const CodeBlockSchema = BlockBaseSchema.extend({
  type: z.literal("code"),
  lang: z.string().nullable(),
  value: z.string(),
  html: z.string(),
});
export type CodeBlock = z.infer<typeof CodeBlockSchema>;

export const QuoteBlockSchema = BlockBaseSchema.extend({
  type: z.literal("quote"),
  text: z.string(),
  html: z.string(),
});
export type QuoteBlock = z.infer<typeof QuoteBlockSchema>;

export const CalloutBlockSchema = BlockBaseSchema.extend({
  type: z.literal("callout"),
  kind: CalloutKindSchema,
  title: z.string().optional(),
  text: z.string(),
  html: z.string(),
  malformed: z.boolean().default(false),
  rawMarker: z.string().optional(),
});
export type CalloutBlock = z.infer<typeof CalloutBlockSchema>;

export const FormulaBlockSchema = BlockBaseSchema.extend({
  type: z.literal("formula"),
  text: z.string(),
  html: z.string(),
  source: z.enum(["code", "callout", "paragraph"]),
});
export type FormulaBlock = z.infer<typeof FormulaBlockSchema>;

export const ExerciseBlockSchema = BlockBaseSchema.extend({
  type: z.literal("exercise"),
  text: z.string(),
  html: z.string(),
  prompt: z.string(),
});
export type ExerciseBlock = z.infer<typeof ExerciseBlockSchema>;

export const ThematicBreakBlockSchema = BlockBaseSchema.extend({
  type: z.literal("thematic-break"),
});
export type ThematicBreakBlock = z.infer<typeof ThematicBreakBlockSchema>;

export const HeadingBlockSchema = BlockBaseSchema.extend({
  type: z.literal("heading"),
  depth: z.number().int().min(1).max(6),
  title: z.string().min(1),
  headingId: z.string().min(1),
});
export type HeadingBlock = z.infer<typeof HeadingBlockSchema>;

export const ContentBlockSchema = z.discriminatedUnion("type", [
  ParagraphBlockSchema,
  ListBlockSchema,
  TableBlockSchema,
  CodeBlockSchema,
  QuoteBlockSchema,
  CalloutBlockSchema,
  FormulaBlockSchema,
  ExerciseBlockSchema,
  ThematicBreakBlockSchema,
  HeadingBlockSchema,
]);
export type ContentBlock = z.infer<typeof ContentBlockSchema>;

export const SectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  headingId: z.string().min(1),
  depth: z.number().int().min(1).max(6),
  order: z.number().int().nonnegative(),
  sourceDocumentId: z.string().min(1),
  sourceHeading: z.string().min(1),
  blockIds: z.array(z.string()),
});
export type Section = z.infer<typeof SectionSchema>;

export const ChapterSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  order: z.number().int().nonnegative(),
  sourceDocumentId: z.string().min(1),
  sourceHeading: z.string().min(1),
  sourceFile: z.string().min(1),
  partTitle: z.string().nullable(),
  headingId: z.string().min(1),
  route: z.string().min(1),
  previousChapterId: z.string().nullable(),
  nextChapterId: z.string().nullable(),
  sectionIds: z.array(z.string()),
  blockIds: z.array(z.string()),
});
export type Chapter = z.infer<typeof ChapterSchema>;

export const BookSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceDocumentIds: z.array(z.string().min(1)).min(1),
  chapterIds: z.array(z.string()),
  route: z.string().min(1),
});
export type Book = z.infer<typeof BookSchema>;

export const ParseWarningSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  sourceDocumentId: z.string().min(1).optional(),
  path: z.string().optional(),
});
export type ParseWarning = z.infer<typeof ParseWarningSchema>;

export const SourceDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  fileName: z.string().min(1),
  relativePath: z.string().min(1),
  frontmatterId: z.string().nullable(),
  checksum: z.string().min(1),
  headingCount: z.number().int().nonnegative(),
  chapterCount: z.number().int().nonnegative(),
  evidenceCount: z.number().int().nonnegative(),
  tableCount: z.number().int().nonnegative(),
  codeBlockCount: z.number().int().nonnegative(),
  calloutCount: z.number().int().nonnegative(),
  formulaCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
});
export type SourceDocument = z.infer<typeof SourceDocumentSchema>;

export const ContentManifestSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string().min(1),
  sourceRoot: z.string().min(1),
  documents: z.array(SourceDocumentSchema),
  books: z.array(BookSchema),
  chapters: z.array(ChapterSchema),
  sections: z.array(SectionSchema),
  headings: z.array(HeadingSchema),
  blocks: z.array(ContentBlockSchema),
  evidenceBadges: z.array(EvidenceBadgeSchema),
  conceptLinks: z.array(ConceptLinkSchema),
  warnings: z.array(ParseWarningSchema),
  stats: z.object({
    documentCount: z.number().int().nonnegative(),
    chapterCount: z.number().int().nonnegative(),
    headingCount: z.number().int().nonnegative(),
    evidenceCount: z.number().int().nonnegative(),
    tableCount: z.number().int().nonnegative(),
    codeBlockCount: z.number().int().nonnegative(),
    calloutCount: z.number().int().nonnegative(),
    formulaCount: z.number().int().nonnegative(),
    warningCount: z.number().int().nonnegative(),
  }),
});
export type ContentManifest = z.infer<typeof ContentManifestSchema>;
