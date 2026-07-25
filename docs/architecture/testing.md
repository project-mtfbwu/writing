# Testing

## Layers

| Layer | Command | Location |
| --- | --- | --- |
| Content validation | `pnpm content:check` | `scripts/content-check.ts` |
| Unit | `pnpm test` | `tests/unit` |
| Integration | `pnpm test:integration` | `tests/integration` |
| E2E smoke | `pnpm test:e2e` | `tests/e2e` |
| Build | `pnpm build` | Next production build |

## CI

`.github/workflows/ci.yml` runs content index/check, lint, type-check, unit, integration, build, audit, then Playwright Chromium smoke.

## Playwright coverage (smoke)

- Home nav + dashboard labels
- Read a chapter
- Attempt reading mode change
- Library search surface
- Learn entry
- Auth gates for project/write/test flows
- Reference indexes

Authenticated create-beat / screenplay / Scene Lab write paths need credentials — smoke asserts gates rather than inventing fixtures.

## Honesty rule

Do not claim coverage for flows that only redirect to login.
