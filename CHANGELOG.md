# Changelog

All notable changes to this project are documented here. This project follows [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-18
### Added
- Studio: product name and category form with validation, AI generation of title, description and keywords (strict JSON, validated), 1 or 3 variations, single-field regeneration, inline editing with SEO counters, undo/redo history.
- Six card templates (Minimal, Luxe Gold, Glass, Bold, Instagram post, Marketplace listing), image upload with in-browser compression or 3D category icons, export to PNG, JSON and HTML.
- Library with favourites and search; Brand Kit (voice, words to avoid, colours) injected into prompts.
- Accounts with Firebase Authentication (email/password with verification and password reset, Google), guest mode with import on sign-in, consent records with re-consent on new versions, cookie banner.
- Ask Kabir support assistant grounded in the in-repo Help Center, with streaming answers, sources, allow-listed actions, feedback and human support tickets.
- Settings with search and ten sections, profile with avatars, stats and badges, owner support inbox.
- Legal pack: Terms of Service, Privacy Policy (DPDP Act 2023 and GDPR), Cookie Policy, AI Disclaimer, Acceptable Use Policy.
- Hono API on Vercel Functions and Netlify Functions with Groq to Gemini fallback, rate limiting, CORS allow-list and output redaction.
- Prerendered public pages, sitemap, robots, JSON-LD, Open Graph image, PWA manifest, service worker and offline page.
- CI/CD with lint, typecheck, unit, API, rules and end-to-end tests, secret scanning, dependency audit and CodeQL; deployments to Vercel, Netlify and GitHub Pages.

### Changed
- The shared demo account was removed before release; reviewers can use the full Studio as guests or sign up.
