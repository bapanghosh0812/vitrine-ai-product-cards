import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import type { Unsubscribe } from 'firebase/firestore';
import { LIMITS } from '../../../shared/constants';
import type { StoredCard } from '../../../shared/types';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { StorageService } from './storage.service';

const GUEST_KEY = 'guest.cards';
const GUEST_MAX = 60;

export class RepositoryError extends Error {}

/**
 * One place for saved cards:
 * - guests: localStorage in this browser
 * - signed-in users: Firestore users/{uid}/cards/{id}, live-synced
 */
@Injectable({ providedIn: 'root' })
export class CardRepository {
  private readonly auth = inject(AuthService);
  private readonly firebase = inject(FirebaseService);
  private readonly storage = inject(StorageService);

  private readonly _cards = signal<StoredCard[]>([]);
  private readonly _loading = signal(true);
  private unsub: Unsubscribe | null = null;

  readonly cards = this._cards.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly favourites = computed(() => this._cards().filter((c) => c.favourite));
  readonly mode = computed(() => (this.auth.isSignedIn() ? 'cloud' : 'local'));

  constructor() {
    let current: string | null | undefined;
    effect(() => {
      const status = this.auth.status();
      const uid = this.auth.user()?.uid ?? null;
      untracked(() => {
        if (status === 'unknown' || uid === current) return;
        current = uid;
        if (uid) void this.listenCloud(uid);
        else this.loadLocal();
      });
    });
  }

  guestCards(): StoredCard[] {
    return this.storage.get<StoredCard[]>(GUEST_KEY, []);
  }

  private loadLocal(): void {
    this.unsub?.();
    this.unsub = null;
    this._cards.set(this.sorted(this.guestCards()));
    this._loading.set(false);
  }

  private async listenCloud(uid: string): Promise<void> {
    this.unsub?.();
    this._loading.set(true);
    try {
      const { db, fsMod } = await this.firebase.load();
      const q = fsMod.query(fsMod.collection(db, 'users', uid, 'cards'), fsMod.orderBy('updatedAt', 'desc'), fsMod.limit(300));
      this.unsub = fsMod.onSnapshot(
        q,
        (snap) => {
          this._cards.set(snap.docs.map((d) => ({ ...(d.data() as StoredCard), id: d.id })));
          this._loading.set(false);
        },
        () => this._loading.set(false),
      );
    } catch {
      this._loading.set(false);
    }
  }

  private sorted(list: StoredCard[]): StoredCard[] {
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  private writeLocal(list: StoredCard[]): void {
    const trimmed = this.sorted(list).slice(0, GUEST_MAX);
    if (!this.storage.set(GUEST_KEY, trimmed)) {
      throw new RepositoryError('This browser is out of storage space. Remove a few cards or images, or sign in to save to the cloud.');
    }
    this._cards.set(trimmed);
  }

  get(id: string): StoredCard | undefined {
    return this._cards().find((c) => c.id === id);
  }

  async save(card: StoredCard): Promise<void> {
    if (card.image && card.image.length > LIMITS.imageMaxBytes * 1.37) {
      throw new RepositoryError('This image is too large to save. Try a smaller photo.');
    }
    const uid = this.auth.user()?.uid;
    if (!uid) {
      const rest = this.guestCards().filter((c) => c.id !== card.id);
      this.writeLocal([card, ...rest]);
      return;
    }
    const { db, fsMod } = await this.firebase.load();
    const { id, ...data } = card;
    await fsMod.setDoc(fsMod.doc(db, 'users', uid, 'cards', id), stripUndefined(data));
  }

  async update(id: string, patch: Partial<StoredCard>): Promise<void> {
    const uid = this.auth.user()?.uid;
    const next = { ...patch, updatedAt: Date.now() };
    if (!uid) {
      this.writeLocal(this.guestCards().map((c) => (c.id === id ? { ...c, ...next } : c)));
      return;
    }
    const { db, fsMod } = await this.firebase.load();
    await fsMod.updateDoc(fsMod.doc(db, 'users', uid, 'cards', id), stripUndefined(next));
  }

  async toggleFavourite(id: string): Promise<void> {
    const card = this.get(id);
    if (card) await this.update(id, { favourite: !card.favourite });
  }

  async remove(id: string): Promise<void> {
    const uid = this.auth.user()?.uid;
    if (!uid) {
      this.writeLocal(this.guestCards().filter((c) => c.id !== id));
      return;
    }
    const { db, fsMod } = await this.firebase.load();
    await fsMod.deleteDoc(fsMod.doc(db, 'users', uid, 'cards', id));
  }

  /** Copies guest cards into the signed-in account, then clears them locally. */
  async importGuestCards(): Promise<number> {
    const uid = this.auth.user()?.uid;
    const cards = this.guestCards();
    if (!uid || !cards.length) return 0;
    const { db, fsMod } = await this.firebase.load();
    const batch = fsMod.writeBatch(db);
    for (const card of cards.slice(0, 100)) {
      const { id, ...data } = card;
      batch.set(fsMod.doc(db, 'users', uid, 'cards', id), stripUndefined({ ...data, updatedAt: Date.now() }));
    }
    await batch.commit();
    this.storage.remove(GUEST_KEY);
    return cards.length;
  }

  discardGuestCards(): void {
    this.storage.remove(GUEST_KEY);
  }

  /** Deletes every card in the account (used by account deletion). */
  async deleteAllCloud(): Promise<void> {
    const uid = this.auth.user()?.uid;
    if (!uid) return;
    const { db, fsMod } = await this.firebase.load();
    const snap = await fsMod.getDocs(fsMod.collection(db, 'users', uid, 'cards'));
    const chunks: (typeof snap.docs)[] = [];
    for (let i = 0; i < snap.docs.length; i += 400) chunks.push(snap.docs.slice(i, i + 400));
    for (const chunk of chunks) {
      const batch = fsMod.writeBatch(db);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
}

function stripUndefined<T extends object>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
