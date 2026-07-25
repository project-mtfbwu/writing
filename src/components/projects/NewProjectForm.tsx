"use client";

import { useActionState } from "react";
import { createProjectAction, type ProjectActionState } from "@/lib/projects/actions";

const initial: ProjectActionState = { error: null, message: null };

export function NewProjectForm() {
  const [state, action, pending] = useActionState(createProjectAction, initial);
  return (
    <form action={action} className="project-form">
      <label>
        Title
        <input name="title" required placeholder="Working title" />
      </label>
      <label>
        Format
        <select name="format" defaultValue="feature">
          <option value="feature">Feature</option>
          <option value="short">Short</option>
          <option value="series">Series</option>
          <option value="pilot">Pilot</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label>
        Genre
        <input name="genre" placeholder="Drama / thriller / …" />
      </label>
      <label>
        Tone
        <input name="tone" placeholder="Dry, intimate, …" />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create project"}
      </button>
      {state.error ? <p className="auth-error">{state.error}</p> : null}
    </form>
  );
}
