import { Injectable } from '@angular/core';
import { injectIsBrowser } from './platform';

export type StorageClass = 'essential' | 'preference' | 'data';

const PREFIX = 'vitrine.';
const CONSENT_KEY = `${PREFIX}cookie-consent`;

/**
 * Thin, failure-tolerant wrapper over Web Storage.
 * - essential: always allowed (auth session, cookie choice, guest data the user created on purpose).
 * - preference: only persisted across sessions when the user allows preference storage;
 *   otherwise kept in sessionStorage for the current tab.
 * - data: user-created content (guest cards, brand kit). Treated as essential because the
 *   user explicitly asked us to keep it.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly browser = injectIsBrowser();

  preferencesAllowed(): boolean {
    if (!this.browser) return false;
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      return raw ? (JSON.parse(raw) as { preferences?: boolean }).preferences === true : false;
    } catch {
      return false;
    }
  }

  private store(kind: StorageClass): Storage | null {
    if (!this.browser) return null;
    try {
      if (kind === 'preference' && !this.preferencesAllowed()) return sessionStorage;
      return localStorage;
    } catch {
      return null;
    }
  }

  get<T>(key: string, fallback: T, kind: StorageClass = 'data'): T {
    const s = this.store(kind);
    if (!s) return fallback;
    try {
      const raw = s.getItem(PREFIX + key) ?? (kind === 'preference' ? localStorage.getItem(PREFIX + key) : null);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  set(key: string, value: unknown, kind: StorageClass = 'data'): boolean {
    const s = this.store(kind);
    if (!s) return false;
    try {
      s.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      return false; // quota exceeded or storage blocked
    }
  }

  remove(key: string): void {
    if (!this.browser) return;
    try {
      localStorage.removeItem(PREFIX + key);
      sessionStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  }

  /** Moves preference keys between session and local storage after the consent choice changes. */
  migratePreferences(keys: string[], allowed: boolean): void {
    if (!this.browser) return;
    try {
      for (const key of keys) {
        const from = allowed ? sessionStorage : localStorage;
        const to = allowed ? localStorage : sessionStorage;
        const value = from.getItem(PREFIX + key);
        if (value !== null) {
          to.setItem(PREFIX + key, value);
          from.removeItem(PREFIX + key);
        }
      }
    } catch {
      /* ignore */
    }
  }

  clearAll(): void {
    if (!this.browser) return;
    try {
      for (const s of [localStorage, sessionStorage]) {
        Object.keys(s)
          .filter((k) => k.startsWith(PREFIX))
          .forEach((k) => s.removeItem(k));
      }
    } catch {
      /* ignore */
    }
  }

  usageBytes(): number {
    if (!this.browser) return 0;
    try {
      return Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .reduce((n, k) => n + (localStorage.getItem(k)?.length ?? 0) * 2, 0);
    } catch {
      return 0;
    }
  }
}
