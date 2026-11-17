import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';

/**
 * Renders HTML that was compiled at BUILD TIME from the repository's own Markdown
 * (scripts/build-content.mjs disables raw HTML). It is trusted repository content, which is
 * why it may keep heading ids for the table of contents. Never pass user or AI text here;
 * chat messages use the escaping mini-markdown renderer instead.
 * Internal links are routed client-side so the base href (GitHub Pages) is respected.
 */
@Component({
  selector: 'app-router-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(click)': 'onClick($event)' },
  template: `<div [innerHTML]="safe()"></div>`,
})
export class RouterContent {
  readonly html = input.required<string>();
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);
  protected readonly safe = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.html()));

  protected onClick(event: MouseEvent): void {
    const a = (event.target as HTMLElement | null)?.closest('a');
    if (!a || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const href = a.getAttribute('href') ?? '';
    if (href.startsWith('#')) {
      event.preventDefault();
      document.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (href.startsWith('/') && !href.startsWith('//') && !a.target) {
      event.preventDefault();
      void this.router.navigateByUrl(href);
    }
  }
}
