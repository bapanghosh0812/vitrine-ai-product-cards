# 0001. Static prerendering with client-rendered app pages

- Status: accepted (2026-11-17)

## Context
Vitrine must be free to host on Vercel, Netlify and GitHub Pages, load fast for SEO, and still behave like an app.

## Decision
Use Angular's `outputMode: "static"`. Public pages (landing, Help Center, legal, templates, studio) are prerendered at build time; personal pages (library, settings, profile, admin, auth) render in the browser from `index.csr.html`. Every host rewrites unknown paths to `index.csr.html`. The Studio is prerendered for a fast first paint but skips hydration and keeps its static form read-only until the app boots, so a restored draft can never conflict with the static HTML and no typing is lost.

## Consequences
Lighthouse scores of 98 to 100 on mobile and desktop, identical output for three hosts, and no server rendering cost. Per-request personalisation of public pages is not possible, which is acceptable.
