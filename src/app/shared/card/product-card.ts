import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CATEGORIES, type TemplateId } from '../../../../shared/constants';
import type { CardStyle, ProductCopy } from '../../../../shared/types';
import { styleClasses, styleColours, TITLE_SCALE } from './card-style';

export interface CardPalette {
  base: string;
  accent: string;
}

/**
 * The product card, in six templates. Pure presentation: every string is rendered with
 * Angular interpolation (auto-escaped), so AI output can never inject markup.
 * Sizes use container query units, so the card looks identical at any width and exports 1:1.
 */
@Component({
  selector: 'app-product-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './product-card.css',
  host: {
    '[class]': '"pc pc--" + template() + extraClasses()',
    '[style.--brand]': 'palette().base',
    '[style.--brand-accent]': 'palette().accent',
    '[style.--pc-title]': 'titleScale()',
    '[style.--pc-lines]': 'cardStyle()?.lines ?? null',
    role: 'article',
    '[attr.aria-label]': 'copy().title + " product card"',
  },
  template: `
    <div class="pc__frame">
      @switch (template()) {
        @case ('minimal') {
          <div class="m">
            <div class="m__top">
              <span class="m__cat">{{ categoryLabel() }}</span>
              <span class="m__dot"></span>
            </div>
            <div class="m__media">
              <ng-container *ngTemplateOutlet="media" />
              <div class="m__shadow"></div>
            </div>
            <h3 class="m__title">{{ copy().title }}</h3>
            <p class="m__desc">{{ copy().description }}</p>
            <ul class="m__tags">
              @for (k of kw(6); track k) {
                <li>{{ k }}</li>
              }
            </ul>
            <div class="m__foot">
              <span class="m__price">{{ priceLabel() }}</span>
              <ng-container *ngTemplateOutlet="mark" />
            </div>
          </div>
        }
        @case ('luxe') {
          <div class="l">
            <div class="l__frame"></div>
            <div class="l__arch">
              <div class="l__arch-glow"></div>
              <ng-container *ngTemplateOutlet="media" />
              <div class="l__plinth"></div>
            </div>
            <span class="l__cat">{{ categoryLabel() }}</span>
            <h3 class="l__title">{{ copy().title }}</h3>
            <p class="l__desc">{{ copy().description }}</p>
            <ul class="l__tags">
              @for (k of kw(5); track k) {
                <li>{{ k }}</li>
              }
            </ul>
            <div class="l__foot">
              <span class="l__price">{{ priceLabel() }}</span>
              <ng-container *ngTemplateOutlet="mark" />
            </div>
          </div>
        }
        @case ('glass') {
          <div class="g">
            <div class="g__blob g__blob--1"></div>
            <div class="g__blob g__blob--2"></div>
            <div class="g__blob g__blob--3"></div>
            <div class="g__media"><ng-container *ngTemplateOutlet="media" /></div>
            <div class="g__panel">
              <span class="g__cat">{{ categoryLabel() }}</span>
              <h3 class="g__title">{{ copy().title }}</h3>
              <p class="g__desc">{{ copy().description }}</p>
              <ul class="g__tags">
                @for (k of kw(5); track k) {
                  <li>{{ k }}</li>
                }
              </ul>
              <div class="g__foot">
                <span class="g__price">{{ priceLabel() }}</span>
                <ng-container *ngTemplateOutlet="mark" />
              </div>
            </div>
          </div>
        }
        @case ('bold') {
          <div class="b">
            <div class="b__bar"></div>
            <span class="b__cat">{{ categoryLabel() }}</span>
            <h3 class="b__title">{{ copy().title }}</h3>
            <div class="b__media"><ng-container *ngTemplateOutlet="media" /></div>
            <p class="b__desc">{{ copy().description }}</p>
            <ul class="b__tags">
              @for (k of kw(4); track k) {
                <li>{{ k }}</li>
              }
            </ul>
            <div class="b__foot">
              @if (priceLabel()) {
                <span class="b__price">{{ priceLabel() }}</span>
              }
              <ng-container *ngTemplateOutlet="mark" />
            </div>
          </div>
        }
        @case ('instagram') {
          <div class="i">
            <div class="i__head">
              <span class="i__avatar">{{ brandInitial() }}</span>
              <span class="i__brand">{{ brandName() || 'your.brand' }}</span>
              <span class="i__dots" aria-hidden="true">•••</span>
            </div>
            <div class="i__stage">
              <div class="i__ring"></div>
              <ng-container *ngTemplateOutlet="media" />
              @if (priceLabel()) {
                <span class="i__sticker">{{ priceLabel() }}</span>
              }
            </div>
            <div class="i__caption">
              <h3 class="i__title">{{ copy().title }}</h3>
              <p class="i__desc">{{ copy().description }}</p>
              <p class="i__tags">
                @for (k of kw(6); track k) {
                  <span>#{{ hashtag(k) }}</span>
                }
              </p>
            </div>
            <ng-container *ngTemplateOutlet="mark" />
          </div>
        }
        @case ('marketplace') {
          <div class="mk">
            <div class="mk__media"><ng-container *ngTemplateOutlet="media" /></div>
            <div class="mk__body">
              <p class="mk__crumb">Home <span>›</span> {{ categoryLabel() }}</p>
              <h3 class="mk__title">{{ copy().title }}</h3>
              @if (priceLabel()) {
                <p class="mk__price">{{ priceLabel() }}<small>incl. of all taxes</small></p>
              }
              <p class="mk__desc">{{ copy().description }}</p>
              <ul class="mk__tags">
                @for (k of kw(6); track k) {
                  <li>{{ k }}</li>
                }
              </ul>
              <div class="mk__actions">
                <span class="mk__btn mk__btn--primary">Add to bag</span>
                <span class="mk__btn">Save</span>
              </div>
              <ng-container *ngTemplateOutlet="mark" />
            </div>
          </div>
        }
      }
      @if (badge()) {
        <span class="pc__badge">{{ badge() }}</span>
      }
    </div>

    <ng-template #media>
      @if (image()) {
        <img class="pc__img" [src]="image()" [alt]="copy().title" decoding="async" />
      } @else {
        <img class="pc__emoji" [src]="'emoji/' + emoji() + '.webp'" alt="" aria-hidden="true" decoding="async" />
      }
    </ng-template>
    <ng-template #mark>
      @if (watermark()) {
        <span class="pc__mark" aria-hidden="true">Made with Vitrine</span>
      }
    </ng-template>
  `,
  imports: [NgTemplateOutlet],
})
export class ProductCard {
  readonly copy = input.required<ProductCopy>();
  readonly template = input<TemplateId>('luxe');
  readonly category = input<string>('other');
  readonly image = input<string | null>(null);
  readonly price = input<string | undefined>(undefined);
  readonly currency = input<string | undefined>('INR');
  readonly brandName = input<string | undefined>(undefined);
  readonly brandColours = input<string[] | undefined>(undefined);
  readonly watermark = input(true);
  /** Options from the Style panel (colours, type, layout, badge, visibility). */
  readonly cardStyle = input<CardStyle | null>(null);

  protected readonly extraClasses = computed(() => styleClasses(this.cardStyle()));
  protected readonly titleScale = computed(() => {
    const size = this.cardStyle()?.titleSize;
    return size ? String(TITLE_SCALE[size]) : null;
  });
  protected readonly badge = computed(() => this.cardStyle()?.badge ?? '');

  protected readonly categoryDef = computed(() => CATEGORIES.find((c) => c.id === this.category()) ?? CATEGORIES[CATEGORIES.length - 1]!);
  protected readonly categoryLabel = computed(() => this.categoryDef().label);
  protected readonly emoji = computed(() => this.categoryDef().emoji);
  protected readonly brandInitial = computed(() => (this.brandName()?.trim()[0] ?? 'V').toUpperCase());
  protected readonly palette = computed<CardPalette>(() => {
    const chosen = styleColours(this.cardStyle());
    if (chosen) return chosen;
    const [base, accent] = this.brandColours() ?? [];
    return { base: base ?? '', accent: accent ?? '' };
  });

  /** Keywords to show: the template's default count unless the Style panel set one. */
  protected kw(defaultCount: number): string[] {
    return this.copy().keywords.slice(0, this.cardStyle()?.keywords ?? defaultCount);
  }
  protected readonly priceLabel = computed(() => {
    const raw = this.price();
    if (!raw) return '';
    const value = Number(raw);
    if (!Number.isFinite(value)) return '';
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: this.currency() || 'INR', maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
    } catch {
      return `${this.currency() ?? ''} ${raw}`;
    }
  });

  protected hashtag(k: string): string {
    return k.replace(/[^\p{L}\p{N}]+/gu, '');
  }
}
