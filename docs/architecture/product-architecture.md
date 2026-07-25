# Product architecture — Writing

## Purpose

Writing is a single product that combines:

- a novel-like book reader
- a technical learning handbook
- interactive screenwriting lessons
- a complete-system atlas
- a writing project workspace
- a beat board
- a screenplay editor
- a scene-testing system

Working product name: **Writing**.

This repository is the only writable product surface. AVForge is out of scope and must not be referenced as an architectural dependency.

## Product surfaces

| Surface | Job |
|---|---|
| **Book Mode** | Continuous, comfortable reading of source Markdown as chapters |
| **Guided Learning Mode** | Lesson-shaped progression with exercises and progress |
| **Everything Mode** | Dense handbook view with all callouts, formulas, and evidence visible |
| **Atlas Mode** | Concept graph / map across the complete system |
| **Split Mode** | Side-by-side reading + application (project, editor, or reference) |
| **Raw Markdown Mode** | Source fidelity view of the Markdown itself |
| **Reference Mode** | Indexed formulas, Secret Sauce, ELI5s, evidence, reading lists |

All surfaces read the **same** Markdown-derived content model. Modes are projections, not forks.

## Reading experience goals

The reader should combine:

- commercial-novel readability (flow, typography, page comfort)
- O’Reilly-style technical explanations and sidebars
- Secret Sauce callouts
- ELI5 explanations
- real-world examples
- formulas
- evidence labels
- bad-versus-better examples
- exercises

Typography and information design are the reference — not any authorial prose style.

## Domain separation

| Domain | Owns |
|---|---|
| **Content** | Books, source documents, chapters, sections, blocks, callouts, concepts, relationships, evidence, exercises, examples, references |
| **Learning** | Courses, tracks, modules, lessons, attempts, progress, completion, lesson notes |
| **Writing** | Users, projects, premises, characters, drafts, beats, scenes, screenplay elements, versions |
| **Reader** | Position, depth, bookmarks, highlights, private notes |
| **Review** | Rules, review runs, findings, finding status, rewrite passes |

Content is authoritative and file-backed. Learning/Reader/Writing/Review store **user state** separately (local or database later). Supabase is deferred.

## Core architectural law

**Markdown is the single source of truth.**

The same parsed content powers every mode. Never maintain separate copies of the same lesson for book, course, and reference.

## Runtime stack

- Next.js App Router
- TypeScript (strict)
- React
- Tailwind CSS
- pnpm
- ESLint + Prettier
- Vitest + React Testing Library
- Playwright
- Zod

Node LTS is pinned in `.nvmrc`.

## Source corpus (bootstrap)

| File | Role |
|---|---|
| `content/source/screenwriting-syllabus.md` | Loop-structured curriculum; Track F evidence; modules 0–11 |
| `content/source/complete-session-script-to-cut.md` | Complete system: foundations → formula stack → dimension → edit → samples → reference |

Originals remain in `imports/` and are also copied to `content/source/` for the content pipeline. Source copies stay untouched during this bootstrap increment.

## Non-goals for this increment

- Book Mode implementation
- Content parsing pipeline
- Auth / Supabase
- Full route implementations beyond the home placeholder
- Fake dashboards or mock analytics
