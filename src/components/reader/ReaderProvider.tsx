"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultReaderPreferences,
  FONT_SIZE_MAP,
  LINE_WIDTH_MAP,
  type ReaderPreferences,
  type ReadingPosition,
} from "@/lib/reader/modes";
import {
  loadReaderPreferences,
  loadReadingPosition,
  saveReaderPreferences,
  saveReadingPosition,
} from "@/lib/reader/persistence";

type ReaderContextValue = {
  preferences: ReaderPreferences;
  setPreferences: (patch: Partial<ReaderPreferences>) => void;
  position: ReadingPosition | null;
  updatePosition: (position: ReadingPosition) => void;
  ready: boolean;
};

const ReaderContext = createContext<ReaderContextValue | null>(null);

function applyAppearance(appearance: ReaderPreferences["appearance"]) {
  const root = document.documentElement;
  const wantsDark =
    appearance === "dark" ||
    (appearance === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", wantsDark);
  root.dataset.appearance = appearance;
}

function applyPreferenceCss(preferences: ReaderPreferences) {
  document.documentElement.style.setProperty(
    "--reader-font-size",
    FONT_SIZE_MAP[preferences.fontSize],
  );
  document.documentElement.style.setProperty(
    "--reader-measure",
    LINE_WIDTH_MAP[preferences.lineWidth],
  );
  applyAppearance(preferences.appearance);
}

export function ReaderProvider({
  children,
  bookId,
}: {
  children: ReactNode;
  bookId?: string;
}) {
  const [preferences, setPreferencesState] = useState<ReaderPreferences>(defaultReaderPreferences);
  const [position, setPosition] = useState<ReadingPosition | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Hydrate anonymous reader state from localStorage after mount.
    const frame = window.requestAnimationFrame(() => {
      const loaded = loadReaderPreferences();
      setPreferencesState(loaded);
      setPosition(loadReadingPosition(bookId));
      applyPreferenceCss(loaded);
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [bookId]);

  useEffect(() => {
    if (!ready) return;
    saveReaderPreferences(preferences);
    applyPreferenceCss(preferences);
  }, [preferences, ready]);

  const setPreferences = useCallback((patch: Partial<ReaderPreferences>) => {
    setPreferencesState((current) => ({ ...current, ...patch }));
  }, []);

  const updatePosition = useCallback((next: ReadingPosition) => {
    setPosition(next);
    saveReadingPosition(next);
  }, []);

  const value = useMemo(
    () => ({ preferences, setPreferences, position, updatePosition, ready }),
    [preferences, setPreferences, position, updatePosition, ready],
  );

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>;
}

export function useReader() {
  const ctx = useContext(ReaderContext);
  if (!ctx) {
    throw new Error("useReader must be used within ReaderProvider");
  }
  return ctx;
}
