import { z } from "zod";
import { EvidenceLabelSchema } from "@/types/content";

export const AtlasZoomLevelSchema = z.enum([
  "whole-system",
  "track",
  "module",
  "concept",
  "project-application",
]);
export type AtlasZoomLevel = z.infer<typeof AtlasZoomLevelSchema>;

export const AtlasViewSchema = z.enum([
  "system",
  "matrix",
  "formulas",
  "evidence",
  "everything",
]);
export type AtlasView = z.infer<typeof AtlasViewSchema>;

export const AtlasTrackRowSchema = z.enum([
  "audience-evidence",
  "story",
  "architecture",
  "character",
  "scene",
  "dialogue",
  "image",
  "script-to-cut",
]);
export type AtlasTrackRow = z.infer<typeof AtlasTrackRowSchema>;

export const AtlasMatrixColumnSchema = z.enum([
  "idea",
  "structure",
  "draft",
  "scene-loop",
  "polish",
  "production",
  "edit",
]);
export type AtlasMatrixColumn = z.infer<typeof AtlasMatrixColumnSchema>;

export const RelationshipSourceSchema = z.enum([
  "explicit-link",
  "typed-config",
  "heading-hierarchy",
  "reviewed-mapping",
]);
export type RelationshipSource = z.infer<typeof RelationshipSourceSchema>;

export const RelationshipKindSchema = z.enum([
  "next-level",
  "part-of",
  "related",
  "supports",
  "applies-in",
]);
export type RelationshipKind = z.infer<typeof RelationshipKindSchema>;

export const SourceLocationSchema = z.object({
  bookId: z.string().min(1),
  chapterSlug: z.string().min(1),
  sectionId: z.string().nullable().optional(),
  headingId: z.string().nullable().optional(),
  label: z.string().min(1),
  role: z
    .enum([
      "definition",
      "explanation",
      "formula",
      "eli5",
      "secret-sauce",
      "example",
      "bad-better",
      "evidence",
      "exercise-source",
      "overview",
    ])
    .default("overview"),
});
export type SourceLocation = z.infer<typeof SourceLocationSchema>;

export const AtlasConceptSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /** Short locator label for lists — not invented prose. */
  summary: z.string().min(1),
  trackRows: z.array(AtlasTrackRowSchema).default([]),
  matrixColumns: z.array(AtlasMatrixColumnSchema).default([]),
  formulaLevel: z.number().int().min(1).max(7).nullable().default(null),
  hierarchyOrder: z.number().int().nonnegative(),
  evidenceLabels: z.array(EvidenceLabelSchema).default([]),
  sourceLocations: z.array(SourceLocationSchema).min(1),
  lessonIds: z.array(z.string()).default([]),
  exerciseIds: z.array(z.string()).default([]),
  /** Topic keys matched against Secret Sauce / ELI5 chapter paragraphs. */
  secretSauceTopics: z.array(z.string()).default([]),
  eli5Topics: z.array(z.string()).default([]),
  projectCheckPlaceholder: z.string().min(1),
  aliases: z.array(z.string()).default([]),
});
export type AtlasConcept = z.infer<typeof AtlasConceptSchema>;

export const AtlasRelationshipSchema = z.object({
  id: z.string().min(1),
  fromId: z.string().min(1),
  toId: z.string().min(1),
  kind: RelationshipKindSchema,
  source: RelationshipSourceSchema,
  /** Human-readable edge description for a11y / non-graph fallback. */
  description: z.string().min(1),
  /** Why this edge is allowed (required for non-hierarchy sources). */
  justification: z.string().min(1),
});
export type AtlasRelationship = z.infer<typeof AtlasRelationshipSchema>;

export const AtlasMatrixCellSchema = z.object({
  track: AtlasTrackRowSchema,
  column: AtlasMatrixColumnSchema,
  conceptIds: z.array(z.string()),
});
export type AtlasMatrixCell = z.infer<typeof AtlasMatrixCellSchema>;

export const AtlasModuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  trackRow: AtlasTrackRowSchema,
  conceptIds: z.array(z.string()).min(1),
  sourceLocations: z.array(SourceLocationSchema).min(1),
});
export type AtlasModule = z.infer<typeof AtlasModuleSchema>;

export const AtlasConfigSchema = z.object({
  concepts: z.array(AtlasConceptSchema).min(1),
  relationships: z.array(AtlasRelationshipSchema),
  modules: z.array(AtlasModuleSchema),
  matrixCells: z.array(AtlasMatrixCellSchema),
  trackRowLabels: z.record(AtlasTrackRowSchema, z.string()),
  matrixColumnLabels: z.record(AtlasMatrixColumnSchema, z.string()),
  hierarchyIds: z.array(z.string()).min(1),
});
export type AtlasConfig = z.infer<typeof AtlasConfigSchema>;
export type AtlasConfigInput = z.input<typeof AtlasConfigSchema>;
