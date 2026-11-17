import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import type { BrandKitInput } from '../../../shared/types';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';
import { SettingsService } from './settings.service';
import { StorageService } from './storage.service';

export interface BrandKit extends BrandKitInput {
  colours: string[];
}

export const EMPTY_KIT: BrandKit = { brandName: '', voice: '', avoid: '', colours: [] };
const KEY = 'guest.brand-kit';

@Injectable({ providedIn: 'root' })
export class BrandKitService {
  private readonly auth = inject(AuthService);
  private readonly profile = inject(ProfileService);
  private readonly storage = inject(StorageService);
  private readonly settings = inject(SettingsService);

  private readonly _kit = signal<BrandKit>({ ...EMPTY_KIT, ...this.storage.get<Partial<BrandKit>>(KEY, {}) });
  readonly kit = this._kit.asReadonly();
  readonly enabled = computed(() => this.settings.settings().useBrandKit);
  readonly isEmpty = computed(() => {
    const k = this._kit();
    return !k.brandName && !k.voice && !k.avoid && !k.colours.length;
  });

  /** What is sent with a generation request (undefined when off or empty). */
  readonly forRequest = computed<BrandKitInput | undefined>(() => {
    if (!this.enabled() || this.isEmpty()) return undefined;
    const k = this._kit();
    const out: BrandKitInput = {};
    if (k.brandName?.trim()) out.brandName = k.brandName.trim();
    if (k.voice?.trim()) out.voice = k.voice.trim();
    if (k.avoid?.trim()) out.avoid = k.avoid.trim();
    if (k.colours.length) out.colours = k.colours;
    return out;
  });

  constructor() {
    effect(() => {
      const signedIn = this.auth.isSignedIn();
      const remote = this.profile.profile()?.brandKit;
      untracked(() => {
        if (signedIn && remote) this._kit.set({ ...EMPTY_KIT, ...remote, colours: remote.colours ?? [] });
        if (!signedIn && this.auth.status() === 'guest') this._kit.set({ ...EMPTY_KIT, ...this.storage.get<Partial<BrandKit>>(KEY, {}) });
      });
    });
  }

  async save(kit: BrandKit): Promise<void> {
    const clean: BrandKit = {
      brandName: kit.brandName?.trim().slice(0, 60) ?? '',
      voice: kit.voice?.trim().slice(0, 240) ?? '',
      avoid: kit.avoid?.trim().slice(0, 160) ?? '',
      colours: kit.colours.filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 5),
    };
    this._kit.set(clean);
    if (this.auth.isSignedIn()) await this.profile.update({ brandKit: clean });
    else this.storage.set(KEY, clean);
  }
}
