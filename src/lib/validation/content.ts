import { z } from "zod";

export const EvidenceLabelSchema = z.enum(["E1", "E2", "E3", "E4", "E5"]);

export const SourceDocumentIdSchema = z.enum([
  "screenwriting-syllabus",
  "complete-session-script-to-cut",
]);

export type EvidenceLabel = z.infer<typeof EvidenceLabelSchema>;
export type SourceDocumentId = z.infer<typeof SourceDocumentIdSchema>;
