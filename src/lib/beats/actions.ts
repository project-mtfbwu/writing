"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { mapBeatRow, mapSceneRow } from "@/lib/beats/map";
import {
  applyOrderedIds,
  filterTemplateBeatsToInsert,
  projectStructureOrder,
  type Beat,
  type BeatColorKey,
  type Scene,
  type StructureProjection,
} from "@/lib/beats/order";
import { getSystemTemplate } from "@/lib/beats/templates";

export type BeatActionResult = {
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

export async function ensureDraftId(projectId: string): Promise<string> {
  const { supabase } = await requireMember(projectId);
  const { data, error } = await supabase.rpc("ensure_project_draft", {
    p_project_id: projectId,
  });
  if (error || !data) {
    // Fallback without RPC (local/dev without migration applied yet).
    const { data: project } = await supabase
      .from("projects")
      .select("current_draft_id")
      .eq("id", projectId)
      .single();
    if (project?.current_draft_id) return project.current_draft_id;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: draft, error: draftError } = await supabase
      .from("drafts")
      .insert({ project_id: projectId, title: "Draft 1", body: "", version: 1 })
      .select("id")
      .single();
    if (draftError || !draft) throw new Error(draftError?.message ?? "Could not create draft");
    await supabase.from("projects").update({ current_draft_id: draft.id }).eq("id", projectId);
    void user;
    return draft.id;
  }
  return data as string;
}

export async function loadStructureProjection(projectId: string): Promise<{
  draftId: string;
  projection: StructureProjection;
  beats: Beat[];
  scenes: Scene[];
}> {
  const { supabase } = await requireMember(projectId);
  const draftId = await ensureDraftId(projectId);
  const [{ data: beatRows }, { data: sceneRows }] = await Promise.all([
    supabase.from("beats").select("*").eq("draft_id", draftId),
    supabase.from("scenes").select("*").eq("draft_id", draftId),
  ]);
  const beats = (beatRows ?? []).map(mapBeatRow);
  const scenes = (sceneRows ?? []).map(mapSceneRow);
  return {
    draftId,
    beats,
    scenes,
    projection: projectStructureOrder(beats, scenes),
  };
}

function revalidateStructure(projectId: string) {
  revalidatePath(`/projects/${projectId}/structure`);
  revalidatePath(`/projects/${projectId}/beats`);
  revalidatePath(`/projects/${projectId}/scenes`);
  revalidatePath(`/projects/${projectId}`);
}

export async function createBeatAction(input: {
  projectId: string;
  name: string;
  description?: string;
  colorKey?: BeatColorKey;
}): Promise<BeatActionResult & { beat?: Beat }> {
  try {
    const { supabase, user } = await requireMember(input.projectId);
    const draftId = await ensureDraftId(input.projectId);
    const { data: existing } = await supabase
      .from("beats")
      .select("sort_order")
      .eq("draft_id", draftId)
      .order("sort_order", { ascending: false })
      .limit(1);
    const sortOrder = (existing?.[0]?.sort_order ?? -1) + 1;
    const { data, error } = await supabase
      .from("beats")
      .insert({
        project_id: input.projectId,
        draft_id: draftId,
        user_id: user.id,
        name: input.name.trim() || "Untitled beat",
        description: input.description ?? "",
        color_key: input.colorKey ?? "neutral",
        sort_order: sortOrder,
      })
      .select("*")
      .single();
    if (error || !data) return { error: error?.message ?? "Create failed", message: null };
    revalidateStructure(input.projectId);
    return { error: null, message: "Beat created.", beat: mapBeatRow(data) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Create failed", message: null };
  }
}

export async function updateBeatAction(input: {
  projectId: string;
  beatId: string;
  name?: string;
  description?: string;
  colorKey?: BeatColorKey;
  targetPercentage?: number | null;
}): Promise<BeatActionResult> {
  try {
    const { supabase } = await requireMember(input.projectId);
    const { error } = await supabase
      .from("beats")
      .update({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.colorKey !== undefined ? { color_key: input.colorKey } : {}),
        ...(input.targetPercentage !== undefined
          ? { target_percentage: input.targetPercentage }
          : {}),
      })
      .eq("id", input.beatId);
    if (error) return { error: error.message, message: null };
    revalidateStructure(input.projectId);
    return { error: null, message: "Beat updated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Update failed", message: null };
  }
}

export async function deleteBeatAction(input: {
  projectId: string;
  beatId: string;
  confirm: boolean;
}): Promise<BeatActionResult> {
  try {
    if (!input.confirm) {
      return { error: "Confirm deletion. Scenes will move to Unassigned.", message: null };
    }
    const { supabase } = await requireMember(input.projectId);
    // ON DELETE SET NULL moves scenes; never cascade-delete scenes.
    const { error } = await supabase.from("beats").delete().eq("id", input.beatId);
    if (error) return { error: error.message, message: null };
    revalidateStructure(input.projectId);
    return { error: null, message: "Beat deleted. Scenes moved to Unassigned." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Delete failed", message: null };
  }
}

export async function reorderBeatsAction(input: {
  projectId: string;
  orderedIds: string[];
  expectedUpdatedAtById: Record<string, string>;
}): Promise<BeatActionResult> {
  try {
    const { supabase } = await requireMember(input.projectId);
    const draftId = await ensureDraftId(input.projectId);
    const { data } = await supabase.from("beats").select("*").eq("draft_id", draftId);
    const beats = (data ?? []).map(mapBeatRow);
    const applied = applyOrderedIds(beats, input.orderedIds, input.expectedUpdatedAtById);
    if (!applied.ok) {
      return {
        error:
          applied.reason === "stale-version"
            ? "Reorder conflict: another change landed first. Reloading."
            : "Reorder failed: missing beat.",
        message: null,
      };
    }
    for (const beat of applied.items) {
      const { error } = await supabase
        .from("beats")
        .update({ sort_order: beat.sortOrder })
        .eq("id", beat.id)
        .eq("updated_at", input.expectedUpdatedAtById[beat.id]!);
      if (error) return { error: error.message, message: null };
    }
    revalidateStructure(input.projectId);
    return { error: null, message: "Beats reordered." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Reorder failed", message: null };
  }
}

export async function createSceneAction(input: {
  projectId: string;
  beatId: string | null;
  heading?: string;
  summary?: string;
}): Promise<BeatActionResult & { scene?: Scene }> {
  try {
    const { supabase, user } = await requireMember(input.projectId);
    const draftId = await ensureDraftId(input.projectId);
    let existingQuery = supabase
      .from("scenes")
      .select("sort_order")
      .eq("draft_id", draftId)
      .order("sort_order", { ascending: false })
      .limit(1);
    existingQuery = input.beatId
      ? existingQuery.eq("beat_id", input.beatId)
      : existingQuery.is("beat_id", null);
    const { data: existing } = await existingQuery;
    const sortOrder = (existing?.[0]?.sort_order ?? -1) + 1;
    const { data, error } = await supabase
      .from("scenes")
      .insert({
        project_id: input.projectId,
        draft_id: draftId,
        user_id: user.id,
        beat_id: input.beatId,
        heading: input.heading?.trim() || "INT. LOCATION — DAY",
        summary: input.summary ?? "",
        sort_order: sortOrder,
      })
      .select("*")
      .single();
    if (error || !data) return { error: error?.message ?? "Create failed", message: null };
    revalidateStructure(input.projectId);
    return { error: null, message: "Scene created.", scene: mapSceneRow(data) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Create failed", message: null };
  }
}

export async function updateSceneAction(input: {
  projectId: string;
  sceneId: string;
  heading?: string;
  summary?: string;
  location?: string;
  timeOfDay?: string;
  status?: Scene["status"];
}): Promise<BeatActionResult> {
  try {
    const { supabase } = await requireMember(input.projectId);
    const { error } = await supabase
      .from("scenes")
      .update({
        ...(input.heading !== undefined ? { heading: input.heading } : {}),
        ...(input.summary !== undefined ? { summary: input.summary } : {}),
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.timeOfDay !== undefined ? { time_of_day: input.timeOfDay } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      })
      .eq("id", input.sceneId);
    if (error) return { error: error.message, message: null };
    revalidateStructure(input.projectId);
    return { error: null, message: "Scene updated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Update failed", message: null };
  }
}

export async function reassignSceneAction(input: {
  projectId: string;
  sceneId: string;
  beatId: string | null;
  orderedSceneIdsInTarget: string[];
  expectedUpdatedAtById: Record<string, string>;
}): Promise<BeatActionResult> {
  try {
    const { supabase } = await requireMember(input.projectId);
    const draftId = await ensureDraftId(input.projectId);
    const { data: sceneRows } = await supabase.from("scenes").select("*").eq("draft_id", draftId);
    const scenes = (sceneRows ?? []).map(mapSceneRow);
    const targetScenes = scenes
      .filter((scene) =>
        input.beatId ? scene.beatId === input.beatId || scene.id === input.sceneId : scene.beatId === null || scene.id === input.sceneId,
      )
      .map((scene) =>
        scene.id === input.sceneId ? { ...scene, beatId: input.beatId } : scene,
      );

    const applied = applyOrderedIds(
      targetScenes.filter((scene) => input.orderedSceneIdsInTarget.includes(scene.id)),
      input.orderedSceneIdsInTarget,
      input.expectedUpdatedAtById,
    );
    if (!applied.ok) {
      return {
        error:
          applied.reason === "stale-version"
            ? "Reorder conflict: another change landed first. Reloading."
            : "Reassign failed.",
        message: null,
      };
    }

    for (const scene of applied.items) {
      const { error } = await supabase
        .from("scenes")
        .update({
          beat_id: scene.beatId,
          sort_order: scene.sortOrder,
        })
        .eq("id", scene.id);
      if (error) return { error: error.message, message: null };
    }
    revalidateStructure(input.projectId);
    return { error: null, message: "Scene moved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Reassign failed", message: null };
  }
}

export async function applyBeatTemplateAction(input: {
  projectId: string;
  templateKey: string;
}): Promise<BeatActionResult & { added: number }> {
  try {
    const template = getSystemTemplate(input.templateKey);
    if (!template) return { error: "Unknown template.", message: null, added: 0 };
    const { supabase, user } = await requireMember(input.projectId);
    const draftId = await ensureDraftId(input.projectId);
    const { data: existingRows } = await supabase.from("beats").select("*").eq("draft_id", draftId);
    const existing = (existingRows ?? []).map(mapBeatRow);
    const toInsert = filterTemplateBeatsToInsert(existing, template.beats);
    if (toInsert.length === 0) {
      return {
        error: null,
        message: "Template already applied — no duplicate beats created.",
        added: 0,
      };
    }
    const startOrder =
      existing.reduce((max, beat) => Math.max(max, beat.sortOrder), -1) + 1;
    const rows = toInsert.map((beatDef, index) => {
      const full = template.beats.find((item) => item.templateKey === beatDef.templateKey)!;
      return {
        project_id: input.projectId,
        draft_id: draftId,
        user_id: user.id,
        name: full.name,
        description: full.description,
        color_key: full.colorKey,
        sort_order: startOrder + index,
        template_key: full.templateKey,
        target_percentage: full.targetPercentage,
      };
    });
    const { error } = await supabase.from("beats").insert(rows);
    if (error) return { error: error.message, message: null, added: 0 };
    revalidateStructure(input.projectId);
    return {
      error: null,
      message: `Added ${rows.length} template beat(s). Templates are optional starters, not laws.`,
      added: rows.length,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Template apply failed",
      message: null,
      added: 0,
    };
  }
}
