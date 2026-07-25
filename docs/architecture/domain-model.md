# Domain model

## Content domain

Books → chapters → sections → blocks → evidence badges / concept links / callouts.

## User / project domain (Supabase)

- `profiles`, `projects`, `project_members`
- `premises`, `characters`
- `drafts`, `draft_versions`, `beats`, `scenes`
- `screenplay_elements`
- `micro_beats`, `scene_review_runs`, `scene_review_findings`
- `lesson_progress`, `exercise_attempts`
- `review_findings` (legacy placeholder)

## Scene Lab fields on `scenes`

POV, objective, why-now, obstacle, tactics, turn, charge in/out, object, light, environment, background life, register, deletion test result, long draft, dialogue notes, explicit dependency notes.

## Canonical ordering

`projectStructureOrder(beats, scenes)` is the single projection for:

- beat board lanes
- scene navigator
- screenplay scene list
- deletion-test “without this scene” view

## Findings

Findings are rule drafts with severity, evidence location, explanation, learning links, status (`open|accepted|dismissed|deferred`), and optional dialogue-cut tags. No overall score entity exists.
