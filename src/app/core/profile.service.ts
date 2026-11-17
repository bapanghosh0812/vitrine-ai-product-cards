import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import type { Unsubscribe } from 'firebase/firestore';
import { PRIVACY_VERSION, TERMS_VERSION } from '../../../shared/constants';
import type { BrandKitInput } from '../../../shared/types';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { SettingsService, type AppSettings } from './settings.service';

export interface ConsentRecord {
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: number;
}

export interface ProfileStats {
  generated: number;
  saved: number;
  exported: number;
  templatesUsed: string[];
}

export interface UserProfile {
  displayName: string;
  avatar: string;
  consent: ConsentRecord | null;
  brandKit: BrandKitInput & { enabled?: boolean };
  settings: Partial<AppSettings>;
  stats: ProfileStats;
  createdAt: number;
  updatedAt: number;
}

export const EMPTY_STATS: ProfileStats = { generated: 0, saved: 0, exported: 0, templatesUsed: [] };

export function currentConsent(): ConsentRecord {
  return { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION, acceptedAt: Date.now() };
}

/** Live view of users/{uid}. Only the owner can read or write it (see firestore.rules). */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly auth = inject(AuthService);
  private readonly firebase = inject(FirebaseService);
  private readonly settings = inject(SettingsService);

  private readonly _profile = signal<UserProfile | null>(null);
  private readonly _loaded = signal(false);
  private unsub: Unsubscribe | null = null;
  private pendingConsent: ConsentRecord | null = null;

  readonly profile = this._profile.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly needsConsent = computed(() => {
    if (!this.auth.isSignedIn() || !this._loaded()) return false;
    const c = this._profile()?.consent;
    return !c || c.termsVersion !== TERMS_VERSION || c.privacyVersion !== PRIVACY_VERSION;
  });

  constructor() {
    effect(() => {
      const user = this.auth.user();
      untracked(() => this.listen(user?.uid ?? null));
    });
  }

  /** Called by sign-up so the consent given on the form is written with the first profile. */
  setPendingConsent(consent: ConsentRecord): void {
    this.pendingConsent = consent;
  }

  private async listen(uid: string | null): Promise<void> {
    this.unsub?.();
    this.unsub = null;
    this._profile.set(null);
    this._loaded.set(false);
    if (!uid) return;
    const { db, fsMod } = await this.firebase.load();
    const ref = fsMod.doc(db, 'users', uid);
    this.unsub = fsMod.onSnapshot(
      ref,
      async (snap) => {
        if (!snap.exists()) {
          await this.create(uid);
          return;
        }
        const data = snap.data() as Partial<UserProfile>;
        const profile: UserProfile = {
          displayName: data.displayName ?? this.auth.user()?.displayName ?? '',
          avatar: data.avatar ?? 'kabir',
          consent: data.consent ?? null,
          brandKit: data.brandKit ?? {},
          settings: data.settings ?? {},
          stats: { ...EMPTY_STATS, ...(data.stats ?? {}) },
          createdAt: data.createdAt ?? Date.now(),
          updatedAt: data.updatedAt ?? Date.now(),
        };
        this._profile.set(profile);
        this.settings.hydrate(profile.settings);
        this._loaded.set(true);
      },
      () => this._loaded.set(true),
    );
  }

  private async create(uid: string): Promise<void> {
    const { db, fsMod } = await this.firebase.load();
    const user = this.auth.user();
    const now = Date.now();
    const profile: UserProfile = {
      displayName: (user?.displayName ?? user?.email?.split('@')[0] ?? 'Friend').slice(0, 60),
      avatar: 'kabir',
      consent: this.pendingConsent,
      brandKit: {},
      settings: {},
      stats: { ...EMPTY_STATS },
      createdAt: now,
      updatedAt: now,
    };
    this.pendingConsent = null;
    try {
      await fsMod.setDoc(fsMod.doc(db, 'users', uid), profile);
    } catch {
      this._loaded.set(true);
    }
  }

  async update(patch: Partial<Omit<UserProfile, 'createdAt' | 'stats'>>): Promise<void> {
    const uid = this.auth.user()?.uid;
    if (!uid) return;
    const { db, fsMod } = await this.firebase.load();
    await fsMod.updateDoc(fsMod.doc(db, 'users', uid), { ...patch, updatedAt: Date.now() });
  }

  async acceptCurrentTerms(): Promise<void> {
    await this.update({ consent: currentConsent() });
  }

  async bumpStat(stat: 'generated' | 'saved' | 'exported', by = 1, template?: string): Promise<void> {
    const uid = this.auth.user()?.uid;
    if (!uid || !this._profile()) return;
    try {
      const { db, fsMod } = await this.firebase.load();
      const patch: Record<string, unknown> = { [`stats.${stat}`]: fsMod.increment(by), updatedAt: Date.now() };
      if (template) patch['stats.templatesUsed'] = fsMod.arrayUnion(template);
      await fsMod.updateDoc(fsMod.doc(db, 'users', uid), patch);
    } catch {
      /* stats are best effort */
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    if (!this._profile()) return;
    try {
      await this.update({ settings });
    } catch {
      /* offline: will retry on next change */
    }
  }
}
