"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import type { Beat, Scene } from "@/lib/beats/order";
import { projectStructureOrder } from "@/lib/beats/order";
import {
  ELEMENT_TYPES,
  insertElementAfter,
  isSceneHeadingText,
  nextTypeOnEnter,
  nextTypeOnTab,
  previousTypeOnShiftTab,
  removeElement,
  resolveBackspaceAtStart,
  updateElementContent,
  type ScreenplayElement,
  type ScreenplayElementType,
} from "@/lib/screenplay/model";
import { createLocalElement } from "@/lib/screenplay/map";
import { SessionHistory } from "@/lib/screenplay/history";
import {
  enqueueSave,
  flushSaveQueue,
  nextAutosaveStatus,
  type AutosaveStatus,
  type SaveOp,
} from "@/lib/screenplay/save-queue";
import { exportFountain, exportPlainText } from "@/lib/screenplay/export";
import {
  assignSceneBeatAction,
  clearCurrentDraftAction,
  createDraftAction,
  deleteScreenplayElementAction,
  duplicateDraftAction,
  renameDraftAction,
  reorderScreenplayElementsAction,
  switchDraftAction,
  syncSceneHeadingAction,
  upsertScreenplayElementAction,
} from "@/lib/screenplay/actions";

type DraftSummary = {
  id: string;
  title: string;
  revision: number;
  updated_at: string;
  created_at: string;
};

type ScreenplayEditorProps = {
  projectId: string;
  projectTitle: string;
  userId: string;
  draft: DraftSummary & { revision: number };
  drafts: DraftSummary[];
  currentDraftId: string | null;
  initialElements: ScreenplayElement[];
  beats: Beat[];
  scenes: Scene[];
  characterNames: string[];
};

function newId() {
  return crypto.randomUUID();
}

export function ScreenplayEditor({
  projectId,
  projectTitle,
  userId,
  draft,
  drafts,
  currentDraftId,
  initialElements,
  beats,
  scenes,
  characterNames,
}: ScreenplayEditorProps) {
  const [elements, setElements] = useState<ScreenplayElement[]>(() =>
    initialElements.length > 0
      ? initialElements
      : [
          createLocalElement({
            id: newId(),
            projectId,
            draftId: draft.id,
            userId,
            elementType: "scene_heading",
            content: "INT. LOCATION - DAY",
            sortOrder: 0,
          }),
        ],
  );
  const [focusId, setFocusId] = useState<string | null>(elements[0]?.id ?? null);
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [beatFilter, setBeatFilter] = useState<string | "all" | "unassigned">("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const queueRef = useRef<SaveOp[]>([]);
  const historyRef = useRef(new SessionHistory());
  const saveTimer = useRef<number | null>(null);
  const draftRevision = useRef(draft.revision);
  const locations = useMemo(
    () =>
      [...new Set(scenes.map((scene) => scene.location).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [scenes],
  );
  const structure = useMemo(() => projectStructureOrder(beats, scenes), [beats, scenes]);

  const visibleElements = useMemo(() => {
    if (beatFilter === "all") return elements;
    const sceneIds = new Set(
      scenes
        .filter((scene) =>
          beatFilter === "unassigned" ? scene.beatId === null : scene.beatId === beatFilter,
        )
        .map((scene) => scene.id),
    );
    return elements.filter(
      (element) =>
        element.elementType !== "scene_heading" ||
        (element.sceneId ? sceneIds.has(element.sceneId) : beatFilter === "unassigned"),
    );
  }, [beatFilter, elements, scenes]);

  const pushHistory = useCallback(() => {
    historyRef.current.push({ elements, focusId });
  }, [elements, focusId]);

  const queueUpsert = useCallback((element: ScreenplayElement, expectedUpdatedAt: string | null) => {
    queueRef.current = enqueueSave(queueRef.current, {
      kind: "upsert",
      element,
      expectedUpdatedAt,
    });
    setStatus((current) => nextAutosaveStatus(current, "edit"));
  }, []);

  const flush = useCallback(async () => {
    if (queueRef.current.length === 0) return;
    setStatus((current) => nextAutosaveStatus(current, "save-start"));
    const snapshotQueue = [...queueRef.current];
    const result = await flushSaveQueue(snapshotQueue, async (op) => {
      if (op.kind === "upsert") {
        const response = await upsertScreenplayElementAction({
          projectId,
          element: op.element,
          expectedUpdatedAt: op.expectedUpdatedAt,
        });
        if (response.error) return { ok: false, error: response.error };
        if (response.element) {
          setElements((current) =>
            current.map((item) => (item.id === response.element!.id ? response.element! : item)),
          );
        }
        return { ok: true };
      }
      if (op.kind === "delete") {
        const response = await deleteScreenplayElementAction({
          projectId,
          elementId: op.id,
          expectedUpdatedAt: op.expectedUpdatedAt,
        });
        if (response.error) return { ok: false, error: response.error };
        return { ok: true };
      }
      const response = await reorderScreenplayElementsAction({
        projectId,
        draftId: draft.id,
        orderedIds: op.orderedIds,
        expectedRevision: op.expectedRevision,
      });
      if (response.error) return { ok: false, error: response.error };
      draftRevision.current += 1;
      return { ok: true };
    });

    queueRef.current = result.remaining;
    if (!result.ok) {
      setError(result.error);
      setStatus((current) => nextAutosaveStatus(current, "save-fail"));
      return;
    }
    setError(null);
    setStatus((current) => nextAutosaveStatus(current, "save-ok"));
  }, [draft.id, projectId]);

  useEffect(() => {
    if (status !== "unsaved") return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void flush();
    }, 700);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [status, elements, flush]);

  function commitElements(next: ScreenplayElement[], nextFocus: string | null) {
    pushHistory();
    setElements(next);
    setFocusId(nextFocus);
  }

  async function onChangeElement(
    id: string,
    content: string,
    elementType?: ScreenplayElementType,
  ) {
    const current = elements.find((item) => item.id === id);
    if (!current) return;
    let type = elementType ?? current.elementType;
    if (type === "action" && isSceneHeadingText(content)) {
      type = "scene_heading";
    }
    if (type === "character") {
      content = content.toUpperCase();
    }
    const expected = current.updatedAt;
    const next = updateElementContent(elements, id, content, type);
    setElements(next);
    setStatus((value) => nextAutosaveStatus(value, "edit"));
    const updated = next.find((item) => item.id === id)!;
    queueUpsert(updated, expected);

    if (type === "scene_heading" && content.trim()) {
      startTransition(async () => {
        const result = await syncSceneHeadingAction({
          projectId,
          draftId: draft.id,
          elementId: id,
          content,
          sceneId: updated.sceneId,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.sceneId) {
          setElements((currentElements) =>
            currentElements.map((item) =>
              item.id === id ? { ...item, sceneId: result.sceneId! } : item,
            ),
          );
        }
      });
    }
  }

  function onEnter(id: string) {
    const index = elements.findIndex((item) => item.id === id);
    if (index < 0) return;
    const current = elements[index]!;
    const type = nextTypeOnEnter(current.elementType, current.content);
    const created = createLocalElement({
      id: newId(),
      projectId,
      draftId: draft.id,
      userId,
      elementType: type,
      content: "",
      sceneId: type === "scene_heading" ? null : current.sceneId,
    });
    const next = insertElementAfter(elements, id, created);
    commitElements(next, created.id);
    queueUpsert(created, null);
    queueRef.current = enqueueSave(queueRef.current, {
      kind: "reorder",
      orderedIds: next.map((item) => item.id),
      expectedRevision: draftRevision.current,
    });
  }

  function onTab(id: string, shift: boolean) {
    const current = elements.find((item) => item.id === id);
    if (!current) return;
    const type = shift
      ? previousTypeOnShiftTab(current.elementType)
      : nextTypeOnTab(current.elementType);
    void onChangeElement(id, current.content, type);
  }

  function onBackspaceStart(id: string) {
    const index = elements.findIndex((item) => item.id === id);
    if (index < 0) return;
    const current = elements[index]!;
    const previous = index > 0 ? elements[index - 1]! : null;
    const resolution = resolveBackspaceAtStart({ current, previous });
    if (resolution.action === "none") return;
    if (current.content.length > 0) {
      setError("Refusing to discard non-empty text on backspace merge.");
      return;
    }
    const expected = current.updatedAt;
    const next = removeElement(elements, current.id);
    commitElements(next, resolution.focusId);
    queueRef.current = enqueueSave(queueRef.current, {
      kind: "delete",
      id: current.id,
      expectedUpdatedAt: expected,
    });
    queueRef.current = enqueueSave(queueRef.current, {
      kind: "reorder",
      orderedIds: next.map((item) => item.id),
      expectedRevision: draftRevision.current,
    });
    setStatus((value) => nextAutosaveStatus(value, "edit"));
  }

  function undo() {
    const previous = historyRef.current.undo({ elements, focusId });
    if (!previous) return;
    setElements(previous.elements);
    setFocusId(previous.focusId);
    setStatus((value) => nextAutosaveStatus(value, "edit"));
    for (const element of previous.elements) {
      queueUpsert(element, null);
    }
  }

  function redo() {
    const next = historyRef.current.redo({ elements, focusId });
    if (!next) return;
    setElements(next.elements);
    setFocusId(next.focusId);
    setStatus((value) => nextAutosaveStatus(value, "edit"));
    for (const element of next.elements) {
      queueUpsert(element, null);
    }
  }

  function download(format: "fountain" | "plaintext") {
    const content =
      format === "fountain" ? exportFountain(elements, projectTitle) : exportPlainText(elements);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${projectTitle.replace(/[^\w\-]+/g, "_")}.${format === "fountain" ? "fountain" : "txt"}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="screenplay">
      <header className="screenplay__toolbar">
        <div className="screenplay__status" data-status={status} aria-live="polite">
          {status === "idle" && "Ready"}
          {status === "unsaved" && "Unsaved changes"}
          {status === "saving" && "Saving…"}
          {status === "saved" && "Saved"}
          {status === "error" && "Save error — text kept locally"}
        </div>
        <button type="button" onClick={() => void flush()} disabled={pending}>
          Save now
        </button>
        <button type="button" onClick={undo}>
          Undo
        </button>
        <button type="button" onClick={redo}>
          Redo
        </button>
        <button type="button" onClick={() => setPreviewOpen((value) => !value)}>
          {previewOpen ? "Hide preview" : "Preview"}
        </button>
        <button type="button" onClick={() => download("fountain")}>
          Export Fountain
        </button>
        <button type="button" onClick={() => download("plaintext")}>
          Export plain text
        </button>
      </header>

      {error ? <p className="auth-error">{error}</p> : null}

      <DraftControls
        projectId={projectId}
        draft={draft}
        drafts={drafts}
        currentDraftId={currentDraftId}
      />

      <div className="screenplay__layout">
        <aside className="screenplay__nav" aria-label="Scene and beat navigator">
          <h2>Beats</h2>
          <button type="button" onClick={() => setBeatFilter("all")}>
            All scenes
          </button>
          <button type="button" onClick={() => setBeatFilter("unassigned")}>
            Unassigned
          </button>
          <ul>
            {structure.lanes.map((lane) => (
              <li key={lane.beat.id}>
                <button type="button" onClick={() => setBeatFilter(lane.beat.id)}>
                  {lane.beat.name} ({lane.scenes.length})
                </button>
              </li>
            ))}
          </ul>
          <h2>Scenes</h2>
          <ol>
            {structure.screenplayScenes
              .filter((scene) =>
                beatFilter === "all"
                  ? true
                  : beatFilter === "unassigned"
                    ? scene.beatId === null
                    : scene.beatId === beatFilter,
              )
              .map((scene) => (
                <li key={scene.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const heading = elements.find(
                        (element) =>
                          element.elementType === "scene_heading" && element.sceneId === scene.id,
                      );
                      if (heading) setFocusId(heading.id);
                    }}
                  >
                    {scene.heading || "Untitled"}
                  </button>
                  <BeatAssign
                    scene={scene}
                    beats={beats}
                    onAssign={(beatId) => {
                      startTransition(async () => {
                        const result = await assignSceneBeatAction({
                          projectId,
                          sceneId: scene.id,
                          beatId,
                        });
                        if (result.error) setError(result.error);
                      });
                    }}
                  />
                </li>
              ))}
          </ol>
        </aside>

        <div className="screenplay__editor" role="textbox" aria-label="Screenplay editor">
          <datalist id="screenplay-characters">
            {characterNames.map((name) => (
              <option key={name} value={name.toUpperCase()} />
            ))}
          </datalist>
          <datalist id="screenplay-locations">
            {locations.map((location) => (
              <option key={location} value={`INT. ${location.toUpperCase()} - DAY`} />
            ))}
          </datalist>
          {visibleElements.map((element) => (
            <ElementRow
              key={element.id}
              element={element}
              focused={focusId === element.id}
              onFocus={() => setFocusId(element.id)}
              onChange={(content, type) => void onChangeElement(element.id, content, type)}
              onEnter={() => onEnter(element.id)}
              onTab={(shift) => onTab(element.id, shift)}
              onBackspaceStart={() => onBackspaceStart(element.id)}
            />
          ))}
        </div>

        {previewOpen ? (
          <aside className="screenplay__preview" aria-label="Screenplay preview">
            <h2>Preview</h2>
            <pre>{exportFountain(elements, projectTitle)}</pre>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function ElementRow({
  element,
  focused,
  onFocus,
  onChange,
  onEnter,
  onTab,
  onBackspaceStart,
}: {
  element: ScreenplayElement;
  focused: boolean;
  onFocus: () => void;
  onChange: (content: string, type?: ScreenplayElementType) => void;
  onEnter: () => void;
  onTab: (shift: boolean) => void;
  onBackspaceStart: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const usesAutocomplete =
    element.elementType === "character" || element.elementType === "scene_heading";

  useEffect(() => {
    if (!focused) return;
    if (usesAutocomplete) inputRef.current?.focus();
    else textareaRef.current?.focus();
  }, [focused, usesAutocomplete]);

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onEnter();
    } else if (event.key === "Tab") {
      event.preventDefault();
      onTab(event.shiftKey);
    } else if (
      event.key === "Backspace" &&
      (event.currentTarget.selectionStart ?? 0) === 0 &&
      (event.currentTarget.selectionEnd ?? 0) === 0
    ) {
      if (element.content.length === 0) {
        event.preventDefault();
        onBackspaceStart();
      }
    }
  }

  return (
    <div className={`screenplay-line screenplay-line--${element.elementType}`}>
      <label className="screenplay-line__type">
        <span className="sr-only">Element type</span>
        <select
          value={element.elementType}
          onChange={(event) =>
            onChange(element.content, event.target.value as ScreenplayElementType)
          }
        >
          {ELEMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      {usesAutocomplete ? (
        <input
          ref={inputRef}
          value={element.content}
          list={
            element.elementType === "character"
              ? "screenplay-characters"
              : "screenplay-locations"
          }
          onFocus={onFocus}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={element.content}
          rows={Math.max(1, element.content.split("\n").length)}
          onFocus={onFocus}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      )}
    </div>
  );
}

function BeatAssign({
  scene,
  beats,
  onAssign,
}: {
  scene: Scene;
  beats: Beat[];
  onAssign: (beatId: string | null) => void;
}) {
  return (
    <label className="screenplay__beat-assign">
      Beat
      <select
        value={scene.beatId ?? ""}
        onChange={(event) => onAssign(event.target.value || null)}
      >
        <option value="">Unassigned</option>
        {beats.map((beat) => (
          <option key={beat.id} value={beat.id}>
            {beat.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function DraftControls({
  projectId,
  draft,
  drafts,
  currentDraftId,
}: {
  projectId: string;
  draft: DraftSummary;
  drafts: DraftSummary[];
  currentDraftId: string | null;
}) {
  const [title, setTitle] = useState(draft.title);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="screenplay__drafts" aria-label="Draft controls">
      <p>
        Current draft indicator:{" "}
        <strong>{currentDraftId === draft.id ? "This draft is current" : "Not current"}</strong>
      </p>
      <label>
        Draft name
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await renameDraftAction({
              projectId,
              draftId: draft.id,
              title,
            });
            if (result.error) setError(result.error);
            else setMessage(result.message);
          });
        }}
      >
        Rename
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await createDraftAction({
              projectId,
              title: "New draft",
            });
            if (result.error) setError(result.error);
            else if (result.draftId) window.location.href = `/projects/${projectId}/screenplay?draft=${result.draftId}`;
          });
        }}
      >
        Create draft
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await duplicateDraftAction({
              projectId,
              sourceDraftId: draft.id,
            });
            if (result.error) setError(result.error);
            else if (result.draftId) {
              window.location.href = `/projects/${projectId}/screenplay?draft=${result.draftId}`;
            }
          });
        }}
      >
        Duplicate draft
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await clearCurrentDraftAction({ projectId });
            if (result.error) setError(result.error);
            else {
              setMessage(result.message);
              window.location.reload();
            }
          });
        }}
      >
        Clear current-draft indicator
      </button>
      <label>
        Switch draft
        <select
          value={draft.id}
          onChange={(event) => {
            const nextId = event.target.value;
            startTransition(async () => {
              const result = await switchDraftAction({ projectId, draftId: nextId });
              if (result.error) setError(result.error);
              else window.location.href = `/projects/${projectId}/screenplay?draft=${nextId}`;
            });
          }}
        >
          {drafts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
              {currentDraftId === item.id ? " (current)" : ""}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="auth-error">{error}</p> : null}
      {message ? <p className="auth-ok">{message}</p> : null}
    </section>
  );
}
