# Security

## Auth & ownership

- Project routes require authenticated membership (`project_members`)
- Project delete requires owner + matching title confirmation
- Export requires membership authorization
- Account deletion is a **request** recorded on profile — operator completes wipe

## RLS

Migrations enable RLS on user tables with `private.is_project_member` / owner helpers. Re-verify after each schema change.

## Content rendering

Markdown → HTML uses `rehype-sanitize`. Do not introduce `dangerouslySetInnerHTML` with unsanitized user text.

## Logging

`src/lib/logging/*` redacts token/secret/password/email-like keys. Client logs omit payloads in production info channel.

## Rate limits

In-process write limits on project delete/export/account request. Not a substitute for edge rate limiting in production.

## Dependency audit

CI runs `pnpm audit --prod` (non-blocking until clean). Operators should review advisories before production.

## Environment separation

Public publishable key only in browser. Service role server-only when present.
