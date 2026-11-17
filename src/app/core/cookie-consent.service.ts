import { inject, Injectable, signal } from '@angular/core';
import { injectIsBrowser } from './platform';
import { StorageService } from './storage.service';

export interface CookieChoice {
  necessary: true;
  preferences: boolean;
  decidedAt: number;
  version: 1;
}

const KEY = 'cookie-consent';
const PREFERENCE_KEYS = ['settings', 'theme-hint', 'studio.draft', 'recent-commands'];

/** Cookie / storage consent. Necessary-only is the default; nothing is tracked either way. */
@Injectable({ providedIn: 'root' })
export class CookieConsentService {
  private readonly storage = inject(StorageService);
  private readonly browser = injectIsBrowser();

  readonly choice = signal<CookieChoice | null>(this.browser ? this.storage.get<CookieChoice | null>(KEY, null, 'essential') : null);
  readonly bannerOpen = signal(false);
  readonly settingsOpen = signal(false);

  init(): void {
    if (this.browser && !this.choice()) this.bannerOpen.set(true);
  }

  decide(preferences: boolean): void {
    const choice: CookieChoice = { necessary: true, preferences, decidedAt: Date.now(), version: 1 };
    this.storage.set(KEY, choice, 'essential');
    this.storage.migratePreferences(PREFERENCE_KEYS, preferences);
    this.choice.set(choice);
    this.bannerOpen.set(false);
    this.settingsOpen.set(false);
  }

  openSettings(): void {
    this.settingsOpen.set(true);
    this.bannerOpen.set(true);
  }
}
