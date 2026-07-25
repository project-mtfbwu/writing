"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureDraftId } from "@/lib/beats/actions";
import { mapSceneRow } from "@/lib/beats/map";
import { mapMicroBeatRow } from "@/lib/scene-lab/map";
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
import type { Scene } from "@/lib/beats/order";
import { buildReaderDeepLink } from "@/lib/library/related";
import { atlasHref, exerciseHref, lessonHref } from "@/lib/scene-lab/learning-links";
import { mapBeatRow } from "@/lib/beats/map";

export type SceneLabActionResult = {
  error: string | null;
  message: string | null;
};

async function requireMember(projectId: string) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  const { data: membership } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) throw new Error("You do not have access to this project.");
  return { supabase, user };
}

function revalidateSceneLab(projectId: string) {
  revalidatePath(`/projects/${projectId}/scene-lab`);
  revalidatePath(`/projects/${projectId}/scenes`);
  revalidatePath(`/projects/${projectId}/structure`);
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

export type SceneReviewFindingView = {
  id: string;
  ruleId: string;
  severity: "suggestion" | "warning" | "blocker";
  evidenceLocation: string;
  explanation: string;
  atlasConceptId: string;
  lessonId: string;
  exerciseId: string;
  bookId: string;
  chapterSlug: string;
  sectionId: string | null;
  headingId: string | null;
  sourceLabel: string;
  eli5Topic: string;
  dialogueCutTag: DialogueCutTag | null;
  status: FindingStatus;
  userResponse: string;
  sourceHref: string | null;
  atlasHref: string;
  lessonHref: string | null;
  exerciseHref: string | null;
};

export async function loadSceneLabDocument(projectId: string, sceneId?: string) {
  const { supabase, user } = await requireMember(projectId);
  const draftId = await ensureDraftId(projectId);
  const [{ data: beatRows }, { data: sceneRows }, { data: project }] = await Promise.all([
    supabase.from("beats").select("*").eq("draft_id", draftId).order("sort_order"),
    supabase.from("scenes").select("*").eq("draft_id", draftId).order("sort_order"),
    supabase.from("projects").select("id, title").eq("id", projectId).single(),
  ]);

  const scenes = (sceneRows ?? []).map(mapSceneRow);
  const beats = (beatRows ?? []).map(mapBeatRow);

  const active =
    scenes.find((scene) => scene.id === sceneId) ?? scenes[0] ?? null;

  let microBeats: MicroBeat[] = [];
  let findings: SceneReviewFindingView[] = [];
  if (active) {
    const [{ data: microRows }, { data: findingRows }] = await Promise.all([
      supabase
        .from("micro_beats")
        .select("*")
        .eq("scene_id", active.id)
        .order("sort_order"),
      supabase
        .from("scene_review_findings")
        .select("*")
        .eq("scene_id", active.id)
        .order("created_at", { ascending: false }),
    ]);
    microBeats = (microRows ?? []).map(mapMicroBeatRow);
    findings = (findingRows ?? []).map(mapFindingRow);
  }

  return {
    userId: user.id,
    project,
    beats,
    scenes,
    activeScene: active,
    microBeats,
    findings,
  };
}

function mapFindingRow(row: {
  id: string;
  rule_id: string;
  severity: "suggestion" | "warning" | "blocker";
  evidence_location: string;
  explanation: string;
  atlas_concept_id: string;
  lesson_id: string;
  exercise_id: string;
  book_id: string;
  chapter_slug: string;
  section_id: string | null;
  heading_id: string | null;
  source_label: string;
  eli5_topic: string;
  dialogue_cut_tag: DialogueCutTag | null;
  status: FindingStatus;
  user_response: string;
}): SceneReviewFindingView {
  const sourceHref =
    row.book_id && row.chapter_slug
      ? buildReaderDeepLink({
          bookId: row.book_id,
          chapterSlug: row.chapter_slug,
          sectionId: row.section_id,
          headingId: row.heading_id,
        })
      : null;
  return {
    id: row.id,
    ruleId: row.rule_id,
    severity: row.severity,
    evidenceLocation: row.evidence_location,
    explanation: row.explanation,
    atlasConceptId: row.atlas_concept_id,
    lessonId: row.lesson_id,
    exerciseId: row.exercise_id,
    bookId: row.book_id,
    chapterSlug: row.chapter_slug,
    sectionId: row.section_id,
    headingId: row.heading_id,
    sourceLabel: row.source_label,
    eli5Topic: row.eli5_topic,
    dialogueCutTag: row.dialogue_cut_tag,
    status: row.status,
    userResponse: row.user_response,
    sourceHref,
    atlasHref: atlasHref(row.atlas_concept_id || "scene"),
    lessonHref: lessonHref(row.lesson_id),
    exerciseHref: exerciseHref(row.exercise_id),
  };
}

export async function updateSceneLabFieldsAction(input: {
  projectId: string;
  sceneId: string;
  patch: z.infer<typeof SceneLabFieldsPatchSchema>;
}): Promise<SceneLabActionResult & { scene?: Scene }> {
  try {
    const parsed = SceneLabFieldsPatchSchema.parse(input.patch);
    const { supabase } = await requireMember(input.projectId);
    const { data, error } = await supabase
      .from("scenes")
      .update({
        ...(parsed.summary !== undefined ? { summary: parsed.summary } : {}),
        ...(parsed.heading !== undefined ? { heading: parsed.heading } : {}),
        ...(parsed.location !== undefined ? { location: parsed.location } : {}),
        ...(parsed.timeOfDay !== undefined ? { time_of_day: parsed.timeOfDay } : {}),
        ...(parsed.beatId !== undefined ? { beat_id: parsed.beatId } : {}),
        ...(parsed.povOwner !== undefined ? { pov_owner: parsed.povOwner } : {}),
        ...(parsed.sceneObjective !== undefined
          ? { scene_objective: parsed.sceneObjective }
          : {}),
        ...(parsed.whyNow !== undefined ? { why_now: parsed.whyNow } : {}),
        ...(parsed.obstacle !== undefined ? { obstacle: parsed.obstacle } : {}),
        ...(parsed.tactics !== undefined ? { tactics: parsed.tactics } : {}),
        ...(parsed.turnDescription !== undefined
          ? { turn_description: parsed.turnDescription }
          : {}),
        ...(parsed.chargeIn !== undefined ? { charge_in: parsed.chargeIn } : {}),
        ...(parsed.chargeOut !== undefined ? { charge_out: parsed.chargeOut } : {}),
        ...(parsed.object !== undefined ? { object: parsed.object } : {}),
        ...(parsed.lightSource !== undefined ? { light_source: parsed.lightSource } : {}),
        ...(parsed.environment !== undefined ? { environment: parsed.environment } : {}),
        ...(parsed.backgroundLife !== undefined
          ? { background_life: parsed.backgroundLife }
          : {}),
        ...(parsed.register !== undefined ? { register: parsed.register } : {}),
        ...(parsed.deletionTestResult !== undefined
          ? { deletion_test_result: parsed.deletionTestResult }
          : {}),
        ...(parsed.longDraft !== undefined ? { long_draft: parsed.longDraft } : {}),
        ...(parsed.dialogueNotes !== undefined
          ? { dialogue_notes: parsed.dialogueNotes }
          : {}),
        ...(parsed.setupsProvided !== undefined
          ? { setups_provided: parsed.setupsProvided }
          : {}),
        ...(parsed.payoffsSupported !== undefined
          ? { payoffs_supported: parsed.payoffsSupported }
          : {}),
        ...(parsed.characterDecisionsSupported !== undefined
          ? { character_decisions_supported: parsed.characterDecisionsSupported }
          : {}),
      })
      .eq("id", input.sceneId)
      .select("*")
      .single();
    if (error || !data) return { error: error?.message ?? "Save failed", message: null };
    revalidateSceneLab(input.projectId);
    return { error: null, message: "Scene Lab fields saved.", scene: mapSceneRow(data) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Save failed", message: null };
  }
}

export async function upsertMicroBeatAction(input: {
  projectId: string;
  sceneId: string;
  microBeat: Partial<MicroBeat> & { id?: string };
}): Promise<SceneLabActionResult & { microBeat?: MicroBeat }> {
  try {
    const { supabase, user } = await requireMember(input.projectId);
    const loadOrAbsorb = LoadOrAbsorbSchema.parse(input.microBeat.loadOrAbsorb ?? "Load");
    const row = {
      id: input.microBeat.id,
      project_id: input.projectId,
      scene_id: input.sceneId,
      user_id: user.id,
      sort_order: input.microBeat.sortOrder ?? 0,
      action_tactic: input.microBeat.actionTactic ?? "",
      reaction_resistance: input.microBeat.reactionResistance ?? "",
      adjustment: input.microBeat.adjustment ?? "",
      load_or_absorb: loadOrAbsorb,
      element_range_start: input.microBeat.elementRangeStart ?? null,
      element_range_end: input.microBeat.elementRangeEnd ?? null,
      duration_estimate_seconds: input.microBeat.durationEstimateSeconds ?? null,
      notes: input.microBeat.notes ?? "",
    };
    const { data, error } = await supabase.from("micro_beats").upsert(row).select("*").single();
    if (error || !data) return { error: error?.message ?? "Micro-beat save failed", message: null };
    revalidateSceneLab(input.projectId);
    return { error: null, message: "Micro-beat saved.", microBeat: mapMicroBeatRow(data) };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Micro-beat save failed",
      message: null,
    };
  }
}

export async function deleteMicroBeatAction(input: {
  projectId: string;
  microBeatId: string;
}): Promise<SceneLabActionResult> {
  try {
    const { supabase } = await requireMember(input.projectId);
    const { error } = await supabase.from("micro_beats").delete().eq("id", input.microBeatId);
    if (error) return { error: error.message, message: null };
    revalidateSceneLab(input.projectId);
    return { error: null, message: "Micro-beat deleted." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Delete failed", message: null };
  }
}

export async function runSceneReviewAction(input: {
  projectId: string;
  sceneId: string;
  mode: "guided" | "expert";
  dialogueCutTags?: DialogueCutTag[];
}): Promise<SceneLabActionResult & { findings?: SceneReviewFindingView[]; runId?: string }> {
  try {
    const tags = z.array(DialogueCutTagSchema).optional().parse(input.dialogueCutTags) ?? [];
    const { supabase, user } = await requireMember(input.projectId);
    const { data: sceneRow } = await supabase
      .from("scenes")
      .select("*")
      .eq("id", input.sceneId)
      .single();
    if (!sceneRow) return { error: "Scene not found", message: null };
    const scene = mapSceneRow(sceneRow);
    const { data: microRows } = await supabase
      .from("micro_beats")
      .select("*")
      .eq("scene_id", input.sceneId)
      .order("sort_order");
    const microBeats = (microRows ?? []).map(mapMicroBeatRow);

    const drafts = runSceneReviewRules({
      heading: scene.heading,
      beatId: scene.beatId,
      summary: scene.summary,
      location: scene.location,
      fields: sceneLabFieldsFromScene(scene),
      microBeats,
      dialogueCutTags: tags,
    });

    const { data: run, error: runError } = await supabase
      .from("scene_review_runs")
      .insert({
        project_id: input.projectId,
        scene_id: input.sceneId,
        user_id: user.id,
        mode: input.mode,
        ruleset_version: RULESET_VERSION,
      })
      .select("*")
      .single();
    if (runError || !run) return { error: runError?.message ?? "Review run failed", message: null };

    if (drafts.length > 0) {
      const rows = drafts.map((draft) => ({
        run_id: run.id,
        project_id: input.projectId,
        scene_id: input.sceneId,
        user_id: user.id,
        rule_id: draft.ruleId,
        severity: draft.severity,
        evidence_location: draft.evidenceLocation,
        explanation: draft.explanation,
        atlas_concept_id: draft.atlasConceptId,
        lesson_id: draft.lessonId,
        exercise_id: draft.exerciseId,
        book_id: draft.bookId,
        chapter_slug: draft.chapterSlug,
        section_id: draft.sectionId,
        heading_id: draft.headingId,
        source_label: draft.sourceLabel,
        eli5_topic: draft.eli5Topic,
        dialogue_cut_tag: draft.dialogueCutTag,
        status: "open" as const,
        user_response: "",
      }));
      const { error } = await supabase.from("scene_review_findings").insert(rows);
      if (error) return { error: error.message, message: null };
    }

    const { data: findingRows } = await supabase
      .from("scene_review_findings")
      .select("*")
      .eq("run_id", run.id)
      .order("created_at");

    revalidateSceneLab(input.projectId);
    return {
      error: null,
      message: `Review complete — ${drafts.length} finding(s). No overall score is produced.`,
      runId: run.id,
      findings: (findingRows ?? []).map(mapFindingRow),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Review failed", message: null };
  }
}

export async function respondToFindingAction(input: {
  projectId: string;
  findingId: string;
  status: FindingStatus;
  userResponse?: string;
}): Promise<SceneLabActionResult> {
  try {
    const status = FindingStatusSchema.parse(input.status);
    const { supabase } = await requireMember(input.projectId);
    const { error } = await supabase
      .from("scene_review_findings")
      .update({
        status,
        user_response: input.userResponse ?? "",
      })
      .eq("id", input.findingId);
    if (error) return { error: error.message, message: null };
    revalidateSceneLab(input.projectId);
    return { error: null, message: `Finding marked ${status}. Scene text was not rewritten.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Update failed", message: null };
  }
}

export async function deletionTestAction(input: {
  projectId: string;
  sceneId: string;
}): Promise<
  SceneLabActionResult & {
    impact?: ReturnType<typeof evaluateDeletionTest>;
  }
> {
  try {
    const { supabase } = await requireMember(input.projectId);
    const draftId = await ensureDraftId(input.projectId);
    const [{ data: sceneRows }, { data: beatRows }] = await Promise.all([
      supabase.from("scenes").select("*").eq("draft_id", draftId),
      supabase.from("beats").select("*").eq("draft_id", draftId),
    ]);
    const scenes = (sceneRows ?? []).map(mapSceneRow);
    const beats = (beatRows ?? []).map(mapBeatRow);
    const scene = scenes.find((item) => item.id === input.sceneId);
    if (!scene) return { error: "Scene not found", message: null };

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

    await supabase
      .from("scenes")
      .update({ deletion_test_result: summary })
      .eq("id", input.sceneId);

    revalidateSceneLab(input.projectId);
    return { error: null, message: "Deletion test recorded.", impact };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Deletion test failed", message: null };
  }
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
