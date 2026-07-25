# Changelog

## Unreleased / develop

### Internal v1 hardening (`chore(release): harden internal v1`)

- App shell navigation: Home, Read, Learn, Atlas, Write, Test, Reference
- Home dashboard with continue actions (no fake KPIs)
- `/reference` indexes into source chapters
- `/test` Scene Lab hub; `/account` export + deletion flows
- Cross-links: reading → learn/atlas; Scene Lab ↔ screenplay/scenes; atlas project/review pointers
- Error boundaries, offline warning, Supabase outage banner, sanitized logging
- CI: content check, lint, type-check, unit + integration tests, build, Playwright smoke, audit
- Documentation refresh + internal v1 readiness report

### Prior increments on develop

- Scene Lab transparent review loop
- Structured screenplay editor
- Beat/scene board
- Auth + projects
- Atlas, Learn, Library, Reader, content engine bootstrap
