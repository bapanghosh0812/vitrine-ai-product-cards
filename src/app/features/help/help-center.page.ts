import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HELP_ARTICLES } from '../../../../shared/content/help.generated';
import { Emoji } from '../../shared/ui/emoji';
import { Icon } from '../../shared/ui/icon';

const CATEGORY_EMOJI: Record<string, string> = {
  Basics: 'sparkles',
  Studio: 'magic-wand',
  Library: 'books',
  Brand: 'artist-palette',
  Account: 'locked',
  Settings: 'light-bulb',
  Privacy: 'locked',
  AI: 'crystal-ball',
  Help: 'speech-balloon',
};

@Component({
  selector: 'app-help-center-page',
  imports: [RouterLink, Icon, Emoji],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="relative overflow-hidden border-b hairline">
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,var(--hero-glow),transparent_70%)]" aria-hidden="true"></div>
      <div class="relative mx-auto max-w-3xl px-6 pb-12 pt-14 text-center">
        <p class="eyebrow">Help Center</p>
        <h1 class="mt-3 font-display text-5xl leading-tight text-ink">How can we help?</h1>
        <p class="mt-3 text-muted">Guides for every part of Vitrine. Kabir, our assistant, answers from these same articles.</p>
        <div class="relative mx-auto mt-8 max-w-xl">
          <app-icon name="search" [size]="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <label for="help-search" class="sr-only">Search help articles</label>
          <input id="help-search" type="search" class="field !h-14 !rounded-full !pl-11 shadow-lux" placeholder="Search: export, verify email, brand kit…" [value]="q()" (input)="q.set($any($event.target).value)" />
        </div>
      </div>
    </section>

    <div class="mx-auto max-w-5xl px-6 py-12">
      @if (q().trim()) {
        <p class="mb-4 text-sm text-muted" role="status">{{ results().length }} result{{ results().length === 1 ? '' : 's' }} for “{{ q() }}”</p>
      }
      <div class="grid gap-4 sm:grid-cols-2">
        @for (a of results(); track a.slug) {
          <a [routerLink]="['/help', a.slug]" class="surface group flex gap-4 p-5 transition-transform duration-500 ease-[var(--ease-spring)] hover:-translate-y-1">
            <app-emoji [name]="emojiFor(a.category)" [size]="44" />
            <div class="min-w-0">
              <p class="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-gilt">{{ a.category }}</p>
              <h2 class="mt-1 text-[1.05rem] font-semibold text-ink group-hover:underline group-hover:decoration-[var(--gilt)] group-hover:underline-offset-4">{{ a.title }}</h2>
              <p class="mt-1 text-sm leading-relaxed text-muted">{{ a.summary }}</p>
            </div>
          </a>
        } @empty {
          <div class="surface col-span-full p-10 text-center">
            <p class="text-ink">No articles match that search.</p>
            <p class="mt-1 text-sm text-muted">Try different words, or ask Kabir in the bottom-right corner.</p>
          </div>
        }
      </div>
    </div>
  `,
})
export default class HelpCenterPage {
  protected readonly q = signal('');
  protected readonly results = computed(() => {
    const q = this.q().trim().toLowerCase();
    if (!q) return HELP_ARTICLES;
    const words = q.split(/\s+/);
    return HELP_ARTICLES.filter((a) => {
      const text = `${a.title} ${a.summary} ${a.keywords.join(' ')} ${a.sections.map((s) => s.text).join(' ')}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  });

  protected emojiFor(category: string): string {
    return CATEGORY_EMOJI[category] ?? 'sparkles';
  }
}
