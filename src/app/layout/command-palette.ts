import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HELP_ARTICLES } from '../../../shared/content/help.generated';
import { CardRepository } from '../core/card-repository.service';
import { ThemeService } from '../core/theme.service';
import { StudioStore } from '../state/studio.store';
import { Icon } from '../shared/ui/icon';
import type { IconName } from '../shared/ui/icons';
import { CommandPaletteService } from './command-palette.service';
import { SHORTCUTS } from './shortcuts.service';

interface Command {
  id: string;
  label: string;
  group: string;
  icon: IconName;
  hint?: string;
  keywords?: string;
  run: () => void;
}

@Component({
  selector: 'app-command-palette',
  imports: [Icon, A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (palette.isOpen()) {
      <div class="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh] animate-fade">
        <button type="button" class="absolute inset-0 cursor-default bg-black/30 backdrop-blur-sm" tabindex="-1" aria-label="Close" (click)="palette.close()"></button>
        <div
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="palette.mode() === 'commands' ? 'Command palette' : 'Keyboard shortcuts'"
          class="surface shadow-float relative w-full max-w-xl animate-pop overflow-hidden !rounded-3xl"
          cdkTrapFocus
          [cdkTrapFocusAutoCapture]="true"
          (keydown.escape)="palette.close()"
        >
          @if (palette.mode() === 'commands') {
            <div class="flex items-center gap-3 border-b hairline px-5">
              <app-icon name="search" [size]="18" class="text-muted" />
              <input
                #search
                type="text"
                class="h-14 w-full bg-transparent text-[0.98rem] text-ink outline-none placeholder:text-muted"
                placeholder="Search pages, actions, help and your cards…"
                aria-label="Search commands"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                [attr.aria-activedescendant]="results()[index()] ? 'cmd-' + results()[index()]!.id : null"
                [value]="query()"
                (input)="query.set($any($event.target).value); index.set(0)"
                (keydown.arrowdown)="move(1, $event)"
                (keydown.arrowup)="move(-1, $event)"
                (keydown.enter)="runActive($event)"
              />
              <span class="kbd">Esc</span>
            </div>
            <ul id="palette-list" role="listbox" class="scrollbar-thin max-h-[55vh] overflow-y-auto p-2" aria-label="Results">
              @for (cmd of results(); track cmd.id; let i = $index) {
                @if (i === 0 || results()[i - 1]!.group !== cmd.group) {
                  <li role="presentation" class="px-3 pb-1 pt-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">{{ cmd.group }}</li>
                }
                <li
                  [id]="'cmd-' + cmd.id"
                  role="option"
                  [attr.aria-selected]="i === index()"
                  class="flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm text-ink-soft"
                  [class.bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]]="i === index()"
                  [class.text-ink]="i === index()"
                  tabindex="-1"
                  (mouseenter)="index.set(i)"
                  (click)="run(cmd)"
                  (keydown.enter)="run(cmd)"
                >
                  <app-icon [name]="cmd.icon" [size]="17" />
                  <span class="flex-1 truncate">{{ cmd.label }}</span>
                  @if (cmd.hint) {
                    <span class="text-xs text-muted">{{ cmd.hint }}</span>
                  }
                </li>
              } @empty {
                <li class="px-4 py-10 text-center text-sm text-muted">No results for “{{ query() }}”.</li>
              }
            </ul>
          } @else {
            <div class="flex items-center justify-between border-b hairline px-6 py-4">
              <h2 class="font-display text-2xl text-ink">Keyboard shortcuts</h2>
              <button type="button" class="icon-btn" (click)="palette.close()" aria-label="Close"><app-icon name="x" /></button>
            </div>
            <ul class="grid gap-1 p-4">
              @for (s of shortcuts; track s.keys) {
                <li class="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-ink-soft">
                  <span>{{ s.label }}</span>
                  <span class="flex gap-1">
                    @for (k of s.keys.split(' '); track $index) {
                      <span class="kbd">{{ k === 'Mod' ? mod : k }}</span>
                    }
                  </span>
                </li>
              }
            </ul>
          }
        </div>
      </div>
    }
  `,
})
export class CommandPalette {
  protected readonly palette = inject(CommandPaletteService);
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);
  private readonly repo = inject(CardRepository);
  private readonly studio = inject(StudioStore);
  private readonly searchEl = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly query = signal('');
  protected readonly index = signal(0);
  protected readonly shortcuts = SHORTCUTS;
  protected readonly mod = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

  private readonly base: Command[] = [
    { id: 'new', label: 'New card', group: 'Actions', icon: 'plus', run: () => this.nav('/studio', { new: 1 }) },
    { id: 'studio', label: 'Studio', group: 'Go to', icon: 'wand', hint: 'G S', run: () => this.nav('/studio') },
    { id: 'library', label: 'Library', group: 'Go to', icon: 'library', hint: 'G L', run: () => this.nav('/library') },
    { id: 'templates', label: 'Templates', group: 'Go to', icon: 'template', hint: 'G T', run: () => this.nav('/templates') },
    { id: 'brand', label: 'Brand Kit', group: 'Go to', icon: 'palette', hint: 'G B', run: () => this.nav('/brand-kit') },
    { id: 'profile', label: 'Profile', group: 'Go to', icon: 'user', run: () => this.nav('/profile') },
    { id: 'settings', label: 'Settings', group: 'Go to', icon: 'settings', run: () => this.nav('/settings') },
    { id: 'help', label: 'Help Center', group: 'Go to', icon: 'help', run: () => this.nav('/help') },
    { id: 'legal', label: 'Terms & policies', group: 'Go to', icon: 'scale', run: () => this.nav('/legal') },
    { id: 't-light', label: 'Theme: Light', group: 'Appearance', icon: 'sun', run: () => this.theme.set('light') },
    { id: 't-dark', label: 'Theme: Dark', group: 'Appearance', icon: 'moon', run: () => this.theme.set('dark') },
    { id: 't-oled', label: 'Theme: OLED black', group: 'Appearance', icon: 'moon-star', run: () => this.theme.set('oled') },
    { id: 't-system', label: 'Theme: System', group: 'Appearance', icon: 'monitor', run: () => this.theme.set('system') },
    ...['account', 'appearance', 'brand-kit', 'generation', 'export', 'privacy', 'notifications', 'accessibility', 'help', 'about'].map(
      (s): Command => ({
        id: `s-${s}`,
        label: `Settings: ${s.replace('-', ' ').replace(/^\w/, (c) => c.toUpperCase())}`,
        group: 'Settings',
        icon: 'sliders',
        run: () => this.nav(`/settings/${s}`),
      }),
    ),
    { id: 'shortcuts', label: 'Keyboard shortcuts', group: 'Help', icon: 'keyboard', hint: '?', run: () => this.palette.open('shortcuts') },
    ...HELP_ARTICLES.map(
      (a): Command => ({ id: `h-${a.slug}`, label: a.title, group: 'Help', icon: 'book-open', keywords: a.keywords.join(' '), run: () => this.nav(`/help/${a.slug}`) }),
    ),
  ];

  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    const cards: Command[] = this.repo
      .cards()
      .slice(0, 50)
      .map((c) => ({
        id: `c-${c.id}`,
        label: c.copy.title || c.name,
        group: 'Your cards',
        icon: 'layers' as IconName,
        keywords: `${c.name} ${c.copy.keywords.join(' ')}`,
        run: () => {
          this.studio.load(c);
          this.nav('/studio');
        },
      }));
    const all = [...this.base, ...cards];
    if (!q) return all.filter((c) => c.group !== 'Help' || c.id === 'shortcuts').slice(0, 24);
    return all
      .map((c) => ({ c, score: score(`${c.label} ${c.keywords ?? ''} ${c.group}`.toLowerCase(), q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((x) => x.c)
      .sort((a, b) => groupOrder(a.group) - groupOrder(b.group));
  });

  constructor() {
    effect(() => {
      if (this.palette.isOpen()) {
        this.query.set('');
        this.index.set(0);
        setTimeout(() => this.searchEl()?.nativeElement.focus(), 0);
      }
    });
  }

  protected move(delta: number, e: Event): void {
    e.preventDefault();
    const n = this.results().length;
    if (!n) return;
    this.index.update((i) => (i + delta + n) % n);
    document.getElementById(`cmd-${this.results()[this.index()]?.id}`)?.scrollIntoView({ block: 'nearest' });
  }

  protected runActive(e: Event): void {
    e.preventDefault();
    const cmd = this.results()[this.index()];
    if (cmd) this.run(cmd);
  }

  protected run(cmd: Command): void {
    if (cmd.id !== 'shortcuts') this.palette.close();
    cmd.run();
  }

  private nav(path: string, queryParams?: Record<string, unknown>): void {
    void this.router.navigate([path], { queryParams });
  }
}

function score(text: string, q: string): number {
  if (text.includes(q)) return 10 + (text.startsWith(q) ? 5 : 0);
  const words = q.split(/\s+/).filter(Boolean);
  const hits = words.filter((w) => text.includes(w)).length;
  return hits === words.length ? hits * 2 : 0;
}

function groupOrder(group: string): number {
  return ['Actions', 'Go to', 'Your cards', 'Appearance', 'Settings', 'Help'].indexOf(group);
}
