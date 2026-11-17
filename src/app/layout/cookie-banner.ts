import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CookieConsentService } from '../core/cookie-consent.service';
import { Emoji } from '../shared/ui/emoji';

@Component({
  selector: 'app-cookie-banner',
  imports: [RouterLink, Emoji],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (consent.bannerOpen()) {
      <section
        role="dialog"
        aria-labelledby="cookie-title"
        aria-describedby="cookie-desc"
        class="glass shadow-float fixed bottom-20 left-3 right-3 z-[70] max-w-md animate-rise rounded-3xl p-5 sm:left-5 sm:right-auto lg:bottom-5"
      >
        <div class="flex items-start gap-3">
          <app-emoji name="locked" [size]="40" />
          <div>
            <h2 id="cookie-title" class="font-display text-xl text-ink">Your privacy, by default</h2>
            <p id="cookie-desc" class="mt-1 text-sm leading-relaxed text-muted">
              Vitrine uses only <strong class="text-ink-soft">essential storage</strong> (sign-in and this choice). No ads, no tracking. You can also let us remember
              preferences like theme and drafts on this device.
              <a routerLink="/legal/cookies" class="link">Cookie Policy</a>
            </p>
          </div>
        </div>
        @if (custom() || consent.settingsOpen()) {
          <ul class="mt-4 grid gap-2 text-sm">
            <li class="flex items-center justify-between rounded-2xl border hairline px-4 py-3">
              <span><strong class="text-ink">Essential</strong><br /><span class="text-muted">Sign-in session, security, your cookie choice.</span></span>
              <span class="chip">Always on</span>
            </li>
            <li class="flex items-center justify-between rounded-2xl border hairline px-4 py-3">
              <label for="pref-toggle"><strong class="text-ink">Preferences</strong><br /><span class="text-muted">Theme, settings and Studio drafts across visits.</span></label>
              <input id="pref-toggle" type="checkbox" class="size-5 accent-[var(--accent)]" [checked]="prefs()" (change)="prefs.set($any($event.target).checked)" />
            </li>
            <li class="flex items-center justify-between rounded-2xl border hairline px-4 py-3 opacity-70">
              <span><strong class="text-ink">Analytics &amp; ads</strong><br /><span class="text-muted">Not used by Vitrine.</span></span>
              <span class="chip">Never</span>
            </li>
          </ul>
          <div class="mt-4 flex justify-end gap-2">
            <button type="button" class="btn btn-primary btn-sm" (click)="consent.decide(prefs())">Save choices</button>
          </div>
        } @else {
          <div class="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button type="button" class="btn btn-ghost btn-sm" (click)="custom.set(true)">Customise</button>
            <button type="button" class="btn btn-outline btn-sm" (click)="consent.decide(false)">Necessary only</button>
            <button type="button" class="btn btn-primary btn-sm" (click)="consent.decide(true)">Allow preferences</button>
          </div>
        }
      </section>
    }
  `,
})
export class CookieBanner {
  protected readonly consent = inject(CookieConsentService);
  protected readonly custom = signal(this.consent.settingsOpen());
  protected readonly prefs = signal(this.consent.choice()?.preferences ?? false);
}
