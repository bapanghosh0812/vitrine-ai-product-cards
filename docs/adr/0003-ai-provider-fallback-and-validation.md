# 0003. AI provider fallback and strict output validation

- Status: accepted (2026-11-17)

## Context
Free AI tiers are rate limited and occasionally slow or malformed. Product copy must always be plain text with predictable lengths.

## Decision
Use the Vercel AI SDK with an ordered provider chain: Groq primary model, Google Gemini Flash, then a second Groq model. Every call uses `Output.object` with a zod schema, a time budget and no SDK retries; the server re-validates with zod, normalises text (no links, HTML, markdown or control characters), clamps lengths on word boundaries and retries once before moving to the next provider. Model IDs are environment variables. `AI_MOCK=1` provides a deterministic offline provider for tests.

## Consequences
High availability on free tiers and safe output, at the cost of a slightly more complex server. The UI shows which provider answered and whether a fallback was used.
