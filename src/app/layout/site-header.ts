import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { Icon } from '../shared/ui/icon';
import { Logo } from '../shared/ui/logo';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, Logo, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="glass sticky top-0 z-40 border-x-0 border-t-0">
      <div class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-6">
        <a routerLink="/" aria-label="Vitrine home" class="rounded-xl"><app-logo [size]="32" /></a>
        <nav class="hidden items-center gap-1 md:flex" aria-label="Site">
          <a routerLink="/templates" routerLinkActive="!text-ink" class="btn btn-ghost btn-sm text-ink-soft">Templates</a>
          <a routerLink="/help" routerLinkActive="!text-ink" class="btn btn-ghost btn-sm text-ink-soft">Help Center</a>
          <a routerLink="/legal" routerLinkActive="!text-ink" class="btn btn-ghost btn-sm text-ink-soft">Legal</a>
        </nav>
        <div class="ml-auto flex items-center gap-2">
          <button type="button" class="icon-btn" (click)="theme.cycle()" [attr.aria-label]="'Theme: ' + theme.choice() + '. Change theme'">
            <app-icon [name]="themeIcon()" [size]="19" />
          </button>
          @if (auth.isSignedIn()) {
            <a routerLink="/studio" class="btn btn-primary btn-sm">Open Studio <app-icon name="arrow-right" [size]="15" /></a>
          } @else {
            <a routerLink="/auth/sign-in" class="btn btn-ghost btn-sm hidden sm:inline-flex">Sign in</a>
            <a routerLink="/studio" class="btn btn-primary btn-sm">Try it free <app-icon name="arrow-right" [size]="15" /></a>
          }
        </div>
      </div>
    </header>
  `,
})
export class SiteHeader {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly themeIcon = computed(() => {
    const c = this.theme.choice();
    return c === 'light' ? 'sun' : c === 'dark' ? 'moon' : c === 'oled' ? 'moon-star' : 'monitor';
  });
}
