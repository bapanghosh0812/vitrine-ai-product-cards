import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BADGE_PRESETS, CARD_PALETTES, STYLE_LIMITS } from '../../../../shared/constants';
import type { CardStyle } from '../../../../shared/types';
import { StudioStore } from '../../state/studio.store';
import { styleColours } from '../../shared/card/card-style';
import { Icon } from '../../shared/ui/icon';

interface Option<T> {
  label: string;
  value: T | undefined;
}

type VisibilityKey = 'hideCategory' | 'hideDescription' | 'hideKeywords' | 'hidePrice';

/** Visual customisation of the card: palette, typography, layout, badge and what is shown. */
@Component({
  selector: 'app-style-panel',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-6">
      <!-- Palette -->
      <section aria-labelledby="st-palette">
        <div class="st-head">
          <h3 id="st-palette" class="st-title"><app-icon name="palette" [size]="15" /> Palette</h3>
          @if (hasStyle()) {
            <button type="button" class="st-link" (click)="store.resetStyle()" data-testid="style-reset"><app-icon name="refresh" [size]="13" /> Reset style</button>
          }
        </div>
        <div class="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-3" role="radiogroup" aria-label="Card palette">
          <button type="button" role="radio" class="swatch" [attr.aria-checked]="!style().palette" (click)="set({ palette: undefined, base: undefined, accent: undefined })">
            <span class="swatch__dot swatch__dot--auto" aria-hidden="true"></span>
            <span class="swatch__label">Template</span>
          </button>
          @for (p of palettes; track p.id) {
            <button
              type="button"
              role="radio"
              class="swatch"
              [attr.aria-checked]="style().palette === p.id"
              (click)="set({ palette: p.id, base: undefined, accent: undefined })"
              [attr.data-testid]="'palette-' + p.id"
            >
              <span class="swatch__dot" [style.--a]="p.base" [style.--b]="p.accent" aria-hidden="true"></span>
              <span class="swatch__label">{{ p.label }}</span>
            </button>
          }
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-surface-2 px-3.5 py-3">
          <span class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Custom</span>
          <label class="colour">
            <input type="color" [value]="colours().base" (input)="custom('base', $event)" />
            <span>Base</span>
          </label>
          <label class="colour">
            <input type="color" [value]="colours().accent" (input)="custom('accent', $event)" />
            <span>Accent</span>
          </label>
          @if (style().palette === 'custom') {
            <span class="chip !h-6 !px-2 !text-[0.65rem] is-active">In use</span>
          }
        </div>
      </section>

      <!-- Typography -->
      <section aria-labelledby="st-type" class="grid gap-3">
        <h3 id="st-type" class="st-title"><app-icon name="type" [size]="15" /> Typography</h3>
        <div class="st-row">
          <span class="st-label" id="st-font">Title font</span>
          <div class="seg" role="radiogroup" aria-labelledby="st-font">
            @for (o of fontOptions; track o.label) {
              <button type="button" role="radio" [attr.aria-checked]="style().font === o.value" (click)="set({ font: o.value })">{{ o.label }}</button>
            }
          </div>
        </div>
        <div class="st-row">
          <span class="st-label" id="st-size">Title size</span>
          <div class="seg" role="radiogroup" aria-labelledby="st-size">
            @for (o of sizeOptions; track o.label) {
              <button type="button" role="radio" [attr.aria-checked]="style().titleSize === o.value" (click)="set({ titleSize: o.value })">{{ o.label }}</button>
            }
          </div>
        </div>
        <div class="st-row">
          <span class="st-label" id="st-case">Title case</span>
          <div class="seg" role="radiogroup" aria-labelledby="st-case">
            @for (o of caseOptions; track o.label) {
              <button type="button" role="radio" [attr.aria-checked]="style().titleCase === o.value" (click)="set({ titleCase: o.value })">{{ o.label }}</button>
            }
          </div>
        </div>
      </section>

      <!-- Layout -->
      <section aria-labelledby="st-layout" class="grid gap-3">
        <h3 id="st-layout" class="st-title"><app-icon name="layers" [size]="15" /> Layout</h3>
        <div class="st-row">
          <span class="st-label" id="st-radius">Corners</span>
          <div class="seg" role="radiogroup" aria-labelledby="st-radius">
            @for (o of radiusOptions; track o.label) {
              <button type="button" role="radio" [attr.aria-checked]="style().radius === o.value" (click)="set({ radius: o.value })">{{ o.label }}</button>
            }
          </div>
        </div>
        <div class="st-row">
          <span class="st-label" id="st-fit">Photo</span>
          <div class="seg" role="radiogroup" aria-labelledby="st-fit">
            @for (o of fitOptions; track o.label) {
              <button type="button" role="radio" [attr.aria-checked]="style().imageFit === o.value" (click)="set({ imageFit: o.value })">{{ o.label }}</button>
            }
          </div>
        </div>
        <label class="st-row cursor-pointer">
          <span class="st-label">Gilded frame</span>
          <input type="checkbox" class="switch" [checked]="!!style().frame" (change)="set({ frame: $any($event.target).checked || undefined })" data-testid="style-frame" />
        </label>
      </section>

      <!-- Badge -->
      <section aria-labelledby="st-badge" class="grid gap-3">
        <h3 id="st-badge" class="st-title"><app-icon name="badge-check" [size]="15" /> Badge</h3>
        <div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="st-badge">
          <button type="button" role="radio" class="chip" [class.is-active]="!style().badge" [attr.aria-checked]="!style().badge" (click)="set({ badge: undefined })">None</button>
          @for (b of badges; track b) {
            <button type="button" role="radio" class="chip" [class.is-active]="style().badge === b" [attr.aria-checked]="style().badge === b" (click)="set({ badge: b })">{{ b }}</button>
          }
        </div>
        <div>
          <label for="st-badge-text" class="sr-only">Custom badge text</label>
          <input
            id="st-badge-text"
            class="field !min-h-10 !py-2 text-sm"
            placeholder="Or write your own, e.g. Diwali edit"
            [value]="customBadge()"
            (input)="set({ badge: $any($event.target).value || undefined })"
            [attr.maxlength]="limits.badgeMax"
            data-testid="style-badge"
          />
        </div>
      </section>

      <!-- Show on card -->
      <section aria-labelledby="st-show" class="grid gap-2">
        <h3 id="st-show" class="st-title"><app-icon name="eye" [size]="15" /> Show on card</h3>
        @for (v of visibility; track v.key) {
          <label class="st-row cursor-pointer">
            <span class="st-label">{{ v.label }}</span>
            <input type="checkbox" class="switch" [checked]="!style()[v.key]" (change)="toggleVisible(v.key, $any($event.target).checked)" [attr.data-testid]="'show-' + v.id" />
          </label>
        }
      </section>

      <!-- Density -->
      <section aria-labelledby="st-density" class="grid gap-4">
        <h3 id="st-density" class="st-title"><app-icon name="sliders" [size]="15" /> Density</h3>
        <div>
          <div class="flex items-center justify-between">
            <label for="st-keywords" class="st-label">Keywords shown</label>
            <span class="st-value">{{ style().keywords ?? 'Auto' }}</span>
          </div>
          <input
            id="st-keywords"
            type="range"
            class="range"
            [min]="limits.keywordsMin"
            [max]="limits.keywordsMax"
            step="1"
            [value]="style().keywords ?? 5"
            (input)="set({ keywords: +$any($event.target).value, hideKeywords: undefined })"
          />
        </div>
        <div>
          <div class="flex items-center justify-between">
            <label for="st-lines" class="st-label">Description lines</label>
            <span class="st-value">{{ style().lines ?? 'Auto' }}</span>
          </div>
          <input
            id="st-lines"
            type="range"
            class="range"
            [min]="limits.linesMin"
            [max]="limits.linesMax"
            step="1"
            [value]="style().lines ?? 4"
            (input)="set({ lines: +$any($event.target).value })"
          />
        </div>
      </section>

      <p class="flex items-center gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-xs text-muted">
        <app-icon name="history" [size]="14" /> Every change can be undone, and styles are saved with the card.
      </p>
    </div>
  `,
  styles: `
    .st-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }
    .st-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.72rem;
      font-weight: 650;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--gilt);
    }
    .st-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--muted);
    }
    .st-link:hover {
      color: var(--ink);
    }
    .st-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      min-height: 2.5rem;
    }
    .st-label {
      font-size: 0.85rem;
      font-weight: 550;
      color: var(--ink-soft);
    }
    .st-value {
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
      color: var(--muted);
    }
    .swatch {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem 0.3rem 0.5rem;
      border-radius: 1rem;
      border: 1px solid var(--line);
      background: var(--surface);
      transition:
        border-color 0.2s,
        box-shadow 0.2s,
        transform 0.2s;
    }
    .swatch:hover {
      transform: translateY(-1px);
      border-color: var(--line-strong);
    }
    .swatch[aria-checked='true'] {
      border-color: var(--gilt);
      box-shadow:
        0 0 0 1px var(--gilt),
        0 8px 22px -12px color-mix(in oklab, var(--gilt) 70%, transparent);
    }
    .swatch__dot {
      width: 2.1rem;
      height: 2.1rem;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--a) 0 55%, var(--b) 55% 100%);
      box-shadow:
        inset 0 0 0 1px rgb(255 255 255 / 0.25),
        0 4px 10px -4px rgb(0 0 0 / 0.35);
    }
    .swatch__dot--auto {
      background: conic-gradient(from 200deg, #0e4d3a, #d6b672, #fbf7f0, #0e4d3a);
    }
    .swatch__label {
      font-size: 0.66rem;
      line-height: 1.15;
      text-align: center;
      color: var(--muted);
    }
    .swatch[aria-checked='true'] .swatch__label {
      color: var(--ink);
      font-weight: 600;
    }
    .colour {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.8rem;
      color: var(--ink-soft);
      cursor: pointer;
    }
    .colour input {
      width: 1.9rem;
      height: 1.9rem;
      padding: 0;
      border: 1px solid var(--line-strong);
      border-radius: 50%;
      background: none;
      cursor: pointer;
      overflow: hidden;
    }
    .colour input::-webkit-color-swatch-wrapper {
      padding: 0;
    }
    .colour input::-webkit-color-swatch {
      border: none;
      border-radius: 50%;
    }
    .colour input::-moz-color-swatch {
      border: none;
      border-radius: 50%;
    }
    .seg {
      display: inline-flex;
      padding: 0.2rem;
      border-radius: 0.85rem;
      background: var(--surface-2);
      border: 1px solid var(--line);
    }
    .seg button {
      height: 2rem;
      padding: 0 0.7rem;
      border-radius: 0.65rem;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--muted);
      white-space: nowrap;
      transition:
        background 0.2s,
        color 0.2s,
        box-shadow 0.2s;
    }
    .seg button:hover {
      color: var(--ink);
    }
    .seg button[aria-checked='true'] {
      background: var(--surface);
      color: var(--ink);
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.08), 0 0 0 1px color-mix(in oklab, var(--gilt) 45%, transparent);
    }
    .switch {
      appearance: none;
      position: relative;
      flex: none;
      width: 2.6rem;
      height: 1.5rem;
      border-radius: 99px;
      background: var(--line-strong);
      cursor: pointer;
      transition: background 0.25s;
    }
    .switch::after {
      content: '';
      position: absolute;
      top: 0.1875rem;
      left: 0.1875rem;
      width: 1.125rem;
      height: 1.125rem;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
      transition: transform 0.25s cubic-bezier(0.3, 1.4, 0.5, 1);
    }
    .switch:checked {
      background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 70%, var(--gilt)));
    }
    .switch:checked::after {
      transform: translateX(1.1rem);
    }
    .range {
      width: 100%;
      margin-top: 0.5rem;
      accent-color: var(--gilt);
    }
  `,
})
export class StylePanel {
  protected readonly store = inject(StudioStore);
  protected readonly palettes = CARD_PALETTES;
  protected readonly badges = BADGE_PRESETS;
  protected readonly limits = STYLE_LIMITS;

  protected readonly fontOptions: Option<CardStyle['font']>[] = [
    { label: 'Template', value: undefined },
    { label: 'Serif', value: 'serif' },
    { label: 'Sans', value: 'sans' },
  ];
  protected readonly sizeOptions: Option<CardStyle['titleSize']>[] = [
    { label: 'S', value: 'sm' },
    { label: 'M', value: undefined },
    { label: 'L', value: 'lg' },
  ];
  protected readonly caseOptions: Option<CardStyle['titleCase']>[] = [
    { label: 'As written', value: undefined },
    { label: 'Title Case', value: 'title' },
    { label: 'UPPER', value: 'upper' },
  ];
  protected readonly radiusOptions: Option<CardStyle['radius']>[] = [
    { label: 'Sharp', value: 'sharp' },
    { label: 'Soft', value: undefined },
    { label: 'Round', value: 'round' },
  ];
  protected readonly fitOptions: Option<CardStyle['imageFit']>[] = [
    { label: 'Fill', value: undefined },
    { label: 'Fit', value: 'contain' },
  ];
  protected readonly visibility: { key: VisibilityKey; id: string; label: string }[] = [
    { key: 'hideCategory', id: 'category', label: 'Category' },
    { key: 'hideDescription', id: 'description', label: 'Description' },
    { key: 'hideKeywords', id: 'keywords', label: 'Keywords' },
    { key: 'hidePrice', id: 'price', label: 'Price' },
  ];

  protected readonly style = this.store.style;
  protected readonly hasStyle = computed(() => Object.keys(this.style()).length > 0);
  protected readonly colours = computed(() => styleColours(this.style()) ?? { base: '#0e4d3a', accent: '#d6b672' });
  protected readonly customBadge = computed(() => {
    const b = this.style().badge ?? '';
    return (BADGE_PRESETS as readonly string[]).includes(b) ? '' : b;
  });

  protected set(patch: Partial<CardStyle>): void {
    this.store.setStyle(patch);
  }

  protected custom(kind: 'base' | 'accent', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const current = this.colours();
    this.set({ palette: 'custom', base: current.base, accent: current.accent, [kind]: value });
  }

  protected toggleVisible(key: VisibilityKey, visible: boolean): void {
    this.set({ [key]: visible ? undefined : true, ...(key === 'hideKeywords' && visible && this.style().keywords === 0 ? { keywords: undefined } : {}) });
  }
}
