# ADR 0002 — File content vs database user data

## Status

Accepted

## Context

The product mixes durable instructional content with per-user state (progress, notes, projects, review runs). Mixing both into Markdown or both into a database creates either unreviewable content or undeployable personal data.

## Decision

| Data class | Storage |
|---|---|
| Books, lessons, formulas, samples, references | Git-tracked Markdown in `content/source/` (+ generated indexes) |
| Reading position, bookmarks, highlights, private notes | User data store (local first; remote DB later) |
| Course progress, exercise attempts, completion | User data store |
| Projects, drafts, beats, scenes, versions | User data store |
| Review runs and findings | User data store |

Supabase (or any cloud DB) is **not** introduced in bootstrap.

## Consequences

- Content ships with the repo and CI can validate it.
- User data schemas evolve independently of content files.
- Export/import of projects must not require rewriting source Markdown.
- Auth can be added later without restructuring the content pipeline.
