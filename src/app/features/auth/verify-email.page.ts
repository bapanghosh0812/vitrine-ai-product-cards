import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, authMessage } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Emoji } from '../../shared/ui/emoji';
import { Icon } from '../../shared/ui/icon';

@Component({
  selector: 'app-verify-email-page',
  imports: [RouterLink, Icon, Emoji],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text-center">
      <app-emoji [name]="verified() ? 'party-popper' : 'bell'" [size]="80" />
      @if (verified()) {
        <h1 class="mt-6 font-display text-4xl text-ink">Email verified</h1>
        <p class="mt-3 text-muted">You're all set. Your cards will now sync to your account.</p>
        <a routerLink="/studio" class="btn btn-gold btn-lg mt-8">Open the Studio <app-icon name="arrow-right" [size]="17" /></a>
      } @else {
        <h1 class="mt-6 font-display text-4xl text-ink">Verify your email</h1>
        <p class="mt-3 text-muted">
          We sent a link to <strong class="text-ink-soft">{{ auth.user()?.email }}</strong>. Open it on any device; this page checks again automatically.
        </p>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" class="btn btn-primary" (click)="check()" [disabled]="checking()"><app-icon name="refresh" [size]="16" [class.animate-spin]="checking()" /> I've verified</button>
          <button type="button" class="btn btn-outline" (click)="resend()" [disabled]="cooldown() > 0">
            {{ cooldown() > 0 ? 'Resend in ' + cooldown() + 's' : 'Resend email' }}
          </button>
        </div>
        <p class="mt-6 text-sm text-muted">Wrong address? <button type="button" class="link" (click)="signOut()">Sign out</button> and create the account again. You can also <a routerLink="/studio" class="link">keep using the Studio</a> meanwhile.</p>
      }
    </div>
  `,
})
export default class VerifyEmailPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly verified = signal(false);
  protected readonly checking = signal(false);
  protected readonly cooldown = signal(0);

  ngOnInit(): void {
    this.verified.set(!!this.auth.user()?.emailVerified);
    const poll = setInterval(() => void this.check(true), 5000);
    const tick = setInterval(() => this.cooldown.update((c) => Math.max(0, c - 1)), 1000);
    this.destroyRef.onDestroy(() => {
      clearInterval(poll);
      clearInterval(tick);
    });
  }

  protected async check(silent = false): Promise<void> {
    if (this.verified()) return;
    if (!silent) this.checking.set(true);
    try {
      const user = await this.auth.refresh();
      if (user?.emailVerified) {
        this.verified.set(true);
        this.toast.success('Email verified');
      } else if (!silent) {
        this.toast.info('Not verified yet', 'Open the link in the email, then try again.');
      }
    } catch {
      /* ignore while polling */
    } finally {
      this.checking.set(false);
    }
  }

  protected async resend(): Promise<void> {
    try {
      await this.auth.sendVerification();
      this.cooldown.set(60);
      this.toast.success('Verification email sent');
    } catch (e) {
      this.toast.error('Could not send', authMessage(e));
    }
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    void this.router.navigateByUrl('/auth/sign-up');
  }
}
