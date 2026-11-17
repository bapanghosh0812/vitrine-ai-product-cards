# Security Policy

## Reporting a vulnerability
Please report vulnerabilities privately. Do **not** open a public issue for security problems.

- Use GitHub's **Report a vulnerability** button on the repository's Security tab (private advisory), or
- email the maintainer at the support address shown on the live site's legal pages.

Include steps to reproduce, the affected URL or endpoint, and the impact. You will get an acknowledgement within 72 hours and a fix or mitigation plan within 14 days for valid reports. Please give us reasonable time to fix the issue before any disclosure.

**Scope:** the Vitrine web app, its `/api/*` endpoints and its Firestore rules. **Out of scope:** volumetric DoS, social engineering, issues in third-party providers (Firebase, Vercel, Netlify, Groq, Google), and reports from automated scanners without a proof of impact. Do not access other users' data, degrade the service, or run automated scans against production.

## How Vitrine is protected
| Layer | Controls |
| --- | --- |
| Secrets | AI keys live only in server environment variables. `.env.local` is gitignored; `.env.example` has placeholders. secretlint runs as a pre-commit hook and in CI; gitleaks scans the full history in CI. The Firebase service account is used only by a local admin script and is never deployed. |
| Browser | Strict Content Security Policy built from inline-script hashes (no `unsafe-inline` scripts), `frame-ancestors 'none'` and `X-Frame-Options: DENY`, HSTS, `nosniff`, Referrer-Policy, Permissions-Policy, COOP. AI output is rendered only through Angular interpolation or an escape-first Markdown renderer. |
| API | zod validation of every request (strict objects, length and enum checks), 16 KB body cap, JSON-only, CORS allow-list (foreign origins get 403), per-IP and per-user rate limits, Firebase ID-token verification with firebase-admin (project id only), JSON errors without stack traces, `Cache-Control: no-store`. |
| AI | Untrusted input is passed as JSON data inside a delimited block; models must return strict JSON that is re-validated; links/HTML/markdown are stripped; provider fallback with time budgets. The support bot is grounded only in the Help Center, uses allow-listed actions, and every streamed byte passes a redaction filter that masks credentials and blocks system-prompt recitation. |
| Data | Firestore rules: owner-only access, allow-listed keys, type and size validation, no client-set roles, admin-only ticket status changes, default deny. Images are compressed in the browser; no file storage bucket exists. |
| Supply chain | `npm audit` (production, high+) in CI, Dependabot, CodeQL `security-extended`. |

The latest self-attack results are in `reports/security-report.md` and in the Test Report PDF.
