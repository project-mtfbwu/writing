import { EvidenceLabelSchema, type EvidenceBadge, type EvidenceLabel } from "@/types/content";
import { StableIdRegistry } from "@/lib/content/ids";

const EVIDENCE_PATTERN = /\[(E[1-5])\]/g;

export function isEvidenceLabel(value: string): value is EvidenceLabel {
  return EvidenceLabelSchema.safeParse(value).success;
}

export function extractEvidenceBadges(
  text: string,
  registry: StableIdRegistry,
  documentId: string,
  blockId?: string,
): EvidenceBadge[] {
  const badges: EvidenceBadge[] = [];
  for (const match of text.matchAll(EVIDENCE_PATTERN)) {
    const raw = match[0];
    const label = match[1];
    if (!isEvidenceLabel(label)) {
      continue;
    }
    badges.push({
      id: registry.allocate([documentId, "evidence", label.toLowerCase(), String(match.index ?? 0)]),
      label,
      raw,
      blockId,
      offset: match.index ?? undefined,
    });
  }
  return badges;
}

export function findInvalidEvidenceMarkers(text: string): string[] {
  const invalid: string[] = [];
  const loose = /\[(E[0-9]+)\]/g;
  for (const match of text.matchAll(loose)) {
    const label = match[1];
    if (!isEvidenceLabel(label)) {
      invalid.push(match[0]);
    }
  }
  return invalid;
}
