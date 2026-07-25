import type { ScreenplayElement } from "@/lib/screenplay/model";

export type SaveOp =
  | { kind: "upsert"; element: ScreenplayElement; expectedUpdatedAt: string | null }
  | { kind: "delete"; id: string; expectedUpdatedAt: string | null }
  | { kind: "reorder"; orderedIds: string[]; expectedRevision: number };

export type SaveQueueResult =
  | { ok: true; remaining: SaveOp[] }
  | { ok: false; error: string; remaining: SaveOp[]; failed: SaveOp };

/**
 * FIFO save queue. Failed ops stay at the front so text is never silently discarded.
 */
export function enqueueSave(queue: SaveOp[], op: SaveOp): SaveOp[] {
  if (op.kind === "upsert") {
    const without = queue.filter(
      (item) => !(item.kind === "upsert" && item.element.id === op.element.id),
    );
    return [...without, op];
  }
  if (op.kind === "delete") {
    const without = queue.filter((item) => {
      if (item.kind === "upsert" && item.element.id === op.id) return false;
      if (item.kind === "delete" && item.id === op.id) return false;
      return true;
    });
    return [...without, op];
  }
  const without = queue.filter((item) => item.kind !== "reorder");
  return [...without, op];
}

export async function flushSaveQueue(
  queue: SaveOp[],
  runner: (op: SaveOp) => Promise<{ ok: true } | { ok: false; error: string }>,
): Promise<SaveQueueResult> {
  const remaining = [...queue];
  while (remaining.length > 0) {
    const current = remaining[0]!;
    const result = await runner(current);
    if (!result.ok) {
      return { ok: false, error: result.error, remaining, failed: current };
    }
    remaining.shift();
  }
  return { ok: true, remaining: [] };
}

export type AutosaveStatus =
  | "idle"
  | "unsaved"
  | "saving"
  | "saved"
  | "error";

export function nextAutosaveStatus(
  current: AutosaveStatus,
  event: "edit" | "save-start" | "save-ok" | "save-fail" | "reset",
): AutosaveStatus {
  switch (event) {
    case "edit":
      return "unsaved";
    case "save-start":
      return "saving";
    case "save-ok":
      return "saved";
    case "save-fail":
      return "error";
    case "reset":
      return "idle";
    default:
      return current;
  }
}
