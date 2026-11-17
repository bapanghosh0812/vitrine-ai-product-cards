import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteFooter } from '../../layout/site-footer';
import { SiteHeader } from '../../layout/site-header';
import { Icon } from '../../shared/ui/icon';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, SiteHeader, SiteFooter, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh flex-col bg-bg' },
  template: `
    <app-site-header />
    <main id="main" class="relative flex flex-1 items-center overflow-hidden">
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_40%,var(--hero-glow),transparent_70%)]" aria-hidden="true"></div>
      <div class="relative mx-auto grid max-w-5xl items-center gap-10 px-6 py-16 md:grid-cols-[1fr_auto]">
        <div>
          <p class="eyebrow">Error 404</p>
          <h1 class="mt-3 font-display text-5xl leading-[1.02] text-ink md:text-7xl">This shelf is <em class="gilded">empty</em>.</h1>
          <p class="mt-5 max-w-md text-lg text-muted">The page you are looking for was moved, renamed or never existed. Kabir checked twice.</p>
          <div class="mt-8 flex flex-wrap gap-3">
            <a routerLink="/" class="btn btn-primary btn-lg"><app-icon name="home" [size]="18" /> Back home</a>
            <a routerLink="/studio" class="btn btn-outline btn-lg"><app-icon name="wand" [size]="18" /> Open Studio</a>
            <a routerLink="/help" class="btn btn-ghost btn-lg">Help Center</a>
          </div>
        </div>
        <img src="brand/kabir-profile.webp" alt="Kabir looking around for the missing page" width="220" height="1010" class="mx-auto h-[22rem] w-auto animate-float drop-shadow-2xl md:h-[30rem]" />
      </div>
    </main>
    <app-site-footer />
  `,
})
export default class NotFoundPage {}
