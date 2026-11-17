/**
 * Production-like local server for the built app: serves dist/vitrine/browser with the
 * same rewrites as Vercel/Netlify (prerendered pages, SPA fallback to index.csr.html)
 * and mounts the real Hono API in-process. Used by Playwright and Lighthouse.
 *
 *   npx tsx scripts/serve-dist.ts            (port 4173, AI_MOCK=1 unless keys are set)
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { brotliCompressSync, constants as zlibConstants, gzipSync } from 'node:zlib';
import { getRequestListener } from '@hono/node-server';

if (existsSync('.env.local') && !process.env['CI']) process.loadEnvFile('.env.local');
// Deterministic by default (tests, Lighthouse). Set LIVE_AI=1 to call the real providers.
if (process.env['LIVE_AI'] !== '1') process.env['AI_MOCK'] = '1';

const { createApp, normaliseRequest } = await import('../server/app');
const { readEnv } = await import('../server/env');

const ROOT = join(process.cwd(), 'dist', 'vitrine', 'browser');

/** APPLY_HEADERS=1 serves the generated Netlify _headers (CSP etc.) to test them locally. */
function loadHeaders(): Record<string, string> {
  if (process.env['APPLY_HEADERS'] !== '1') return {};
  const file = join(ROOT, '_headers');
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  let inGlobal = false;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.startsWith(' ') && line.trim()) inGlobal = line.trim() === '/*';
    else if (inGlobal && line.includes(':')) {
      const i = line.indexOf(':');
      out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return out;
}
const EXTRA_HEADERS = loadHeaders();
const PORT = Number(process.env['PORT'] ?? 4173);
const app = createApp(readEnv());
const api = getRequestListener((req) => app.fetch(normaliseRequest(req)));

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function resolveFile(urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null; // malformed percent-encoding: treat as not found instead of crashing
  }
  if (decoded.includes('\0')) return null;
  const clean = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const candidates = [join(ROOT, clean), join(ROOT, clean, 'index.html')];
  for (const c of candidates) {
    if (!c.startsWith(ROOT)) continue;
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    void api(req, res);
    return;
  }
  let file = resolveFile(url.pathname);
  let status = 200;
  if (!file) {
    if (extname(url.pathname)) {
      status = 404;
      file = join(ROOT, 'index.csr.html');
    } else {
      file = join(ROOT, 'index.csr.html');
    }
  }
  let body = readFileSync(file);
  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  // Compress text like Vercel/Netlify do, so local Lighthouse numbers are realistic.
  const accept = String(req.headers['accept-encoding'] ?? '');
  let encoding: string | undefined;
  if (/text|javascript|json|xml|svg|manifest/.test(type) && body.length > 1024) {
    if (accept.includes('br')) {
      body = brotliCompressSync(body, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 9 } });
      encoding = 'br';
    } else if (accept.includes('gzip')) {
      body = gzipSync(body, { level: 9 });
      encoding = 'gzip';
    }
  }
  res.writeHead(status, {
    'Content-Type': type,
    ...(encoding ? { 'Content-Encoding': encoding, Vary: 'Accept-Encoding' } : {}),
    'Cache-Control': /\.(js|css)$/.test(file) && /(chunk|main|styles|polyfills)-/.test(file) ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...EXTRA_HEADERS,
  });
  res.end(body);
}).listen(PORT, () => {
  console.log(`serve-dist: http://localhost:${PORT}  (api: ${process.env['AI_MOCK'] === '1' ? 'mock AI' : 'live AI'}${Object.keys(EXTRA_HEADERS).length ? ', production headers' : ''})`);
});
