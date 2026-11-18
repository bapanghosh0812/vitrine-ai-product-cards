/**
 * Local API server for development: `npm run dev:api` (port 8787).
 * The Angular dev server proxies /api to it (see proxy.conf.json).
 */
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { serve } from '@hono/node-server';

// .env.local wins over stale machine-level variables during local development.
if (existsSync('.env.local')) Object.assign(process.env, parseEnv(readFileSync('.env.local', 'utf8')));

const { createApp, normaliseRequest } = await import('./app');
const { readEnv } = await import('./env');

const env = readEnv();
const app = createApp(env);
const port = Number(process.env['API_PORT'] ?? 8787);

serve({ fetch: (req) => app.fetch(normaliseRequest(req)), port }, (info) => {
  const ai = env.aiMock ? 'mock' : [env.groqApiKey && `groq(${env.groqModel})`, env.geminiApiKey && `gemini(${env.geminiModel})`].filter(Boolean).join(' → ') || 'none';
  console.log(`Vitrine API listening on http://localhost:${info.port}/api  ·  AI: ${ai}  ·  auth: ${env.firebaseProjectId ? 'on' : 'off'}`);
});
