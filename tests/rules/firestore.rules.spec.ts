/**
 * Firestore security rules tests (run against the local emulator):
 *   firebase emulators:exec --only firestore --project demo-vitrine "npx vitest run --config vitest.rules.config.ts"
 * Covers IDOR between two users, privilege escalation, field validation and ticket access.
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { deleteDoc, doc, getDoc, getDocs, collection, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

const profile = (over: Record<string, unknown> = {}) => ({
  displayName: 'Alice',
  avatar: 'kabir',
  consent: { termsVersion: '2026-11-17', privacyVersion: '2026-11-17', acceptedAt: 1 },
  brandKit: {},
  settings: {},
  stats: { generated: 0, saved: 0, exported: 0, templatesUsed: [] },
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

const card = (over: Record<string, unknown> = {}) => ({
  name: 'Brass lamp',
  category: 'home',
  template: 'luxe',
  copy: { title: 'Brass & Teak Lamp', description: 'Warm light for slow evenings.', keywords: ['lamp', 'brass'] },
  inputs: { tone: 'luxurious', language: 'en' },
  image: null,
  favourite: false,
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

const ticket = (uid: string, email: string, over: Record<string, unknown> = {}) => ({
  uid,
  email,
  name: 'Alice',
  subject: 'Export problem',
  message: 'My PNG export looks blurry on mobile.',
  transcript: [],
  page: '/studio',
  status: 'open',
  createdAt: 1,
  ...over,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-vitrine',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/alice'), profile());
    await setDoc(doc(db, 'users/alice/cards/card_1'), card());
    await setDoc(doc(db, 'tickets/VT-AAAAAA'), ticket('alice', 'alice@example.com'));
  });
});

const alice = () => env.authenticatedContext('alice', { email: 'alice@example.com' }).firestore();
const bob = () => env.authenticatedContext('bob', { email: 'bob@example.com' }).firestore();
const admin = () => env.authenticatedContext('owner', { email: 'owner@example.com', admin: true }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('users/{uid} (owner only)', () => {
  it('owner can read and update their profile', async () => {
    await assertSucceeds(getDoc(doc(alice(), 'users/alice')));
    await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), { avatar: 'fox', updatedAt: 2 }));
  });
  it('IDOR: another user cannot read, write or delete it', async () => {
    await assertFails(getDoc(doc(bob(), 'users/alice')));
    await assertFails(updateDoc(doc(bob(), 'users/alice'), { displayName: 'Hacked' }));
    await assertFails(deleteDoc(doc(bob(), 'users/alice')));
  });
  it('unauthenticated requests are denied', async () => {
    await assertFails(getDoc(doc(anon(), 'users/alice')));
    await assertFails(setDoc(doc(anon(), 'users/mallory'), profile()));
  });
  it('privilege escalation: role/admin fields cannot be written', async () => {
    await assertFails(updateDoc(doc(alice(), 'users/alice'), { role: 'admin' }));
    await assertFails(updateDoc(doc(alice(), 'users/alice'), { admin: true }));
    await assertFails(setDoc(doc(bob(), 'users/bob'), profile({ isAdmin: true })));
  });
  it('validates field types and sizes, and createdAt is immutable', async () => {
    await assertFails(updateDoc(doc(alice(), 'users/alice'), { displayName: 'x'.repeat(61) }));
    await assertFails(updateDoc(doc(alice(), 'users/alice'), { avatar: '<script>' }));
    await assertFails(updateDoc(doc(alice(), 'users/alice'), { createdAt: 999 }));
    await assertSucceeds(setDoc(doc(bob(), 'users/bob'), profile({ displayName: 'Bob' })));
  });
  it('owner can delete their own profile', async () => {
    await assertSucceeds(deleteDoc(doc(alice(), 'users/alice')));
  });
});

describe('users/{uid}/cards (owner only, validated)', () => {
  it('owner can create, read, update and delete cards', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/cards/card_2'), card()));
    await assertSucceeds(getDoc(doc(alice(), 'users/alice/cards/card_1')));
    await assertSucceeds(updateDoc(doc(alice(), 'users/alice/cards/card_1'), { favourite: true, updatedAt: 2 }));
    await assertSucceeds(deleteDoc(doc(alice(), 'users/alice/cards/card_1')));
  });
  it("IDOR: another user cannot list or touch Alice's cards", async () => {
    await assertFails(getDocs(collection(bob(), 'users/alice/cards')));
    await assertFails(getDoc(doc(bob(), 'users/alice/cards/card_1')));
    await assertFails(setDoc(doc(bob(), 'users/alice/cards/card_9'), card()));
    await assertFails(deleteDoc(doc(bob(), 'users/alice/cards/card_1')));
  });
  it('rejects invalid cards', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/cards/c3'), card({ template: 'evil' })));
    await assertFails(setDoc(doc(alice(), 'users/alice/cards/c4'), card({ copy: { title: 'x'.repeat(81), description: 'd', keywords: [] } })));
    await assertFails(setDoc(doc(alice(), 'users/alice/cards/c5'), card({ image: 'https://evil.example/x.png' })));
    await assertFails(setDoc(doc(alice(), 'users/alice/cards/c6'), card({ extra: 'field' })));
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/cards/c7'), card({ image: 'data:image/webp;base64,QUJDRA==' })));
  });
});

describe('tickets', () => {
  it('owner can create a ticket with their own uid and email', async () => {
    await assertSucceeds(setDoc(doc(bob(), 'tickets/VT-BBBBBB'), ticket('bob', 'bob@example.com')));
  });
  it('cannot spoof another uid or email, or set a status', async () => {
    await assertFails(setDoc(doc(bob(), 'tickets/VT-CCCCCC'), ticket('alice', 'bob@example.com')));
    await assertFails(setDoc(doc(bob(), 'tickets/VT-DDDDDD'), ticket('bob', 'ceo@example.com')));
    await assertFails(setDoc(doc(bob(), 'tickets/VT-EEEEEE'), ticket('bob', 'bob@example.com', { status: 'resolved' })));
    await assertFails(setDoc(doc(bob(), 'tickets/not-a-ticket-id'), ticket('bob', 'bob@example.com')));
  });
  it("IDOR: users cannot read other people's tickets or overwrite them", async () => {
    await assertFails(getDoc(doc(bob(), 'tickets/VT-AAAAAA')));
    await assertFails(getDocs(collection(bob(), 'tickets')));
    await assertFails(setDoc(doc(bob(), 'tickets/VT-AAAAAA'), ticket('bob', 'bob@example.com')));
    await assertSucceeds(getDocs(query(collection(alice(), 'tickets'), where('uid', '==', 'alice'))));
  });
  it('owners cannot change status; admins can change status only', async () => {
    await assertFails(updateDoc(doc(alice(), 'tickets/VT-AAAAAA'), { status: 'resolved' }));
    await assertSucceeds(updateDoc(doc(admin(), 'tickets/VT-AAAAAA'), { status: 'in_progress' }));
    await assertFails(updateDoc(doc(admin(), 'tickets/VT-AAAAAA'), { message: 'edited' }));
    await assertFails(updateDoc(doc(admin(), 'tickets/VT-AAAAAA'), { status: 'deleted' }));
  });
  it('admins can read all tickets but not user profiles; nobody can delete tickets', async () => {
    await assertSucceeds(getDocs(collection(admin(), 'tickets')));
    await assertFails(getDoc(doc(admin(), 'users/alice')));
    await assertFails(deleteDoc(doc(admin(), 'tickets/VT-AAAAAA')));
    await assertFails(deleteDoc(doc(alice(), 'tickets/VT-AAAAAA')));
  });
});

describe('default deny', () => {
  it('unknown collections are closed', async () => {
    await assertFails(setDoc(doc(alice(), 'config/flags'), { admin: true }));
    await assertFails(getDoc(doc(admin(), 'secrets/keys')));
  });
});
