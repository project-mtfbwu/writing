import { z } from "zod";
import type { EvidenceLabel } from "@/types/content";

export const SearchContentTypeSchema = z.enum([
  "title",
  "heading",
  "paragraph",
  "formula",
  "secret-sauce",
  "eli5",
  "real-world",
  "evidence",
  "exercise",
  "reference",
  "table",
  "quote",
  "definition",
  "other",
]);
export type SearchContentType = z.infer<typeof SearchContentTypeSchema>;

export const SearchDocumentSchema = z.object({
  id: z.string().min(1),
  bookId: z.string().min(1),
  bookTitle: z.string().min(1),
  chapterId: z.string().min(1),
  chapterSlug: z.string().min(1),
  chapterTitle: z.string().min(1),
  sectionId: z.string().nullable(),
  sectionTitle: z.string().nullable(),
  headingId: z.string().nullable(),
  blockId: z.string().nullable(),
  contentType: SearchContentTypeSchema,
  title: z.string().min(1),
  text: z.string(),
  normalizedText: z.string(),
  evidenceLabels: z.array(z.enum(["E1", "E2", "E3", "E4", "E5"])).default([]),
  href: z.string().min(1),
});
export type SearchDocument = z.infer<typeof SearchDocumentSchema>;

export const SearchIndexSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string().min(1),
  documentCount: z.number().int().nonnegative(),
  documents: z.array(SearchDocumentSchema),
});
export type SearchIndex = z.infer<typeof SearchIndexSchema>;

export const SearchResultSchema = SearchDocumentSchema.extend({
  score: z.number(),
  matchedText: z.string(),
  evidenceLabel: z.enum(["E1", "E2", "E3", "E4", "E5"]).nullable(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export type GroupedSearchResults = Partial<Record<SearchContentType, SearchResult[]>>;

export type EvidenceLabelOnResult = EvidenceLabel;
