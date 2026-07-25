import { z } from "zod";

/** Exact Scene Lab sequence order from the source loop. */
export const SCENE_LAB_STEPS = [
  {
    id: "logline",
    title: "Write the scene logline",
    field: "summary" as const,
    help: "One sentence: who wants what, against what pressure.",
  },
  {
    id: "charge",
    title: "Set the charge",
    field: "charge" as const,
    help: "Charge in must flip to a different charge out.",
  },
  {
    id: "object",
    title: "Choose the object",
    field: "object" as const,
    help: "A concrete object the camera can hold on.",
  },
  {
    id: "location-light",
    title: "Choose the location and light source",
    field: "locationLight" as const,
    help: "Where we are, and what lights the frame.",
  },
  {
    id: "turn",
    title: "Find the turn",
    field: "turnDescription" as const,
    help: "The irreversible change that flips the charge.",
  },
  {
    id: "write-long",
    title: "Write it too long",
    field: "longDraft" as const,
    help: "Over-write first. Cuts come later — never auto-rewritten.",
  },
  {
    id: "delete-speeches",
    title: "Delete the first and last speech",
    field: "dialogueNotes" as const,
    help: "Mark that first/last speech cuts are done in your draft notes.",
  },
  {
    id: "dialogue-cuts",
    title: "Apply the dialogue cuts",
    field: "dialogueCuts" as const,
    help: "Tag lines that state emotion, repeat info, answer directly, or can be image/silence.",
  },
  {
    id: "camera-test",
    title: "Camera-test every action line",
    field: "cameraTest" as const,
    help: "Suggestion only: can a camera photograph this, or a mic record it?",
  },
  {
    id: "micro-beats",
    title: "Map micro-beats with Load/Absorb",
    field: "microBeats" as const,
    help: "Action → reaction → adjustment. Alternate Load and Absorb.",
  },
  {
    id: "deletion-test",
    title: "Run the deletion test",
    field: "deletionTest" as const,
    help: "Temporarily remove the scene from projection and inspect explicit links only.",
  },
] as const;

export type SceneLabStepId = (typeof SCENE_LAB_STEPS)[number]["id"];

export const LoadOrAbsorbSchema = z.enum(["Load", "Absorb"]);
export type LoadOrAbsorb = z.infer<typeof LoadOrAbsorbSchema>;

export const DialogueCutTagSchema = z.enum([
  "states_emotion",
  "repeats_known_information",
  "answers_directly",
  "replaceable_by_image_object_silence",
]);
export type DialogueCutTag = z.infer<typeof DialogueCutTagSchema>;

export const DIALOGUE_CUT_LABELS: Record<DialogueCutTag, string> = {
  states_emotion: "states emotion",
  repeats_known_information: "repeats known information",
  answers_directly: "answers directly",
  replaceable_by_image_object_silence: "replaceable by image/object/silence",
};

export const FindingStatusSchema = z.enum([
  "open",
  "accepted",
  "dismissed",
  "deferred",
]);
export type FindingStatus = z.infer<typeof FindingStatusSchema>;

export const FindingSeveritySchema = z.enum(["suggestion", "warning", "blocker"]);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

export const MicroBeatSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  userId: z.string().uuid(),
  sortOrder: z.number().int(),
  actionTactic: z.string(),
  reactionResistance: z.string(),
  adjustment: z.string(),
  loadOrAbsorb: LoadOrAbsorbSchema,
  elementRangeStart: z.number().int().nullable(),
  elementRangeEnd: z.number().int().nullable(),
  durationEstimateSeconds: z.number().int().nullable(),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MicroBeat = z.infer<typeof MicroBeatSchema>;

export const SceneLabFieldsSchema = z.object({
  povOwner: z.string(),
  sceneObjective: z.string(),
  whyNow: z.string(),
  obstacle: z.string(),
  tactics: z.string(),
  turnDescription: z.string(),
  chargeIn: z.string(),
  chargeOut: z.string(),
  object: z.string(),
  lightSource: z.string(),
  environment: z.string(),
  backgroundLife: z.string(),
  register: z.string(),
  deletionTestResult: z.string(),
  longDraft: z.string(),
  dialogueNotes: z.string(),
  setupsProvided: z.string(),
  payoffsSupported: z.string(),
  characterDecisionsSupported: z.string(),
});
export type SceneLabFields = z.infer<typeof SceneLabFieldsSchema>;

export const CAMERA_TEST_TERMS = [
  "remembers",
  "knows",
  "realizes",
  "feels",
  "symbolizes",
  "seems",
  "has always been",
] as const;

export const RULESET_VERSION = "scene-lab-v1";

export const HIGH_MICRO_BEAT_COUNT = 12;
export const MIN_MICRO_BEAT_COUNT = 3;
