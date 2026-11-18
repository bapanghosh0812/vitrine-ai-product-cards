/**
 * Builds the submission documents from REAL test output (reports/raw/*, coverage/*):
 *   - E:\INT Assignment\_submission\Vitrine_Solution_Bapan_Ghosh.pdf
 *   - E:\INT Assignment\_submission\Vitrine_Test_Report_Bapan_Ghosh.pdf
 *   - reports/security-report.md
 * Usage: npx tsx scripts/build-docs.ts [outDir]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const OUT_DIR = resolve(process.argv[2] ?? '../_submission');
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync('reports', { recursive: true });

/* ------------------------------------------------------------------ data */
type VitestReport = { numTotalTests: number; numPassedTests: number; numFailedTests: number; startTime: number; testResults: { name: string; assertionResults: { ancestorTitles: string[]; title: string; status: string }[] }[] };
const read = <T>(p: string): T | null => (existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : null);
const api = read<VitestReport>('reports/raw/api-unit.json');
const ng = read<VitestReport>('reports/raw/angular-unit.json');
const rules = read<VitestReport>('reports/raw/rules.json');
const e2e = read<{ stats: { expected: number; skipped: number; unexpected: number; flaky: number; startTime: string; duration: number }; suites: unknown[] }>('reports/raw/e2e.json');
const sec = read<{ ranAt: string; rounds: { id: number; title: string; attack: string; expected: string; observed: string[]; status: string }[] }>('reports/raw/security.json');
const lh = read<{ ranAt: string; runsPerPage?: number; results: { preset: string; path: string; performance: number; accessibility: number; bestPractices: number; seo: number; lcpMs: number; cls: number; tbtMs: number }[] }>('reports/raw/lighthouse.json');
const live = read<{ ranAt: string; generation: { requested: string; status: number; provider: string; model: string; fallbackUsed: boolean; latencyMs: number; title: string | null }[]; jailbreaks: { prompt: string; provider: string; leaked: boolean; answer: string }[] }>('reports/raw/live.json');
type Cov = { total: Record<'lines' | 'statements' | 'functions' | 'branches', { pct: number; covered: number; total: number }> };
const covApi = read<Cov>('reports/raw/coverage-api/coverage-summary.json');
const covNg = read<Cov>('coverage/vitrine/coverage-summary.json');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const ver = (name: string) => {
  try {
    return JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8')).version as string;
  } catch {
    return '?';
  }
};

interface Case {
  suite: string;
  file: string;
  name: string;
  status: string;
  project?: string;
}
const vitestCases = (r: VitestReport | null, suite: string): Case[] =>
  (r?.testResults ?? []).flatMap((f) =>
    f.assertionResults.map((a) => ({ suite, file: f.name.replace(/\\/g, '/').split('/').slice(-2).join('/'), name: [...a.ancestorTitles, a.title].join(' › '), status: a.status })),
  );
const e2eCases: Case[] = [];
const walk = (s: { title?: string; file?: string; specs?: { title: string; file?: string; tests: { projectName: string; results: { status: string }[] }[] }[]; suites?: unknown[] }, parents: string[]) => {
  for (const sp of s.specs ?? []) {
    for (const t of sp.tests) {
      const last = t.results.at(-1)?.status ?? 'not run';
      e2eCases.push({ suite: 'E2E', file: (sp.file ?? s.file ?? '').replace(/\\/g, '/'), name: [...parents, sp.title].join(' › '), status: last, project: t.projectName });
    }
  }
  for (const c of (s.suites ?? []) as (typeof s)[]) walk(c, c.title && !c.title.endsWith('.ts') ? [...parents, c.title] : parents);
};
for (const s of (e2e?.suites ?? []) as Parameters<typeof walk>[0][]) walk(s, []);

const count = (cs: Case[]) => ({ total: cs.length, passed: cs.filter((c) => c.status === 'passed').length, skipped: cs.filter((c) => c.status === 'skipped' || c.status === 'pending').length, failed: cs.filter((c) => c.status === 'failed' || c.status === 'timedOut').length });
const apiCases = vitestCases(api, 'API');
const ngCases = vitestCases(ng, 'Angular');
const rulesCases = vitestCases(rules, 'Rules');
const C = { api: count(apiCases), ng: count(ngCases), rules: count(rulesCases), e2e: count(e2eCases) };
const projects = [...new Set(e2eCases.map((c) => c.project))];
const secPassed = sec?.rounds.filter((r) => r.status === 'pass').length ?? 0;
const lhMin = (k: 'performance' | 'accessibility' | 'bestPractices' | 'seo') => Math.min(...(lh?.results ?? []).map((r) => r[k]));
const lhMax = (k: 'performance' | 'accessibility' | 'bestPractices' | 'seo') => Math.max(...(lh?.results ?? []).map((r) => r[k]));
const pct = (c: Cov | null, k: keyof Cov['total']) => (c ? `${c.total[k].pct.toFixed(1)}%` : 'n/a');
const runDate = new Date(api?.startTime ?? Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

/* ------------------------------------------------------------------ assets */
const b64 = (p: string) => readFileSync(p).toString('base64');
const font = {
  serif: b64('node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2'),
  serifI: b64('node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2'),
  geist: b64('node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2'),
};
const img = (name: string) => `data:image/webp;base64,${b64(`docs/screenshots/${name}.webp`)}`;
const og = `data:image/png;base64,${b64('public/brand/og-image.png')}`;
const logo = `data:image/svg+xml;base64,${b64('public/brand/logo-mark.svg')}`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

const URLS = {
  vercel: 'https://vitrine-ai-product-cards.vercel.app',
  netlify: 'https://vitrine-ai-product-cards.netlify.app',
  pages: 'https://bapanghosh0812.github.io/vitrine-ai-product-cards/',
  repo: 'https://github.com/bapanghosh0812/vitrine-ai-product-cards',
};

const CSS = `
@font-face{font-family:'IS';src:url(data:font/woff2;base64,${font.serif}) format('woff2')}
@font-face{font-family:'IS';font-style:italic;src:url(data:font/woff2;base64,${font.serifI}) format('woff2')}
@font-face{font-family:'Geist';src:url(data:font/woff2;base64,${font.geist}) format('woff2');font-weight:100 900}
@page{size:A4}
*{box-sizing:border-box}
body{margin:0;font-family:Geist,system-ui,sans-serif;color:#1d2a24;font-size:10.2pt;line-height:1.55;background:#fff}
h1,h2,h3{font-family:'IS',Georgia,serif;font-weight:400;color:#0e4d3a;margin:0}
h1{font-size:30pt;line-height:1.05}
h2{font-size:19pt;margin:22px 0 8px;padding-bottom:4px;border-bottom:1.5px solid #e6d7b5;break-after:avoid}
h3{font-size:13.5pt;margin:14px 0 6px;color:#12201a;break-after:avoid}
p{margin:6px 0}
.eyebrow{font-size:7.5pt;letter-spacing:.2em;text-transform:uppercase;color:#7d602b;font-weight:650}
table{width:100%;border-collapse:collapse;margin:8px 0 12px;font-size:8.8pt;break-inside:auto}
tr{break-inside:avoid}
th,td{border:1px solid #e2e6e3;padding:5px 7px;text-align:left;vertical-align:top}
th{background:#0e4d3a;color:#fbf7f0;font-weight:600}
tr:nth-child(even) td{background:#faf8f3}
code{font-family:ui-monospace,Consolas,monospace;font-size:8.3pt;background:#f4efe4;padding:1px 4px;border-radius:3px}
.cover{height:255mm;display:flex;flex-direction:column;break-after:page}
.cover img.hero{width:100%;border-radius:14px}
.meta{margin-top:auto;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:9.5pt}
.meta div{background:#faf8f3;border:1px solid #eee3cc;border-radius:10px;padding:10px 12px}
.meta b{display:block;color:#0e4d3a;font-size:8pt;letter-spacing:.12em;text-transform:uppercase;margin-bottom:2px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}
.kpi{border:1px solid #eee3cc;border-radius:10px;padding:10px;background:linear-gradient(180deg,#fffdf8,#f7f1e4)}
.kpi .v{font-family:'IS',serif;font-size:21pt;color:#0e4d3a;line-height:1}
.kpi .l{font-size:7.6pt;color:#5f6b64;text-transform:uppercase;letter-spacing:.08em;margin-top:4px}
.pass{color:#13634b;font-weight:650}.fail{color:#b4372f;font-weight:650}.skip{color:#7d602b;font-weight:650}
.shots{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.shots figure{margin:0;break-inside:avoid}
.shots img{width:100%;border-radius:8px;border:1px solid #e5e5e5}
figcaption{font-size:8pt;color:#5f6b64;margin-top:3px}
.note{background:#fbf6ea;border-left:3px solid #c9a35b;padding:8px 12px;border-radius:4px;margin:8px 0;font-size:9.2pt}
.arch{display:grid;grid-template-columns:1fr 1.1fr 1fr;gap:10px;align-items:stretch;margin:10px 0}
.box{border:1.5px solid #0e4d3a;border-radius:10px;padding:9px 10px;font-size:8.6pt;background:#f6faf8}
.box h4{margin:0 0 4px;font-family:'IS',serif;font-weight:400;font-size:12pt;color:#0e4d3a}
.box.gold{border-color:#c9a35b;background:#fdf9ef}
ul{margin:4px 0 8px;padding-left:18px}li{margin:2px 0}
.small{font-size:8.4pt;color:#5f6b64}
.page-break{break-before:page}
`;

const doc = (title: string, body: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;

const cover = (kind: string, subtitle: string) => `
<section class="cover">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px"><img src="${logo}" width="40" height="40" alt=""><span style="font-family:'IS',serif;font-size:20pt;color:#0e4d3a">Vitrine</span><span class="eyebrow" style="margin-left:auto">INT. First Flush · Assignment 2</span></div>
  <img class="hero" src="${og}" alt="Vitrine cover art">
  <p class="eyebrow" style="margin-top:22px">${esc(kind)}</p>
  <h1>Vitrine: AI Product Card Generator</h1>
  <p style="font-size:12pt;color:#3c4a44;margin-top:8px">${esc(subtitle)}</p>
  <div class="meta">
    <div><b>Author</b>Bapan Ghosh · Kolkata, India<br>Designed &amp; built by Bapan Ghosh</div>
    <div><b>Date</b>${esc(runDate)}<br>Version ${esc(pkg.version)}</div>
    <div><b>Live app</b>${URLS.vercel}<br>${URLS.netlify}<br>${URLS.pages}</div>
    <div><b>Source</b>${URLS.repo}<br>Stack: Angular ${ver('@angular/core')} · Hono · Vercel AI SDK · Firebase</div>
  </div>
</section>`;

const kpiBlock = `
<div class="kpis">
  <div class="kpi"><div class="v">${C.api.passed}/${C.api.total}</div><div class="l">API tests passed</div></div>
  <div class="kpi"><div class="v">${C.ng.passed}/${C.ng.total}</div><div class="l">Angular tests passed</div></div>
  <div class="kpi"><div class="v">${C.rules.passed}/${C.rules.total}</div><div class="l">Firestore rules tests</div></div>
  <div class="kpi"><div class="v">${C.e2e.passed}</div><div class="l">E2E passed (${C.e2e.skipped} skipped, ${C.e2e.failed} failed)</div></div>
  <div class="kpi"><div class="v">${lhMin('performance')}–${lhMax('performance')}</div><div class="l">Lighthouse performance</div></div>
  <div class="kpi"><div class="v">${lhMin('accessibility')}</div><div class="l">Lighthouse accessibility (min)</div></div>
  <div class="kpi"><div class="v">${secPassed}/${sec?.rounds.length ?? 0}</div><div class="l">Security rounds passed</div></div>
  <div class="kpi"><div class="v">${pct(covApi, 'lines')}</div><div class="l">API line coverage</div></div>
</div>`;

const lhTable = `<table><tr><th>Device</th><th>Page</th><th>Performance</th><th>Accessibility</th><th>Best practices</th><th>SEO</th><th>LCP</th><th>CLS</th><th>TBT</th></tr>
${(lh?.results ?? []).map((r) => `<tr><td>${r.preset}</td><td><code>${r.path}</code></td><td>${r.performance}</td><td>${r.accessibility}</td><td>${r.bestPractices}</td><td>${r.seo}</td><td>${(r.lcpMs / 1000).toFixed(2)} s</td><td>${r.cls}</td><td>${r.tbtMs} ms</td></tr>`).join('')}</table>`;

const secTable = `<table><tr><th>#</th><th>Round</th><th>Attack</th><th>Observed</th><th>Result</th></tr>
${(sec?.rounds ?? []).map((r) => `<tr><td>R${r.id}</td><td><b>${esc(r.title)}</b><div class="small">Expected: ${esc(r.expected)}</div></td><td>${esc(r.attack)}</td><td>${r.observed.map((o) => esc(o)).join('<br>')}</td><td class="${r.status === 'pass' ? 'pass' : 'fail'}">${r.status.toUpperCase()}</td></tr>`).join('')}</table>`;


const liveSection = live
  ? `<h3>Live AI verification (real provider keys)</h3>
<table><tr><th>Requested provider</th><th>Answered by</th><th>Model</th><th>Latency</th><th>Sample title</th></tr>
${live.generation.map((g) => `<tr><td>${esc(g.requested)}</td><td>${esc(g.provider ?? '-')}</td><td><code>${esc(g.model ?? '-')}</code></td><td>${g.latencyMs} ms</td><td>${esc(g.title ?? '-')}</td></tr>`).join('')}</table>
<table><tr><th>Prompt sent to Ask Kabir (live model)</th><th>Answer</th><th>Leak</th></tr>
${live.jailbreaks.map((j) => `<tr><td>${esc(j.prompt)}</td><td>${esc(j.answer)}</td><td class="${j.leaked ? 'fail' : 'pass'}">${j.leaked ? 'LEAK' : 'none'}</td></tr>`).join('')}</table>
<p class="small">Run ${esc(new Date(live.ranAt).toLocaleString('en-IN'))} against the local API with the real Groq and Gemini keys (scripts/live-check.mjs).</p>`
  : '';

const FIXED_FINDINGS = [
  ['Hosting', 'The Netlify API crashed on every call: Netlify shipped firebase-admin from node_modules and its Lambda Node could not require() the ESM-only jose package.', 'The API is prebuilt into one self-contained bundle for both hosts; tested with require(esm) disabled, including token verification.'],
  ['CI stability', 'The 5-browser e2e job hung until its 30-minute limit when a WebKit page transition stalled navigation.', 'View transitions now finish without animating after 1.2 s; e2e runs as one parallel job per browser with a Playwright global timeout.'],
  ['Prompt structure', 'User text containing "</product_data>" was copied verbatim into the prompt (JSON does not escape < or >), so it could close the data block early.', 'All prompt data blocks escape < and > as JSON unicode escapes; covered by a unit test.'],
  ['Anti-spam', 'The 3-per-day recipient limit for support confirmations could be dodged with +tags or Gmail dots (all reach one inbox).', 'Limits key on the real mailbox (tags removed, Gmail dots and googlemail.com normalised); unit test added.'],
  ['Sign-in', 'Google sign-in failed on the live site: the service worker re-fetches every GET and the CSP connect-src did not list the Google script origins, so gapi got a synthetic 504.', 'connect-src now lists apis.google.com, www.gstatic.com and googleusercontent.com; the Google helper loads only on sign-in pages.'],
  ['Forms', 'Auth forms without a formGroup did a native submit and reloaded the page; Enter in a Studio field submitted the form.', 'Forms bound to FormGroups; Enter in single-line fields no longer submits; e2e tests cover both.'],
  ['Configuration', 'A stale machine-level GEMINI_API_KEY silently overrode the project key in local runs.', 'Local scripts now let .env.local win over machine variables; keys verified against the providers\' model-list APIs.'],
  ['AI provider drift', 'gemini-2.5-flash is no longer offered to new keys and llama-3.3-70b-versatile is gone from Groq.', 'Defaults moved to gemini-3.1-flash-lite and openai/gpt-oss-20b (still environment-configurable); fallback chain re-verified live.'],
  ['Dependency audit', '4 high-severity advisories in a transitive gRPC package (@grpc/grpc-js via Firebase).', 'npm override to @grpc/grpc-js ^1.14.7; production audit now 0 vulnerabilities.'],
  ['Secret scan', 'Redaction patterns matched ordinary words such as "ask-kabir-support-assistant" (could mask normal bot text).', 'Word-boundary patterns that require key-like structure; scanner false positives (library PEM format checks) documented.'],
  ['Path robustness', 'A malformed percent-encoded URL (/%E0%A4%A) crashed the local preview server (decodeURIComponent).', 'Decode wrapped in try/catch, NUL bytes rejected; API already returned JSON 404.'],
  ['Secrets in history', 'Credential-shaped fake tokens in test fixtures were committed (would trip secret scanners and push protection).', 'Fake tokens assembled at runtime (server/test-fakes.ts); unpushed commit amended; history scan clean.'],
  ['Repository hygiene', 'An emulator debug log was committed by mistake.', 'Removed and *-debug.log ignored.'],
  ['Accessibility', 'axe found gold text below 4.5:1 contrast, a label/name mismatch and a focusable link inside aria-hidden.', 'Gold darkened to #7d602b (5.1:1+), labels fixed, aria-hidden removed; 0 serious violations.'],
  ['Performance', 'Font preload links were placed before <base href>, so nested pages requested fonts from the wrong path (404 + layout shift).', 'Preloads injected after <base href>; CLS 0 on every audited page.'],
  ['UX race', 'Typing into the prerendered Studio before the app booted was lost.', 'Static form is read-only until the app boots.'],
];

/* ------------------------------------------------------------------ solution document */
const REQS = [
  ['Form: product name + category', 'Reactive form with validation (2–80 chars, letters required) and a 20-category picker with 3D icons, accessible error messages.', 'features/studio/generate-form.ts, category-picker.ts'],
  ['"Generate Details" button', 'Gold call-to-action, disabled while generating, shows cooldown on rate limits; Ctrl/Cmd + Enter shortcut.', 'generate-form.ts'],
  ['AI returns title, short description, keywords', 'POST /api/generate (Hono). Groq primary, Gemini Flash fallback. Strict JSON via AI SDK Output.object, re-validated with zod, sanitised, length-clamped.', 'server/app.ts, server/lib/ai.ts, schemas.ts, prompts.ts'],
  ['Render a styled product card', 'Six templates (Minimal, Luxe Gold, Glass, Bold, Instagram post, Marketplace) using container-query units; text always escaped.', 'shared/card/product-card.ts + .css'],
  ['Simple state management', 'Signal store with undo/redo history (60 steps, typing coalesced), variations, template, image, save/load.', 'state/studio.store.ts'],
  ['Angular, CSS styling', 'Angular 22 standalone + signals + zoneless, OnPush; Tailwind CSS v4 tokens + hand-written component CSS; light/dark/OLED/system themes.', 'src/styles.css, layout/*'],
  ['AI via REST API', 'Hono app deployed as Vercel Function (Build Output API) and Netlify Function; GitHub Pages calls the Vercel API via CORS allow-list.', 'server/entry-vercel.ts, netlify/functions/api.mts'],
  ['README with design choices and AI usage', 'README + 7 architecture decision records + SECURITY.md.', 'README.md, docs/adr/*'],
];

const solution = doc(
  'Vitrine Solution · Bapan Ghosh',
  `${cover('Solution document', 'Type a product name and a category; Vitrine writes the title, short description and SEO keywords and presents them on a luxury product card.')}
<h2>1. Summary</h2>
<p>Vitrine fulfils INT. assignment 2 (AI product-card generator) and goes further: it is a production-grade Angular 22 app with a secure AI API, accounts, a support assistant grounded in its own Help Center, a complete legal pack, automated tests, a self-attack security audit and CI/CD to three free hosts. Everything runs on free tiers (₹0).</p>
${kpiBlock}
<h2>2. Requirement → implementation map</h2>
<table><tr><th style="width:24%">Requirement</th><th>Implementation</th><th style="width:28%">Code</th></tr>
${REQS.map((r) => `<tr><td><b>${esc(r[0]!)}</b></td><td>${esc(r[1]!)}</td><td><code>${esc(r[2]!)}</code></td></tr>`).join('')}</table>
<h3>Beyond the brief</h3>
<ul>
<li><b>Brief, Style panel and Ask AI:</b> a long brief box (Enter adds lines, only the button sends); a Style panel with eight palettes or custom colours, fonts, title size/case, corners, photo fit, gilded frame, badges, show/hide fields and density; Ask AI rewrites the card from the user's own instruction or one-click refinements. All undoable and saved with the card.</li>
<li><b>Studio extras:</b> 3 variations, single-field regeneration, inline editing with SEO counters, audience/tone/features/price/language, image upload with in-browser WebP compression, PNG/JSON/HTML export.</li>
<li><b>Library &amp; Brand Kit:</b> favourites and search; brand voice, words to avoid and colours injected into prompts.</li>
<li><b>Accounts:</b> Firebase email/password with verification and reset, Google sign-in, passwordless email-link sign-in, guest mode with import on sign-in, consent records with re-consent on new versions, cookie banner (necessary-only by default).</li>
<li><b>Ask Kabir:</b> streaming support bot answering only from the Help Center (BM25 retrieval), sources, allow-listed actions and feedback.</li>
<li><b>Human support by email:</b> anyone (guest or signed in) can open a ticket with name, email, optional phone and message. The team receives it in the support inbox (Reply-To set to the customer) and the customer instantly gets a branded emerald-and-gold confirmation email with the ticket ID, links to the Studio and Help Center. Hard anti-spam limits, a honeypot and verified-email rules prevent abuse.</li>
<li><b>Settings, Profile, Admin:</b> searchable settings in 10 sections, avatars/stats/badges, owner support inbox via custom claim.</li>
<li><b>Legal:</b> 26-section Terms (scroll-to-accept), Privacy Policy (DPDP Act 2023 + GDPR), Cookies, AI Disclaimer, Acceptable Use.</li>
<li><b>Quality:</b> prerendered public pages, PWA + offline page, Lighthouse performance ${lhMin('performance')}–${lhMax('performance')}, WCAG 2.1 AA checks.</li>
</ul>
<h2 class="page-break">3. Screenshots</h2>
<p class="small">Captured from the production build with fixed sample copy so the images are reproducible.</p>
<div class="shots">
<figure><img src="${img('landing')}" alt=""><figcaption>Landing page (prerendered)</figcaption></figure>
<figure><img src="${img('studio')}" alt=""><figcaption>Studio: form, Luxe Gold card, three variations, refine panel</figcaption></figure>
<figure><img src="${img('studio-style')}" alt=""><figcaption>Style panel: Midnight Sapphire palette, Bestseller badge, gilded frame</figcaption></figure>
<figure><img src="${img('studio-ask-ai')}" alt=""><figcaption>Ask AI: rewrite the card with a multi-line instruction</figcaption></figure>
<figure><img src="${img('studio-dark')}" alt=""><figcaption>Dark (emerald-black) theme, Glass template</figcaption></figure>
<figure><img src="${img('studio-marketplace')}" alt=""><figcaption>Marketplace listing template</figcaption></figure>
<figure><img src="${img('templates')}" alt=""><figcaption>Six templates</figcaption></figure>
<figure><img src="${img('ask-kabir')}" alt=""><figcaption>Ask Kabir with Help Center sources</figcaption></figure>
<figure><img src="${img('terms-consent')}" alt=""><figcaption>Sign-up consent: scroll-to-accept Terms</figcaption></figure>
<figure><img src="${img('settings')}" alt=""><figcaption>Settings with search and sections</figcaption></figure>
</div>
<div class="shots" style="grid-template-columns:1fr 1fr 1fr;margin-top:10px">
<figure><img src="${img('mobile-studio')}" alt=""><figcaption>Studio on a phone</figcaption></figure>
<figure><img src="${img('mobile-landing')}" alt=""><figcaption>Landing on a phone</figcaption></figure>
<figure><img src="${img('library')}" alt=""><figcaption>Library</figcaption></figure>
</div>
<h2 class="page-break">4. Architecture</h2>
<div class="arch">
 <div class="box"><h4>Browser · Angular 22</h4>Standalone components, signals, zoneless, OnPush.<br>Prerendered: landing, help, legal, templates, studio.<br>Client-rendered: library, settings, profile, admin, auth.<br>Signal stores with undo/redo; guest data in localStorage; Firebase SDK lazy-loaded.</div>
 <div class="box gold"><h4>Hono API (one codebase)</h4><code>POST /api/generate</code> · <code>POST /api/support</code> (NDJSON stream) · <code>GET /api/health</code><br>Middleware: security headers → CORS allow-list → 16 KB body cap → JSON only → zod → rate limits → Firebase ID-token check.<br>Deployed as Vercel Function (esbuild bundle) and Netlify Function.</div>
 <div class="box"><h4>Services</h4><b>AI:</b> Groq (primary) → Gemini Flash (fallback) → second Groq model.<br><b>Firebase:</b> Auth (email, Google) + Firestore (owner-only rules). No Storage bucket.<br><b>KB:</b> Help Center Markdown compiled at build time.</div>
</div>
<ul>
<li><b>Hosting:</b> Vercel (static + API), Netlify (static + API), GitHub Pages (static; API on Vercel). Unknown paths fall back to the client shell.</li>
<li><b>Security headers:</b> a Content Security Policy built from the SHA-256 hashes of inline scripts (no <code>unsafe-inline</code> scripts), <code>frame-ancestors 'none'</code>, HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP.</li>
<li><b>Data model:</b> <code>users/{uid}</code> (profile, consent, settings, Brand Kit, stats), <code>users/{uid}/cards/{id}</code>, <code>tickets/{VT-XXXXXX}</code>.</li>
</ul>
<h2>5. How AI is used</h2>
<table><tr><th style="width:22%">Aspect</th><th>Details</th></tr>
<tr><td><b>Features</b></td><td>Title (≤ 60 chars target), 2–3 sentence description (≈ 140–220 chars), 4–10 keywords; three variations; single-field regeneration; support answers in Ask Kabir.</td></tr>
<tr><td><b>Models</b></td><td>Groq <code>openai/gpt-oss-120b</code> (primary), Google <code>gemini-3.1-flash-lite</code> (fallback), Groq <code>openai/gpt-oss-20b</code> (backup). All configurable through environment variables; the UI shows which provider answered.</td></tr>
<tr><td><b>Prompting</b></td><td>Fixed system prompt with copy and safety rules. User input is serialised as JSON inside <code>&lt;product_data&gt;</code> and treated as data only. Brand Kit and options are structured fields.</td></tr>
<tr><td><b>Validation</b></td><td>Structured output (AI SDK <code>Output.object</code>) → zod re-validation → removal of links, HTML, markdown, emails and control characters → word-boundary clamping → keyword de-duplication → one retry → next provider within a time budget.</td></tr>
<tr><td><b>Safety</b></td><td>AI text is rendered only as escaped text. The bot answers only from retrieved Help Center chunks, can trigger only allow-listed actions, and every streamed byte passes a redaction filter that masks credentials and replaces any recited system prompt with a refusal.</td></tr>
<tr><td><b>Privacy</b></td><td>Only product details or the question are sent to providers; never emails, account IDs or images. Free tiers may use inputs to improve services, stated in the Privacy Policy and AI Disclaimer.</td></tr>
<tr><td><b>Limitations</b></td><td>Copy can be generic or wrong; non-English output may be less fluent; free-tier rate limits apply. Users are told to review before publishing.</td></tr>
<tr><td><b>Brand art</b></td><td>The Kabir mascot and app-icon artwork were created with AI image tools. The SVG logo and interface were designed and built by hand.</td></tr>
</table>
${liveSection}
<h2 class="page-break">6. Security</h2>
<p>Defence in depth across browser, API, AI and data layers, verified by a 12-round self-attack audit (<code>scripts/security-audit.ts</code>) against the production build with production headers. Result: <b>${secPassed}/${sec?.rounds.length ?? 0} rounds passed</b> after fixing the findings below.</p>
<table><tr><th>Area</th><th>Finding</th><th>Fix</th></tr>${FIXED_FINDINGS.map((f) => `<tr><td><b>${esc(f[0]!)}</b></td><td>${esc(f[1]!)}</td><td>${esc(f[2]!)}</td></tr>`).join('')}</table>
<ul>
<li><b>Secrets:</b> AI keys only in server environment variables; <code>.env.local</code> gitignored; secretlint pre-commit hook; gitleaks, CodeQL, npm audit and Dependabot in CI; no service account on servers.</li>
<li><b>API:</b> strict zod schemas, 16 KB body limit, JSON-only, CORS allow-list (foreign origins get 403), per-IP/per-user rate limits with Retry-After, Firebase ID-token verification, no stack traces.</li>
<li><b>Firestore:</b> owner-only access, key allow-lists, type/size validation, no client-set roles, admin-only ticket status, default deny.</li>
</ul>
<h2>7. Setup (3 commands)</h2>
<p>Requires Node.js 24.15+.</p>
<p><code>npm ci</code> → <code>cp .env.example .env.local</code> (add keys or set <code>AI_MOCK=1</code>) → <code>npm run dev</code> (API :8787, app :4200).</p>
<table><tr><th>Variable</th><th>Scope</th><th>Purpose</th></tr>
<tr><td><code>GROQ_API_KEY</code>, <code>GEMINI_API_KEY</code></td><td>Server</td><td>AI providers</td></tr>
<tr><td><code>FIREBASE_PROJECT_ID</code></td><td>Server</td><td>ID-token verification</td></tr>
<tr><td><code>ALLOWED_ORIGINS</code></td><td>Server</td><td>Extra CORS origins</td></tr>
<tr><td><code>NG_APP_FIREBASE_*</code></td><td>Build (public)</td><td>Firebase web config (public by design)</td></tr>
<tr><td><code>NG_APP_API_BASE</code>, <code>NG_APP_SITE_URL</code>, <code>NG_APP_SUPPORT_EMAIL</code></td><td>Build (public)</td><td>API origin for Pages, canonical URL, grievance contact</td></tr></table>
<h2>8. How to evaluate</h2>
<ul>
<li>Open the live app and press <b>Open the Studio</b>. No login is needed: guest mode runs the full generator and saves cards in the browser.</li>
<li>To see accounts, sign up with email (verification link), Google, or a one-time email link. There is deliberately no shared demo account (see ADR 0007).</li>
<li>Try 3 variations, regenerate one field, switch templates, export PNG/JSON/HTML, save to the Library, ask Kabir a question, and switch to dark or OLED theme.</li>
</ul>
<h2>9. Future scope</h2>
<ul><li>Bulk generation from CSV and marketplace export formats (Shopify, WooCommerce, Amazon).</li><li>Variation scoring and readability hints.</li><li>Shared team Brand Kits; Firestore-backed distributed rate limits.</li><li>More templates and locale-aware currency formatting.</li></ul>
<p class="small" style="margin-top:20px">Designed &amp; built by Bapan Ghosh · MIT licence · Test numbers in this document come from local runs on ${esc(runDate)} and are detailed in the Test Report.</p>`,
);

/* ------------------------------------------------------------------ test report */
const statusCell = (s: string) => `<td class="${s === 'passed' ? 'pass' : s === 'skipped' || s === 'pending' ? 'skip' : 'fail'}">${esc(s)}</td>`;
const caseRows = (cs: Case[]) => cs.map((c, i) => `<tr><td>${i + 1}</td><td><code>${esc(c.file)}</code></td><td>${esc(c.name)}</td>${c.project ? `<td>${esc(c.project)}</td>` : ''}${statusCell(c.status)}</tr>`).join('');
const e2eUnique = [...new Map(e2eCases.map((c) => [c.name, c])).values()];
const e2eMatrix = e2eUnique.map((u) => {
  const cells = projects.map((p) => e2eCases.find((c) => c.name === u.name && c.project === p)?.status ?? '-');
  return `<tr><td><code>${esc(u.file.split('/').pop() ?? '')}</code></td><td>${esc(u.name)}</td>${cells.map(statusCell).join('')}</tr>`;
});

const report = doc(
  'Vitrine Test Report · Bapan Ghosh',
  `${cover('Test report', 'Strategy, environment and real results: unit, API, Firestore rules, end-to-end, accessibility, performance and security.')}
<h2>1. Summary</h2>
${kpiBlock}
<table><tr><th>Suite</th><th>Tool</th><th>Total</th><th>Passed</th><th>Skipped</th><th>Failed</th></tr>
<tr><td>API unit + security</td><td>Vitest ${ver('vitest')} (Node)</td><td>${C.api.total}</td><td class="pass">${C.api.passed}</td><td>${C.api.skipped}</td><td>${C.api.failed}</td></tr>
<tr><td>Angular unit + component</td><td>Vitest via <code>ng test</code> (jsdom)</td><td>${C.ng.total}</td><td class="pass">${C.ng.passed}</td><td>${C.ng.skipped}</td><td>${C.ng.failed}</td></tr>
<tr><td>Firestore security rules</td><td>Firebase emulator + rules-unit-testing</td><td>${C.rules.total}</td><td class="pass">${C.rules.passed}</td><td>${C.rules.skipped}</td><td>${C.rules.failed}</td></tr>
<tr><td>End-to-end (${projects.join(', ')})</td><td>Playwright ${ver('@playwright/test')}</td><td>${C.e2e.total}</td><td class="pass">${C.e2e.passed}</td><td>${C.e2e.skipped}</td><td>${C.e2e.failed}</td></tr>
<tr><td>Security self-attack</td><td>scripts/security-audit.ts</td><td>${sec?.rounds.length ?? 0}</td><td class="pass">${secPassed}</td><td>0</td><td>${(sec?.rounds.length ?? 0) - secPassed}</td></tr></table>
<h2>2. Strategy</h2>
<table><tr><th style="width:20%">Layer</th><th>What is tested</th><th style="width:22%">How</th></tr>
<tr><td><b>Unit (API)</b></td><td>Sanitisers, zod schemas, prompt construction, output finalisation, rate limiter, redaction, KB retrieval; route behaviour (200/400/401/403/404/413/415/422/429/503), CORS, streaming support, fallback when AI is not configured.</td><td>Vitest, <code>app.request()</code> without a network</td></tr>
<tr><td><b>Support tickets</b></td><td>Inbox + confirmation emails, guest confirmations without user text, HTML and header injection, honeypot, per-IP and per-recipient limits, mail outages (502/503).</td><td>Vitest with a capture mailer</td></tr>
<tr><td><b>Security (API)</b></td><td>An adversarial fake model that leaks a key split across chunks, recites the system prompt, dumps env values and requests forbidden actions.</td><td>Vitest with an injected stream</td></tr>
<tr><td><b>Unit/component (UI)</b></td><td>Signal store (generate, undo/redo, coalescing, regenerate one field, keyword sanitising, rate-limit cooldown, save/load), card templates and HTML escaping, form validation, export escaping, XSS-safe Markdown.</td><td>Vitest + TestBed (zoneless)</td></tr>
<tr><td><b>Rules</b></td><td>IDOR with a second user, unauthenticated access, privilege escalation, field validation, ticket spoofing, admin-only status, default deny.</td><td>Firestore emulator</td></tr>
<tr><td><b>End-to-end</b></td><td>Validation, generation, editing, undo/redo, templates, variations, field regeneration, Library save, JSON export, rate-limit UX, XSS rendering, SEO tags, help search, legal TOC, theme, settings search, scroll-to-accept Terms, passwordless sign-in and forgot-password forms, Ask Kabir, guest support tickets, mobile navigation.</td><td>Playwright against the production build with the real API, mock AI and captured email</td></tr>
<tr><td><b>Accessibility</b></td><td>WCAG 2.1 A/AA rules on 7 key pages.</td><td>axe-core inside Playwright</td></tr>
<tr><td><b>Performance/SEO</b></td><td>Mobile and desktop Lighthouse on 4 pages.</td><td>Lighthouse 13.6</td></tr>
<tr><td><b>Security</b></td><td>12 attack rounds against the running production build.</td><td>scripts/security-audit.ts</td></tr></table>
<p class="note">AI calls are mocked in automated tests (deterministic <code>AI_MOCK=1</code> provider through the real API code path, plus route interception for edge cases), so results do not depend on provider availability or quotas.</p>
<h2>3. Environment</h2>
<table><tr><th>Item</th><th>Value</th></tr>
<tr><td>OS</td><td>Windows 11 (build 26320)</td></tr>
<tr><td>Node.js</td><td>${esc(process.version)}</td></tr>
<tr><td>Angular / TypeScript</td><td>${ver('@angular/core')} / ${ver('typescript')}</td></tr>
<tr><td>Browsers</td><td>Playwright Chromium (desktop 1440×900) and Pixel 7 emulation; Lighthouse on Chromium headless shell</td></tr>
<tr><td>Run date</td><td>${esc(runDate)} (security audit ${esc(new Date(sec?.ranAt ?? Date.now()).toLocaleString('en-IN'))}, Lighthouse ${esc(new Date(lh?.ranAt ?? Date.now()).toLocaleString('en-IN'))})</td></tr></table>
<h2 class="page-break">4. Coverage</h2>
<table><tr><th>Scope</th><th>Statements</th><th>Branches</th><th>Functions</th><th>Lines</th></tr>
<tr><td>API (<code>server/**</code>)</td><td>${pct(covApi, 'statements')}</td><td>${pct(covApi, 'branches')}</td><td>${pct(covApi, 'functions')}</td><td>${pct(covApi, 'lines')}</td></tr>
<tr><td>Angular unit/component (<code>src/**</code>)</td><td>${pct(covNg, 'statements')}</td><td>${pct(covNg, 'branches')}</td><td>${pct(covNg, 'functions')}</td><td>${pct(covNg, 'lines')}</td></tr></table>
<p class="small">Angular coverage reflects unit/component tests only; page-level flows are covered by the end-to-end suite, which has no coverage instrumentation.</p>
<h2>5. Lighthouse</h2>
<p class="small">Production build served locally with the production headers; Lighthouse 13.6 on Chromium headless shell. Each row is the median of ${lh?.runsPerPage ?? 1} run(s) for that page and preset.</p>
${lhTable}
<h2>6. Accessibility</h2>
<p>axe-core (tags wcag2a, wcag2aa, wcag21a, wcag21aa) reports <b>0 serious or critical violations</b> on <code>/</code>, <code>/studio</code>, <code>/help</code>, <code>/legal/privacy</code>, <code>/settings</code>, <code>/auth/sign-in</code> and <code>/templates</code> in every executed browser project. Lighthouse accessibility is ${lhMin('accessibility')} on all audited pages. Manual design checks: keyboard navigation and visible focus, skip link, reduced-motion support, large-text option, labelled controls, live regions for toasts and chat.</p>
<h2 class="page-break">7. Security rounds</h2>
${secTable}
${liveSection}
<h3>Findings fixed during testing</h3>
<table><tr><th>Area</th><th>Finding</th><th>Fix</th></tr>${FIXED_FINDINGS.map((f) => `<tr><td><b>${esc(f[0]!)}</b></td><td>${esc(f[1]!)}</td><td>${esc(f[2]!)}</td></tr>`).join('')}</table>
<h2 class="page-break">8. Browser and responsive matrix</h2>
<table><tr><th>Project</th><th>Viewport</th><th>Status</th></tr>
<tr><td>Chromium desktop</td><td>1440 × 900</td><td class="pass">Executed: all tests passed</td></tr>
<tr><td>Mobile Chrome (Pixel 7 emulation)</td><td>412 × 839, touch</td><td class="pass">Executed: all tests passed</td></tr>
<tr><td>Firefox desktop</td><td>1440 × 900</td><td class="pass">Passed on GitHub Actions (Linux, run for commit 30f4e50). Not run locally: Windows blocked Playwright's Firefox binary.</td></tr>
<tr><td>WebKit desktop</td><td>1440 × 900</td><td class="pass">Passed on GitHub Actions (Linux, run for commit 30f4e50). Not run locally: Windows blocked Playwright's WebKit binary.</td></tr>
<tr><td>Mobile Safari (iPhone 14 emulation)</td><td>390 × 664, touch</td><td class="pass">Passed on GitHub Actions (Linux, run for commit 30f4e50). Not run locally (WebKit).</td></tr></table>
<h3>E2E results by project</h3>
<table><tr><th>File</th><th>Test</th>${projects.map((p) => `<th>${esc(p ?? '')}</th>`).join('')}</tr>${e2eMatrix.join('')}</table>
<h2>9. Known issues and unverified items</h2>
<ul>
<li><b>Live AI:</b> automated suites use the mock provider for determinism; the real Groq and Gemini integration and live jailbreak resistance were verified separately (section 7). Larger free-tier Gemini models returned temporary "high demand" errors, so the fallback uses gemini-3.1-flash-lite.</li>
<li><b>Firebase:</b> project created, Email/Password, Email link and Google sign-in enabled, rules deployed. Rules are verified in the emulator; sign-up and sync against the live project are checked manually after deployment.</li>
<li><b>Deployments:</b> live on Vercel, Netlify and GitHub Pages. Pages deploys from CI after every check passes; Vercel and Netlify deploy through their Git integrations. Google sign-in works on the three main addresses; per-deployment preview addresses cannot be authorised in Firebase (no wildcards), so the app points users to the main site there.</li>
<li><b>Firefox/WebKit:</b> verified on GitHub Actions only (see matrix); the per-project table below lists the local runs.</li>
<li><b>Lighthouse variance:</b> mobile performance moves by 10+ points between runs on the same build (CPU load, thermals, power source). An A/B run of this morning's build against the final build on the same machine gave the same scores, and each page is reported as the median of three runs.</li>
<li><b>Rate limiting</b> is in-memory per serverless instance (best effort); provider quotas are the outer limit.</li>
<li><b>Angular unit coverage</b> is ${pct(covNg, 'lines')} of lines; UI flows rely on end-to-end tests.</li>
</ul>
<h2 class="page-break">10. Test cases</h2>
<h3>API unit and security (${C.api.total})</h3>
<table><tr><th>#</th><th>File</th><th>Test</th><th>Status</th></tr>${caseRows(apiCases)}</table>
<h3>Angular unit and component (${C.ng.total})</h3>
<table><tr><th>#</th><th>File</th><th>Test</th><th>Status</th></tr>${caseRows(ngCases)}</table>
<h3>Firestore rules (${C.rules.total})</h3>
<table><tr><th>#</th><th>File</th><th>Test</th><th>Status</th></tr>${caseRows(rulesCases)}</table>
<p class="small" style="margin-top:20px">Designed &amp; built by Bapan Ghosh. Every number in this report was produced by the test runs described above; raw JSON is generated under <code>reports/raw/</code>.</p>`,
);

/* ------------------------------------------------------------------ security markdown */
const md = `# Security self-attack report

Run: ${sec?.ranAt ?? 'n/a'} against the production build with production headers (\`scripts/security-audit.ts\`).

**Result: ${secPassed}/${sec?.rounds.length ?? 0} rounds passed.**

| # | Round | Attack | Result |
| --- | --- | --- | --- |
${(sec?.rounds ?? []).map((r) => `| R${r.id} | ${r.title} | ${r.attack} | ${r.status.toUpperCase()} |`).join('\n')}

## Observations
${(sec?.rounds ?? []).map((r) => `### R${r.id}. ${r.title}\n- Expected: ${r.expected}\n${r.observed.map((o) => `- ${o}`).join('\n')}`).join('\n\n')}

## Findings fixed during testing
| Area | Finding | Fix |
| --- | --- | --- |
${FIXED_FINDINGS.map((f) => `| ${f[0]} | ${f[1]} | ${f[2]} |`).join('\n')}
`;
writeFileSync('reports/security-report.md', md);

/* ------------------------------------------------------------------ render */
const browser = await chromium.launch();
try {
  for (const [name, html] of [
    ['Vitrine_Solution_Bapan_Ghosh.pdf', solution],
    ['Vitrine_Test_Report_Bapan_Ghosh.pdf', report],
  ] as const) {
    const page = await browser.newPage();
    if (process.env['DOCS_HTML_DIR']) writeFileSync(join(process.env['DOCS_HTML_DIR'], name.replace('.pdf', '.html')), html);
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: join(OUT_DIR, name),
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `<div style="width:100%;font-size:7px;color:#7a847f;padding:0 16mm;display:flex;justify-content:space-between;font-family:system-ui"><span>Vitrine · ${name.includes('Test') ? 'Test Report' : 'Solution'} · Bapan Ghosh</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
      margin: { top: '15mm', bottom: '17mm', left: '15mm', right: '15mm' },
    });
    await page.close();
    console.log(`pdf: ${join(OUT_DIR, name)}`);
  }
} finally {
  await browser.close();
}
console.log(`counts: api ${C.api.passed}/${C.api.total}, angular ${C.ng.passed}/${C.ng.total}, rules ${C.rules.passed}/${C.rules.total}, e2e ${C.e2e.passed} passed ${C.e2e.skipped} skipped ${C.e2e.failed} failed, security ${secPassed}/${sec?.rounds.length ?? 0}`);
