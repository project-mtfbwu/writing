# Content architecture

## Single source of truth

All instructional and reference material lives as Markdown under `content/source/`.

```
content/
  source/          # Authoritative Markdown (human-edited)
  generated/       # Derived indexes, AST, search payloads (machine-written)
```

Rules:

1. Humans edit only `content/source/`.
2. Generated artifacts never become a second editorial source.
3. Book, Learn, Atlas, Reference, Everything, Split, and Raw modes all consume the same parse.
4. Do not duplicate lessons across “book copy,” “course copy,” and “reference copy.”

## Document → book → chapter → section → block

| Layer | Meaning |
|---|---|
| **Source document** | One Markdown file (e.g. syllabus, complete session) |
| **Book** | Product-facing reading unit composed from one or more source documents |
| **Part / Track** | Top-level grouping (`PART I`, `TRACK A`) |
| **Chapter / Module** | Numbered instructional unit |
| **Section** | Major heading under a module (`###` / `##`) |
| **Block** | Atomic renderable unit: prose, formula, callout, evidence row, exercise, sample, etc. |

## Block kinds

| Kind | Purpose |
|---|---|
| `prose` | Narrative / instructional body |
| `callout` | Sidebars, notes, warnings |
| `formula` | Formula fences and formula tables |
| `evidence` | Evidence-labeled claims and citation clusters |
| `eli5` | ELI5 explanations |
| `secret-sauce` | Collected craft maxims |
| `exercise` | Practice prompts |
| `example` | Worked examples, bad-vs-better pairs |
| `sample` | Full sample scenes / scripts |
| `reference` | Reading lists, indexes, collected reference sections |

## Evidence labels

Evidence marks from the syllabus are first-class content metadata:

| Mark | Meaning |
|---|---|
| **E1** | Empirically supported |
| **E2** | Partially supported |
| **E3** | Descriptive scholarship |
| **E4** | Craft heuristic |
| **E5** | Folklore / disputed |

Labels attach to blocks and citations; they travel into Every Mode that surfaces claims.

## Mode projections

| Mode | Projection rule |
|---|---|
| Book | Continuous chapter flow; selective callout density |
| Guided Learning | Module/lesson sequence + exercises + progress hooks |
| Everything | Full block set visible |
| Atlas | Concepts + relationships graph derived from headings and cross-links |
| Split | Same content pane + writing/project pane |
| Raw Markdown | Untransformed source |
| Reference | Indexes of formulas, Secret Sauce, ELI5, evidence, samples |

## Pipeline (planned)

1. Read Markdown from `content/source/`.
2. Parse headings, fences, tables, lists into a typed AST (Zod-validated).
3. Emit `content/generated/` indexes for search, atlas edges, and lesson maps.
4. Serve AST to UI modes; never re-author for a mode.

Bootstrap does not implement the parser yet. Source files are preserved verbatim.
