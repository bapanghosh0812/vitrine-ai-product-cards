# 0006. Security model

- Status: accepted (2026-11-17)

## Decision
Defence in depth across layers: secrets only on the server; hash-based CSP and strict headers generated per build (`scripts/postbuild.mjs`); zod validation, 16 KB body cap, JSON-only, CORS allow-list and rate limits on the API; Firestore rules with owner-only access, key allow-lists and size checks, admin-only ticket status and default deny; AI output rendered only as escaped text; support-bot output redaction and prompt-leak blocking; secretlint, gitleaks, CodeQL, npm audit and Dependabot in CI.

## Verification
`scripts/security-audit.ts` runs 12 self-attack rounds against the production build (jailbreaks, XSS, IDOR via the rules emulator suite, forged tokens, rate-limit bursts, bundle secret scan, CORS, headers/CSP/clickjacking, malformed payloads, dependency audit, path traversal, git history). Findings fixed along the way include a vulnerable transitive gRPC package, redaction patterns that matched ordinary words, a malformed-URL crash in the local preview server, and credential-shaped test fixtures.
