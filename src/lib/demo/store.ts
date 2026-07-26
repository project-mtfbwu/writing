import { gzipSync, gunzipSync } from "node:zlib";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  BeatColorKeySchema,
  SceneStatusSchema,
} from "@/lib/beats/order";
import { ScreenplayElementTypeSchema } from "@/lib/screenplay/model";
import { LoadOrAbsorbSchema, FindingStatusSchema, DialogueCutTagSchema } from "@/lib/scene-lab/model";
import {
  DEMO_COOKIE_CHUNK_SIZE,
  DEMO_DATA_CHUNK_COUNT_COOKIE,
  DEMO_DATA_COOKIE_PREFIX,
  DEMO_MAX_CHUNKS,
  DEMO_USER_ID,
} from "@/lib/demo/constants";

const IsoDateSchema = z.string().min(1);

const DemoProjectSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  title: z.string(),
  format: z.string(),
  genre: z.string(),
  tone: z.string(),
  status: z.string(),
  logline: z.string(),
  controllingIdea: z.string(),
  currentDraftId: z.string().uuid().nullable(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

const DemoPremiseSchema = z.object({
  projectId: z.string().uuid(),
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

const DemoCharacterSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
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

const DemoDraftSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  version: z.number().int(),
  revision: z.number().int(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

const DemoBeatSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  draftId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  colorKey: BeatColorKeySchema,
  sortOrder: z.number().int(),
  templateKey: z.string().nullable(),
  targetPercentage: z.number().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

const DemoSceneSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  draftId: z.string().uuid(),
  userId: z.string().uuid(),
  beatId: z.string().uuid().nullable(),
  heading: z.string(),
  summary: z.string(),
  location: z.string(),
  timeOfDay: z.string(),
  sortOrder: z.number().int(),
  status: SceneStatusSchema,
  metadata: z.record(z.string(), z.unknown()).default({}),
  povOwner: z.string().default(""),
  sceneObjective: z.string().default(""),
  whyNow: z.string().default(""),
  obstacle: z.string().default(""),
  tactics: z.string().default(""),
  turnDescription: z.string().default(""),
  chargeIn: z.string().default(""),
  chargeOut: z.string().default(""),
  object: z.string().default(""),
  lightSource: z.string().default(""),
  environment: z.string().default(""),
  backgroundLife: z.string().default(""),
  register: z.string().default(""),
  deletionTestResult: z.string().default(""),
  longDraft: z.string().default(""),
  dialogueNotes: z.string().default(""),
  setupsProvided: z.string().default(""),
  payoffsSupported: z.string().default(""),
  characterDecisionsSupported: z.string().default(""),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

const DemoElementSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  draftId: z.string().uuid(),
  sceneId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  elementType: ScreenplayElementTypeSchema,
  content: z.string(),
  sortOrder: z.number().int(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

const DemoMicroBeatSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  userId: z.string().uuid(),
  sortOrder: z.number().int(),
  actionTactic: z.string(),
  reactionResistance: z.string(),
  adjustment: z.string(),
  loadOrAbsorb: LoadOrAbsorbSchema,
  elementRangeStart: z.number().nullable(),
  elementRangeEnd: z.number().nullable(),
  durationEstimateSeconds: z.number().nullable(),
  notes: z.string(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

const DemoFindingSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  userId: z.string().uuid(),
  ruleId: z.string(),
  severity: z.enum(["suggestion", "warning", "blocker"]),
  evidenceLocation: z.string(),
  explanation: z.string(),
  atlasConceptId: z.string(),
  lessonId: z.string(),
  exerciseId: z.string(),
  bookId: z.string(),
  chapterSlug: z.string(),
  sectionId: z.string().nullable(),
  headingId: z.string().nullable(),
  sourceLabel: z.string(),
  eli5Topic: z.string(),
  dialogueCutTag: DialogueCutTagSchema.nullable(),
  status: FindingStatusSchema,
  userResponse: z.string(),
  createdAt: IsoDateSchema,
});

const DemoReviewRunSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  userId: z.string().uuid(),
  mode: z.enum(["guided", "expert"]),
  rulesetVersion: z.string(),
  createdAt: IsoDateSchema,
});

export const DemoStoreSchema = z.object({
  version: z.literal(1),
  userId: z.string().uuid(),
  projects: z.array(DemoProjectSchema),
  premises: z.array(DemoPremiseSchema),
  characters: z.array(DemoCharacterSchema),
  drafts: z.array(DemoDraftSchema),
  beats: z.array(DemoBeatSchema),
  scenes: z.array(DemoSceneSchema),
  elements: z.array(DemoElementSchema),
  microBeats: z.array(DemoMicroBeatSchema),
  findings: z.array(DemoFindingSchema),
  reviewRuns: z.array(DemoReviewRunSchema),
});

export type DemoStore = z.infer<typeof DemoStoreSchema>;
export type DemoProject = z.infer<typeof DemoProjectSchema>;
export type DemoPremise = z.infer<typeof DemoPremiseSchema>;
export type DemoCharacter = z.infer<typeof DemoCharacterSchema>;
export type DemoDraft = z.infer<typeof DemoDraftSchema>;
export type DemoBeat = z.infer<typeof DemoBeatSchema>;
export type DemoScene = z.infer<typeof DemoSceneSchema>;
export type DemoElement = z.infer<typeof DemoElementSchema>;
export type DemoMicroBeat = z.infer<typeof DemoMicroBeatSchema>;
export type DemoFinding = z.infer<typeof DemoFindingSchema>;
export type DemoReviewRun = z.infer<typeof DemoReviewRunSchema>;

export function emptyDemoStore(userId = DEMO_USER_ID): DemoStore {
  return {
    version: 1,
    userId,
    projects: [],
    premises: [],
    characters: [],
    drafts: [],
    beats: [],
    scenes: [],
    elements: [],
    microBeats: [],
    findings: [],
    reviewRuns: [],
  };
}

function encodeStore(store: DemoStore): string {
  const json = JSON.stringify(store);
  return gzipSync(Buffer.from(json, "utf8")).toString("base64url");
}

function decodeStore(encoded: string): DemoStore {
  const json = gunzipSync(Buffer.from(encoded, "base64url")).toString("utf8");
  return DemoStoreSchema.parse(JSON.parse(json));
}

function chunkString(value: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += size) {
    chunks.push(value.slice(i, i + size));
  }
  return chunks.length > 0 ? chunks : [""];
}

export async function readDemoStore(): Promise<DemoStore> {
  const jar = await cookies();
  const countRaw = jar.get(DEMO_DATA_CHUNK_COUNT_COOKIE)?.value;
  const count = countRaw ? Number.parseInt(countRaw, 10) : 0;
  if (!Number.isFinite(count) || count <= 0) {
    return emptyDemoStore();
  }
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const part = jar.get(`${DEMO_DATA_COOKIE_PREFIX}${i}`)?.value;
    if (!part) return emptyDemoStore();
    parts.push(part);
  }
  try {
    return decodeStore(parts.join(""));
  } catch {
    return emptyDemoStore();
  }
}

export async function writeDemoStore(store: DemoStore): Promise<void> {
  const parsed = DemoStoreSchema.parse(store);
  const encoded = encodeStore(parsed);
  const chunks = chunkString(encoded, DEMO_COOKIE_CHUNK_SIZE);
  if (chunks.length > DEMO_MAX_CHUNKS) {
    throw new Error(
      "Demo writing data is too large for browser cookies. Delete a draft or clear demo data.",
    );
  }

  const jar = await cookies();
  const previous = Number.parseInt(jar.get(DEMO_DATA_CHUNK_COUNT_COOKIE)?.value ?? "0", 10) || 0;
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  };

  for (let i = 0; i < previous; i += 1) {
    jar.delete(`${DEMO_DATA_COOKIE_PREFIX}${i}`);
  }
  chunks.forEach((chunk, index) => {
    jar.set(`${DEMO_DATA_COOKIE_PREFIX}${index}`, chunk, cookieOptions);
  });
  jar.set(DEMO_DATA_CHUNK_COUNT_COOKIE, String(chunks.length), cookieOptions);
}

export async function clearDemoStore(): Promise<void> {
  const jar = await cookies();
  const previous = Number.parseInt(jar.get(DEMO_DATA_CHUNK_COUNT_COOKIE)?.value ?? "0", 10) || 0;
  for (let i = 0; i < Math.max(previous, DEMO_MAX_CHUNKS); i += 1) {
    jar.delete(`${DEMO_DATA_COOKIE_PREFIX}${i}`);
  }
  jar.delete(DEMO_DATA_CHUNK_COUNT_COOKIE);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}
