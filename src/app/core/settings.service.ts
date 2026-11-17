import { effect, inject, Injectable, signal } from '@angular/core';
import type { LanguageId, TemplateId, ToneId } from '../../../shared/constants';
import { StorageService } from './storage.service';

export type ThemeChoice = 'system' | 'light' | 'dark' | 'oled';

export interface AppSettings {
  theme: ThemeChoice;
  // generation
  defaultTone: ToneId;
  defaultLanguage: LanguageId;
  defaultVariations: 1 | 3;
  creativity: 'precise' | 'balanced' | 'creative';
  provider: 'auto' | 'groq' | 'gemini';
  useBrandKit: boolean;
  // card & export
  defaultTemplate: TemplateId;
  exportScale: 1 | 2 | 3;
  watermark: boolean;
  // history & privacy
  keepHistory: boolean;
  // notifications & sound
  toasts: boolean;
  sounds: boolean;
  haptics: boolean;
  // accessibility
  reduceMotion: boolean;
  largeText: boolean;
  strongFocus: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  defaultTone: 'luxurious',
  defaultLanguage: 'en',
  defaultVariations: 1,
  creativity: 'balanced',
  provider: 'auto',
  useBrandKit: true,
  defaultTemplate: 'luxe',
  exportScale: 2,
  watermark: true,
  keepHistory: true,
  toasts: true,
  sounds: false,
  haptics: true,
  reduceMotion: false,
  largeText: false,
  strongFocus: false,
};

const KEY = 'settings';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly storage = inject(StorageService);
  private readonly state = signal<AppSettings>({ ...DEFAULT_SETTINGS, ...this.storage.get<Partial<AppSettings>>(KEY, {}, 'preference') });

  readonly settings = this.state.asReadonly();

  constructor() {
    effect(() => {
      this.storage.set(KEY, this.state(), 'preference');
    });
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.state()[key];
  }

  update(patch: Partial<AppSettings>): void {
    this.state.update((s) => ({ ...s, ...patch }));
  }

  /** Used when a signed-in user's cloud settings arrive. */
  hydrate(remote: Partial<AppSettings> | undefined): void {
    if (!remote) return;
    const clean: Partial<AppSettings> = {};
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
      if (key in remote && typeof remote[key] === typeof DEFAULT_SETTINGS[key]) {
        (clean as Record<string, unknown>)[key] = remote[key];
      }
    }
    this.state.update((s) => ({ ...s, ...clean }));
  }

  reset(): void {
    this.state.set({ ...DEFAULT_SETTINGS });
  }
}
