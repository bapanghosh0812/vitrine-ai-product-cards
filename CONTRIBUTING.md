# Contributing

Thanks for your interest in Vitrine!

## Setup
```bash
npm ci
cp .env.example .env.local   # set AI_MOCK=1 to work without AI keys
npm run dev                  # API on :8787, app on :4200
```
Node.js 24.15 or newer is required (see `.nvmrc`).

## Before opening a pull request
```bash
npm run lint && npm run typecheck
npm test && npm run test:api
npm run build && npm run e2e
```
Firestore rule changes also need `npm run test:rules` (needs Java 21 and the Firebase emulator).

## Guidelines
- Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Standalone components, signals, `OnPush`, and accessible markup (labels, roles, keyboard support).
- Never render untrusted text with `innerHTML`; never commit secrets, keys or personal data.
- Content (help articles, legal documents) lives in `/content` as Markdown; run `npm run content` after editing.
