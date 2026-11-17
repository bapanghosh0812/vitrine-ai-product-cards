import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TERMS_VERSION } from '../../../../shared/constants';
import { LEGAL_DOCS } from '../../../../shared/content/legal.generated';
import { fillContentTokens } from '../../core/content-tokens';
import { Icon } from '../../shared/ui/icon';
import { RouterContent } from '../../shared/ui/router-content';

/** Full Terms of Service in a scroll-to-accept dialog: Accept unlocks only at the end. */
@Component({
  selector: 'app-terms-modal',
  imports: [A11yModule, Icon, RouterContent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[85] grid place-items-center bg-black/40 p-3 backdrop-blur-sm animate-fade sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-title"
          aria-describedby="terms-help"
          class="surface shadow-float flex max-h-[92dvh] w-full max-w-3xl animate-pop flex-col overflow-hidden !rounded-3xl"
          cdkTrapFocus
          [cdkTrapFocusAutoCapture]="true"
          (keydown.escape)="closed.emit()"
        >
          <header class="flex items-start justify-between gap-4 border-b hairline px-6 py-5">
            <div>
              <p class="eyebrow">Version {{ version }}</p>
              <h2 id="terms-title" class="font-display text-3xl text-ink">Terms of Service</h2>
              <p id="terms-help" class="mt-1 text-sm text-muted">Please read to the end. The Accept button unlocks when you reach the last section.</p>
            </div>
            <button type="button" class="icon-btn" (click)="closed.emit()" aria-label="Close without accepting"><app-icon name="x" /></button>
          </header>
          <div class="h-1 bg-surface-2" aria-hidden="true">
            <div class="h-full bg-[linear-gradient(90deg,#8f6e33,#d6b672,#f6e3ae)] transition-[width] duration-200" [style.width.%]="progress()"></div>
          </div>
          <div class="scrollbar-thin flex-1 overflow-y-auto px-6 py-6" (scroll)="onScroll($event)" tabindex="0" aria-label="Terms of Service text" data-testid="terms-scroll">
            @if (terms(); as t) {
              <app-router-content class="prose-vitrine block" [html]="html()" />
            } @else {
              <p class="text-muted">The Terms could not be loaded. Read them at <a routerLink="/legal/terms" class="link">/legal/terms</a>.</p>
            }
          </div>
          <footer class="flex flex-col gap-3 border-t hairline px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-xs text-muted" aria-live="polite">{{ reachedEnd() ? 'Thanks for reading.' : 'Scroll to the end to continue (' + progress() + '%).' }}</p>
            <div class="flex gap-2">
              <button type="button" class="btn btn-ghost" (click)="closed.emit()">Not now</button>
              <button type="button" class="btn btn-primary" [disabled]="!reachedEnd()" (click)="accepted.emit()" data-testid="terms-accept">
                <app-icon name="check" [size]="16" /> I accept
              </button>
            </div>
          </footer>
        </div>
      </div>
    }
  `,
})
export class TermsModal {
  readonly open = input(false);
  readonly accepted = output<void>();
  readonly closed = output<void>();
  protected readonly version = TERMS_VERSION;
  protected readonly terms = computed(() => LEGAL_DOCS.find((d) => d.slug === 'terms') ?? null);
  protected readonly html = computed(() => fillContentTokens(this.terms()?.html ?? ''));
  protected readonly progress = signal(0);
  protected readonly reachedEnd = computed(() => this.progress() >= 99 || !this.terms());

  protected onScroll(e: Event): void {
    const el = e.target as HTMLElement;
    const max = el.scrollHeight - el.clientHeight;
    const pct = max <= 0 ? 100 : Math.min(100, Math.round(((el.scrollTop + 4) / max) * 100));
    if (pct > this.progress()) this.progress.set(pct);
  }
}
