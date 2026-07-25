"use client";

import { useMemo, useState, useTransition } from "react";
import type { Scene } from "@/lib/beats/order";
import { updateSceneAction } from "@/lib/beats/actions";
import { SceneCard } from "@/components/beats/SceneCard";

type SceneEditorListProps = {
  projectId: string;
  initialScenes: Scene[];
  selectedSceneId?: string | null;
};

export function SceneEditorList({
  projectId,
  initialScenes,
  selectedSceneId = null,
}: SceneEditorListProps) {
  const [scenes, setScenes] = useState(initialScenes);
  const [activeId, setActiveId] = useState(selectedSceneId ?? initialScenes[0]?.id ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = useMemo(
    () => scenes.find((scene) => scene.id === activeId) ?? null,
    [scenes, activeId],
  );

  function save(patch: Partial<Scene>) {
    if (!active) return;
    const snapshot = scenes;
    setScenes((current) =>
      current.map((scene) => (scene.id === active.id ? { ...scene, ...patch } : scene)),
    );
    startTransition(async () => {
      const result = await updateSceneAction({
        projectId,
        sceneId: active.id,
        heading: patch.heading,
        summary: patch.summary,
        location: patch.location,
        timeOfDay: patch.timeOfDay,
        status: patch.status,
      });
      if (result.error) {
        setScenes(snapshot);
        setError(result.error);
      } else setMessage(result.message);
    });
  }

  return (
    <div className="scene-editor">
      <aside>
        <h2>Scenes</h2>
        <ul>
          {scenes.map((scene) => (
            <li key={scene.id}>
              <button type="button" onClick={() => setActiveId(scene.id)}>
                {scene.heading || "Untitled"}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div>
        {active ? (
          <>
            <SceneCard scene={active} projectId={projectId} />
            <label>
              Heading
              <input
                value={active.heading}
                onChange={(event) =>
                  setScenes((current) =>
                    current.map((scene) =>
                      scene.id === active.id ? { ...scene, heading: event.target.value } : scene,
                    ),
                  )
                }
                onBlur={(event) => save({ heading: event.target.value })}
              />
            </label>
            <label>
              Summary
              <textarea
                rows={3}
                value={active.summary}
                onChange={(event) =>
                  setScenes((current) =>
                    current.map((scene) =>
                      scene.id === active.id ? { ...scene, summary: event.target.value } : scene,
                    ),
                  )
                }
                onBlur={(event) => save({ summary: event.target.value })}
              />
            </label>
            <label>
              Location
              <input
                value={active.location}
                onChange={(event) =>
                  setScenes((current) =>
                    current.map((scene) =>
                      scene.id === active.id ? { ...scene, location: event.target.value } : scene,
                    ),
                  )
                }
                onBlur={(event) => save({ location: event.target.value })}
              />
            </label>
            <label>
              Time of day
              <input
                value={active.timeOfDay}
                onChange={(event) =>
                  setScenes((current) =>
                    current.map((scene) =>
                      scene.id === active.id
                        ? { ...scene, timeOfDay: event.target.value }
                        : scene,
                    ),
                  )
                }
                onBlur={(event) => save({ timeOfDay: event.target.value })}
              />
            </label>
            <p className="atlas-muted">{pending ? "Saving…" : null}</p>
          </>
        ) : (
          <p className="atlas-muted">No scenes yet. Add some from the beat board.</p>
        )}
        {error ? <p className="auth-error">{error}</p> : null}
        {message ? <p className="auth-ok">{message}</p> : null}
      </div>
    </div>
  );
}
