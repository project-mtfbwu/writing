# Deployment

## Requirements

1. Node ≥ 24, pnpm 11.17.0
2. Build: `pnpm content:index && pnpm build`
3. Host that can run Next.js App Router (Node server or compatible platform)
4. Supabase project with migrations applied in order under `supabase/migrations/`
5. Env vars from `.env.example` (never commit secrets)

## Environments

| Env | Purpose |
| --- | --- |
| Local `.env.local` | Developer |
| Preview / staging | Integration against a non-prod Supabase |
| Production | Not declared ready for internal v1 without the readiness checklist |

## Migrations

Apply every SQL file in timestamp order. Internal v1 depends on auth, beats/scenes, screenplay, and scene-lab migrations.

## Post-deploy smoke

- `/` nav + dashboard
- `/read/...` chapter
- `/learn`
- `/atlas`
- `/reference`
- `/projects` auth gate
- `/test` Scene Lab hub
- `/account` export/delete UI

## Do not

- Force-push
- Merge to `main` from this hardening pass without an explicit release decision
- Deploy with service-role keys in `NEXT_PUBLIC_*`
