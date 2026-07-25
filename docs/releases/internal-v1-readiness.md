# Internal v1 readiness report

Date: 2026-07-25  
Branch target: `develop`  
Recommendation: **GO for internal dogfood / no-go for public production**

## Completed features

- Content engine + Book Mode reader with modes, study rail, library search/bookmarks/notes
- Learn curriculum with apply-to-project
- Atlas system/matrix/formulas/evidence/everything + concept pages
- Auth + projects (premise, characters)
- Beats/scenes board with canonical order
- Screenplay editor (Fountain/plaintext export, drafts, autosave)
- Scene Lab guided/expert + deterministic findings (no fake score)
- App shell nav; home continue dashboard; `/reference`; `/test`; `/account` export/delete flows
- Error boundaries, offline warning, outage banner, sanitized logging
- CI quality + Playwright smoke scaffold

## Incomplete features

- Full authenticated Playwright fixtures (create project → beat → scene → screenplay → Scene Lab end-to-end)
- Split Mode
- PDF export
- Operator-completed account wipe automation
- Edge/global rate limiting
- Production observability sink (logging abstraction only)
- Live RLS integration tests against a real Supabase instance in CI

## Known bugs / risks

- Without Supabase env, Write/Test flows redirect — expected
- Site nav “Test” active state overlaps Write when under `/projects/.../scene-lab`
- Playwright reading-mode control selectors are best-effort across UI variants
- In-process rate limits reset per server instance

## Security status

- RLS policies present in migrations; **must be applied** on the target Supabase project
- Export/delete gated by membership/owner checks
- Markdown sanitized for HTML
- `pnpm audit --prod` runs in CI (`|| true` until clean). Local environments without pnpm on PATH should use CI for audit evidence.

## Test coverage

- Unit suites for content, reader, library, learning, atlas, projects, beats, screenplay, scene-lab
- Integration: nav, order agreement, bridges, export helpers, reference books
- E2E smoke: public/gated routes (not full auth craft loop)

## Performance observations

- Manifest/search index are generated files loaded server-side — watch size as content grows
- Atlas concept pages cap snippet loads
- Screenplay/Scene Lab are client islands; keep unnecessary client wrappers out of static pages
- No image-heavy marketing surface yet; Next font `display: swap` used
- Prefer code-splitting via route segments already provided by App Router

## Accessibility status

- Skip link, landmarks via header/main, primary nav labels
- `prefers-reduced-motion` kill switch in CSS
- Form errors use `role="alert"` on account panel
- Beat board still needs keyboard alternatives beyond drag-and-drop (buttons/forms exist on Scene Lab / scene editors)

## Migration status

Migrations through Scene Lab exist in-repo. Remote apply is an operator step — **not verified in this report**.

## Deployment requirements

See `docs/architecture/deployment.md`. Need Node 24, pnpm, content index, build, Supabase migrations, env vars.

## Go / no-go

| Audience | Verdict |
| --- | --- |
| Internal authors testing Read/Learn/Atlas/Reference | **GO** |
| Internal writers with configured Supabase | **GO** after migrations |
| Public production users | **NO-GO** until auth e2e, audit clean, and operator account-deletion runbook are proven |
