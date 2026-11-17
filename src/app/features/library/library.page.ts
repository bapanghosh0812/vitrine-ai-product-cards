import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CATEGORIES } from '../../../../shared/constants';
import type { StoredCard } from '../../../../shared/types';
import { AuthService } from '../../core/auth.service';
import { CardRepository, RepositoryError } from '../../core/card-repository.service';
import { ToastService } from '../../core/toast.service';
import { StudioStore } from '../../state/studio.store';
import { ProductCard } from '../../shared/card/product-card';
import { Emoji } from '../../shared/ui/emoji';
import { Icon } from '../../shared/ui/icon';

@Component({
  selector: 'app-library-page',
  imports: [ProductCard, Icon, Emoji, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Library</p>
        <h1 class="font-display text-5xl leading-tight text-ink">Your cards</h1>
        <p class="mt-1 text-sm text-muted">
          {{ repo.cards().length }} saved · {{ repo.favourites().length }} favourite{{ repo.favourites().length === 1 ? '' : 's' }} ·
          {{ repo.mode() === 'cloud' ? 'synced to your account' : 'stored in this browser' }}
        </p>
      </div>
      <a routerLink="/studio" [queryParams]="{ new: 1 }" class="btn btn-gold"><app-icon name="plus" [size]="16" /> New card</a>
    </div>

    <div class="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
      <div class="relative flex-1">
        <app-icon name="search" [size]="17" class="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <label for="lib-search" class="sr-only">Search your cards</label>
        <input id="lib-search" type="search" class="field !rounded-full !pl-11" placeholder="Search by name, title, description or keyword" [value]="q()" (input)="q.set($any($event.target).value)" />
      </div>
      <div class="flex gap-2">
        <label for="lib-cat" class="sr-only">Filter by category</label>
        <select id="lib-cat" class="field !w-auto !rounded-full" [value]="category()" (change)="category.set($any($event.target).value)">
          <option value="">All categories</option>
          @for (c of categories; track c.id) {
            <option [value]="c.id">{{ c.label }}</option>
          }
        </select>
        <button type="button" class="btn btn-outline" [attr.aria-pressed]="onlyFav()" [class.!border-[var(--gilt)]]="onlyFav()" (click)="onlyFav.set(!onlyFav())">
          <app-icon name="star" [size]="16" [class.fill-current]="onlyFav()" [class.text-gilt]="onlyFav()" /> Favourites
        </button>
      </div>
    </div>

    @if (repo.loading()) {
      <div class="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        @for (i of [1, 2, 3, 4]; track i) {
          <div class="surface p-4"><div class="skeleton aspect-[4/5] w-full !rounded-2xl"></div><div class="skeleton mt-3 h-4 w-2/3"></div></div>
        }
      </div>
    } @else if (filtered().length) {
      <ul class="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        @for (card of filtered(); track card.id) {
          <li class="surface group flex flex-col p-3 transition-transform duration-500 ease-[var(--ease-spring)] hover:-translate-y-1">
            <button type="button" class="block rounded-2xl text-left" (click)="open(card)" [attr.aria-label]="'Open ' + card.copy.title + ' in Studio'">
              <app-product-card [copy]="card.copy" [template]="card.template" [category]="card.category" [image]="card.image ?? null" [price]="card.inputs.price" [currency]="card.inputs.currency" [watermark]="false" />
            </button>
            <div class="mt-3 flex items-start gap-2 px-1">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-ink">{{ card.name }}</p>
                <p class="text-xs text-muted">{{ card.updatedAt | date: 'd MMM y, h:mm a' }}</p>
              </div>
              <button type="button" class="icon-btn size-8" (click)="fav(card)" [attr.aria-pressed]="card.favourite" [attr.aria-label]="card.favourite ? 'Remove from favourites' : 'Add to favourites'">
                <app-icon name="star" [size]="16" [class.fill-current]="card.favourite" [class.text-gilt]="card.favourite" />
              </button>
              <button type="button" class="icon-btn size-8 hover:!text-danger" (click)="remove(card)" [attr.aria-label]="'Delete ' + card.name"><app-icon name="trash" [size]="16" /></button>
            </div>
          </li>
        }
      </ul>
    } @else {
      <div class="surface mt-8 grid place-items-center px-6 py-16 text-center">
        <app-emoji [name]="repo.cards().length ? 'thinking-face' : 'shopping-bags'" [size]="88" />
        <h2 class="mt-5 font-display text-3xl text-ink">{{ repo.cards().length ? 'No cards match' : 'Your library is empty' }}</h2>
        <p class="mt-2 max-w-sm text-sm text-muted">
          {{ repo.cards().length ? 'Try a different search or clear the filters.' : 'Generate a card in the Studio and press Save. It will appear here.' }}
        </p>
        @if (repo.cards().length) {
          <button type="button" class="btn btn-outline mt-6" (click)="clear()">Clear filters</button>
        } @else {
          <a routerLink="/studio" class="btn btn-primary mt-6">Open Studio</a>
        }
      </div>
    }
  `,
})
export default class LibraryPage {
  protected readonly repo = inject(CardRepository);
  protected readonly auth = inject(AuthService);
  private readonly studio = inject(StudioStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly categories = CATEGORIES;
  protected readonly q = signal('');
  protected readonly category = signal('');
  protected readonly onlyFav = signal(false);

  protected readonly filtered = computed(() => {
    const q = this.q().trim().toLowerCase();
    const cat = this.category();
    return this.repo.cards().filter((c) => {
      if (this.onlyFav() && !c.favourite) return false;
      if (cat && c.category !== cat) return false;
      if (!q) return true;
      return `${c.name} ${c.copy.title} ${c.copy.description} ${c.copy.keywords.join(' ')}`.toLowerCase().includes(q);
    });
  });

  protected open(card: StoredCard): void {
    this.studio.load(card);
    void this.router.navigateByUrl('/studio');
  }

  protected async fav(card: StoredCard): Promise<void> {
    try {
      await this.repo.toggleFavourite(card.id);
    } catch {
      this.toast.error('Could not update favourite');
    }
  }

  protected async remove(card: StoredCard): Promise<void> {
    if (!confirm(`Delete "${card.name}"? This cannot be undone.`)) return;
    try {
      await this.repo.remove(card.id);
      this.toast.success('Card deleted');
    } catch (e) {
      this.toast.error('Could not delete', e instanceof RepositoryError ? e.message : 'Please try again.');
    }
  }

  protected clear(): void {
    this.q.set('');
    this.category.set('');
    this.onlyFav.set(false);
  }
}
