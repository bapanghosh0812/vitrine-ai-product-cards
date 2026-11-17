import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HELP_ARTICLES } from '../../../../shared/content/help.generated';
import { SeoService } from '../../core/seo.service';
import { Icon } from '../../shared/ui/icon';
import { RouterContent } from '../../shared/ui/router-content';

@Component({
  selector: 'app-help-article-page',
  imports: [RouterLink, Icon, RouterContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside class="hidden lg:block">
        <nav class="sticky top-24" aria-label="Help articles">
          <a routerLink="/help" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><app-icon name="arrow-left" [size]="15" /> All articles</a>
          <ul class="grid gap-0.5 text-sm">
            @for (a of all; track a.slug) {
              <li>
                <a
                  [routerLink]="['/help', a.slug]"
                  class="block rounded-lg px-3 py-1.5 text-ink-soft hover:bg-surface-2"
                  [class.!bg-surface-2]="a.slug === slug()"
                  [class.font-semibold]="a.slug === slug()"
                  [attr.aria-current]="a.slug === slug() ? 'page' : null"
                  >{{ a.title }}</a
                >
              </li>
            }
          </ul>
        </nav>
      </aside>

      @if (article(); as a) {
        <article class="min-w-0">
          <a routerLink="/help" class="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink lg:hidden"><app-icon name="arrow-left" [size]="15" /> Help Center</a>
          <p class="eyebrow">{{ a.category }}</p>
          <h1 class="mt-2 font-display text-5xl leading-[1.05] text-ink">{{ a.title }}</h1>
          <p class="mt-3 text-lg text-muted">{{ a.summary }}</p>
          <div class="divider my-8"></div>
          <app-router-content class="prose-vitrine block max-w-2xl" [html]="a.html" />
          <div class="surface mt-12 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
            <img src="brand/kabir-head.webp" alt="" width="48" height="48" class="size-12 rounded-full bg-[radial-gradient(circle_at_50%_30%,#f6e3ae,#c9a35b)]" />
            <div class="flex-1">
              <p class="font-semibold text-ink">Still have a question?</p>
              <p class="text-sm text-muted">Ask Kabir in the bottom-right corner, or open a ticket to reach a human.</p>
            </div>
            <a routerLink="/help/contact-support" class="btn btn-outline btn-sm">Contact support</a>
          </div>
          <p class="mt-6 text-xs text-muted">Last updated {{ a.updated }}</p>
        </article>
      } @else {
        <div class="py-20 text-center">
          <h1 class="font-display text-4xl text-ink">Article not found</h1>
          <a routerLink="/help" class="btn btn-primary mt-6">Back to Help Center</a>
        </div>
      }
    </div>
  `,
})
export default class HelpArticlePage {
  readonly slug = input<string>('');
  private readonly seo = inject(SeoService);
  protected readonly all = HELP_ARTICLES;
  protected readonly article = computed(() => HELP_ARTICLES.find((a) => a.slug === this.slug()) ?? null);

  constructor() {
    effect(() => {
      const a = this.article();
      if (a) this.seo.set({ title: a.title, description: a.summary, type: 'article' });
      else this.seo.set({ title: 'Article not found', description: 'This help article does not exist.', noindex: true });
    });
  }
}
