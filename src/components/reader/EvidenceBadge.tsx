"use client";

import { useId, useState } from "react";
import type { EvidenceLabel } from "@/types/content";
import { EVIDENCE_DEFINITIONS } from "@/lib/reader/modes";

type EvidenceBadgeProps = {
  label: EvidenceLabel;
  className?: string;
};

export function EvidenceBadge({ label, className = "" }: EvidenceBadgeProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const definition = EVIDENCE_DEFINITIONS[label];

  return (
    <span className={`evidence-badge-wrap ${className}`}>
      <button
        type="button"
        className="evidence-badge"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        aria-label={`${label}: ${definition.meaning}`}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        {label}
      </button>
      {open ? (
        <span role="tooltip" id={tooltipId} className="evidence-badge__tooltip">
          {definition.meaning}
        </span>
      ) : null}
    </span>
  );
}

export function enrichTextWithEvidenceBadges(
  text: string,
  enabled: boolean,
): Array<string | { label: EvidenceLabel }> {
  if (!enabled) {
    return [text];
  }
  const parts: Array<string | { label: EvidenceLabel }> = [];
  const pattern = /\[(E[1-5])\]/g;
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }
    parts.push({ label: match[1] as EvidenceLabel });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}
