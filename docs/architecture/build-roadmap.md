# Build roadmap

Phased delivery. Each increment stays on `develop` after bootstrap, with focused commits and CI green before push.

## Phase 0 — Bootstrap (this increment)

- Next.js App Router scaffold (`src/`)
- Required tooling: TypeScript strict, Tailwind, ESLint, Prettier, Vitest, RTL, Playwright, Zod, pnpm
- Folder structure for domains and content
- Copy source Markdown into `content/source/`
- Architecture docs + ADRs + source inventory
- CI workflow + Cursor workflow rule
- Placeholder home page
- Push `main`, create `develop`

## Phase 1 — Content pipeline

- Markdown parser → typed AST (Zod)
- Heading / block classification
- Evidence label extraction
- Generated indexes under `content/generated/`
- Raw Markdown Mode + basic Book Mode chapter render
- Unit tests over fixtures from source documents

## Phase 2 — Book Mode + Reader

- `/library`, `/read`, `/read/[book]`, `/read/[book]/[chapter]`
- Novel-comfortable typography + technical sidebars
- Reading position, bookmarks (local first)
- Everything Mode toggle

## Phase 3 — Guided Learning

- Course/track/module mapping from syllabus + complete session
- `/learn` routes
- Exercises + attempt storage
- Progress and completion

## Phase 4 — Atlas + Reference

- Concept extraction and relationship edges
- `/atlas` graph/map UI
- `/reference` indexes: formulas, Secret Sauce, ELI5, evidence, samples

## Phase 5 — Writing workspace

- Projects CRUD (local / later remote)
- Premise, characters, structure, beats, scenes
- Screenplay editor (`/projects/[id]/script`)
- Split Mode (content + project)

## Phase 6 — Scene testing / Review

- Rule pack from craft tests (camera test, deletion test, four cuts, charge flip, …)
- Review runs and findings
- `/projects/[id]/test`
- Rewrite-pass checklist

## Phase 7 — Persistence & accounts (deferred)

- Auth and multi-device sync (Supabase or equivalent — not in bootstrap)
- User data migration from local stores

## Exit criteria per phase

- `pnpm lint`, `type-check`, `test`, `build` green
- No second copy of lesson content for a new mode
- Docs updated when domain or routes change
