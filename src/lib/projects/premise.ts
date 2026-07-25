import { z } from "zod";

export const ProjectStatusSchema = z.enum(["draft", "active", "archived"]);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectFormatSchema = z.enum([
  "feature",
  "short",
  "series",
  "pilot",
  "other",
]);
export type ProjectFormat = z.infer<typeof ProjectFormatSchema>;

export const PremiseFieldsSchema = z.object({
  title: z.string(),
  format: z.string(),
  genre: z.string(),
  tone: z.string(),
  protagonist: z.string(),
  incitingIncident: z.string(),
  goal: z.string(),
  stakes: z.string(),
  obstacle: z.string(),
  controllingIdea: z.string(),
});
export type PremiseFields = z.infer<typeof PremiseFieldsSchema>;

export const CharacterFieldsSchema = z.object({
  name: z.string().min(1),
  role: z.string(),
  want: z.string(),
  need: z.string(),
  wound: z.string(),
  lie: z.string(),
  arc: z.string(),
  method: z.string(),
  relationshipToTheme: z.string(),
  register: z.string(),
  notes: z.string(),
});
export type CharacterFields = z.infer<typeof CharacterFieldsSchema>;

/** Assemble logline preview from entered fields only — no AI. */
export function assemblePremisePreview(fields: PremiseFields): string {
  const parts: string[] = [];
  if (fields.incitingIncident.trim()) {
    parts.push(`When ${fields.incitingIncident.trim()}`);
  }
  if (fields.protagonist.trim()) {
    parts.push(`a ${fields.protagonist.trim()}`);
  }
  if (fields.goal.trim()) {
    parts.push(`must ${fields.goal.trim()}`);
  }
  if (fields.stakes.trim()) {
    parts.push(`or ${fields.stakes.trim()}`);
  }
  if (fields.obstacle.trim()) {
    parts.push(`— but ${fields.obstacle.trim()}`);
  }
  const logline = parts.join(" ").replace(/\s+/g, " ").trim();
  const idea = fields.controllingIdea.trim();
  if (logline && idea) return `${logline}\n\nControlling idea: ${idea}`;
  if (logline) return logline;
  if (idea) return `Controlling idea: ${idea}`;
  return "Fill the fields to preview the premise.";
}
