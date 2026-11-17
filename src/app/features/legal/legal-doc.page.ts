import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEGAL_DOCS } from '../../../../shared/content/legal.generated';
import { fillContentTokens } from '../../core/content-tokens';
import { SeoService } from '../../core/seo.service';
import { Icon } from '../../shared/ui/icon';
import { RouterContent } from '../../shared/ui/router-content';

@Component({
  selector: 'app-legal-doc-page',
  imports: [RouterLink, Icon, RouterContent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (entry(); as d) {
      <div class="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside class="hidden lg:block">
          <nav class="scrollbar-thin sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto pr-2" aria-label="On this page">
            <a routerLink="/legal" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><app-icon name="arrow-left" [size]="15" /> All policies</a>
            <p class="eyebrow mb-2">On this page</p>
            <ol class="grid gap-0.5 text-[0.82rem]">
              @for (h of d.toc; track h.id) {
                <li><a [href]="'#' + h.id" (click)="jump($event, h.id)" class="block rounded-md px-2 py-1 text-ink-soft hover:bg-surface-2">{{ h.title }}</a></li>
              }
            </ol>
          </nav>
        </aside>
        <article class="min-w-0">
          <p class="eyebrow">Legal</p>
          <h1 class="mt-2 font-display text-5xl leading-[1.05] text-ink">{{ d.title }}</h1>
          <p class="mt-3 text-muted">{{ d.summary }}</p>
          <p class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>Version {{ d.version }}</span><span>Last updated {{ d.updated }}</span><span>{{ d.words | number }} words</span>
          </p>
          <div class="divider my-8"></div>
          <app-router-content class="prose-vitrine block max-w-3xl" [html]="html()" />
          <div class="divider my-10"></div>
          <nav class="flex flex-wrap gap-2 text-sm" aria-label="Other policies">
            @for (o of others(); track o.slug) {
              <a [routerLink]="['/legal', o.slug]" class="chip hover:border-[var(--gilt)]">{{ o.title }}</a>
            }
          </nav>
        </article>
      </div>
    } @else {
      <div class="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 class="font-display text-4xl text-ink">Document not found</h1>
        <a routerLink="/legal" class="btn btn-primary mt-6">See all policies</a>
      </div>
    }
  `,
})
export default class LegalDocPage {
  readonly doc = input<string>('');
  private readonly seo = inject(SeoService);
  protected readonly entry = computed(() => LEGAL_DOCS.find((d) => d.slug === this.doc()) ?? null);
  protected readonly html = computed(() => fillContentTokens(this.entry()?.html ?? ''));
  protected readonly others = computed(() => LEGAL_DOCS.filter((d) => d.slug !== this.doc()));

  constructor() {
    effect(() => {
      const d = this.entry();
      if (d) this.seo.set({ title: d.title, description: d.summary, type: 'article' });
      else this.seo.set({ title: 'Document not found', description: 'This legal document does not exist.', noindex: true });
    });
  }

  protected jump(e: Event, id: string): void {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  }
}
