import {
  applyOrderedIds,
  filterTemplateBeatsToInsert,
  projectStructureOrder,
  type Beat,
  type BeatColorKey,
  type Scene,
} from "@/lib/beats/order";
import { getSystemTemplate } from "@/lib/beats/templates";
import { assemblePremisePreview, type CharacterFields, type PremiseFields } from "@/lib/projects/premise";
import {
  parseSceneHeading,
  type ScreenplayElement,
  type ScreenplayElementType,
} from "@/lib/screenplay/model";
import { exportFountain, exportPlainText } from "@/lib/screenplay/export";
import {
  DialogueCutTagSchema,
  FindingStatusSchema,
  LoadOrAbsorbSchema,
  RULESET_VERSION,
  type DialogueCutTag,
  type FindingStatus,
  type MicroBeat,
  type SceneLabFields,
} from "@/lib/scene-lab/model";
import { runSceneReviewRules } from "@/lib/scene-lab/rules";
import { evaluateDeletionTest } from "@/lib/scene-lab/deletion";
import { buildReaderDeepLink } from "@/lib/library/related";
import { atlasHref, exerciseHref, lessonHref } from "@/lib/scene-lab/learning-links";
import { DEMO_USER_ID } from "@/lib/demo/constants";
import {
  newId,
  nowIso,
  readDemoStore,
  writeDemoStore,
  type DemoBeat,
  type DemoElement,
  type DemoFinding,
  type DemoMicroBeat,
  type DemoScene,
  type DemoStore,
} from "@/lib/demo/store";
import { z } from "zod";

function asBeat(row: DemoBeat): Beat {
  return { ...row };
}

function asScene(row: DemoScene): Scene {
  return { ...row };
}

function asElement(row: DemoElement): ScreenplayElement {
  return { ...row };
}

function asMicroBeat(row: DemoMicroBeat): MicroBeat {
  return {
    id: row.id,
    projectId: row.projectId,
    sceneId: row.sceneId,
    userId: row.userId,
    sortOrder: row.sortOrder,
    actionTactic: row.actionTactic,
    reactionResistance: row.reactionResistance,
    adjustment: row.adjustment,
    loadOrAbsorb: row.loadOrAbsorb,
    elementRangeStart: row.elementRangeStart,
    elementRangeEnd: row.elementRangeEnd,
    durationEstimateSeconds: row.durationEstimateSeconds,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapFindingView(row: DemoFinding) {
  const sourceHref =
    row.bookId && row.chapterSlug
      ? buildReaderDeepLink({
          bookId: row.bookId,
          chapterSlug: row.chapterSlug,
          sectionId: row.sectionId,
          headingId: row.headingId,
        })
      : null;
  return {
    id: row.id,
    ruleId: row.ruleId,
    severity: row.severity,
    evidenceLocation: row.evidenceLocation,
    explanation: row.explanation,
    atlasConceptId: row.atlasConceptId,
    lessonId: row.lessonId,
    exerciseId: row.exerciseId,
    bookId: row.bookId,
    chapterSlug: row.chapterSlug,
    sectionId: row.sectionId,
    headingId: row.headingId,
    sourceLabel: row.sourceLabel,
    eli5Topic: row.eli5Topic,
    dialogueCutTag: row.dialogueCutTag,
    status: row.status,
    userResponse: row.userResponse,
    sourceHref,
    atlasHref: atlasHref(row.atlasConceptId || "scene"),
    lessonHref: lessonHref(row.lessonId),
    exerciseHref: exerciseHref(row.exerciseId),
  };
}

function sceneLabFieldsFromScene(scene: Scene): SceneLabFields {
  return {
    povOwner: scene.povOwner,
    sceneObjective: scene.sceneObjective,
    whyNow: scene.whyNow,
    obstacle: scene.obstacle,
    tactics: scene.tactics,
    turnDescription: scene.turnDescription,
    chargeIn: scene.chargeIn,
    chargeOut: scene.chargeOut,
    object: scene.object,
    lightSource: scene.lightSource,
    environment: scene.environment,
    backgroundLife: scene.backgroundLife,
    register: scene.register,
    deletionTestResult: scene.deletionTestResult,
    longDraft: scene.longDraft,
    dialogueNotes: scene.dialogueNotes,
    setupsProvided: scene.setupsProvided,
    payoffsSupported: scene.payoffsSupported,
    characterDecisionsSupported: scene.characterDecisionsSupported,
  };
}

function touchProject(store: DemoStore, projectId: string): void {
  const project = store.projects.find((item) => item.id === projectId);
  if (project) project.updatedAt = nowIso();
}

function requireProject(store: DemoStore, projectId: string) {
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) throw new Error("Project not found.");
  return project;
}

export async function demoListProjects() {
  const store = await readDemoStore();
  return [...store.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function demoGetProject(projectId: string) {
  const store = await readDemoStore();
  return store.projects.find((item) => item.id === projectId) ?? null;
}

export async function demoGetPremise(projectId: string) {
  const store = await readDemoStore();
  return store.premises.find((item) => item.projectId === projectId) ?? null;
}

export async function demoListCharacters(projectId: string) {
  const store = await readDemoStore();
  return store.characters
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function demoCreateProject(input: {
  title: string;
  format: string;
  genre: string;
  tone: string;
}): Promise<{ id: string }> {
  const store = await readDemoStore();
  const stamp = nowIso();
  const projectId = newId();
  const draftId = newId();
  store.projects.unshift({
    id: projectId,
    ownerId: DEMO_USER_ID,
    title: input.title,
    format: input.format,
    genre: input.genre,
    tone: input.tone,
    status: "draft",
    logline: "",
    controllingIdea: "",
    currentDraftId: draftId,
    createdAt: stamp,
    updatedAt: stamp,
  });
  store.premises.push({
    projectId,
    title: input.title,
    format: input.format,
    genre: input.genre,
    tone: input.tone,
    protagonist: "",
    incitingIncident: "",
    goal: "",
    stakes: "",
    obstacle: "",
    controllingIdea: "",
  });
  store.drafts.push({
    id: draftId,
    projectId,
    title: "Draft 1",
    body: "",
    version: 1,
    revision: 1,
    createdAt: stamp,
    updatedAt: stamp,
  });
  await writeDemoStore(store);
  return { id: projectId };
}

export async function demoUpdatePremise(projectId: string, fields: PremiseFields) {
  const store = await readDemoStore();
  requireProject(store, projectId);
  const preview = assemblePremisePreview(fields);
  const premise = store.premises.find((item) => item.projectId === projectId);
  if (!premise) throw new Error("Premise missing.");
  Object.assign(premise, {
    title: fields.title,
    format: fields.format,
    genre: fields.genre,
    tone: fields.tone,
    protagonist: fields.protagonist,
    incitingIncident: fields.incitingIncident,
    goal: fields.goal,
    stakes: fields.stakes,
    obstacle: fields.obstacle,
    controllingIdea: fields.controllingIdea,
  });
  const project = requireProject(store, projectId);
  if (fields.title) project.title = fields.title;
  project.format = fields.format;
  project.genre = fields.genre;
  project.tone = fields.tone;
  project.logline = preview.split("\n\n")[0] ?? "";
  project.controllingIdea = fields.controllingIdea;
  touchProject(store, projectId);
  await writeDemoStore(store);
}

export async function demoUpsertCharacter(
  projectId: string,
  characterId: string | null,
  fields: CharacterFields,
): Promise<string> {
  const store = await readDemoStore();
  requireProject(store, projectId);
  if (characterId) {
    const character = store.characters.find((item) => item.id === characterId);
    if (!character) throw new Error("Character not found.");
    Object.assign(character, {
      name: fields.name,
      role: fields.role,
      want: fields.want,
      need: fields.need,
      wound: fields.wound,
      lie: fields.lie,
      arc: fields.arc,
      method: fields.method,
      relationshipToTheme: fields.relationshipToTheme,
      register: fields.register,
      notes: fields.notes,
    });
    touchProject(store, projectId);
    await writeDemoStore(store);
    return characterId;
  }
  const id = newId();
  store.characters.push({
    id,
    projectId,
    name: fields.name,
    role: fields.role,
    want: fields.want,
    need: fields.need,
    wound: fields.wound,
    lie: fields.lie,
    arc: fields.arc,
    method: fields.method,
    relationshipToTheme: fields.relationshipToTheme,
    register: fields.register,
    notes: fields.notes,
  });
  touchProject(store, projectId);
  await writeDemoStore(store);
  return id;
}

export async function demoEnsureDraftId(projectId: string): Promise<string> {
  const store = await readDemoStore();
  const project = requireProject(store, projectId);
  if (project.currentDraftId) {
    const existing = store.drafts.find((item) => item.id === project.currentDraftId);
    if (existing) return existing.id;
  }
  const stamp = nowIso();
  const draftId = newId();
  store.drafts.push({
    id: draftId,
    projectId,
    title: "Draft 1",
    body: "",
    version: 1,
    revision: 1,
    createdAt: stamp,
    updatedAt: stamp,
  });
  project.currentDraftId = draftId;
  touchProject(store, projectId);
  await writeDemoStore(store);
  return draftId;
}

export async function demoLoadStructure(projectId: string) {
  const store = await readDemoStore();
  requireProject(store, projectId);
  const draftId = await demoEnsureDraftId(projectId);
  const refreshed = await readDemoStore();
  const beats = refreshed.beats.filter((item) => item.draftId === draftId).map(asBeat);
  const scenes = refreshed.scenes.filter((item) => item.draftId === draftId).map(asScene);
  return {
    draftId,
    beats,
    scenes,
    projection: projectStructureOrder(beats, scenes),
  };
}

export async function demoCreateBeat(input: {
  projectId: string;
  name: string;
  description?: string;
  colorKey?: BeatColorKey;
}): Promise<Beat> {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const draftId = await demoEnsureDraftId(input.projectId);
  const next = await readDemoStore();
  const stamp = nowIso();
  const sortOrder =
    next.beats
      .filter((item) => item.draftId === draftId)
      .reduce((max, beat) => Math.max(max, beat.sortOrder), -1) + 1;
  const beat: DemoBeat = {
    id: newId(),
    projectId: input.projectId,
    draftId,
    userId: DEMO_USER_ID,
    name: input.name.trim() || "Untitled beat",
    description: input.description ?? "",
    colorKey: input.colorKey ?? "neutral",
    sortOrder,
    templateKey: null,
    targetPercentage: null,
    metadata: {},
    createdAt: stamp,
    updatedAt: stamp,
  };
  next.beats.push(beat);
  touchProject(next, input.projectId);
  await writeDemoStore(next);
  return asBeat(beat);
}

export async function demoUpdateBeat(input: {
  projectId: string;
  beatId: string;
  name?: string;
  description?: string;
  colorKey?: BeatColorKey;
  targetPercentage?: number | null;
}) {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const beat = store.beats.find((item) => item.id === input.beatId);
  if (!beat) throw new Error("Beat not found.");
  if (input.name !== undefined) beat.name = input.name;
  if (input.description !== undefined) beat.description = input.description;
  if (input.colorKey !== undefined) beat.colorKey = input.colorKey;
  if (input.targetPercentage !== undefined) beat.targetPercentage = input.targetPercentage;
  beat.updatedAt = nowIso();
  touchProject(store, input.projectId);
  await writeDemoStore(store);
}

export async function demoDeleteBeat(input: { projectId: string; beatId: string }) {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  store.beats = store.beats.filter((item) => item.id !== input.beatId);
  for (const scene of store.scenes) {
    if (scene.beatId === input.beatId) {
      scene.beatId = null;
      scene.updatedAt = nowIso();
    }
  }
  touchProject(store, input.projectId);
  await writeDemoStore(store);
}

export async function demoReorderBeats(input: {
  projectId: string;
  orderedIds: string[];
  expectedUpdatedAtById: Record<string, string>;
}): Promise<{ ok: true } | { ok: false; reason: "stale-version" | "missing-item" }> {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const draftId = await demoEnsureDraftId(input.projectId);
  const next = await readDemoStore();
  const beats = next.beats.filter((item) => item.draftId === draftId).map(asBeat);
  const applied = applyOrderedIds(beats, input.orderedIds, input.expectedUpdatedAtById);
  if (!applied.ok) return applied;
  for (const beat of applied.items) {
    const row = next.beats.find((item) => item.id === beat.id);
    if (!row) return { ok: false, reason: "missing-item" };
    if (row.updatedAt !== input.expectedUpdatedAtById[beat.id]) {
      return { ok: false, reason: "stale-version" };
    }
    row.sortOrder = beat.sortOrder;
    row.updatedAt = nowIso();
  }
  touchProject(next, input.projectId);
  await writeDemoStore(next);
  return { ok: true };
}

export async function demoCreateScene(input: {
  projectId: string;
  beatId: string | null;
  heading?: string;
  summary?: string;
}): Promise<Scene> {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const draftId = await demoEnsureDraftId(input.projectId);
  const next = await readDemoStore();
  const stamp = nowIso();
  const peers = next.scenes.filter(
    (item) =>
      item.draftId === draftId &&
      (input.beatId ? item.beatId === input.beatId : item.beatId === null),
  );
  const sortOrder = peers.reduce((max, scene) => Math.max(max, scene.sortOrder), -1) + 1;
  const scene: DemoScene = {
    id: newId(),
    projectId: input.projectId,
    draftId,
    userId: DEMO_USER_ID,
    beatId: input.beatId,
    heading: input.heading?.trim() || "INT. LOCATION — DAY",
    summary: input.summary ?? "",
    location: "",
    timeOfDay: "",
    sortOrder,
    status: "idea",
    metadata: {},
    povOwner: "",
    sceneObjective: "",
    whyNow: "",
    obstacle: "",
    tactics: "",
    turnDescription: "",
    chargeIn: "",
    chargeOut: "",
    object: "",
    lightSource: "",
    environment: "",
    backgroundLife: "",
    register: "",
    deletionTestResult: "",
    longDraft: "",
    dialogueNotes: "",
    setupsProvided: "",
    payoffsSupported: "",
    characterDecisionsSupported: "",
    createdAt: stamp,
    updatedAt: stamp,
  };
  next.scenes.push(scene);
  touchProject(next, input.projectId);
  await writeDemoStore(next);
  return asScene(scene);
}

export async function demoUpdateScene(input: {
  projectId: string;
  sceneId: string;
  heading?: string;
  summary?: string;
  location?: string;
  timeOfDay?: string;
  status?: Scene["status"];
  patch?: Partial<DemoScene>;
}): Promise<Scene | null> {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const scene = store.scenes.find((item) => item.id === input.sceneId);
  if (!scene) return null;
  if (input.heading !== undefined) scene.heading = input.heading;
  if (input.summary !== undefined) scene.summary = input.summary;
  if (input.location !== undefined) scene.location = input.location;
  if (input.timeOfDay !== undefined) scene.timeOfDay = input.timeOfDay;
  if (input.status !== undefined) scene.status = input.status;
  if (input.patch) {
    for (const [key, value] of Object.entries(input.patch)) {
      if (value === undefined) continue;
      if (key === "id" || key === "projectId" || key === "draftId" || key === "userId" || key === "createdAt") {
        continue;
      }
      (scene as Record<string, unknown>)[key] = value;
    }
  }
  scene.updatedAt = nowIso();
  touchProject(store, input.projectId);
  await writeDemoStore(store);
  return asScene(scene);
}

export async function demoReassignScene(input: {
  projectId: string;
  sceneId: string;
  beatId: string | null;
  orderedSceneIdsInTarget: string[];
  expectedUpdatedAtById: Record<string, string>;
}): Promise<{ ok: true } | { ok: false; reason: "stale-version" | "missing-item" }> {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const draftId = await demoEnsureDraftId(input.projectId);
  const next = await readDemoStore();
  const scenes = next.scenes.filter((item) => item.draftId === draftId).map(asScene);
  const targetScenes = scenes
    .filter((scene) =>
      input.beatId
        ? scene.beatId === input.beatId || scene.id === input.sceneId
        : scene.beatId === null || scene.id === input.sceneId,
    )
    .map((scene) => (scene.id === input.sceneId ? { ...scene, beatId: input.beatId } : scene));
  const applied = applyOrderedIds(
    targetScenes.filter((scene) => input.orderedSceneIdsInTarget.includes(scene.id)),
    input.orderedSceneIdsInTarget,
    input.expectedUpdatedAtById,
  );
  if (!applied.ok) return applied;
  for (const scene of applied.items) {
    const row = next.scenes.find((item) => item.id === scene.id);
    if (!row) return { ok: false, reason: "missing-item" };
    row.beatId = scene.beatId;
    row.sortOrder = scene.sortOrder;
    row.updatedAt = nowIso();
  }
  touchProject(next, input.projectId);
  await writeDemoStore(next);
  return { ok: true };
}

export async function demoApplyBeatTemplate(input: {
  projectId: string;
  templateKey: string;
}): Promise<{ added: number; message: string }> {
  const template = getSystemTemplate(input.templateKey);
  if (!template) throw new Error("Unknown template.");
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const draftId = await demoEnsureDraftId(input.projectId);
  const next = await readDemoStore();
  const existing = next.beats.filter((item) => item.draftId === draftId).map(asBeat);
  const toInsert = filterTemplateBeatsToInsert(existing, template.beats);
  if (toInsert.length === 0) {
    return {
      added: 0,
      message: "Template already applied — no duplicate beats created.",
    };
  }
  const startOrder = existing.reduce((max, beat) => Math.max(max, beat.sortOrder), -1) + 1;
  const stamp = nowIso();
  toInsert.forEach((beatDef, index) => {
    const full = template.beats.find((item) => item.templateKey === beatDef.templateKey)!;
    next.beats.push({
      id: newId(),
      projectId: input.projectId,
      draftId,
      userId: DEMO_USER_ID,
      name: full.name,
      description: full.description,
      colorKey: full.colorKey,
      sortOrder: startOrder + index,
      templateKey: full.templateKey,
      targetPercentage: full.targetPercentage,
      metadata: {},
      createdAt: stamp,
      updatedAt: stamp,
    });
  });
  touchProject(next, input.projectId);
  await writeDemoStore(next);
  return {
    added: toInsert.length,
    message: `Added ${toInsert.length} template beat(s). Templates are optional starters, not laws.`,
  };
}

export async function demoLoadScreenplay(projectId: string, draftId?: string) {
  const store = await readDemoStore();
  const project = requireProject(store, projectId);
  const activeDraftId = draftId ?? (await demoEnsureDraftId(projectId));
  const next = await readDemoStore();
  const draft = next.drafts.find((item) => item.id === activeDraftId);
  if (!draft) throw new Error("Draft not found.");
  const drafts = next.drafts
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const elements = next.elements
    .filter((item) => item.draftId === activeDraftId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .map(asElement);
  const characterNames = next.characters
    .filter((item) => item.projectId === projectId)
    .map((item) => item.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  return {
    userId: DEMO_USER_ID,
    project: {
      id: project.id,
      title: project.title,
      current_draft_id: project.currentDraftId,
    },
    draft: {
      id: draft.id,
      title: draft.title,
      revision: draft.revision,
      updated_at: draft.updatedAt,
      created_at: draft.createdAt,
      body: draft.body,
      version: draft.version,
      project_id: draft.projectId,
    },
    drafts: drafts.map((item) => ({
      id: item.id,
      title: item.title,
      revision: item.revision,
      updated_at: item.updatedAt,
      created_at: item.createdAt,
    })),
    elements,
    characterNames,
  };
}

function bumpDraft(store: DemoStore, draftId: string) {
  const draft = store.drafts.find((item) => item.id === draftId);
  if (!draft) return;
  draft.revision = (draft.revision ?? 1) + 1;
  draft.updatedAt = nowIso();
}

export async function demoUpsertElement(input: {
  projectId: string;
  element: ScreenplayElement;
  expectedUpdatedAt: string | null;
}): Promise<ScreenplayElement> {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const existing = store.elements.find((item) => item.id === input.element.id);
  if (existing && input.expectedUpdatedAt && existing.updatedAt !== input.expectedUpdatedAt) {
    throw new Error(
      "Conflict: this element changed elsewhere. Reload or retry — your local text is kept.",
    );
  }
  const stamp = nowIso();
  const row: DemoElement = {
    id: input.element.id,
    projectId: input.projectId,
    draftId: input.element.draftId,
    sceneId: input.element.sceneId,
    userId: DEMO_USER_ID,
    elementType: input.element.elementType,
    content: input.element.content,
    sortOrder: input.element.sortOrder,
    metadata: input.element.metadata ?? {},
    createdAt: existing?.createdAt ?? stamp,
    updatedAt: stamp,
  };
  if (existing) {
    Object.assign(existing, row);
  } else {
    store.elements.push(row);
  }
  bumpDraft(store, input.element.draftId);
  touchProject(store, input.projectId);
  await writeDemoStore(store);
  return asElement(row);
}

export async function demoDeleteElement(input: {
  projectId: string;
  elementId: string;
  expectedUpdatedAt: string | null;
}) {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const existing = store.elements.find((item) => item.id === input.elementId);
  if (!existing) return;
  if (input.expectedUpdatedAt && existing.updatedAt !== input.expectedUpdatedAt) {
    throw new Error("Conflict deleting element. Local text was not discarded.");
  }
  store.elements = store.elements.filter((item) => item.id !== input.elementId);
  bumpDraft(store, existing.draftId);
  touchProject(store, input.projectId);
  await writeDemoStore(store);
}

export async function demoReorderElements(input: {
  projectId: string;
  draftId: string;
  orderedIds: string[];
  expectedRevision: number;
}) {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const draft = store.drafts.find((item) => item.id === input.draftId);
  if (!draft) throw new Error("Draft missing");
  if (draft.revision !== input.expectedRevision) {
    throw new Error("Reorder conflict: draft revision changed. Local order kept until you retry.");
  }
  input.orderedIds.forEach((id, index) => {
    const element = store.elements.find((item) => item.id === id);
    if (element) {
      element.sortOrder = index;
      element.updatedAt = nowIso();
    }
  });
  bumpDraft(store, input.draftId);
  touchProject(store, input.projectId);
  await writeDemoStore(store);
}

export async function demoSyncSceneHeading(input: {
  projectId: string;
  draftId: string;
  elementId: string;
  content: string;
  sceneId: string | null;
}): Promise<string> {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const parsed = parseSceneHeading(input.content);
  if (input.sceneId) {
    const scene = store.scenes.find((item) => item.id === input.sceneId);
    if (!scene) throw new Error("Scene not found");
    scene.heading = input.content.trim() || "INT. LOCATION — DAY";
    scene.location = parsed.location;
    scene.timeOfDay = parsed.timeOfDay;
    scene.updatedAt = nowIso();
    const element = store.elements.find((item) => item.id === input.elementId);
    if (element) {
      element.sceneId = input.sceneId;
      element.elementType = "scene_heading";
      element.updatedAt = nowIso();
    }
    touchProject(store, input.projectId);
    await writeDemoStore(store);
    return input.sceneId;
  }

  const sortOrder =
    store.scenes
      .filter((item) => item.draftId === input.draftId)
      .reduce((max, scene) => Math.max(max, scene.sortOrder), -1) + 1;
  const stamp = nowIso();
  const sceneId = newId();
  store.scenes.push({
    id: sceneId,
    projectId: input.projectId,
    draftId: input.draftId,
    userId: DEMO_USER_ID,
    beatId: null,
    heading: input.content.trim() || "INT. LOCATION — DAY",
    summary: "",
    location: parsed.location,
    timeOfDay: parsed.timeOfDay,
    sortOrder,
    status: "idea",
    metadata: {},
    povOwner: "",
    sceneObjective: "",
    whyNow: "",
    obstacle: "",
    tactics: "",
    turnDescription: "",
    chargeIn: "",
    chargeOut: "",
    object: "",
    lightSource: "",
    environment: "",
    backgroundLife: "",
    register: "",
    deletionTestResult: "",
    longDraft: "",
    dialogueNotes: "",
    setupsProvided: "",
    payoffsSupported: "",
    characterDecisionsSupported: "",
    createdAt: stamp,
    updatedAt: stamp,
  });
  const element = store.elements.find((item) => item.id === input.elementId);
  if (element) {
    element.sceneId = sceneId;
    element.elementType = "scene_heading" satisfies ScreenplayElementType;
    element.updatedAt = stamp;
  }
  touchProject(store, input.projectId);
  await writeDemoStore(store);
  return sceneId;
}

export async function demoAssignSceneBeat(input: {
  projectId: string;
  sceneId: string;
  beatId: string | null;
}) {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const scene = store.scenes.find((item) => item.id === input.sceneId);
  if (!scene) throw new Error("Scene not found");
  scene.beatId = input.beatId;
  scene.updatedAt = nowIso();
  touchProject(store, input.projectId);
  await writeDemoStore(store);
}

export async function demoCreateDraft(input: { projectId: string; title: string }) {
  const store = await readDemoStore();
  const project = requireProject(store, input.projectId);
  const stamp = nowIso();
  const draftId = newId();
  store.drafts.push({
    id: draftId,
    projectId: input.projectId,
    title: input.title.trim() || "Untitled draft",
    body: "",
    version: 1,
    revision: 1,
    createdAt: stamp,
    updatedAt: stamp,
  });
  project.currentDraftId = draftId;
  touchProject(store, input.projectId);
  await writeDemoStore(store);
  return draftId;
}

export async function demoRenameDraft(input: {
  projectId: string;
  draftId: string;
  title: string;
}) {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const draft = store.drafts.find((item) => item.id === input.draftId);
  if (!draft) throw new Error("Draft not found");
  draft.title = input.title.trim() || "Untitled draft";
  draft.updatedAt = nowIso();
  touchProject(store, input.projectId);
  await writeDemoStore(store);
}

export async function demoSwitchDraft(input: { projectId: string; draftId: string }) {
  const store = await readDemoStore();
  const project = requireProject(store, input.projectId);
  project.currentDraftId = input.draftId;
  touchProject(store, input.projectId);
  await writeDemoStore(store);
}

export async function demoClearCurrentDraft(input: { projectId: string }) {
  const store = await readDemoStore();
  const project = requireProject(store, input.projectId);
  project.currentDraftId = null;
  touchProject(store, input.projectId);
  await writeDemoStore(store);
}

export async function demoDuplicateDraft(input: {
  projectId: string;
  sourceDraftId: string;
  title?: string;
}) {
  const store = await readDemoStore();
  const project = requireProject(store, input.projectId);
  const source = store.drafts.find((item) => item.id === input.sourceDraftId);
  if (!source) throw new Error("Source draft missing");
  const stamp = nowIso();
  const draftId = newId();
  store.drafts.push({
    id: draftId,
    projectId: input.projectId,
    title: input.title?.trim() || `${source.title} (copy)`,
    body: source.body,
    version: source.version + 1,
    revision: 1,
    createdAt: stamp,
    updatedAt: stamp,
  });
  const sourceElements = store.elements.filter((item) => item.draftId === input.sourceDraftId);
  for (const element of sourceElements) {
    store.elements.push({
      ...element,
      id: newId(),
      draftId,
      sceneId: null,
      createdAt: stamp,
      updatedAt: stamp,
    });
  }
  project.currentDraftId = draftId;
  touchProject(store, input.projectId);
  await writeDemoStore(store);
  return draftId;
}

export async function demoExportScreenplay(input: {
  projectId: string;
  draftId: string;
  format: "fountain" | "plaintext";
}) {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const draft = store.drafts.find((item) => item.id === input.draftId);
  const elements = store.elements
    .filter((item) => item.draftId === input.draftId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(asElement);
  const content =
    input.format === "fountain"
      ? exportFountain(elements, draft?.title)
      : exportPlainText(elements);
  const ext = input.format === "fountain" ? "fountain" : "txt";
  return {
    content,
    filename: `${(draft?.title || "screenplay").replace(/[^\w\-]+/g, "_")}.${ext}`,
  };
}

export async function demoLoadSceneLab(projectId: string, sceneId?: string) {
  const store = await readDemoStore();
  const project = requireProject(store, projectId);
  const draftId = await demoEnsureDraftId(projectId);
  const next = await readDemoStore();
  const beats = next.beats
    .filter((item) => item.draftId === draftId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(asBeat);
  const scenes = next.scenes
    .filter((item) => item.draftId === draftId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(asScene);
  const active = scenes.find((scene) => scene.id === sceneId) ?? scenes[0] ?? null;
  let microBeats: MicroBeat[] = [];
  let findings: ReturnType<typeof mapFindingView>[] = [];
  if (active) {
    microBeats = next.microBeats
      .filter((item) => item.sceneId === active.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(asMicroBeat);
    findings = next.findings
      .filter((item) => item.sceneId === active.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(mapFindingView);
  }
  return {
    userId: DEMO_USER_ID,
    project: { id: project.id, title: project.title },
    beats,
    scenes,
    activeScene: active,
    microBeats,
    findings,
  };
}

const SceneLabFieldsPatchSchema = z.object({
  summary: z.string().optional(),
  heading: z.string().optional(),
  location: z.string().optional(),
  timeOfDay: z.string().optional(),
  beatId: z.string().uuid().nullable().optional(),
  povOwner: z.string().optional(),
  sceneObjective: z.string().optional(),
  whyNow: z.string().optional(),
  obstacle: z.string().optional(),
  tactics: z.string().optional(),
  turnDescription: z.string().optional(),
  chargeIn: z.string().optional(),
  chargeOut: z.string().optional(),
  object: z.string().optional(),
  lightSource: z.string().optional(),
  environment: z.string().optional(),
  backgroundLife: z.string().optional(),
  register: z.string().optional(),
  deletionTestResult: z.string().optional(),
  longDraft: z.string().optional(),
  dialogueNotes: z.string().optional(),
  setupsProvided: z.string().optional(),
  payoffsSupported: z.string().optional(),
  characterDecisionsSupported: z.string().optional(),
});

export async function demoUpdateSceneLabFields(input: {
  projectId: string;
  sceneId: string;
  patch: z.infer<typeof SceneLabFieldsPatchSchema>;
}): Promise<Scene> {
  const parsed = SceneLabFieldsPatchSchema.parse(input.patch);
  const scene = await demoUpdateScene({
    projectId: input.projectId,
    sceneId: input.sceneId,
    heading: parsed.heading,
    summary: parsed.summary,
    location: parsed.location,
    timeOfDay: parsed.timeOfDay,
    patch: {
      beatId: parsed.beatId,
      povOwner: parsed.povOwner,
      sceneObjective: parsed.sceneObjective,
      whyNow: parsed.whyNow,
      obstacle: parsed.obstacle,
      tactics: parsed.tactics,
      turnDescription: parsed.turnDescription,
      chargeIn: parsed.chargeIn,
      chargeOut: parsed.chargeOut,
      object: parsed.object,
      lightSource: parsed.lightSource,
      environment: parsed.environment,
      backgroundLife: parsed.backgroundLife,
      register: parsed.register,
      deletionTestResult: parsed.deletionTestResult,
      longDraft: parsed.longDraft,
      dialogueNotes: parsed.dialogueNotes,
      setupsProvided: parsed.setupsProvided,
      payoffsSupported: parsed.payoffsSupported,
      characterDecisionsSupported: parsed.characterDecisionsSupported,
    },
  });
  if (!scene) throw new Error("Scene not found");
  return scene;
}

export async function demoUpsertMicroBeat(input: {
  projectId: string;
  sceneId: string;
  microBeat: Partial<MicroBeat> & { id?: string };
}): Promise<MicroBeat> {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const loadOrAbsorb = LoadOrAbsorbSchema.parse(input.microBeat.loadOrAbsorb ?? "Load");
  const stamp = nowIso();
  const id = input.microBeat.id ?? newId();
  const existing = store.microBeats.find((item) => item.id === id);
  const row: DemoMicroBeat = {
    id,
    projectId: input.projectId,
    sceneId: input.sceneId,
    userId: DEMO_USER_ID,
    sortOrder: input.microBeat.sortOrder ?? existing?.sortOrder ?? 0,
    actionTactic: input.microBeat.actionTactic ?? existing?.actionTactic ?? "",
    reactionResistance: input.microBeat.reactionResistance ?? existing?.reactionResistance ?? "",
    adjustment: input.microBeat.adjustment ?? existing?.adjustment ?? "",
    loadOrAbsorb,
    elementRangeStart:
      input.microBeat.elementRangeStart ?? existing?.elementRangeStart ?? null,
    elementRangeEnd: input.microBeat.elementRangeEnd ?? existing?.elementRangeEnd ?? null,
    durationEstimateSeconds:
      input.microBeat.durationEstimateSeconds ?? existing?.durationEstimateSeconds ?? null,
    notes: input.microBeat.notes ?? existing?.notes ?? "",
    createdAt: existing?.createdAt ?? stamp,
    updatedAt: stamp,
  };
  if (existing) Object.assign(existing, row);
  else store.microBeats.push(row);
  touchProject(store, input.projectId);
  await writeDemoStore(store);
  return asMicroBeat(row);
}

export async function demoDeleteMicroBeat(input: { projectId: string; microBeatId: string }) {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  store.microBeats = store.microBeats.filter((item) => item.id !== input.microBeatId);
  touchProject(store, input.projectId);
  await writeDemoStore(store);
}

export async function demoRunSceneReview(input: {
  projectId: string;
  sceneId: string;
  mode: "guided" | "expert";
  dialogueCutTags?: DialogueCutTag[];
}) {
  const tags = z.array(DialogueCutTagSchema).optional().parse(input.dialogueCutTags) ?? [];
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const sceneRow = store.scenes.find((item) => item.id === input.sceneId);
  if (!sceneRow) throw new Error("Scene not found");
  const scene = asScene(sceneRow);
  const microBeats = store.microBeats
    .filter((item) => item.sceneId === input.sceneId)
    .map(asMicroBeat);
  const drafts = runSceneReviewRules({
    heading: scene.heading,
    beatId: scene.beatId,
    summary: scene.summary,
    location: scene.location,
    fields: sceneLabFieldsFromScene(scene),
    microBeats,
    dialogueCutTags: tags,
  });
  const stamp = nowIso();
  const runId = newId();
  store.reviewRuns.push({
    id: runId,
    projectId: input.projectId,
    sceneId: input.sceneId,
    userId: DEMO_USER_ID,
    mode: input.mode,
    rulesetVersion: RULESET_VERSION,
    createdAt: stamp,
  });
  const findings: DemoFinding[] = drafts.map((draft) => ({
    id: newId(),
    runId,
    projectId: input.projectId,
    sceneId: input.sceneId,
    userId: DEMO_USER_ID,
    ruleId: draft.ruleId,
    severity: draft.severity,
    evidenceLocation: draft.evidenceLocation,
    explanation: draft.explanation,
    atlasConceptId: draft.atlasConceptId,
    lessonId: draft.lessonId,
    exerciseId: draft.exerciseId,
    bookId: draft.bookId,
    chapterSlug: draft.chapterSlug,
    sectionId: draft.sectionId,
    headingId: draft.headingId,
    sourceLabel: draft.sourceLabel,
    eli5Topic: draft.eli5Topic,
    dialogueCutTag: draft.dialogueCutTag,
    status: "open",
    userResponse: "",
    createdAt: stamp,
  }));
  store.findings.push(...findings);
  touchProject(store, input.projectId);
  await writeDemoStore(store);
  return {
    runId,
    findings: findings.map(mapFindingView),
    count: drafts.length,
  };
}

export async function demoRespondToFinding(input: {
  projectId: string;
  findingId: string;
  status: FindingStatus;
  userResponse?: string;
}) {
  const status = FindingStatusSchema.parse(input.status);
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const finding = store.findings.find((item) => item.id === input.findingId);
  if (!finding) throw new Error("Finding not found");
  finding.status = status;
  finding.userResponse = input.userResponse ?? "";
  touchProject(store, input.projectId);
  await writeDemoStore(store);
}

export async function demoDeletionTest(input: { projectId: string; sceneId: string }) {
  const store = await readDemoStore();
  requireProject(store, input.projectId);
  const draftId = await demoEnsureDraftId(input.projectId);
  const next = await readDemoStore();
  const scenes = next.scenes.filter((item) => item.draftId === draftId).map(asScene);
  const beats = next.beats.filter((item) => item.draftId === draftId).map(asBeat);
  const scene = scenes.find((item) => item.id === input.sceneId);
  if (!scene) throw new Error("Scene not found");
  const impact = evaluateDeletionTest({
    sceneId: input.sceneId,
    scenes,
    beats,
    fields: sceneLabFieldsFromScene(scene),
  });
  const summary = impact.emptyMessage
    ? impact.emptyMessage
    : [
        impact.setupsLost.length ? `Setups lost: ${impact.setupsLost.join("; ")}` : null,
        impact.payoffsWeakened.length
          ? `Payoffs weakened: ${impact.payoffsWeakened.join("; ")}`
          : null,
        impact.characterDecisionsUnsupported.length
          ? `Character decisions unsupported: ${impact.characterDecisionsUnsupported.join("; ")}`
          : null,
        impact.beatGaps.length ? impact.beatGaps.join("; ") : null,
      ]
        .filter(Boolean)
        .join(" | ");
  const row = next.scenes.find((item) => item.id === input.sceneId)!;
  row.deletionTestResult = summary;
  row.updatedAt = nowIso();
  touchProject(next, input.projectId);
  await writeDemoStore(next);
  return impact;
}

export async function demoDeleteProject(input: {
  projectId: string;
  confirmTitle: string;
}) {
  const store = await readDemoStore();
  const project = requireProject(store, input.projectId);
  if (input.confirmTitle.trim() !== project.title) {
    throw new Error("Confirmation title does not match. Project not deleted.");
  }
  store.projects = store.projects.filter((item) => item.id !== input.projectId);
  store.premises = store.premises.filter((item) => item.projectId !== input.projectId);
  store.characters = store.characters.filter((item) => item.projectId !== input.projectId);
  const draftIds = new Set(
    store.drafts.filter((item) => item.projectId === input.projectId).map((item) => item.id),
  );
  store.drafts = store.drafts.filter((item) => item.projectId !== input.projectId);
  store.beats = store.beats.filter((item) => item.projectId !== input.projectId);
  store.scenes = store.scenes.filter((item) => item.projectId !== input.projectId);
  store.elements = store.elements.filter((item) => !draftIds.has(item.draftId));
  store.microBeats = store.microBeats.filter((item) => item.projectId !== input.projectId);
  store.findings = store.findings.filter((item) => item.projectId !== input.projectId);
  store.reviewRuns = store.reviewRuns.filter((item) => item.projectId !== input.projectId);
  await writeDemoStore(store);
}
