"use client";

import { useMemo, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  UNASSIGNED_LANE_ID,
  projectStructureOrder,
  type Beat,
  type Scene,
} from "@/lib/beats/order";
import {
  applyBeatTemplateAction,
  createBeatAction,
  createSceneAction,
  deleteBeatAction,
  reassignSceneAction,
  reorderBeatsAction,
  updateBeatAction,
} from "@/lib/beats/actions";
import { SYSTEM_BEAT_TEMPLATES } from "@/lib/beats/templates";
import { SceneCard } from "@/components/beats/SceneCard";
import { SortableBeatLane, UnassignedLane } from "@/components/beats/BeatLanes";

type BeatBoardProps = {
  projectId: string;
  initialBeats: Beat[];
  initialScenes: Scene[];
};

export function BeatBoard({ projectId, initialBeats, initialScenes }: BeatBoardProps) {
  const [beats, setBeats] = useState(initialBeats);
  const [scenes, setScenes] = useState(initialScenes);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [useMobileControls, setUseMobileControls] = useState(false);

  const projection = useMemo(() => projectStructureOrder(beats, scenes), [beats, scenes]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function rollback(nextBeats: Beat[], nextScenes: Scene[], reason: string) {
    setBeats(nextBeats);
    setScenes(nextScenes);
    setError(reason);
  }

  function onDragStart(event: DragStartEvent) {
    if (String(event.active.id).startsWith("scene:")) {
      setActiveSceneId(String(event.active.id).replace("scene:", ""));
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveSceneId(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("beat:") && overId.startsWith("beat:")) {
      const orderedBeats = [...beats].sort((a, b) => a.sortOrder - b.sortOrder);
      const from = orderedBeats.findIndex((beat) => `beat:${beat.id}` === activeId);
      const to = orderedBeats.findIndex((beat) => `beat:${beat.id}` === overId);
      if (from < 0 || to < 0 || from === to) return;
      const snapshot = beats;
      const ordered = arrayMove(orderedBeats, from, to).map((beat, index) => ({
        ...beat,
        sortOrder: index,
      }));
      setBeats(ordered);
      const expected = Object.fromEntries(snapshot.map((beat) => [beat.id, beat.updatedAt]));
      startTransition(async () => {
        const result = await reorderBeatsAction({
          projectId,
          orderedIds: ordered.map((beat) => beat.id),
          expectedUpdatedAtById: expected,
        });
        if (result.error) rollback(snapshot, scenes, result.error);
        else setMessage(result.message);
      });
      return;
    }

    if (!activeId.startsWith("scene:")) return;
    const sceneId = activeId.replace("scene:", "");
    const scene = scenes.find((item) => item.id === sceneId);
    if (!scene) return;

    let targetBeatId: string | null = null;
    if (overId === `lane:${UNASSIGNED_LANE_ID}`) {
      targetBeatId = null;
    } else if (overId.startsWith("lane:")) {
      targetBeatId = overId.replace("lane:", "");
    } else if (overId.startsWith("scene:")) {
      const overScene = scenes.find((item) => item.id === overId.replace("scene:", ""));
      targetBeatId = overScene?.beatId ?? null;
    } else if (overId.startsWith("beat:")) {
      targetBeatId = overId.replace("beat:", "");
    }

    const snapshotScenes = scenes;
    let orderedIds = scenes
      .filter((item) =>
        targetBeatId
          ? item.beatId === targetBeatId || item.id === sceneId
          : item.beatId === null || item.id === sceneId,
      )
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => item.id);
    if (!orderedIds.includes(sceneId)) orderedIds = [...orderedIds, sceneId];
    if (overId.startsWith("scene:")) {
      const overSceneId = overId.replace("scene:", "");
      const from = orderedIds.indexOf(sceneId);
      const to = orderedIds.indexOf(overSceneId);
      if (from >= 0 && to >= 0) orderedIds = arrayMove(orderedIds, from, to);
    }

    const nextScenes = scenes.map((item) => {
      if (item.id === sceneId) {
        return { ...item, beatId: targetBeatId, sortOrder: orderedIds.indexOf(sceneId) };
      }
      if (
        (targetBeatId ? item.beatId === targetBeatId : item.beatId === null) &&
        orderedIds.includes(item.id)
      ) {
        return { ...item, sortOrder: orderedIds.indexOf(item.id) };
      }
      return item;
    });
    setScenes(nextScenes);
    const expected = Object.fromEntries(snapshotScenes.map((item) => [item.id, item.updatedAt]));
    startTransition(async () => {
      const result = await reassignSceneAction({
        projectId,
        sceneId,
        beatId: targetBeatId,
        orderedSceneIdsInTarget: orderedIds,
        expectedUpdatedAtById: expected,
      });
      if (result.error) rollback(beats, snapshotScenes, result.error);
      else setMessage(result.message);
    });
  }

  function createBeat() {
    const snapshot = beats;
    startTransition(async () => {
      const result = await createBeatAction({ projectId, name: "New beat" });
      if (result.error || !result.beat) {
        setError(result.error);
        setBeats(snapshot);
        return;
      }
      setBeats((current) => [...current, result.beat!]);
      setMessage(result.message);
    });
  }

  function addScene(beatId: string | null) {
    const snapshot = scenes;
    startTransition(async () => {
      const result = await createSceneAction({ projectId, beatId });
      if (result.error || !result.scene) {
        setError(result.error);
        setScenes(snapshot);
        return;
      }
      setScenes((current) => [...current, result.scene!]);
      setMessage(result.message);
    });
  }

  const activeScene = activeSceneId
    ? scenes.find((scene) => scene.id === activeSceneId)
    : null;

  return (
    <div className="beat-board">
      <div className="beat-board__toolbar">
        <button type="button" onClick={createBeat} disabled={pending}>
          Create beat
        </button>
        <button type="button" onClick={() => addScene(null)} disabled={pending}>
          Add unassigned scene
        </button>
        <label className="beat-board__mobile-toggle">
          <input
            type="checkbox"
            checked={useMobileControls}
            onChange={(event) => setUseMobileControls(event.target.checked)}
          />
          Mobile controls (no drag)
        </label>
      </div>

      <TemplatePanel
        projectId={projectId}
        setMessage={setMessage}
        setError={setError}
      />

      {error ? <p className="auth-error">{error}</p> : null}
      {message ? <p className="auth-ok">{message}</p> : null}

      {useMobileControls ? (
        <MobileBeatBoard
          projectId={projectId}
          projection={projection}
          beats={beats}
          scenes={scenes}
          setBeats={setBeats}
          setScenes={setScenes}
          setError={setError}
          setMessage={setMessage}
          onAddScene={addScene}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={projection.lanes.map((lane) => `beat:${lane.beat.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="beat-board__lanes">
              {projection.lanes.map((lane) => (
                <SortableBeatLane
                  key={lane.beat.id}
                  projectId={projectId}
                  beat={lane.beat}
                  scenes={lane.scenes}
                  onAddScene={() => addScene(lane.beat.id)}
                  onUpdateBeat={(patch) => {
                    const snapshot = beats;
                    setBeats((current) =>
                      current.map((beat) =>
                        beat.id === lane.beat.id ? { ...beat, ...patch } : beat,
                      ),
                    );
                    startTransition(async () => {
                      const result = await updateBeatAction({
                        projectId,
                        beatId: lane.beat.id,
                        ...patch,
                      });
                      if (result.error) {
                        setBeats(snapshot);
                        setError(result.error);
                      }
                    });
                  }}
                  onDeleteBeat={() => {
                    if (!window.confirm("Delete this beat? Scenes move to Unassigned.")) return;
                    const snapshotBeats = beats;
                    const snapshotScenes = scenes;
                    setBeats((current) => current.filter((beat) => beat.id !== lane.beat.id));
                    setScenes((current) =>
                      current.map((scene) =>
                        scene.beatId === lane.beat.id ? { ...scene, beatId: null } : scene,
                      ),
                    );
                    startTransition(async () => {
                      const result = await deleteBeatAction({
                        projectId,
                        beatId: lane.beat.id,
                        confirm: true,
                      });
                      if (result.error) rollback(snapshotBeats, snapshotScenes, result.error);
                      else setMessage(result.message);
                    });
                  }}
                />
              ))}
              <UnassignedLane
                projectId={projectId}
                scenes={projection.unassigned}
                onAddScene={() => addScene(null)}
              />
            </div>
          </SortableContext>
          <DragOverlay>
            {activeScene ? (
              <SceneCard scene={activeScene} projectId={projectId} compact />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {beats.length === 0 && scenes.length === 0 ? (
        <p className="atlas-muted beat-board__empty">
          Empty board. Create a beat, add a scene, or apply an optional template.
        </p>
      ) : null}

      <StructureOutline projectId={projectId} projection={projection} />
    </div>
  );
}

function TemplatePanel({
  projectId,
  setMessage,
  setError,
}: {
  projectId: string;
  setMessage: (value: string | null) => void;
  setError: (value: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <section className="beat-templates" aria-label="Optional structure templates">
      <h2>Optional templates</h2>
      <p className="atlas-muted">
        Templates are additive starters. None of them is a law. Applying the same template twice
        will not duplicate its beats.
      </p>
      <ul>
        {SYSTEM_BEAT_TEMPLATES.map((template) => (
          <li key={template.key}>
            <div>
              <strong>{template.name}</strong>
              <span className="atlas-pill atlas-pill--evidence">{template.evidenceStatus}</span>
              <p>{template.summary}</p>
              <p className="atlas-muted">{template.craftNote}</p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await applyBeatTemplateAction({
                    projectId,
                    templateKey: template.key,
                  });
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  setMessage(result.message);
                  if (result.added > 0) window.location.reload();
                });
              }}
            >
              Apply
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StructureOutline({
  projectId,
  projection,
}: {
  projectId: string;
  projection: ReturnType<typeof projectStructureOrder>;
}) {
  return (
    <section className="structure-outline" aria-label="Canonical structure outline">
      <h2>Structure outline</h2>
      <p className="atlas-muted">
        Same canonical order as the board, scene navigator, and screenplay projection.
      </p>
      <ol>
        {projection.lanes.map((lane) => (
          <li key={lane.beat.id}>
            <strong>{lane.beat.name}</strong>
            <ol>
              {lane.scenes.map((scene) => (
                <li key={scene.id}>
                  <a href={`/projects/${projectId}/scenes?scene=${scene.id}`}>{scene.heading}</a>
                </li>
              ))}
            </ol>
          </li>
        ))}
        <li>
          <strong>Unassigned</strong>
          <ol>
            {projection.unassigned.map((scene) => (
              <li key={scene.id}>
                <a href={`/projects/${projectId}/scenes?scene=${scene.id}`}>{scene.heading}</a>
              </li>
            ))}
          </ol>
        </li>
      </ol>
      <h3>Screenplay projection order</h3>
      <ol>
        {projection.screenplayScenes.map((scene) => (
          <li key={scene.id}>{scene.heading}</li>
        ))}
      </ol>
    </section>
  );
}

function MobileBeatBoard({
  projectId,
  projection,
  beats,
  scenes,
  setBeats,
  setScenes,
  setError,
  setMessage,
  onAddScene,
}: {
  projectId: string;
  projection: ReturnType<typeof projectStructureOrder>;
  beats: Beat[];
  scenes: Scene[];
  setBeats: Dispatch<SetStateAction<Beat[]>>;
  setScenes: Dispatch<SetStateAction<Scene[]>>;
  setError: (value: string | null) => void;
  setMessage: (value: string | null) => void;
  onAddScene: (beatId: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();

  function moveBeat(beatId: string, direction: -1 | 1) {
    const ordered = [...beats].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((beat) => beat.id === beatId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ordered.length) return;
    const snapshot = beats;
    const moved = arrayMove(ordered, index, next).map((beat, sortOrder) => ({
      ...beat,
      sortOrder,
    }));
    setBeats(moved);
    const expected = Object.fromEntries(snapshot.map((beat) => [beat.id, beat.updatedAt]));
    startTransition(async () => {
      const result = await reorderBeatsAction({
        projectId,
        orderedIds: moved.map((beat) => beat.id),
        expectedUpdatedAtById: expected,
      });
      if (result.error) {
        setBeats(snapshot);
        setError(result.error);
      } else setMessage(result.message);
    });
  }

  function moveScene(sceneId: string, beatId: string | null) {
    const snapshot = scenes;
    const laneIds = scenes
      .filter((scene) =>
        beatId
          ? scene.beatId === beatId || scene.id === sceneId
          : scene.beatId === null || scene.id === sceneId,
      )
      .map((scene) => scene.id);
    if (!laneIds.includes(sceneId)) laneIds.push(sceneId);
    setScenes((current) =>
      current.map((scene) =>
        scene.id === sceneId
          ? { ...scene, beatId, sortOrder: laneIds.indexOf(sceneId) }
          : scene,
      ),
    );
    const expected = Object.fromEntries(snapshot.map((scene) => [scene.id, scene.updatedAt]));
    startTransition(async () => {
      const result = await reassignSceneAction({
        projectId,
        sceneId,
        beatId,
        orderedSceneIdsInTarget: laneIds,
        expectedUpdatedAtById: expected,
      });
      if (result.error) {
        setScenes(snapshot);
        setError(result.error);
      } else setMessage(result.message);
    });
  }

  return (
    <div className="beat-board__mobile">
      {projection.lanes.map((lane) => (
        <section key={lane.beat.id} className="beat-lane">
          <h3>{lane.beat.name}</h3>
          <div className="beat-lane__actions">
            <button type="button" disabled={pending} onClick={() => moveBeat(lane.beat.id, -1)}>
              Move beat left
            </button>
            <button type="button" disabled={pending} onClick={() => moveBeat(lane.beat.id, 1)}>
              Move beat right
            </button>
            <button type="button" onClick={() => onAddScene(lane.beat.id)}>
              Add scene
            </button>
          </div>
          <ul>
            {lane.scenes.map((scene) => (
              <li key={scene.id}>
                <SceneCard scene={scene} projectId={projectId} />
                <label>
                  Move to
                  <select
                    value={scene.beatId ?? UNASSIGNED_LANE_ID}
                    onChange={(event) =>
                      moveScene(
                        scene.id,
                        event.target.value === UNASSIGNED_LANE_ID ? null : event.target.value,
                      )
                    }
                  >
                    <option value={UNASSIGNED_LANE_ID}>Unassigned</option>
                    {beats.map((beat) => (
                      <option key={beat.id} value={beat.id}>
                        {beat.name}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="beat-lane beat-lane--unassigned">
        <h3>Unassigned</h3>
        <button type="button" onClick={() => onAddScene(null)}>
          Add scene
        </button>
        <ul>
          {projection.unassigned.map((scene) => (
            <li key={scene.id}>
              <SceneCard scene={scene} projectId={projectId} />
              <label>
                Move to
                <select
                  value={UNASSIGNED_LANE_ID}
                  onChange={(event) =>
                    moveScene(
                      scene.id,
                      event.target.value === UNASSIGNED_LANE_ID ? null : event.target.value,
                    )
                  }
                >
                  <option value={UNASSIGNED_LANE_ID}>Unassigned</option>
                  {beats.map((beat) => (
                    <option key={beat.id} value={beat.id}>
                      {beat.name}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
