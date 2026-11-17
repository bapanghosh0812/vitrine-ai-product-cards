#!/usr/bin/env node
/**
 * Local helper: merges values from a private secrets folder into .env.local
 * (gitignored). Prints key NAMES only, never values.
 *
 *   node scripts/import-secrets.mjs ../_secrets
 *
 * Reads:
 *   <dir>/SECRETS.env                 GROQ_API_KEY, GEMINI_API_KEY, OWNER_EMAIL, SUPPORT_EMAIL
 *   <dir>/vitrine-firebase-config.txt the `const firebaseConfig = { ... }` block from the Firebase console
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

const dir = process.argv[2] ?? '../_secrets';
const target = '.env.local';

const current = existsSync(target) ? parseEnv(readFileSync(target, 'utf8')) : {};
const next = { ...current };

const secretsFile = join(dir, 'SECRETS.env');
if (existsSync(secretsFile)) {
  const s = parseEnv(readFileSync(secretsFile, 'utf8'));
  for (const key of ['GROQ_API_KEY', 'GEMINI_API_KEY', 'OWNER_EMAIL', 'SUPPORT_EMAIL']) {
    if (s[key]?.trim()) next[key] = s[key].trim();
  }
  if (s.SUPPORT_EMAIL?.trim()) next.NG_APP_SUPPORT_EMAIL = s.SUPPORT_EMAIL.trim();
}

const fbFile = join(dir, 'vitrine-firebase-config.txt');
if (existsSync(fbFile)) {
  const text = readFileSync(fbFile, 'utf8');
  const map = {
    apiKey: 'NG_APP_FIREBASE_API_KEY',
    authDomain: 'NG_APP_FIREBASE_AUTH_DOMAIN',
    projectId: 'NG_APP_FIREBASE_PROJECT_ID',
    storageBucket: 'NG_APP_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'NG_APP_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'NG_APP_FIREBASE_APP_ID',
  };
  for (const [field, key] of Object.entries(map)) {
    const m = new RegExp(`${field}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`).exec(text);
    if (m?.[1]) next[key] = m[1].trim();
  }
  if (next.NG_APP_FIREBASE_PROJECT_ID) next.FIREBASE_PROJECT_ID = next.NG_APP_FIREBASE_PROJECT_ID;
}

next.NG_APP_DEMO_EMAIL ??= 'demo.vitrine@example.com';
next.NG_APP_DEMO_PASSWORD ??= 'Kabir#Vitrine-2026!';

const lines = Object.entries(next).map(([k, v]) => `${k}=${/[\s#"'=]/.test(v) ? JSON.stringify(v) : v}`);
writeFileSync(target, `# Local secrets. Gitignored. Never commit.\n${lines.join('\n')}\n`);

const added = Object.keys(next).filter((k) => current[k] !== next[k]);
console.log(`.env.local keys: ${Object.keys(next).join(', ')}`);
console.log(`changed: ${added.length ? added.join(', ') : 'none'}`);
