"use client";

import { useMemo, useState, useTransition } from "react";
import type { PremiseFields } from "@/lib/projects/premise";
import { assemblePremisePreview } from "@/lib/projects/premise";
import { updatePremiseAction } from "@/lib/projects/actions";

type PremiseBuilderProps = {
  projectId: string;
  initial: PremiseFields;
};

export function PremiseBuilder({ projectId, initial }: PremiseBuilderProps) {
  const [fields, setFields] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const preview = useMemo(() => assemblePremisePreview(fields), [fields]);

  function setField<K extends keyof PremiseFields>(key: K, value: PremiseFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function save() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updatePremiseAction(projectId, fields);
      if (result.error) setError(result.error);
      else setMessage(result.message);
    });
  }

  return (
    <div className="project-builder">
      <div className="project-builder__fields">
        {(
          [
            ["title", "Title"],
            ["format", "Format"],
            ["genre", "Genre"],
            ["tone", "Tone"],
            ["protagonist", "Protagonist"],
            ["incitingIncident", "Inciting incident"],
            ["goal", "Goal"],
            ["stakes", "Stakes"],
            ["obstacle", "Obstacle"],
            ["controllingIdea", "Controlling idea"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <textarea
              rows={key === "controllingIdea" || key === "incitingIncident" ? 3 : 2}
              value={fields[key]}
              onChange={(event) => setField(key, event.target.value)}
            />
          </label>
        ))}
        <button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save premise"}
        </button>
        {error ? <p className="auth-error">{error}</p> : null}
        {message ? <p className="auth-ok">{message}</p> : null}
      </div>
      <aside className="project-builder__preview" aria-live="polite">
        <h2>Preview</h2>
        <p className="atlas-muted">Assembled from your fields only — no AI.</p>
        <pre>{preview}</pre>
      </aside>
    </div>
  );
}
