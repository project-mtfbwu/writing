# Route map

Routes are planned for the full product. Only `/` is implemented in the bootstrap increment.

## Public / product routes

| Route | Intent | Domain |
|---|---|---|
| `/` | Product home / mode entry | Shell |
| `/read` | Book library / reading entry | Content + Reader |
| `/read/[book]` | Book overview / TOC | Content + Reader |
| `/read/[book]/[chapter]` | Chapter reading (Book Mode) | Content + Reader |
| `/library` | Catalog of books and source documents | Content |
| `/learn` | Course catalog / guided learning home | Learning |
| `/learn/[course]` | Course outline (tracks / modules) | Learning |
| `/learn/[course]/[lesson]` | Lesson view + exercises | Learning |
| `/atlas` | Complete-system atlas | Content (Atlas Mode) |
| `/projects` | Writing project list | Writing |
| `/projects/[projectId]` | Project overview | Writing |
| `/projects/[projectId]/premise` | Premise / logline / controlling idea | Writing |
| `/projects/[projectId]/characters` | Character bible | Writing |
| `/projects/[projectId]/structure` | Structure map | Writing |
| `/projects/[projectId]/beats` | Beat board | Writing |
| `/projects/[projectId]/scenes` | Scene list / cards | Writing |
| `/projects/[projectId]/script` | Screenplay editor | Writing |
| `/projects/[projectId]/test` | Scene-testing / review | Writing + Review |
| `/reference` | Formulas, Secret Sauce, ELI5, evidence, reading list | Content (Reference Mode) |

## Mode overlays (not separate content trees)

Modes may be query/path modifiers on content routes, for example:

- `/read/[book]/[chapter]?mode=book|everything|raw`
- `/learn/[course]/[lesson]?mode=guided`
- `/atlas` as graph projection of the same AST
- Split Mode as a layout that pairs a content route with a project route

Exact mode URL encoding is a later decision; the invariant is **one content AST**.

## Bootstrap status

| Route | Status |
|---|---|
| `/` | Implemented (placeholder links) |
| All others | Documented only |
