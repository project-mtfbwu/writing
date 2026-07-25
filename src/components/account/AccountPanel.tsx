"use client";

import { useState, useTransition } from "react";
import {
  deleteProjectAction,
  exportProjectBundleAction,
  requestAccountDeletionAction,
} from "@/lib/projects/actions";
import { clearAnonymousLocalProgress, createUserDataStore, exportNotesAsMarkdown } from "@/lib/storage/local";

export function AccountPanel({
  signedIn,
  projects,
}: {
  signedIn: boolean;
  projects: Array<{ id: string; title: string }>;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [deletePhrase, setDeletePhrase] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  function download(filename: string, content: string, type = "text/plain") {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="account-panel">
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {message ? <p className="auth-ok" role="status">{message}</p> : null}

      <section>
        <h2>Export notes (local)</h2>
        <button
          type="button"
          onClick={async () => {
            const notes = await createUserDataStore().listNotes();
            download("writing-notes.md", exportNotesAsMarkdown(notes), "text/markdown");
            setMessage("Notes Markdown downloaded.");
          }}
        >
          Export notes Markdown
        </button>
      </section>

      <section>
        <h2>Clear local anonymous progress</h2>
        <p className="atlas-muted">
          Clears bookmarks, notes, recent reading, and learning progress in this browser only.
        </p>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm("Clear local anonymous progress on this device?")) return;
            clearAnonymousLocalProgress();
            setMessage("Local anonymous progress cleared.");
          }}
        >
          Clear local progress
        </button>
      </section>

      {signedIn ? (
        <>
          <section>
            <h2>Export project data</h2>
            <label>
              Project
              <select
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={pending || !selectedProjectId}
              onClick={() => {
                startTransition(async () => {
                  const result = await exportProjectBundleAction(selectedProjectId);
                  if (result.error || !result.bundle) {
                    setError(result.error);
                    return;
                  }
                  download(
                    `${result.bundle.project.title || "project"}.json`,
                    JSON.stringify(result.bundle, null, 2),
                    "application/json",
                  );
                  if (result.markdownSummary) {
                    download("project-summary.md", result.markdownSummary, "text/markdown");
                  }
                  if (result.fountain) {
                    download("screenplay.fountain", result.fountain);
                  }
                  if (result.findingsMarkdown) {
                    download("review-findings.md", result.findingsMarkdown, "text/markdown");
                  }
                  if (result.exerciseHistoryJson) {
                    download("exercise-history.json", result.exerciseHistoryJson, "application/json");
                  }
                  setMessage("Project export files downloaded.");
                  setError(null);
                });
              }}
            >
              Export JSON / Markdown / Fountain / findings / exercises
            </button>
          </section>

          <section>
            <h2>Delete project</h2>
            <p className="atlas-muted">
              Cascades only within the chosen project. Type the project title to confirm.
            </p>
            <label>
              Confirm title
              <input
                value={confirmTitle}
                onChange={(event) => setConfirmTitle(event.target.value)}
                aria-required="true"
              />
            </label>
            <button
              type="button"
              disabled={pending || !selectedProjectId}
              onClick={() => {
                startTransition(async () => {
                  const result = await deleteProjectAction({
                    projectId: selectedProjectId,
                    confirmTitle,
                  });
                  if (result.error) setError(result.error);
                  else {
                    setMessage(result.message);
                    setError(null);
                    window.location.href = "/projects";
                  }
                });
              }}
            >
              Delete selected project
            </button>
          </section>

          <section>
            <h2>Delete account request</h2>
            <p className="atlas-muted">
              Records a deletion request. Type DELETE MY ACCOUNT. This does not wipe other users’
              projects.
            </p>
            <label>
              Confirmation phrase
              <input
                value={deletePhrase}
                onChange={(event) => setDeletePhrase(event.target.value)}
                aria-required="true"
              />
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await requestAccountDeletionAction({
                    confirmPhrase: deletePhrase,
                  });
                  if (result.error) setError(result.error);
                  else {
                    setMessage(result.message);
                    setError(null);
                  }
                });
              }}
            >
              Request account deletion
            </button>
          </section>
        </>
      ) : (
        <p className="atlas-muted">Sign in to export projects or request account deletion.</p>
      )}
    </div>
  );
}
