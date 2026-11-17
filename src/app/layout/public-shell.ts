import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

@Component({
  selector: 'app-public-shell',
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh flex-col bg-bg' },
  template: `
    <app-site-header />
    <main id="main" tabindex="-1" class="flex-1 outline-none">
      <router-outlet />
    </main>
    <app-site-footer />
  `,
})
export default class PublicShell {}
