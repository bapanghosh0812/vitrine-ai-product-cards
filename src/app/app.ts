import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConsentGate } from './features/auth/consent-gate';
import { GuestImport } from './features/auth/guest-import';
import { AskKabir } from './features/support/ask-kabir';
import { CommandPalette } from './layout/command-palette';
import { CookieBanner } from './layout/cookie-banner';
import { ToastOutlet } from './shared/ui/toast-outlet';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutlet, CookieBanner, AskKabir, CommandPalette, ConsentGate, GuestImport],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a href="#main" class="sr-only-focusable fixed left-3 top-3 z-[100] rounded-full bg-accent px-4 py-2 text-accent-ink">Skip to content</a>
    <router-outlet />
    <app-toast-outlet />
    @defer (on idle) {
      <app-cookie-banner />
      <app-command-palette />
      <app-consent-gate />
      <app-guest-import />
    }
    @defer (on idle) {
      <app-ask-kabir />
    }
  `,
})
export class App {}
