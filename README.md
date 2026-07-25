# Writing

Product name: **Writing**.

Markdown under `content/source/` is the single source of truth for book, learning, atlas, and reference modes. Supabase stores only authenticated user/project data.

## Stack

- Next.js App Router + TypeScript (strict) + React + Tailwind CSS
- Supabase Auth + Postgres (RLS) when configured
- pnpm, ESLint, Prettier, Vitest, Playwright, Zod

## Scripts

```bash
pnpm install
pnpm content:index
pnpm content:check
pnpm dev
pnpm lint
pnpm type-check
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm audit
```

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Home dashboard (continue actions only — no fake KPIs) |
| `/read` | Book mode |
| `/learn` | Guided curriculum |
| `/atlas` | System map |
| `/projects` | Write — projects, structure, screenplay |
| `/test` | Scene Lab hub |
| `/reference` | Indexes into source chapters (no rewrite) |
| `/account` | Export, local clear, project delete, account deletion request |

## Environment

Copy `.env.example` → `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Apply migrations under `supabase/migrations/` before using Write/Test against a live database.

## Docs

- Architecture: `docs/architecture/`
- Release readiness: `docs/releases/internal-v1-readiness.md`
- Changelog: `CHANGELOG.md`
