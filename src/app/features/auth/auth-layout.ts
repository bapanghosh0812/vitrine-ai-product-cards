import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Icon } from '../../shared/ui/icon';
import { Logo } from '../../shared/ui/logo';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, RouterLink, Logo, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid min-h-dvh bg-bg lg:grid-cols-[1.05fr_1fr]' },
  template: `
    <aside class="relative hidden overflow-hidden bg-[radial-gradient(90%_70%_at_30%_20%,#1a7a5d_0%,#0e4d3a_45%,#05231a_100%)] text-ivory-100 lg:block" aria-hidden="true">
      <div class="absolute inset-0 bg-grain opacity-60"></div>
      <div class="absolute -right-24 top-24 size-[28rem] rounded-full bg-[radial-gradient(closest-side,rgb(214_182_114/0.35),transparent)]"></div>
      <div class="relative flex h-full flex-col p-12">
        <a routerLink="/" class="inline-flex"><app-logo [size]="40" [wordmark]="false" /><span class="ml-3 font-display text-3xl text-ivory-50">Vitrine</span></a>
        <div class="mt-auto max-w-md">
          <p class="font-display text-[2.8rem] leading-[1.05]">Every product deserves a <em class="text-gold-300">spotlight.</em></p>
          <p class="mt-4 text-ivory-200/80">Titles, descriptions and keywords written by AI, styled on cards that feel like a boutique window.</p>
          <ul class="mt-8 grid gap-3 text-sm text-ivory-200/90">
            <li class="flex items-center gap-3"><app-icon name="sparkles" [size]="17" class="text-gold-300" /> 3 variations in seconds, Groq + Gemini fallback</li>
            <li class="flex items-center gap-3"><app-icon name="template" [size]="17" class="text-gold-300" /> 6 templates, PNG / JSON / HTML export</li>
            <li class="flex items-center gap-3"><app-icon name="shield" [size]="17" class="text-gold-300" /> Your data is private to your account</li>
          </ul>
        </div>
        <img src="brand/kabir-three-quarter.webp" alt="" width="350" height="1010" class="absolute bottom-0 right-10 h-[78%] w-auto drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)]" />
      </div>
    </aside>
    <main id="main" class="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
      <div class="flex items-center justify-between">
        <a routerLink="/" class="lg:invisible" aria-label="Vitrine home"><app-logo [size]="32" /></a>
        <a routerLink="/studio" class="btn btn-ghost btn-sm">Continue as guest <app-icon name="arrow-right" [size]="15" /></a>
      </div>
      <div class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        @if (!auth.enabled) {
          <div class="mb-6 rounded-2xl border border-[var(--line-strong)] bg-surface-2 p-4 text-sm text-ink-soft" role="note">
            <strong>Accounts are not configured on this deployment yet.</strong> Everything in the Studio still works in guest mode.
          </div>
        }
        <router-outlet />
      </div>
      <p class="text-center text-xs text-muted">Designed &amp; built by Bapan Ghosh · <a routerLink="/legal/privacy" class="link">Privacy</a> · <a routerLink="/legal/terms" class="link">Terms</a></p>
    </main>
  `,
})
export default class AuthLayout {
  protected readonly auth = inject(AuthService);
}
