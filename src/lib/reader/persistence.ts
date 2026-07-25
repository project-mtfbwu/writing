import {
  defaultReaderPreferences,
  POSITION_STORAGE_KEY,
  PREFERENCES_STORAGE_KEY,
  ReadingPositionSchema,
  ReaderPreferencesSchema,
  type ReadingPosition,
  type ReaderPreferences,
} from "@/lib/reader/modes";

export function loadReaderPreferences(): ReaderPreferences {
  if (typeof window === "undefined") {
    return defaultReaderPreferences();
  }
  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return defaultReaderPreferences();
    return ReaderPreferencesSchema.parse({ ...defaultReaderPreferences(), ...JSON.parse(raw) });
  } catch {
    return defaultReaderPreferences();
  }
}

export function saveReaderPreferences(preferences: ReaderPreferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

export function loadReadingPosition(bookId?: string): ReadingPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = ReadingPositionSchema.parse(JSON.parse(raw));
    if (bookId && parsed.bookId !== bookId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveReadingPosition(position: ReadingPosition): void {
  if (typeof window === "undefined") return;
  const parsed = ReadingPositionSchema.parse(position);
  window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(parsed));
}

export function serializeReadingPosition(position: ReadingPosition): string {
  return JSON.stringify(ReadingPositionSchema.parse(position));
}

export function deserializeReadingPosition(raw: string): ReadingPosition | null {
  try {
    return ReadingPositionSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function escapeRawMarkdown(source: string): string {
  return source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
