import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEGAL_DOCS } from '../../../../shared/content/legal.generated';
import { Icon } from '../../shared/ui/icon';

@Component({
  selector: 'app-legal-index-page',
  imports: [RouterLink, Icon, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-4xl px-6 py-14">
      <p class="eyebrow">Legal</p>
      <h1 class="mt-2 font-display text-5xl text-ink">Terms &amp; policies</h1>
      <p class="mt-3 max-w-2xl text-muted">
        Plain-language summaries first, full documents below. These documents apply to the Vitrine web app and its API. Questions? See
        <a routerLink="/help/contact-support" class="link">Contact support</a>.
      </p>
      <div class="mt-10 grid gap-4">
        @for (d of docs; track d.slug) {
          <a [routerLink]="['/legal', d.slug]" class="surface group flex items-center gap-5 p-6 transition-transform duration-500 ease-[var(--ease-spring)] hover:-translate-y-0.5">
            <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-gilt"><app-icon name="scale" [size]="22" /></span>
            <span class="min-w-0 flex-1">
              <span class="block text-lg font-semibold text-ink">{{ d.title }}</span>
              <span class="mt-1 block text-sm text-muted">{{ d.summary }}</span>
              <span class="mt-2 block text-xs text-muted">Version {{ d.version }} · {{ d.words | number }} words · about {{ minutes(d.words) }} min read</span>
            </span>
            <app-icon name="chevron-right" class="text-muted transition-transform group-hover:translate-x-1" />
          </a>
        }
      </div>
    </div>
  `,
})
export default class LegalIndexPage {
  protected readonly docs = LEGAL_DOCS;
  protected minutes(words: number): number {
    return Math.max(1, Math.round(words / 230));
  }
}
