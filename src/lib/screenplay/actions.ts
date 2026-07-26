"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureDraftId } from "@/lib/beats/actions";
import { mapElementRow } from "@/lib/screenplay/map";
import {
  parseSceneHeading,
  type ScreenplayElement,
  type ScreenplayElementType,
} from "@/lib/screenplay/model";
import { exportFountain, exportPlainText } from "@/lib/screenplay/export";
import type { Json } from "@/types/database";
import { isDemoSession } from "@/lib/demo/session-state";
import {
  demoAssignSceneBeat,
  demoClearCurrentDraft,
  demoCreateDraft,
  demoDeleteElement,
  demoDuplicateDraft,
  demoExportScreenplay,
  demoLoadScreenplay,
  demoRenameDraft,
  demoReorderElements,
  demoSwitchDraft,
  demoSyncSceneHeading,
  demoUpsertElement,
} from "@/lib/demo/repository";

export type ScreenplayActionResult = {
  error: string | null;
  message: string | null;
};

async function requireMember(projectId: string) {
  if (await isDemoSession()) throw new Error("DEMO_SESSION");
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

function revalidateScreenplay(projectId: string) {
  revalidatePath(`/projects/${projectId}/screenplay`);
  revalidatePath(`/projects/${projectId}/structure`);
  revalidatePath(`/projects/${projectId}/scenes`);
  revalidatePath(`/projects/${projectId}`);
}

export async function loadScreenplayDocument(projectId: string, draftId?: string) {
  if (await isDemoSession()) {
    return demoLoadScreenplay(projectId, draftId);
  }
  const { supabase, user } = await requireMember(projectId);
  const activeDraftId = draftId ?? (await ensureDraftId(projectId));
  const [{ data: draft }, { data: elementRows }, { data: drafts }, { data: characters }] =
    await Promise.all([
      supabase.from("drafts").select("*").eq("id", activeDraftId).maybeSingle(),
      supabase
        .from("screenplay_elements")
        .select("*")
        .eq("draft_id", activeDraftId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("drafts")
        .select("id, title, revision, updated_at, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase.from("characters").select("id, name").eq("project_id", projectId).order("name"),
    ]);

  if (!draft) throw new Error("Draft not found.");

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, current_draft_id")
    .eq("id", projectId)
    .single();

  return {
    userId: user.id,
    project,
    draft,
    drafts: drafts ?? [],
    elements: (elementRows ?? []).map(mapElementRow),
    characterNames: (characters ?? []).map((row) => row.name).filter(Boolean),
  };
}

export async function upsertScreenplayElementAction(input: {
  projectId: string;
  element: ScreenplayElement;
  expectedUpdatedAt: string | null;
}): Promise<ScreenplayActionResult & { element?: ScreenplayElement }> {
  try {
    if (await isDemoSession()) {
      const element = await demoUpsertElement(input);
      return { error: null, message: "Saved", element };
    }
    const { supabase, user } = await requireMember(input.projectId);
    const row = {
      id: input.element.id,
      project_id: input.projectId,
      draft_id: input.element.draftId,
      scene_id: input.element.sceneId,
      user_id: user.id,
      element_type: input.element.elementType,
      content: input.element.content,
      sort_order: input.element.sortOrder,
      metadata: input.element.metadata as Json,
    };

    if (input.expectedUpdatedAt) {
      const { data: existing } = await supabase
        .from("screenplay_elements")
        .select("updated_at")
        .eq("id", input.element.id)
        .maybeSingle();
      if (existing && existing.updated_at !== input.expectedUpdatedAt) {
        return {
          error: "Conflict: this element changed elsewhere. Reload or retry — your local text is kept.",
          message: null,
        };
      }
    }

    const { data, error } = await supabase
      .from("screenplay_elements")
      .upsert(row)
      .select("*")
      .single();
    if (error || !data) return { error: error?.message ?? "Save failed", message: null };

    await bumpDraftRevision(supabase, input.element.draftId);
    return { error: null, message: "Saved", element: mapElementRow(data) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Save failed", message: null };
  }
}

export async function deleteScreenplayElementAction(input: {
  projectId: string;
  elementId: string;
  expectedUpdatedAt: string | null;
}): Promise<ScreenplayActionResult> {
  try {
    if (await isDemoSession()) {
      await demoDeleteElement(input);
      return { error: null, message: "Deleted" };
    }
    const { supabase } = await requireMember(input.projectId);
    if (input.expectedUpdatedAt) {
      const { data: existing } = await supabase
        .from("screenplay_elements")
        .select("updated_at, draft_id")
        .eq("id", input.elementId)
        .maybeSingle();
      if (existing && existing.updated_at !== input.expectedUpdatedAt) {
        return {
          error: "Conflict deleting element. Local text was not discarded.",
          message: null,
        };
      }
    }
    const { data: removed, error } = await supabase
      .from("screenplay_elements")
      .delete()
      .eq("id", input.elementId)
      .select("draft_id")
      .maybeSingle();
    if (error) return { error: error.message, message: null };
    if (removed?.draft_id) await bumpDraftRevision(supabase, removed.draft_id);
    return { error: null, message: "Deleted" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Delete failed", message: null };
  }
}

export async function reorderScreenplayElementsAction(input: {
  projectId: string;
  draftId: string;
  orderedIds: string[];
  expectedRevision: number;
}): Promise<ScreenplayActionResult> {
  try {
    if (await isDemoSession()) {
      await demoReorderElements(input);
      return { error: null, message: "Reordered" };
    }
    const { supabase } = await requireMember(input.projectId);
    const { data: draft } = await supabase
      .from("drafts")
      .select("revision")
      .eq("id", input.draftId)
      .single();
    if (!draft) return { error: "Draft missing", message: null };
    if (draft.revision !== input.expectedRevision) {
      return {
        error: "Reorder conflict: draft revision changed. Local order kept until you retry.",
        message: null,
      };
    }
    for (let index = 0; index < input.orderedIds.length; index += 1) {
      const id = input.orderedIds[index]!;
      const { error } = await supabase
        .from("screenplay_elements")
        .update({ sort_order: index })
        .eq("id", id);
      if (error) return { error: error.message, message: null };
    }
    await bumpDraftRevision(supabase, input.draftId);
    return { error: null, message: "Reordered" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Reorder failed", message: null };
  }
}

export async function syncSceneHeadingAction(input: {
  projectId: string;
  draftId: string;
  elementId: string;
  content: string;
  sceneId: string | null;
}): Promise<ScreenplayActionResult & { sceneId?: string }> {
  try {
    if (await isDemoSession()) {
      const sceneId = await demoSyncSceneHeading(input);
      revalidateScreenplay(input.projectId);
      return { error: null, message: "Scene attached", sceneId };
    }
    const { supabase, user } = await requireMember(input.projectId);
    const parsed = parseSceneHeading(input.content);
    if (input.sceneId) {
      const { error } = await supabase
        .from("scenes")
        .update({
          heading: input.content.trim() || "INT. LOCATION — DAY",
          location: parsed.location,
          time_of_day: parsed.timeOfDay,
        })
        .eq("id", input.sceneId);
      if (error) return { error: error.message, message: null };
      await supabase
        .from("screenplay_elements")
        .update({ scene_id: input.sceneId, element_type: "scene_heading" satisfies ScreenplayElementType })
        .eq("id", input.elementId);
      return { error: null, message: "Scene updated", sceneId: input.sceneId };
    }

    const { data: existing } = await supabase
      .from("scenes")
      .select("sort_order")
      .eq("draft_id", input.draftId)
      .order("sort_order", { ascending: false })
      .limit(1);
    const sortOrder = (existing?.[0]?.sort_order ?? -1) + 1;
    const { data: scene, error } = await supabase
      .from("scenes")
      .insert({
        project_id: input.projectId,
        draft_id: input.draftId,
        user_id: user.id,
        beat_id: null,
        heading: input.content.trim() || "INT. LOCATION — DAY",
        location: parsed.location,
        time_of_day: parsed.timeOfDay,
        sort_order: sortOrder,
        summary: "",
      })
      .select("id")
      .single();
    if (error || !scene) return { error: error?.message ?? "Scene create failed", message: null };

    await supabase
      .from("screenplay_elements")
      .update({ scene_id: scene.id, element_type: "scene_heading" })
      .eq("id", input.elementId);

    revalidateScreenplay(input.projectId);
    return { error: null, message: "Scene attached", sceneId: scene.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Scene sync failed", message: null };
  }
}

export async function assignSceneBeatAction(input: {
  projectId: string;
  sceneId: string;
  beatId: string | null;
}): Promise<ScreenplayActionResult> {
  try {
    if (await isDemoSession()) {
      await demoAssignSceneBeat(input);
      revalidateScreenplay(input.projectId);
      return { error: null, message: "Beat assignment saved" };
    }
    const { supabase } = await requireMember(input.projectId);
    const { error } = await supabase
      .from("scenes")
      .update({ beat_id: input.beatId })
      .eq("id", input.sceneId);
    if (error) return { error: error.message, message: null };
    revalidateScreenplay(input.projectId);
    return { error: null, message: "Beat assignment saved" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Assignment failed", message: null };
  }
}

export async function createDraftAction(input: {
  projectId: string;
  title: string;
}): Promise<ScreenplayActionResult & { draftId?: string }> {
  try {
    if (await isDemoSession()) {
      const draftId = await demoCreateDraft(input);
      revalidateScreenplay(input.projectId);
      return { error: null, message: "Draft created", draftId };
    }
    const { supabase } = await requireMember(input.projectId);
    const { data, error } = await supabase
      .from("drafts")
      .insert({
        project_id: input.projectId,
        title: input.title.trim() || "Untitled draft",
        body: "",
        version: 1,
        revision: 1,
      })
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "Create failed", message: null };
    await supabase.from("projects").update({ current_draft_id: data.id }).eq("id", input.projectId);
    revalidateScreenplay(input.projectId);
    return { error: null, message: "Draft created", draftId: data.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Create failed", message: null };
  }
}

export async function renameDraftAction(input: {
  projectId: string;
  draftId: string;
  title: string;
}): Promise<ScreenplayActionResult> {
  try {
    if (await isDemoSession()) {
      await demoRenameDraft(input);
      revalidateScreenplay(input.projectId);
      return { error: null, message: "Draft renamed" };
    }
    const { supabase } = await requireMember(input.projectId);
    const { error } = await supabase
      .from("drafts")
      .update({ title: input.title.trim() || "Untitled draft" })
      .eq("id", input.draftId);
    if (error) return { error: error.message, message: null };
    revalidateScreenplay(input.projectId);
    return { error: null, message: "Draft renamed" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Rename failed", message: null };
  }
}

export async function switchDraftAction(input: {
  projectId: string;
  draftId: string;
}): Promise<ScreenplayActionResult> {
  try {
    if (await isDemoSession()) {
      await demoSwitchDraft(input);
      revalidateScreenplay(input.projectId);
      return { error: null, message: "Draft switched" };
    }
    const { supabase } = await requireMember(input.projectId);
    const { error } = await supabase
      .from("projects")
      .update({ current_draft_id: input.draftId })
      .eq("id", input.projectId);
    if (error) return { error: error.message, message: null };
    revalidateScreenplay(input.projectId);
    return { error: null, message: "Draft switched" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Switch failed", message: null };
  }
}

export async function clearCurrentDraftAction(input: {
  projectId: string;
}): Promise<ScreenplayActionResult> {
  try {
    if (await isDemoSession()) {
      await demoClearCurrentDraft(input);
      revalidateScreenplay(input.projectId);
      return { error: null, message: "Current-draft indicator cleared" };
    }
    const { supabase } = await requireMember(input.projectId);
    const { error } = await supabase
      .from("projects")
      .update({ current_draft_id: null })
      .eq("id", input.projectId);
    if (error) return { error: error.message, message: null };
    revalidateScreenplay(input.projectId);
    return { error: null, message: "Current-draft indicator cleared" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Clear failed", message: null };
  }
}

/**
 * Duplicate draft: copy elements; beats/scenes stay on source draft.
 * Does not overwrite another draft.
 */
export async function duplicateDraftAction(input: {
  projectId: string;
  sourceDraftId: string;
  title?: string;
}): Promise<ScreenplayActionResult & { draftId?: string }> {
  try {
    if (await isDemoSession()) {
      const draftId = await demoDuplicateDraft(input);
      revalidateScreenplay(input.projectId);
      return { error: null, message: "Draft duplicated", draftId };
    }
    const { supabase, user } = await requireMember(input.projectId);
    const { data: source } = await supabase
      .from("drafts")
      .select("*")
      .eq("id", input.sourceDraftId)
      .single();
    if (!source) return { error: "Source draft missing", message: null };

    const { data: created, error } = await supabase
      .from("drafts")
      .insert({
        project_id: input.projectId,
        title: input.title?.trim() || `${source.title} (copy)`,
        body: source.body,
        version: source.version + 1,
        revision: 1,
      })
      .select("id")
      .single();
    if (error || !created) return { error: error?.message ?? "Duplicate failed", message: null };

    const { data: elements } = await supabase
      .from("screenplay_elements")
      .select("*")
      .eq("draft_id", input.sourceDraftId)
      .order("sort_order");

    if (elements && elements.length > 0) {
      const rows = elements.map((element) => ({
        project_id: input.projectId,
        draft_id: created.id,
        scene_id: null,
        user_id: user.id,
        element_type: element.element_type,
        content: element.content,
        sort_order: element.sort_order,
        metadata: element.metadata,
      }));
      const { error: copyError } = await supabase.from("screenplay_elements").insert(rows);
      if (copyError) return { error: copyError.message, message: null };
    }

    await supabase.from("draft_versions").insert({
      project_id: input.projectId,
      draft_id: created.id,
      user_id: user.id,
      revision: 1,
      label: "duplicated",
      note: `Copied from ${source.title}`,
    });

    await supabase.from("projects").update({ current_draft_id: created.id }).eq("id", input.projectId);
    revalidateScreenplay(input.projectId);
    return { error: null, message: "Draft duplicated", draftId: created.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Duplicate failed", message: null };
  }
}

export async function exportScreenplayAction(input: {
  projectId: string;
  draftId: string;
  format: "fountain" | "plaintext";
}): Promise<{ error: string | null; content: string | null; filename: string | null }> {
  try {
    if (await isDemoSession()) {
      const exported = await demoExportScreenplay(input);
      return { error: null, content: exported.content, filename: exported.filename };
    }
    const { supabase } = await requireMember(input.projectId);
    const [{ data: draft }, { data: rows }] = await Promise.all([
      supabase.from("drafts").select("title").eq("id", input.draftId).single(),
      supabase
        .from("screenplay_elements")
        .select("*")
        .eq("draft_id", input.draftId)
        .order("sort_order"),
    ]);
    const elements = (rows ?? []).map(mapElementRow);
    const content =
      input.format === "fountain"
        ? exportFountain(elements, draft?.title)
        : exportPlainText(elements);
    const ext = input.format === "fountain" ? "fountain" : "txt";
    return {
      error: null,
      content,
      filename: `${(draft?.title || "screenplay").replace(/[^\w\-]+/g, "_")}.${ext}`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Export failed",
      content: null,
      filename: null,
    };
  }
}

async function bumpDraftRevision(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  draftId: string,
) {
  const { data } = await supabase.from("drafts").select("revision").eq("id", draftId).single();
  const next = (data?.revision ?? 1) + 1;
  await supabase.from("drafts").update({ revision: next }).eq("id", draftId);
}
