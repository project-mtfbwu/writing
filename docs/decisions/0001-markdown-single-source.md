# ADR 0001 — Markdown as single source of truth

## Status

Accepted

## Context

Writing must present the same instructional material as a book, a guided course, an atlas, a reference index, and raw source — without drifting copies.

## Decision

Markdown files under `content/source/` are the sole editorial source of truth. All product modes are projections of one parsed content model. Generated artifacts under `content/generated/` are derived only.

## Consequences

- Parsers and mode UIs must share typed AST contracts (Zod).
- Fixing a lesson once fixes every mode.
- Temptation to “improve” copy per mode is rejected; presentation differs, text does not fork.
- Content PRs review Markdown + generator output, not hand-edited mode duplicates.
