import { z } from "zod";

export const ScreenplayElementTypeSchema = z.enum([
  "scene_heading",
  "action",
  "character",
  "parenthetical",
  "dialogue",
  "transition",
  "shot",
  "note",
]);
export type ScreenplayElementType = z.infer<typeof ScreenplayElementTypeSchema>;

export const ELEMENT_TYPES = ScreenplayElementTypeSchema.options;

export const ScreenplayElementSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  draftId: z.string().uuid(),
  sceneId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  elementType: ScreenplayElementTypeSchema,
  content: z.string(),
  sortOrder: z.number().int(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ScreenplayElement = z.infer<typeof ScreenplayElementSchema>;

export const TAB_CYCLE: ScreenplayElementType[] = [
  "action",
  "character",
  "parenthetical",
  "dialogue",
  "transition",
  "shot",
  "scene_heading",
  "note",
];

const SCENE_HEADING_RE =
  /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)(\s|$)/i;

export function isSceneHeadingText(content: string): boolean {
  return SCENE_HEADING_RE.test(content.trim());
}

export function normalizeCharacterName(content: string): string {
  return content.trim().toUpperCase().replace(/\s+/g, " ");
}

/** Enter: insert a new element of the appropriate following type. */
export function nextTypeOnEnter(
  type: ScreenplayElementType,
  content: string,
): ScreenplayElementType {
  switch (type) {
    case "scene_heading":
      return "action";
    case "action":
      if (isSceneHeadingText(content)) return "action";
      if (content.trim() && content === content.toUpperCase() && content.trim().length <= 40) {
        return "dialogue";
      }
      return "action";
    case "character":
      return "dialogue";
    case "parenthetical":
      return "dialogue";
    case "dialogue":
      return "action";
    case "transition":
      return "scene_heading";
    case "shot":
      return "action";
    case "note":
      return "action";
    default:
      return "action";
  }
}

/** Tab: cycle element type for the current line. */
export function nextTypeOnTab(type: ScreenplayElementType): ScreenplayElementType {
  const index = TAB_CYCLE.indexOf(type);
  if (index < 0) return "action";
  return TAB_CYCLE[(index + 1) % TAB_CYCLE.length]!;
}

export function previousTypeOnShiftTab(type: ScreenplayElementType): ScreenplayElementType {
  const index = TAB_CYCLE.indexOf(type);
  if (index < 0) return "action";
  return TAB_CYCLE[(index - 1 + TAB_CYCLE.length) % TAB_CYCLE.length]!;
}

/**
 * Backspace at start of an empty element may merge/delete into previous.
 * Never silently discard non-empty content.
 */
export function resolveBackspaceAtStart(input: {
  current: Pick<ScreenplayElement, "id" | "content" | "elementType">;
  previous: Pick<ScreenplayElement, "id" | "content" | "elementType"> | null;
}): 
  | { action: "none" }
  | { action: "delete-empty"; deleteId: string; focusId: string }
  | { action: "merge-into-previous"; deleteId: string; focusId: string; mergedContent: string } {
  const currentEmpty = input.current.content.length === 0;
  if (!currentEmpty) return { action: "none" };
  if (!input.previous) {
    return { action: "none" };
  }
  if (input.previous.content.length === 0) {
    return {
      action: "delete-empty",
      deleteId: input.current.id,
      focusId: input.previous.id,
    };
  }
  // Empty current at boundary: remove current and keep previous content intact.
  return {
    action: "delete-empty",
    deleteId: input.current.id,
    focusId: input.previous.id,
  };
}

export function insertElementAfter(
  elements: ScreenplayElement[],
  afterId: string | null,
  element: ScreenplayElement,
): ScreenplayElement[] {
  if (!afterId) {
    return reindex([{ ...element, sortOrder: 0 }, ...elements]);
  }
  const index = elements.findIndex((item) => item.id === afterId);
  if (index < 0) return reindex([...elements, element]);
  const next = [...elements];
  next.splice(index + 1, 0, element);
  return reindex(next);
}

export function removeElement(
  elements: ScreenplayElement[],
  id: string,
): ScreenplayElement[] {
  return reindex(elements.filter((item) => item.id !== id));
}

export function updateElementContent(
  elements: ScreenplayElement[],
  id: string,
  content: string,
  elementType?: ScreenplayElementType,
): ScreenplayElement[] {
  return elements.map((item) =>
    item.id === id
      ? {
          ...item,
          content,
          elementType: elementType ?? item.elementType,
          updatedAt: new Date().toISOString(),
        }
      : item,
  );
}

export function reindex(elements: ScreenplayElement[]): ScreenplayElement[] {
  return elements.map((item, index) => ({ ...item, sortOrder: index }));
}

export function parseSceneHeading(content: string): {
  location: string;
  timeOfDay: string;
} {
  const trimmed = content.trim();
  const parts = trimmed.split(" - ");
  if (parts.length >= 2) {
    const timeOfDay = parts[parts.length - 1]!.trim();
    const location = parts.slice(0, -1).join(" - ").replace(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)\s*/i, "").trim();
    return { location, timeOfDay };
  }
  return {
    location: trimmed.replace(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)\s*/i, "").trim(),
    timeOfDay: "",
  };
}
