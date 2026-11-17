# 0004. Best-effort in-memory rate limiting

- Status: accepted (2026-11-17)

## Context
The service is free and public; one client should not exhaust the shared AI quota. A paid store such as Redis is out of scope (budget: zero).

## Decision
A sliding-window limiter in memory (`server/lib/rate-limit.ts`) with per-IP, per-guest and per-user rules (guests: 8/min and 60/hour for generation; signed-in users: 15/min and 150/hour). The client IP comes from platform headers (`x-nf-client-connection-ip`, `x-real-ip`, then `x-forwarded-for`). A rejected request records nothing, and responses carry `Retry-After`; the Studio shows a countdown.

## Consequences
Effective against bursts (verified: 30 requests give 8 × 200 and 22 × 429), but limits reset on cold starts and are per instance. Provider-side quotas remain the outer limit. A shared store is on the roadmap.
