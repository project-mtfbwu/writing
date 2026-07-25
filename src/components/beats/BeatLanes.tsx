"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import type { Beat, BeatColorKey, Scene } from "@/lib/beats/order";
import { UNASSIGNED_LANE_ID } from "@/lib/beats/order";
import { SceneCard } from "@/components/beats/SceneCard";

const COLOR_OPTIONS: BeatColorKey[] = [
  "neutral",
  "setup",
  "confrontation",
  "resolution",
  "character",
  "theme",
];

export function SortableBeatLane({
  projectId,
  beat,
  scenes,
  onAddScene,
  onUpdateBeat,
  onDeleteBeat,
}: {
  projectId: string;
  beat: Beat;
  scenes: Scene[];
  onAddScene: () => void;
  onUpdateBeat: (patch: Partial<Pick<Beat, "name" | "description" | "colorKey">>) => void;
  onDeleteBeat: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `beat:${beat.id}`,
    data: { type: "beat", beatId: beat.id },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `lane:${beat.id}`,
    data: { type: "lane", beatId: beat.id },
  });
  const [name, setName] = useState(beat.name);
  const [description, setDescription] = useState(beat.description);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <section
      ref={(node) => {
        setNodeRef(node);
        setDropRef(node);
      }}
      style={style}
      className={`beat-lane beat-lane--${beat.colorKey}${isOver ? " is-over" : ""}`}
      data-lane-id={beat.id}
    >
      <header className="beat-lane__header">
        <button type="button" className="beat-lane__handle" {...attributes} {...listeners}>
          Drag beat
        </button>
        <input
          value={name}
          aria-label="Beat name"
          onChange={(event) => setName(event.target.value)}
          onBlur={() => onUpdateBeat({ name })}
        />
        <select
          value={beat.colorKey}
          aria-label="Color label"
          onChange={(event) => onUpdateBeat({ colorKey: event.target.value as BeatColorKey })}
        >
          {COLOR_OPTIONS.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
      </header>
      <textarea
        value={description}
        aria-label="Beat description"
        rows={2}
        onChange={(event) => setDescription(event.target.value)}
        onBlur={() => onUpdateBeat({ description })}
      />
      <p className="beat-lane__stats">
        Target {beat.targetPercentage ?? "—"}% · {scenes.length} scene
        {scenes.length === 1 ? "" : "s"}
      </p>
      <div className="beat-lane__actions">
        <button type="button" onClick={onAddScene}>
          Add scene
        </button>
        <button type="button" onClick={onDeleteBeat}>
          Delete beat
        </button>
      </div>
      <SortableContext
        items={scenes.map((scene) => `scene:${scene.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="beat-lane__scenes">
          {scenes.map((scene) => (
            <SortableScene key={scene.id} scene={scene} projectId={projectId} />
          ))}
        </ul>
      </SortableContext>
      {scenes.length === 0 ? <p className="atlas-muted">No scenes in this beat.</p> : null}
    </section>
  );
}

export function UnassignedLane({
  projectId,
  scenes,
  onAddScene,
}: {
  projectId: string;
  scenes: Scene[];
  onAddScene: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `lane:${UNASSIGNED_LANE_ID}`,
    data: { type: "lane", beatId: null },
  });
  return (
    <section
      ref={setNodeRef}
      className={`beat-lane beat-lane--unassigned${isOver ? " is-over" : ""}`}
      data-lane-id={UNASSIGNED_LANE_ID}
    >
      <header className="beat-lane__header">
        <h3>Unassigned</h3>
      </header>
      <p className="atlas-muted">Scenes with no primary beat.</p>
      <button type="button" onClick={onAddScene}>
        Add scene
      </button>
      <SortableContext
        items={scenes.map((scene) => `scene:${scene.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="beat-lane__scenes">
          {scenes.map((scene) => (
            <SortableScene key={scene.id} scene={scene} projectId={projectId} />
          ))}
        </ul>
      </SortableContext>
    </section>
  );
}

function SortableScene({ scene, projectId }: { scene: Scene; projectId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `scene:${scene.id}`,
    data: { type: "scene", sceneId: scene.id, beatId: scene.beatId },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <li ref={setNodeRef} style={style}>
      <div className="beat-scene-card__drag" {...attributes} {...listeners}>
        <SceneCard scene={scene} projectId={projectId} compact />
      </div>
    </li>
  );
}
