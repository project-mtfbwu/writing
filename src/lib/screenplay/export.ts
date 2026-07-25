import type { ScreenplayElement } from "@/lib/screenplay/model";
import { normalizeCharacterName } from "@/lib/screenplay/model";

/** Fountain export — stable text format, no PDF. */
export function exportFountain(elements: ScreenplayElement[], title?: string): string {
  const lines: string[] = [];
  if (title?.trim()) {
    lines.push(`Title: ${title.trim()}`, "");
  }
  for (const element of [...elements].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const text = element.content;
    switch (element.elementType) {
      case "scene_heading":
        lines.push(text.toUpperCase() || "INT. LOCATION - DAY");
        lines.push("");
        break;
      case "action":
        lines.push(text);
        lines.push("");
        break;
      case "character":
        lines.push(normalizeCharacterName(text));
        break;
      case "parenthetical":
        lines.push(text.startsWith("(") ? text : `(${text})`);
        break;
      case "dialogue":
        lines.push(text);
        lines.push("");
        break;
      case "transition":
        lines.push(text.toUpperCase().endsWith(":") ? text.toUpperCase() : `${text.toUpperCase()}:`);
        lines.push("");
        break;
      case "shot":
        lines.push(text.toUpperCase());
        lines.push("");
        break;
      case "note":
        lines.push(`[[${text}]]`);
        lines.push("");
        break;
      default:
        lines.push(text);
    }
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export function exportPlainText(elements: ScreenplayElement[]): string {
  return (
    [...elements]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((element) => {
        switch (element.elementType) {
          case "character":
            return normalizeCharacterName(element.content);
          case "parenthetical":
            return element.content.startsWith("(") ? element.content : `(${element.content})`;
          case "note":
            return `[NOTE] ${element.content}`;
          default:
            return element.content;
        }
      })
      .join("\n\n")
      .trimEnd() + "\n"
  );
}
