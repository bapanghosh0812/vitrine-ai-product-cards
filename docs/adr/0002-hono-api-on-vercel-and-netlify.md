# 0002. One Hono API, two serverless hosts

- Status: accepted (2026-11-17)

## Context
AI keys must stay on a server, and the brief asks for an AI REST API. Both Vercel and Netlify should serve the full app.

## Decision
Write the API once with Hono (`server/app.ts`, Web-standard Request/Response). Vercel runs it through the Build Output API as a single esbuild bundle (`scripts/build-api.mjs`); Netlify runs `netlify/functions/api.mts`. A small `normaliseRequest` maps each platform's rewritten path back to `/api/*`. GitHub Pages has no functions and calls the Vercel API through the CORS allow-list.

## Consequences
No duplicated logic, platform-independent tests (`app.request()` in Vitest), and a local dev server with the same code. Function time limits (about 10 s on Netlify) shape the AI time budget (`AI_BUDGET_MS`).
