# Content architecture

## Pipeline

1. Author Markdown in `content/source/`
2. `pnpm content:index` builds `content/generated/manifest.json` + search index
3. `pnpm content:check` validates schema, evidence markers, and on-disk sync
4. App modes read the generated manifest — they do not invent book prose

## One source, many projections

| Projection | Consumer |
| --- | --- |
| Book Mode | `/read` |
| Library search | `/library` |
| Learn lessons | `sourceRefs` on curriculum lessons |
| Atlas snippets / ELI5 / Secret Sauce | Atlas concept `sourceLocations` + topic excerpts |
| Reference | Deep links into chapters (no rewrite) |
| Scene Lab learning links | Atlas + curriculum IDs on findings |

## Callouts, evidence, concepts

See `docs/architecture/content-authoring-guide.md`.

## Generated artifacts

- `content/generated/manifest.json`
- `content/generated/search-index.json`

Do not hand-edit generated files.
