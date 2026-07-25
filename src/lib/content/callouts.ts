import { CalloutKindSchema, type CalloutKind } from "@/types/content";

const CALLOUT_MARKER = /^\[!([^\]]+)\]\s*(.*)$/i;

const ALIASES: Record<string, CalloutKind> = {
  "secret-sauce": "secret-sauce",
  secretsauce: "secret-sauce",
  "secret sauce": "secret-sauce",
  eli5: "eli5",
  "real-world": "real-world",
  realworld: "real-world",
  "real world": "real-world",
  evidence: "evidence",
  formula: "formula",
  bad: "bad",
  better: "better",
  "try-it": "try-it",
  tryit: "try-it",
  "try it": "try-it",
  "common-mistake": "common-mistake",
  commonmistake: "common-mistake",
  "common mistake": "common-mistake",
  definition: "definition",
  source: "source",
};

export type ParsedCalloutMarker = {
  kind: CalloutKind | null;
  rawKind: string;
  title?: string;
  malformed: boolean;
};

export function normalizeCalloutKind(raw: string): CalloutKind | null {
  const key = raw.trim().toLowerCase().replace(/_/g, "-");
  const spaced = key.replace(/\s+/g, " ");
  const dashed = spaced.replace(/\s/g, "-");
  const compact = dashed.replace(/-/g, "");

  const mapped =
    ALIASES[dashed] ??
    ALIASES[spaced] ??
    ALIASES[compact] ??
    (CalloutKindSchema.safeParse(dashed).success ? (dashed as CalloutKind) : null);

  return mapped;
}

export function parseCalloutMarkerLine(line: string): ParsedCalloutMarker | null {
  const trimmed = line.trim();
  const match = CALLOUT_MARKER.exec(trimmed);
  if (!match) {
    return null;
  }

  const rawKind = match[1] ?? "";
  const title = (match[2] ?? "").trim() || undefined;
  const kind = normalizeCalloutKind(rawKind);

  return {
    kind,
    rawKind,
    title,
    malformed: kind === null,
  };
}

export function isKnownCalloutKind(raw: string): boolean {
  return normalizeCalloutKind(raw) !== null;
}
