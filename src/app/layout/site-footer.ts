import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PUBLIC_ENV } from '../../environments/public-env';
import { CookieConsentService } from '../core/cookie-consent.service';
import { Icon } from '../shared/ui/icon';
import { Logo } from '../shared/ui/logo';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, Logo, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="border-t hairline bg-bg-soft">
      <div class="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-6">
        <div>
          <app-logo [size]="34" />
          <p class="mt-4 max-w-xs text-sm leading-relaxed text-muted">Products, beautifully told. AI-written titles, descriptions and keywords on cards worth sharing.</p>
          <p class="mt-5 text-sm text-ink-soft">Designed &amp; built by <strong>Bapan Ghosh</strong></p>
          <a [href]="repo" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
            <app-icon name="github" [size]="16" /> Source on GitHub
          </a>
        </div>
        <nav aria-label="Product">
          <h2 class="eyebrow">Product</h2>
          <ul class="mt-4 grid gap-2.5 text-sm">
            <li><a routerLink="/studio" class="text-ink-soft hover:text-ink">Studio</a></li>
            <li><a routerLink="/templates" class="text-ink-soft hover:text-ink">Templates</a></li>
            <li><a routerLink="/library" class="text-ink-soft hover:text-ink">Library</a></li>
            <li><a routerLink="/brand-kit" class="text-ink-soft hover:text-ink">Brand Kit</a></li>
          </ul>
        </nav>
        <nav aria-label="Support">
          <h2 class="eyebrow">Support</h2>
          <ul class="mt-4 grid gap-2.5 text-sm">
            <li><a routerLink="/help" class="text-ink-soft hover:text-ink">Help Center</a></li>
            <li><a routerLink="/help/contact-support" class="text-ink-soft hover:text-ink">Contact support</a></li>
            <li><a routerLink="/help/demo-account" class="text-ink-soft hover:text-ink">Demo account</a></li>
            <li><a [href]="repo + '/issues'" target="_blank" rel="noopener noreferrer" class="text-ink-soft hover:text-ink">Report an issue</a></li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <h2 class="eyebrow">Legal</h2>
          <ul class="mt-4 grid gap-2.5 text-sm">
            <li><a routerLink="/legal/terms" class="text-ink-soft hover:text-ink">Terms of Service</a></li>
            <li><a routerLink="/legal/privacy" class="text-ink-soft hover:text-ink">Privacy Policy</a></li>
            <li><a routerLink="/legal/cookies" class="text-ink-soft hover:text-ink">Cookie Policy</a></li>
            <li><a routerLink="/legal/ai-disclaimer" class="text-ink-soft hover:text-ink">AI Disclaimer</a></li>
            <li><a routerLink="/legal/acceptable-use" class="text-ink-soft hover:text-ink">Acceptable Use</a></li>
            <li><button type="button" class="text-ink-soft hover:text-ink" (click)="cookies.openSettings()">Cookie settings</button></li>
          </ul>
        </nav>
      </div>
      <div class="border-t hairline">
        <div class="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted md:flex-row md:items-center md:justify-between md:px-6">
          <p>© 2026 Bapan Ghosh. MIT licensed. Made in Kolkata, India.</p>
          <p>
            3D emoji: <a href="https://github.com/microsoft/fluentui-emoji" target="_blank" rel="noopener noreferrer" class="link">Microsoft Fluent Emoji</a> (MIT). Mascot and
            app-icon art created with AI image tools.
          </p>
        </div>
      </div>
    </footer>
  `,
})
export class SiteFooter {
  protected readonly cookies = inject(CookieConsentService);
  protected readonly repo = PUBLIC_ENV.repoUrl;
}
