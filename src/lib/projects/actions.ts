"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { CharacterFields, PremiseFields } from "@/lib/projects/premise";
import { assemblePremisePreview } from "@/lib/projects/premise";

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
