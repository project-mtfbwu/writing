"use client";

import { useState, useTransition } from "react";
import type { CharacterFields } from "@/lib/projects/premise";
import { upsertCharacterAction } from "@/lib/projects/actions";

type CharacterRow = CharacterFields & { id: string };

type CharacterBuilderProps = {
  projectId: string;
  initialCharacters: CharacterRow[];
};

const empty: CharacterFields = {
  name: "",
  role: "",
  want: "",
  need: "",
  wound: "",
  lie: "",
  arc: "",
  method: "",
  relationshipToTheme: "",
  register: "",
  notes: "",
};

export function CharacterBuilder({ projectId, initialCharacters }: CharacterBuilderProps) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [selectedId, setSelectedId] = useState<string | null>(initialCharacters[0]?.id ?? null);
  const [draft, setDraft] = useState<CharacterFields>(initialCharacters[0] ?? empty);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function selectCharacter(character: CharacterRow) {
    setSelectedId(character.id);
    setDraft(character);
  }

  function startNew() {
    setSelectedId(null);
    setDraft(empty);
  }

  function save() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await upsertCharacterAction(projectId, selectedId, draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
      if (result.characterId) {
        const row = { ...draft, id: result.characterId };
        setCharacters((current) => {
          const without = current.filter((item) => item.id !== row.id);
          return [...without, row].sort((a, b) => a.name.localeCompare(b.name));
        });
        setSelectedId(result.characterId);
      }
    });
  }

  return (
    <div className="project-builder project-builder--characters">
      <aside>
        <button type="button" onClick={startNew}>
          New character
        </button>
        <ul>
          {characters.map((character) => (
            <li key={character.id}>
              <button type="button" onClick={() => selectCharacter(character)}>
                {character.name || "Untitled"}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="project-builder__fields">
        {(
          [
            ["name", "Name"],
            ["role", "Role"],
            ["want", "Want"],
            ["need", "Need"],
            ["wound", "Wound"],
            ["lie", "Lie"],
            ["arc", "Arc"],
            ["method", "Method"],
            ["relationshipToTheme", "Relationship to theme"],
            ["register", "Register"],
            ["notes", "Notes"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <textarea
              rows={key === "notes" || key === "arc" ? 3 : 2}
              value={draft[key]}
              onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
            />
          </label>
        ))}
        <button type="button" onClick={save} disabled={pending || !draft.name.trim()}>
          {pending ? "Saving…" : "Save character"}
        </button>
        {error ? <p className="auth-error">{error}</p> : null}
        {message ? <p className="auth-ok">{message}</p> : null}
      </div>
    </div>
  );
}
