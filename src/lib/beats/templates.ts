import { z } from "zod";
import type { BeatColorKey } from "@/lib/beats/order";

export const BeatTemplateBeatSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  colorKey: z
    .enum(["neutral", "setup", "confrontation", "resolution", "character", "theme"])
    .default("neutral"),
  targetPercentage: z.number().nullable().default(null),
  templateKey: z.string().min(1),
});
export type BeatTemplateBeat = z.infer<typeof BeatTemplateBeatSchema>;

export const BeatTemplateSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  evidenceStatus: z.enum(["E1", "E2", "E3", "E4", "E5"]),
  craftNote: z.string().min(1),
  beats: z.array(BeatTemplateBeatSchema),
});
export type BeatTemplate = z.infer<typeof BeatTemplateSchema>;

/**
 * Typed system templates (mirror seeded beat_templates rows).
 * Templates are additive and optional — never laws.
 */
export const SYSTEM_BEAT_TEMPLATES: BeatTemplate[] = [
  {
    key: "blank",
    name: "Blank structure",
    summary: "Start with no predefined story landmarks.",
    evidenceStatus: "E4",
    craftNote:
      "Craft heuristic — choose any structure that serves the story. No template is a law.",
    beats: [],
  },
  {
    key: "three-act",
    name: "Three-act starter",
    summary: "Additive Act I / Act II / Act III landmarks.",
    evidenceStatus: "E4",
    craftNote:
      "Three-act is a craft heuristic (E4), not a scientific law. Optional starter only.",
    beats: [
      {
        name: "Act I",
        description: "Setup and irreversible launch",
        colorKey: "setup",
        targetPercentage: 25,
        templateKey: "three-act:act-1",
      },
      {
        name: "Act II",
        description: "Confrontation and midpoint pressure",
        colorKey: "confrontation",
        targetPercentage: 50,
        templateKey: "three-act:act-2",
      },
      {
        name: "Act III",
        description: "Climax and resolution",
        colorKey: "resolution",
        targetPercentage: 25,
        templateKey: "three-act:act-3",
      },
    ],
  },
  {
    key: "eight-sequence",
    name: "Eight-sequence starter",
    summary: "Additive eight-sequence scaffolding.",
    evidenceStatus: "E4",
    craftNote:
      "Sequence maps are craft heuristics (E4). Optional and descriptive, not mandatory.",
    beats: Array.from({ length: 8 }, (_, index) => ({
      name: `Sequence ${index + 1}`,
      description: "",
      colorKey: (index < 2
        ? "setup"
        : index < 6
          ? "confrontation"
          : "resolution") as BeatColorKey,
      targetPercentage: 12.5,
      templateKey: `eight-sequence:${index + 1}`,
    })),
  },
  {
    key: "save-the-cat",
    name: "Save the Cat starter",
    summary: "Additive commercial beat labels inspired by Save the Cat.",
    evidenceStatus: "E5",
    craftNote:
      "Save the Cat is folklore/craft lore (E5) — widely repeated, not evidence. Optional labels only; never treat as law.",
    beats: [
      { name: "Opening Image", description: "", colorKey: "setup", targetPercentage: 1, templateKey: "save-the-cat:opening-image" },
      { name: "Theme Stated", description: "", colorKey: "setup", targetPercentage: 5, templateKey: "save-the-cat:theme-stated" },
      { name: "Set-Up", description: "", colorKey: "setup", targetPercentage: 10, templateKey: "save-the-cat:set-up" },
      { name: "Catalyst", description: "", colorKey: "setup", targetPercentage: 12, templateKey: "save-the-cat:catalyst" },
      { name: "Debate", description: "", colorKey: "setup", targetPercentage: 20, templateKey: "save-the-cat:debate" },
      { name: "Break into Two", description: "", colorKey: "confrontation", targetPercentage: 25, templateKey: "save-the-cat:break-into-two" },
      { name: "B Story", description: "", colorKey: "confrontation", targetPercentage: 30, templateKey: "save-the-cat:b-story" },
      { name: "Fun and Games", description: "", colorKey: "confrontation", targetPercentage: 40, templateKey: "save-the-cat:fun-and-games" },
      { name: "Midpoint", description: "", colorKey: "confrontation", targetPercentage: 50, templateKey: "save-the-cat:midpoint" },
      { name: "Bad Guys Close In", description: "", colorKey: "confrontation", targetPercentage: 60, templateKey: "save-the-cat:bad-guys-close-in" },
      { name: "All Is Lost", description: "", colorKey: "confrontation", targetPercentage: 75, templateKey: "save-the-cat:all-is-lost" },
      { name: "Dark Night of the Soul", description: "", colorKey: "confrontation", targetPercentage: 80, templateKey: "save-the-cat:dark-night" },
      { name: "Break into Three", description: "", colorKey: "resolution", targetPercentage: 85, templateKey: "save-the-cat:break-into-three" },
      { name: "Finale", description: "", colorKey: "resolution", targetPercentage: 95, templateKey: "save-the-cat:finale" },
      { name: "Final Image", description: "", colorKey: "resolution", targetPercentage: 99, templateKey: "save-the-cat:final-image" },
    ],
  },
];

export function getSystemTemplate(key: string): BeatTemplate | null {
  return SYSTEM_BEAT_TEMPLATES.find((template) => template.key === key) ?? null;
}
