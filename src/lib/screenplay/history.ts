import type { ScreenplayElement } from "@/lib/screenplay/model";

export type EditorSnapshot = {
  elements: ScreenplayElement[];
  focusId: string | null;
};

export class SessionHistory {
  private past: EditorSnapshot[] = [];
  private future: EditorSnapshot[] = [];
  private limit: number;

  constructor(limit = 100) {
    this.limit = limit;
  }

  push(snapshot: EditorSnapshot) {
    this.past.push(cloneSnapshot(snapshot));
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  undo(current: EditorSnapshot): EditorSnapshot | null {
    const previous = this.past.pop();
    if (!previous) return null;
    this.future.push(cloneSnapshot(current));
    return previous;
  }

  redo(current: EditorSnapshot): EditorSnapshot | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(cloneSnapshot(current));
    return next;
  }

  get canUndo() {
    return this.past.length > 0;
  }

  get canRedo() {
    return this.future.length > 0;
  }
}

function cloneSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return {
    focusId: snapshot.focusId,
    elements: snapshot.elements.map((element) => ({ ...element, metadata: { ...element.metadata } })),
  };
}
