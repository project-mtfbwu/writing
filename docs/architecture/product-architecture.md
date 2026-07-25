# Product architecture

## Modes

Writing projects craft through connected modes from one Markdown source:

1. **Read** — book projection (`/read`, `/library`)
2. **Learn** — curriculum (`/learn`)
3. **Atlas** — concept map (`/atlas`)
4. **Write** — projects, beats, scenes, screenplay (`/projects/...`)
5. **Test** — Scene Lab rule reviews (`/test`, `/projects/.../scene-lab`)
6. **Reference** — indexes into source (`/reference`)

## Navigation

Primary nav is shared via `AppShell` / `SiteNav`. Project sub-nav remains local to Write tools.

## Data boundary

| Layer | Source of truth |
| --- | --- |
| Books, formulas, ELI5, Secret Sauce, evidence labels | `content/source/*.md` → generated manifest |
| Curriculum structure | `src/data/learning/` pointing at Markdown refs |
| Atlas graph | `src/data/atlas/system.ts` pointing at Markdown |
| Auth, projects, beats, scenes, elements, findings | Supabase (RLS) |

## Cross-product flows

- Reading study rail → Atlas concept + Learn lesson (explicit concept links only)
- Learn exercise → Apply to project premise/character
- Scene Lab finding → book/lesson/exercise/Atlas links
- Beat board order ≡ screenplay scene projection (`projectStructureOrder`)
- Scene card / screenplay nav → Scene Lab

## Non-goals for internal v1

- Split Mode side-by-side editor
- PDF export
- Automatic dialogue rewrite
- Fake overall script scores
- Claiming production readiness without operator-run migrations and e2e auth coverage
