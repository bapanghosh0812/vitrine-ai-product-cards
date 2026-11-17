#!/usr/bin/env node
/**
 * Post-processes the static Angular build for a hosting target.
 *
 *   node scripts/postbuild.mjs --target vercel|netlify|pages
 *
 * - replaces %SITE_URL% placeholders, writes sitemap.xml and robots.txt
 * - hashes every inline executable <script> and builds a strict CSP from the hashes
 * - vercel:  .vercel/output (Build Output API v3) with routes + security headers
 * - netlify: _headers with security headers and caching
 * - pages:   CSP <meta> tags, 404.html SPA fallback, .nojekyll
 * - keeps the Angular service worker manifest (ngsw.json) hashes in sync with edited files
 */
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

if (existsSync('.env.local') && !process.env.CI) process.loadEnvFile('.env.local');

const target = process.argv[process.argv.indexOf('--target') + 1];
if (!['vercel', 'netlify', 'pages'].includes(target)) {
  console.error('usage: node scripts/postbuild.mjs --target vercel|netlify|pages');
  process.exit(1);
}

const DIST = join('dist', 'vitrine', 'browser');
if (!existsSync(DIST)) {
  console.error(`missing ${DIST}; run the Angular build first`);
  process.exit(1);
}

const SITE_URL = (process.env.NG_APP_SITE_URL || 'https://vitrine-ai-product-cards.vercel.app').replace(/\/+$/, '');
const API_BASE = (process.env.NG_APP_API_BASE || '').replace(/\/+$/, '');
const AUTH_DOMAIN = process.env.NG_APP_FIREBASE_AUTH_DOMAIN || '';

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
const toUrlPath = (file) => `/${relative(DIST, file).split(sep).join('/')}`;
const sha256b64 = (text) => createHash('sha256').update(text, 'utf8').digest('base64');
const sha1hex = (buf) => createHash('sha1').update(buf).digest('hex');

const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));
const edited = new Set();

/* ------------------------------------------------------------------ */
/* 1. placeholders                                                     */
/* ------------------------------------------------------------------ */
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  if (html.includes('%SITE_URL%')) {
    writeFileSync(file, html.replaceAll('%SITE_URL%', SITE_URL));
    edited.add(file);
  }
}

/* ------------------------------------------------------------------ */
/* 2. CSP from inline script hashes                                    */
/* ------------------------------------------------------------------ */
const hashes = new Set();
const SCRIPT_RE = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(SCRIPT_RE)) {
    const attrs = m[1] ?? '';
    const type = /type=["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase();
    if (type && !['text/javascript', 'module', 'application/javascript'].includes(type)) continue; // JSON data blocks are not executed
    if (m[2]) hashes.add(`'sha256-${sha256b64(m[2])}'`);
  }
}

const apiOrigin = API_BASE ? new URL(API_BASE).origin : '';
const csp = [
  "default-src 'self'",
  `script-src 'self' ${[...hashes].join(' ')} https://apis.google.com https://www.gstatic.com`.replace(/\s+/g, ' ').trim(),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleusercontent.com https://www.gstatic.com",
  "font-src 'self' data:",
  `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://firebaseinstallations.googleapis.com${apiOrigin ? ` ${apiOrigin}` : ''}`,
  `frame-src 'self' ${AUTH_DOMAIN ? `https://${AUTH_DOMAIN}` : 'https://*.firebaseapp.com https://*.web.app'} https://accounts.google.com https://apis.google.com`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
];
const cspHeader = [...csp, "frame-ancestors 'none'", 'upgrade-insecure-requests'].join('; ');
const cspMeta = csp.join('; '); // frame-ancestors is ignored in <meta>

const SECURITY_HEADERS = {
  'Content-Security-Policy': cspHeader,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-site',
  'X-DNS-Prefetch-Control': 'off',
};

/* ------------------------------------------------------------------ */
/* 3. sitemap + robots                                                 */
/* ------------------------------------------------------------------ */
const prerendered = htmlFiles
  .map(toUrlPath)
  .filter((p) => p.endsWith('/index.html') && !p.startsWith('/offline'))
  .map((p) => p.replace(/index\.html$/, ''))
  .sort();
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${prerendered
  .map((p) => {
    const loc = p === '/' ? `${SITE_URL}/` : `${SITE_URL}${p.replace(/\/$/, '')}`;
    const priority = p === '/' ? '1.0' : p.startsWith('/help') ? '0.7' : p.startsWith('/legal') ? '0.4' : '0.8';
    return `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><priority>${priority}</priority></url>`;
  })
  .join('\n')}
</urlset>
`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap);
writeFileSync(
  join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /studio\nDisallow: /library\nDisallow: /settings\nDisallow: /profile\nDisallow: /admin\nDisallow: /auth/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
);

/* ------------------------------------------------------------------ */
/* 4. target specific                                                  */
/* ------------------------------------------------------------------ */
const IMMUTABLE = 'public, max-age=31536000, immutable';

if (target === 'pages') {
  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    if (!html.includes('http-equiv="Content-Security-Policy"')) {
      writeFileSync(file, html.replace(/<meta charset="utf-8"\s*\/?>/i, (m) => `${m}\n    <meta http-equiv="Content-Security-Policy" content="${cspMeta}" />`));
      edited.add(file);
    }
  }
  const csr = join(DIST, 'index.csr.html');
  if (existsSync(csr)) cpSync(csr, join(DIST, '404.html'));
  writeFileSync(join(DIST, '.nojekyll'), '');
}

if (target === 'netlify') {
  const block = (path, headers) => `${path}\n${Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`;
  const headersFile = [
    block('/*', SECURITY_HEADERS),
    block('/*.js', { 'Cache-Control': IMMUTABLE }),
    block('/*.css', { 'Cache-Control': IMMUTABLE }),
    block('/media/*', { 'Cache-Control': IMMUTABLE }),
    block('/emoji/*', { 'Cache-Control': 'public, max-age=604800' }),
    block('/brand/*', { 'Cache-Control': 'public, max-age=604800' }),
    block('/ngsw.json', { 'Cache-Control': 'no-cache' }),
    block('/ngsw-worker.js', { 'Cache-Control': 'no-cache' }),
  ].join('\n');
  writeFileSync(join(DIST, '_headers'), headersFile);
}

/* ------------------------------------------------------------------ */
/* 5. keep ngsw.json hashes valid for edited files                     */
/* ------------------------------------------------------------------ */
const ngswPath = join(DIST, 'ngsw.json');
if (existsSync(ngswPath)) {
  const ngsw = JSON.parse(readFileSync(ngswPath, 'utf8'));
  for (const file of edited) {
    const key = toUrlPath(file);
    if (ngsw.hashTable && key in ngsw.hashTable) ngsw.hashTable[key] = sha1hex(readFileSync(file));
  }
  writeFileSync(ngswPath, JSON.stringify(ngsw, null, 2));
}

if (target === 'vercel') {
  const OUT = join('.vercel', 'output');
  rmSync(join(OUT, 'static'), { recursive: true, force: true });
  mkdirSync(join(OUT, 'static'), { recursive: true });
  cpSync(DIST, join(OUT, 'static'), { recursive: true });
  const pageRoutes = htmlFiles
    .map(toUrlPath)
    .filter((p) => p.endsWith('/index.html') && p !== '/index.html')
    .map((p) => {
      const dir = p.replace(/\/index\.html$/, '');
      return { src: `^${dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`, dest: p };
    });
  const config = {
    version: 3,
    routes: [
      { src: '^/(.*)$', headers: SECURITY_HEADERS, continue: true },
      { src: '^/(?:chunk-|main-|polyfills-|styles-)[^/]+\\.(?:js|css)$', headers: { 'Cache-Control': IMMUTABLE }, continue: true },
      { src: '^/media/(.*)$', headers: { 'Cache-Control': IMMUTABLE }, continue: true },
      { src: '^/(?:ngsw\\.json|ngsw-worker\\.js)$', headers: { 'Cache-Control': 'no-cache' }, continue: true },
      { src: '^/api(?:/(.*))?$', dest: '/api?__route=$1' },
      { src: '^/$', dest: '/index.html' },
      ...pageRoutes,
      { handle: 'filesystem' },
      { src: '^/(?!.*\\.[a-zA-Z0-9]{2,5}$).*$', dest: '/index.csr.html' },
    ],
  };
  writeFileSync(join(OUT, 'config.json'), JSON.stringify(config, null, 2));
}

console.log(
  `postbuild(${target}): ${htmlFiles.length} html, ${hashes.size} inline script hash(es), ${prerendered.length} sitemap urls, site ${SITE_URL}${apiOrigin ? `, api ${apiOrigin}` : ''}`,
);
