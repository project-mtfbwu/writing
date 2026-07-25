"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { CharacterFields, PremiseFields } from "@/lib/projects/premise";
import { assemblePremisePreview } from "@/lib/projects/premise";
import { assertWriteRateLimit } from "@/lib/security/rate-limit";
import { serverLog } from "@/lib/logging/server";
import { mapBeatRow, mapSceneRow } from "@/lib/beats/map";
import { mapElementRow } from "@/lib/screenplay/map";
import {
  buildFountainFromElements,
  findingsToMarkdown,
  projectToMarkdownSummary,
} from "@/lib/export/project-export";

export type ProjectActionState = {
  error: string | null;
  message: string | null;
};

async function requireUser() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  return { supabase, user };
}

export async function createProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  try {
    const { supabase, user } = await requireUser();
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return { error: "Title is required.", message: null };
    const format = String(formData.get("format") ?? "feature");
    const genre = String(formData.get("genre") ?? "").trim();
    const tone = String(formData.get("tone") ?? "").trim();

    const { data, error } = await supabase
      .from("projects")
      .insert({
        owner_id: user.id,
        title,
        format,
        genre,
        tone,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !data) return { error: error?.message ?? "Could not create project.", message: null };
    revalidatePath("/projects");
    redirect(`/projects/${data.id}`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return {
      error: error instanceof Error ? error.message : "Could not create project.",
      message: null,
    };
  }
}

export async function updatePremiseAction(
  projectId: string,
  fields: PremiseFields,
): Promise<ProjectActionState> {
  try {
    const { supabase } = await requireUser();
    const preview = assemblePremisePreview(fields);
    const { error } = await supabase
      .from("premises")
      .update({
        title: fields.title,
        format: fields.format,
        genre: fields.genre,
        tone: fields.tone,
        protagonist: fields.protagonist,
        inciting_incident: fields.incitingIncident,
        goal: fields.goal,
        stakes: fields.stakes,
        obstacle: fields.obstacle,
        controlling_idea: fields.controllingIdea,
      })
      .eq("project_id", projectId);

    if (error) return { error: error.message, message: null };

    await supabase
      .from("projects")
      .update({
        title: fields.title || undefined,
        format: fields.format,
        genre: fields.genre,
        tone: fields.tone,
        logline: preview.split("\n\n")[0] ?? "",
        controlling_idea: fields.controllingIdea,
      })
      .eq("id", projectId);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/premise`);
    return { error: null, message: "Premise saved." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save premise.",
      message: null,
    };
  }
}

export async function upsertCharacterAction(
  projectId: string,
  characterId: string | null,
  fields: CharacterFields,
): Promise<ProjectActionState & { characterId?: string }> {
  try {
    const { supabase } = await requireUser();
    const payload = {
      project_id: projectId,
      name: fields.name,
      role: fields.role,
      want: fields.want,
      need: fields.need,
      wound: fields.wound,
      lie: fields.lie,
      arc: fields.arc,
      method: fields.method,
      relationship_to_theme: fields.relationshipToTheme,
      register: fields.register,
      notes: fields.notes,
    };

    if (characterId) {
      const { error } = await supabase.from("characters").update(payload).eq("id", characterId);
      if (error) return { error: error.message, message: null };
      revalidatePath(`/projects/${projectId}/characters`);
      return { error: null, message: "Character saved.", characterId };
    }

    const { data, error } = await supabase.from("characters").insert(payload).select("id").single();
    if (error || !data) return { error: error?.message ?? "Insert failed.", message: null };
    revalidatePath(`/projects/${projectId}/characters`);
    return { error: null, message: "Character created.", characterId: data.id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save character.",
      message: null,
    };
  }
}

export async function applyExerciseToProjectAction(input: {
  projectId: string;
  entityType: "premise" | "character";
  entityId: string | null;
  field: string;
  value: string;
  confirmOverwrite: boolean;
  attempt: {
    id: string;
    contentVersion: string;
    courseId: string;
    lessonId: string;
    exerciseId: string;
    response: unknown;
    passed: boolean;
    feedback: string;
    attemptNumber: number;
  };
}): Promise<ProjectActionState> {
  try {
    const { supabase, user } = await requireUser();
    if (!input.confirmOverwrite) {
      return {
        error: "Confirm overwrite before applying to project writing.",
        message: null,
      };
    }

    if (input.entityType === "premise") {
      const allowed = [
        "title",
        "format",
        "genre",
        "tone",
        "protagonist",
        "inciting_incident",
        "goal",
        "stakes",
        "obstacle",
        "controlling_idea",
      ] as const;
      type PremiseField = (typeof allowed)[number];
      if (!allowed.includes(input.field as PremiseField)) {
        return { error: "That premise field cannot be updated from this exercise.", message: null };
      }
      const field = input.field as PremiseField;
      const { error } = await supabase
        .from("premises")
        .update({ [field]: input.value } as {
          title?: string;
          format?: string;
          genre?: string;
          tone?: string;
          protagonist?: string;
          inciting_incident?: string;
          goal?: string;
          stakes?: string;
          obstacle?: string;
          controlling_idea?: string;
        })
        .eq("project_id", input.projectId);
      if (error) return { error: error.message, message: null };
    } else {
      if (!input.entityId) return { error: "Select a character.", message: null };
      const allowed = [
        "name",
        "role",
        "want",
        "need",
        "wound",
        "lie",
        "arc",
        "method",
        "relationship_to_theme",
        "register",
        "notes",
      ] as const;
      type CharacterField = (typeof allowed)[number];
      if (!allowed.includes(input.field as CharacterField)) {
        return { error: "That character field cannot be updated from this exercise.", message: null };
      }
      const field = input.field as CharacterField;
      const { error } = await supabase
        .from("characters")
        .update({ [field]: input.value } as {
          name?: string;
          role?: string;
          want?: string;
          need?: string;
          wound?: string;
          lie?: string;
          arc?: string;
          method?: string;
          relationship_to_theme?: string;
          register?: string;
          notes?: string;
        })
        .eq("id", input.entityId)
        .eq("project_id", input.projectId);
      if (error) return { error: error.message, message: null };
    }

    const { error: attemptError } = await supabase.from("exercise_attempts").upsert({
      id: input.attempt.id,
      user_id: user.id,
      content_version: input.attempt.contentVersion,
      course_id: input.attempt.courseId,
      lesson_id: input.attempt.lessonId,
      exercise_id: input.attempt.exerciseId,
      response: input.attempt.response as never,
      passed: input.attempt.passed,
      feedback: input.attempt.feedback,
      attempt_number: input.attempt.attemptNumber,
      original_answer: input.attempt.response as never,
      applied_project_id: input.projectId,
      applied_entity_type: input.entityType,
      applied_entity_id: input.entityId ?? input.projectId,
      applied_at: new Date().toISOString(),
    });

    if (attemptError) return { error: attemptError.message, message: null };

    revalidatePath(`/projects/${input.projectId}`);
    return { error: null, message: "Applied to project. Original answer kept in exercise history." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Apply failed.",
      message: null,
    };
  }
}

export async function deleteProjectAction(input: {
  projectId: string;
  confirmTitle: string;
}): Promise<ProjectActionState> {
  try {
    const { supabase, user } = await requireUser();
    assertWriteRateLimit(`delete-project:${user.id}`);
    const { data: project } = await supabase
      .from("projects")
      .select("id, title, owner_id")
      .eq("id", input.projectId)
      .maybeSingle();
    if (!project || project.owner_id !== user.id) {
      return { error: "Only the project owner can delete this project.", message: null };
    }
    if (input.confirmTitle.trim() !== project.title) {
      return { error: "Confirmation title does not match. Project not deleted.", message: null };
    }
    const { error } = await supabase.from("projects").delete().eq("id", input.projectId);
    if (error) return { error: error.message, message: null };
    revalidatePath("/projects");
    revalidatePath("/");
    return { error: null, message: "Project deleted. Other projects were not affected." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Delete failed.",
      message: null,
    };
  }
}

export async function exportProjectBundleAction(projectId: string): Promise<{
  error: string | null;
  bundle: import("@/lib/export/project-export").ProjectExportBundle | null;
  markdownSummary: string | null;
  findingsMarkdown: string | null;
  fountain: string | null;
  exerciseHistoryJson: string | null;
}> {
  try {
    const { supabase, user } = await requireUser();
    assertWriteRateLimit(`export-project:${user.id}`, 10);
    const { data: membership } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) {
      return {
        error: "Not authorized to export this project.",
        bundle: null,
        markdownSummary: null,
        findingsMarkdown: null,
        fountain: null,
        exerciseHistoryJson: null,
      };
    }

    const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single();
    if (!project) {
      return {
        error: "Project not found.",
        bundle: null,
        markdownSummary: null,
        findingsMarkdown: null,
        fountain: null,
        exerciseHistoryJson: null,
      };
    }

    const draftId = project.current_draft_id;
    const { data: beatRows } = draftId
      ? await supabase.from("beats").select("*").eq("draft_id", draftId).order("sort_order")
      : { data: [] as never[] };
    const { data: sceneRows } = draftId
      ? await supabase.from("scenes").select("*").eq("draft_id", draftId).order("sort_order")
      : { data: [] as never[] };
    const { data: elementRows } = draftId
      ? await supabase
          .from("screenplay_elements")
          .select("*")
          .eq("draft_id", draftId)
          .order("sort_order")
      : { data: [] as never[] };
    const { data: findings } = await supabase
      .from("scene_review_findings")
      .select("*")
      .eq("project_id", projectId);
    const { data: attempts } = await supabase
      .from("exercise_attempts")
      .select("*")
      .eq("user_id", user.id)
      .eq("applied_project_id", projectId);

    const beats = (beatRows ?? []).map(mapBeatRow);
    const scenes = (sceneRows ?? []).map(mapSceneRow);
    const elements = (elementRows ?? []).map(mapElementRow);
    const bundle = {
      project,
      beats,
      scenes,
      elements,
      findings: findings ?? [],
      exerciseAttempts: attempts ?? [],
      notesMarkdown: "",
      exportedAt: new Date().toISOString(),
    };

    return {
      error: null,
      bundle,
      markdownSummary: projectToMarkdownSummary(bundle),
      findingsMarkdown: findingsToMarkdown(findings ?? []),
      fountain: buildFountainFromElements(elements, project.title),
      exerciseHistoryJson: JSON.stringify(attempts ?? [], null, 2),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Export failed.",
      bundle: null,
      markdownSummary: null,
      findingsMarkdown: null,
      fountain: null,
      exerciseHistoryJson: null,
    };
  }
}

export async function requestAccountDeletionAction(input: {
  confirmPhrase: string;
}): Promise<ProjectActionState> {
  try {
    const { supabase, user } = await requireUser();
    if (input.confirmPhrase.trim() !== "DELETE MY ACCOUNT") {
      return {
        error: 'Type DELETE MY ACCOUNT exactly to request deletion.',
        message: null,
      };
    }
    assertWriteRateLimit(`account-delete:${user.id}`, 3);
    serverLog.warn("Account deletion requested", { userId: user.id });
    // Soft request: mark profile for operator follow-up. Does not wipe other users.
    await supabase
      .from("profiles")
      .update({ display_name: `[deletion-requested:${new Date().toISOString()}]` })
      .eq("id", user.id);
    return {
      error: null,
      message:
        "Deletion request recorded on your profile. An operator must complete account wipe; project data for other users is untouched.",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Request failed.",
      message: null,
    };
  }
}
