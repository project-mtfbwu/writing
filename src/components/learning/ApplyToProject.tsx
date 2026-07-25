"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { applyExerciseToProjectAction } from "@/lib/projects/actions";
import type { Exercise } from "@/types/learning";
import type { ExerciseResponse } from "@/lib/learning/exercises";

type ApplyToProjectProps = {
  exercise: Exercise;
  lastResult: {
    passed: boolean;
    feedback: string;
    response: ExerciseResponse;
  } | null;
  courseId: string;
  lessonId: string;
  contentVersion: string;
  attemptNumber: number;
};

type ProjectOption = { id: string; title: string };
type CharacterOption = { id: string; name: string };

function suggestedField(entity: string): { entityType: "premise" | "character"; field: string } {
  const lower = entity.toLowerCase();
  if (lower.includes("character") || lower.includes("want") || lower.includes("bible")) {
    return { entityType: "character", field: "want" };
  }
  if (lower.includes("logline") || lower.includes("premise")) {
    return { entityType: "premise", field: "goal" };
  }
  if (lower.includes("controlling")) {
    return { entityType: "premise", field: "controlling_idea" };
  }
  return { entityType: "premise", field: "obstacle" };
}

function valueFromResponse(response: ExerciseResponse): string {
  if (response.type === "text") return response.text;
  if (response.type === "option") return response.optionId;
  return response.optionIds.join(", ");
}

export function ApplyToProject({
  exercise,
  lastResult,
  courseId,
  lessonId,
  contentVersion,
  attemptNumber,
}: ApplyToProjectProps) {
  const suggestion = useMemo(
    () => suggestedField(exercise.applyTarget.entity),
    [exercise.applyTarget.entity],
  );
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [projectId, setProjectId] = useState("");
  const [entityType, setEntityType] = useState<"premise" | "character">(suggestion.entityType);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [field, setField] = useState(suggestion.field);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    void (async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from("projects").select("id, title").order("updated_at", {
        ascending: false,
      });
      setProjects(data ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!projectId || entityType !== "character" || !isSupabaseConfigured()) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from("characters")
        .select("id, name")
        .eq("project_id", projectId)
        .order("name");
      if (!cancelled) setCharacters(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, entityType]);

  const visibleCharacters = entityType === "character" && projectId ? characters : [];

  async function onApply() {
    setError(null);
    setStatus(null);
    if (!lastResult) {
      setError("Complete the exercise first.");
      return;
    }
    if (!projectId) {
      setError("Select a project.");
      return;
    }
    const value = valueFromResponse(lastResult.response);
    const result = await applyExerciseToProjectAction({
      projectId,
      entityType,
      entityId,
      field,
      value,
      confirmOverwrite,
      attempt: {
        id: `attempt:${lessonId}:${exercise.id}:${attemptNumber}:apply`,
        contentVersion,
        courseId,
        lessonId,
        exerciseId: exercise.id,
        response: lastResult.response,
        passed: lastResult.passed,
        feedback: lastResult.feedback,
        attemptNumber,
      },
    });
    if (result.error) setError(result.error);
    else setStatus(result.message);
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="learn-apply">
        <h4>Apply to project</h4>
        <p>
          Eventually updates: <strong>{exercise.applyTarget.entity}</strong>
        </p>
        <p>{exercise.applyTarget.description}</p>
        <p className="learn-meta">Sign in with Supabase configured to apply answers to a project.</p>
      </div>
    );
  }

  return (
    <div className="learn-apply">
      <h4>Apply to project</h4>
      <p>
        Target entity: <strong>{exercise.applyTarget.entity}</strong>
      </p>
      <p>{exercise.applyTarget.description}</p>

      <label>
        Project
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="">Select…</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
      </label>

      <label>
        Entity type
        <select
          value={entityType}
          onChange={(event) => setEntityType(event.target.value as "premise" | "character")}
        >
          <option value="premise">Premise</option>
          <option value="character">Character</option>
        </select>
      </label>

      {entityType === "character" ? (
        <label>
          Character
          <select
            value={entityId ?? ""}
            onChange={(event) => setEntityId(event.target.value || null)}
          >
            <option value="">Select…</option>
            {visibleCharacters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label>
        Field
        <input value={field} onChange={(event) => setField(event.target.value)} />
      </label>

      <label className="learn-apply__confirm">
        <input
          type="checkbox"
          checked={confirmOverwrite}
          onChange={(event) => setConfirmOverwrite(event.target.checked)}
        />
        I confirm overwriting the selected project field. The original exercise answer stays in
        history.
      </label>

      <button type="button" onClick={() => void onApply()} disabled={!confirmOverwrite}>
        Apply to project
      </button>
      {error ? <p className="auth-error">{error}</p> : null}
      {status ? <p className="auth-ok">{status}</p> : null}
    </div>
  );
}
