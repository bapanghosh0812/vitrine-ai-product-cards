#!/usr/bin/env node
/**
 * Grants (or revokes) the `admin` custom claim for the owner account, which unlocks the
 * Support inbox (/admin). Run locally ONCE with a Firebase service-account key that is
 * never committed and never uploaded to Vercel/Netlify.
 *
 *   node scripts/set-admin-claim.mjs --key ../_secrets/vitrine-service-account.json --email you@example.com
 *   node scripts/set-admin-claim.mjs --key ... --email you@example.com --revoke
 *
 * --email defaults to OWNER_EMAIL from .env.local. The owner must have signed up first.
 */
import { existsSync, readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const keyPath = arg('--key') ?? '../_secrets/vitrine-service-account.json';
const email = (arg('--email') ?? process.env.OWNER_EMAIL ?? '').trim();
const revoke = process.argv.includes('--revoke');

if (!existsSync(keyPath)) {
  console.error(`Service account key not found at ${keyPath}`);
  process.exit(1);
}
if (!email) {
  console.error('Pass --email or set OWNER_EMAIL in .env.local');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();

const user = await auth.getUserByEmail(email).catch(() => null);
if (!user) {
  console.error('No Firebase user with that email yet. Sign up in the app first, then run this again.');
  process.exit(1);
}
const claims = { ...(user.customClaims ?? {}) };
if (revoke) delete claims.admin;
else claims.admin = true;
await auth.setCustomUserClaims(user.uid, claims);
console.log(`${revoke ? 'Revoked' : 'Granted'} admin for uid ${user.uid}. Sign out and in again to refresh the token.`);
