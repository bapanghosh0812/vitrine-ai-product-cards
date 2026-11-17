import { describe, expect, it } from 'vitest';
import { createApp, isAllowedOrigin, normaliseRequest } from './app';
import { readEnv } from './env';
import { FAKE } from './test-fakes';

const env = readEnv({ AI_MOCK: '1', ALLOWED_ORIGINS: 'https://vitrine-ai-product-cards.vercel.app' });
const json = (body: unknown, headers: Record<string, string> = {}) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

describe('API routes', () => {
  it('GET /api/health reports status and security headers', async () => {
    const app = createApp(env);
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok', ai: 'mock' });
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
  });

  it('POST /api/generate returns validated copy', async () => {
    const app = createApp(env);
    const res = await app.request('/api/generate', json({ name: 'Handwoven silk saree', category: 'fashion', variations: 3 }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { variations: { title: string; keywords: string[] }[] };
    expect(body.variations).toHaveLength(3);
    for (const v of body.variations) {
      expect(v.title.length).toBeLessThanOrEqual(80);
      expect(v.keywords.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('rejects malformed JSON (400), invalid input (422) and wrong content type (415)', async () => {
    const app = createApp(env);
    expect((await app.request('/api/generate', json('{"name": '))).status).toBe(400);
    expect((await app.request('/api/generate', json({ name: '', category: 'home' }))).status).toBe(422);
    expect((await app.request('/api/generate', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'hi' })).status).toBe(415);
  });

  it('rejects oversized payloads with 413', async () => {
    const app = createApp(env);
    const res = await app.request('/api/generate', json({ name: 'x'.repeat(40_000), category: 'home' }));
    expect(res.status).toBe(413);
  });

  it('blocks foreign origins and answers allowed preflights', async () => {
    const app = createApp(env);
    const evil = await app.request('/api/generate', json({ name: 'Lamp', category: 'home' }, { origin: 'https://evil.example' }));
    expect(evil.status).toBe(403);
    expect(evil.headers.get('access-control-allow-origin')).toBeNull();
    const pre = await app.request('/api/generate', { method: 'OPTIONS', headers: { origin: 'https://vitrine-ai-product-cards.vercel.app', 'access-control-request-method': 'POST' } });
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-origin')).toBe('https://vitrine-ai-product-cards.vercel.app');
  });

  it('rate-limits a burst from one IP with 429 and Retry-After', async () => {
    const app = createApp(env);
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await app.request('/api/generate', json({ name: 'Brass lamp', category: 'home' }, { 'x-forwarded-for': '203.0.113.9' }));
      statuses.push(res.status);
      if (res.status === 429) expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
    }
    expect(statuses.filter((s) => s === 200)).toHaveLength(8);
    expect(statuses.slice(8).every((s) => s === 429)).toBe(true);
  });

  it('rejects a forged bearer token with 401', async () => {
    const app = createApp(readEnv({ AI_MOCK: '1', FIREBASE_PROJECT_ID: 'demo-vitrine' }));
    const res = await app.request('/api/generate', json({ name: 'Lamp', category: 'home' }, { authorization: `Bearer ${FAKE.forgedJwt}` }));
    expect(res.status).toBe(401);
  });

  it('POST /api/support streams NDJSON grounded in the help center', async () => {
    const app = createApp(env);
    const res = await app.request('/api/support', json({ messages: [{ role: 'user', content: 'How do I export a PNG?' }] }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/x-ndjson');
    const events = (await res.text())
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l) as { t: string; sources?: { slug: string }[] });
    expect(events[0]?.t).toBe('meta');
    expect(events[0]?.sources?.some((s) => s.slug === 'exporting')).toBe(true);
    expect(events.at(-1)?.t).toBe('done');
  });

  it('falls back to help articles when AI is not configured', async () => {
    const app = createApp(readEnv({}));
    const res = await app.request('/api/support', json({ messages: [{ role: 'user', content: 'delete my account' }] }));
    const events = (await res.text()).trim().split('\n').map((l) => JSON.parse(l) as { t: string; articles?: unknown[] });
    expect(events[0]?.t).toBe('fallback');
    expect(events[0]?.articles?.length).toBeGreaterThan(0);
  });

  it('returns 503 for generation when no AI provider is configured', async () => {
    const app = createApp(readEnv({}));
    const res = await app.request('/api/generate', json({ name: 'Brass lamp', category: 'home' }));
    expect(res.status).toBe(503);
  });

  it('unknown routes return JSON 404', async () => {
    const app = createApp(env);
    const res = await app.request('/api/../../etc/passwd');
    expect(res.status).toBe(404);
  });
});

describe('helpers', () => {
  it('isAllowedOrigin accepts same-host previews and the allow-list only', () => {
    expect(isAllowedOrigin('https://preview-abc.vercel.app', 'preview-abc.vercel.app', env)).toBe(true);
    expect(isAllowedOrigin('https://vitrine-ai-product-cards.vercel.app', 'x', env)).toBe(true);
    expect(isAllowedOrigin('https://vitrine-ai-product-cards.vercel.app.evil.com', 'x', env)).toBe(false);
    expect(isAllowedOrigin('null', 'x', env)).toBe(false);
  });
  it('normaliseRequest maps Vercel and Netlify paths to /api/*', () => {
    expect(new URL(normaliseRequest(new Request('https://x.app/api?__route=generate')).url).pathname).toBe('/api/generate');
    expect(new URL(normaliseRequest(new Request('https://x.app/.netlify/functions/api/health')).url).pathname).toBe('/api/health');
    expect(new URL(normaliseRequest(new Request('https://x.app/api/health')).url).pathname).toBe('/api/health');
  });
});
