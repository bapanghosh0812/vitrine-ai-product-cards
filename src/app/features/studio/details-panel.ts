import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LIMITS, type CopyField } from '../../../../shared/constants';
import { StudioStore } from '../../state/studio.store';
import { Icon } from '../../shared/ui/icon';
import { RefinePanel } from './refine-panel';
import { StylePanel } from './style-panel';

type Tab = 'copy' | 'style' | 'ask';

type Level = 'ok' | 'warn' | 'over';

function level(length: number, warn: number, max: number): Level {
  return length > max ? 'over' : length > warn ? 'warn' : 'ok';
}

@Component({
  selector: 'app-details-panel',
  imports: [Icon, StylePanel, RefinePanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="surface p-5 md:p-6" aria-labelledby="details-title">
      <p class="eyebrow">Step 3</p>
      <h2 id="details-title" class="font-display text-[1.7rem] leading-tight text-ink">Refine &amp; style</h2>

      <div class="tabs mt-4" role="tablist" aria-label="Refine and style">
        @for (t of tabs; track t.id) {
          <button
            type="button"
            role="tab"
            class="tabs__tab"
            [id]="'tab-' + t.id"
            [attr.aria-selected]="tab() === t.id"
            [attr.aria-controls]="'panel-' + t.id"
            [attr.data-testid]="'tab-' + t.id"
            (click)="tab.set(t.id)"
          >
            <app-icon [name]="t.icon" [size]="15" /> {{ t.label }}
          </button>
        }
      </div>

      @if (tab() === 'style') {
        <div id="panel-style" role="tabpanel" aria-labelledby="tab-style" class="mt-5 animate-fade">
          <app-style-panel />
        </div>
      } @else if (tab() === 'ask') {
        <div id="panel-ask" role="tabpanel" aria-labelledby="tab-ask" class="mt-5 animate-fade">
          <app-refine-panel />
        </div>
      } @else {
      <div id="panel-copy" role="tabpanel" aria-labelledby="tab-copy" class="animate-fade">
      @if (store.variations().length > 1) {
        <div class="mt-4 flex rounded-2xl bg-surface-2 p-1" role="tablist" aria-label="Variations">
          @for (v of store.variations(); track $index) {
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="store.active() === $index"
              class="h-9 flex-1 rounded-xl text-sm font-semibold transition-all duration-300"
              [class.bg-surface]="store.active() === $index"
              [class.shadow-lux]="store.active() === $index"
              [class.text-ink]="store.active() === $index"
              [class.text-muted]="store.active() !== $index"
              (click)="store.selectVariation($index)"
            >
              Variation {{ $index + 1 }}
            </button>
          }
        </div>
      }

      @if (store.copy(); as copy) {
        <div class="mt-5 grid gap-5">
          <!-- Title -->
          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <label for="edit-title" class="field-label !mb-0">Title</label>
              <div class="flex items-center gap-2">
                <span class="counter" [attr.data-level]="titleLevel()" aria-live="polite">{{ copy.title.length }}/{{ limits.titleSeo }}</span>
                <button type="button" class="icon-btn size-8" (click)="store.regenerate('title')" [disabled]="store.busy()" aria-label="Regenerate title" title="Regenerate title">
                  <app-icon name="refresh" [size]="15" [class.animate-spin]="spinning('title')" />
                </button>
              </div>
            </div>
            <textarea id="edit-title" rows="2" class="field font-display !text-[1.2rem] !leading-snug" [value]="copy.title" (input)="store.editField('title', $any($event.target).value)" [attr.maxlength]="limits.titleMax" data-testid="edit-title"></textarea>
            <p class="field-hint">{{ titleHint() }}</p>
          </div>

          <!-- Description -->
          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <label for="edit-description" class="field-label !mb-0">Description</label>
              <div class="flex items-center gap-2">
                <span class="counter" [attr.data-level]="descLevel()" aria-live="polite">{{ copy.description.length }}/{{ limits.descriptionSeo }}</span>
                <button type="button" class="icon-btn size-8" (click)="store.regenerate('description')" [disabled]="store.busy()" aria-label="Regenerate description" title="Regenerate description">
                  <app-icon name="refresh" [size]="15" [class.animate-spin]="spinning('description')" />
                </button>
              </div>
            </div>
            <textarea id="edit-description" rows="5" class="field" [value]="copy.description" (input)="store.editField('description', $any($event.target).value)" [attr.maxlength]="limits.descriptionMax" data-testid="edit-description"></textarea>
            <p class="field-hint">{{ descHint() }}</p>
          </div>

          <!-- Keywords -->
          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <span class="field-label !mb-0" id="kw-label">Keywords</span>
              <div class="flex items-center gap-2">
                <span class="counter" [attr.data-level]="copy.keywords.length < limits.keywordsMin ? 'warn' : 'ok'">{{ copy.keywords.length }}/{{ limits.keywordsMax }}</span>
                <button type="button" class="icon-btn size-8" (click)="store.regenerate('keywords')" [disabled]="store.busy()" aria-label="Regenerate keywords" title="Regenerate keywords">
                  <app-icon name="refresh" [size]="15" [class.animate-spin]="spinning('keywords')" />
                </button>
              </div>
            </div>
            <ul class="flex flex-wrap gap-2" aria-labelledby="kw-label" data-testid="keywords">
              @for (k of copy.keywords; track k) {
                <li class="chip !pr-1">
                  {{ k }}
                  <button type="button" class="grid size-5 place-items-center rounded-full hover:bg-[color-mix(in_oklab,var(--danger)_14%,transparent)]" (click)="removeKeyword(k)" [attr.aria-label]="'Remove keyword ' + k">
                    <app-icon name="x" [size]="12" />
                  </button>
                </li>
              }
            </ul>
            @if (copy.keywords.length < limits.keywordsMax) {
              <form class="mt-2 flex gap-2" (submit)="addKeyword($event)">
                <label for="new-keyword" class="sr-only">Add keyword</label>
                <input id="new-keyword" class="field !min-h-10 !py-2 text-sm" placeholder="Add keyword and press Enter" [value]="draft()" (input)="draft.set($any($event.target).value)" [attr.maxlength]="limits.keywordMax" />
                <button type="submit" class="btn btn-outline btn-sm !h-10" [disabled]="draft().trim().length < 2"><app-icon name="plus" [size]="15" /> Add</button>
              </form>
            }
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-xs text-muted">
            <span class="flex items-center gap-2"><app-icon name="history" [size]="14" /> {{ store.historySize() }} steps in history</span>
            <span class="flex items-center gap-2"><app-icon name="shield" [size]="14" /> Plain text only, safely escaped</span>
          </div>
        </div>
      } @else {
        <div class="mt-5 grid gap-3" aria-hidden="true">
          <div class="h-20 rounded-2xl border border-dashed border-[var(--line-strong)]"></div>
          <div class="h-32 rounded-2xl border border-dashed border-[var(--line-strong)]"></div>
          <div class="h-12 rounded-2xl border border-dashed border-[var(--line-strong)]"></div>
        </div>
        <p class="mt-4 text-sm text-muted">After generating, edit the title, description and keywords here. SEO counters show when text gets too long for search results.</p>
      }
      </div>
      }
    </section>
  `,
  styles: `
    .tabs {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.25rem;
      padding: 0.25rem;
      border-radius: 1.1rem;
      background: var(--surface-2);
      border: 1px solid var(--line);
    }
    .tabs__tab {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      height: 2.4rem;
      border-radius: 0.85rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--muted);
      transition:
        background 0.25s,
        color 0.25s,
        box-shadow 0.25s;
    }
    .tabs__tab:hover {
      color: var(--ink);
    }
    .tabs__tab[aria-selected='true'] {
      background: var(--surface);
      color: var(--ink);
      box-shadow:
        0 1px 2px rgb(0 0 0 / 0.06),
        0 0 0 1px color-mix(in oklab, var(--gilt) 45%, transparent),
        0 10px 24px -16px color-mix(in oklab, var(--gilt) 90%, transparent);
    }
    .tabs__tab[aria-selected='true'] app-icon {
      color: var(--gilt);
    }
    .counter {
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
      padding: 0.1rem 0.5rem;
      border-radius: 999px;
      background: var(--surface-2);
      color: var(--muted);
      transition: background 0.2s, color 0.2s;
    }
    .counter[data-level='warn'] {
      background: color-mix(in oklab, var(--gilt) 18%, transparent);
      color: var(--gilt);
    }
    .counter[data-level='over'] {
      background: color-mix(in oklab, var(--danger) 14%, transparent);
      color: var(--danger);
    }
  `,
})
export class DetailsPanel {
  protected readonly store = inject(StudioStore);
  protected readonly limits = LIMITS;
  protected readonly draft = signal('');
  protected readonly tab = signal<Tab>('copy');
  protected readonly tabs: { id: Tab; label: string; icon: 'pencil' | 'palette' | 'sparkles' }[] = [
    { id: 'copy', label: 'Copy', icon: 'pencil' },
    { id: 'style', label: 'Style', icon: 'palette' },
    { id: 'ask', label: 'Ask AI', icon: 'sparkles' },
  ];

  protected readonly titleLevel = computed(() => level(this.store.copy()?.title.length ?? 0, 50, LIMITS.titleSeo));
  protected readonly descLevel = computed(() => level(this.store.copy()?.description.length ?? 0, 150, LIMITS.descriptionSeo));
  protected readonly titleHint = computed(() =>
    this.titleLevel() === 'over' ? 'Search results usually cut titles after about 60 characters.' : 'Great length for search and marketplaces.',
  );
  protected readonly descHint = computed(() =>
    this.descLevel() === 'over' ? 'Longer than a typical search snippet (about 160 characters). Fine for product pages.' : 'Fits a search snippet.',
  );

  protected spinning(field: CopyField): boolean {
    return this.store.regeneratingField() === field;
  }

  protected removeKeyword(k: string): void {
    const copy = this.store.copy();
    if (copy) this.store.setKeywords(copy.keywords.filter((x) => x !== k));
  }

  protected addKeyword(e: Event): void {
    e.preventDefault();
    const copy = this.store.copy();
    const parts = this.draft()
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x.length >= 2);
    if (!copy || !parts.length) return;
    this.store.setKeywords([...copy.keywords, ...parts]);
    this.draft.set('');
  }
}
