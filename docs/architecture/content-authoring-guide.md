# Content authoring guide

## Where to write

Author only in `content/source/`. Imports under `imports/` are archival.

## Frontmatter

YAML frontmatter on source documents supplies title and metadata consumed by the indexer. Keep keys stable; unknown keys may be ignored by validation.

## Headings

Use ATX headings (`#` … `######`). Heading text becomes navigation labels and stable slug IDs. Prefer unique heading text within a book.

## Callout syntax

Callouts are recognized markers (see `src/lib/content/callouts.ts`). Use known kinds only — unknown kinds fail content check.

## Evidence labels

Inline evidence markers (E1–E4 family) must match the allowed set. Invalid markers fail `pnpm content:check`.

## Concept links

Explicit concept references in Markdown become `conceptLinks` in the manifest when resolved. Unresolved links stay visible but do not invent destinations.

## Exercises / lessons

Curriculum exercises live in `src/data/learning/` and **point at** Markdown via `sourceRefs`. Do not duplicate lesson prose into TypeScript.

## One Markdown source powers every mode

| Mode | How it uses Markdown |
| --- | --- |
| Read | Renders chapter blocks |
| Learn | Opens `sourceRefs` in the reader |
| Atlas | Loads section/chapter snippets + ELI5/Secret Sauce excerpts |
| Reference | Links to chapters without rewriting |
| Scene Lab | Findings deep-link to the same chapters/lessons |

After edits: `pnpm content:index && pnpm content:check`.
