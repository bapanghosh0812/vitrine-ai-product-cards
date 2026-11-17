import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { injectIsBrowser } from './platform';
import { SettingsService, type ThemeChoice } from './settings.service';
import { StorageService } from './storage.service';

const THEME_COLORS: Record<'light' | 'dark' | 'oled', string> = {
  light: '#fbf7f0',
  dark: '#07130f',
  oled: '#000000',
};

/** Applies theme + accessibility attributes to <html>. A tiny inline script in index.html does the first paint. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly settings = inject(SettingsService);
  private readonly storage = inject(StorageService);
  private readonly doc = inject(DOCUMENT);
  private readonly browser = injectIsBrowser();
  private readonly systemDark = signal(false);

  readonly choice = computed(() => this.settings.settings().theme);
  readonly resolved = computed<'light' | 'dark' | 'oled'>(() => {
    const c = this.choice();
    if (c === 'system') return this.systemDark() ? 'dark' : 'light';
    return c;
  });
  readonly isDark = computed(() => this.resolved() !== 'light');

  constructor() {
    if (this.browser && typeof matchMedia !== 'undefined') {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      this.systemDark.set(mq.matches);
      mq.addEventListener('change', (e) => this.systemDark.set(e.matches));
    }
    effect(() => {
      const root = this.doc.documentElement;
      const theme = this.resolved();
      const s = this.settings.settings();
      // setAttribute (not dataset) so this also works in the prerender DOM.
      root.setAttribute('data-theme', theme);
      root.setAttribute('data-motion', s.reduceMotion ? 'reduced' : 'full');
      root.setAttribute('data-text', s.largeText ? 'large' : 'normal');
      root.setAttribute('data-focus', s.strongFocus ? 'strong' : 'normal');
      if (this.browser) {
        // Mirror for the pre-paint script in index.html; follows the preference-storage consent.
        this.storage.set('theme-hint', s.theme, 'preference');
        this.doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
      }
    });
  }

  set(choice: ThemeChoice): void {
    this.settings.update({ theme: choice });
  }

  /** Cycles light → dark → oled → system. */
  cycle(): void {
    const order: ThemeChoice[] = ['light', 'dark', 'oled', 'system'];
    const next = order[(order.indexOf(this.choice()) + 1) % order.length] ?? 'system';
    this.set(next);
  }
}
