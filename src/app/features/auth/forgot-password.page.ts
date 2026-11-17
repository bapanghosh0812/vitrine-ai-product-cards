import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, authMessage } from '../../core/auth.service';
import { Emoji } from '../../shared/ui/emoji';
import { Icon } from '../../shared/ui/icon';

@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, Icon, Emoji],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (sent()) {
      <div class="text-center animate-rise">
        <app-emoji name="bell" [size]="72" />
        <h1 class="mt-6 font-display text-4xl text-ink">Check your inbox</h1>
        <p class="mt-3 text-muted">If an account exists for <strong class="text-ink-soft">{{ email.value }}</strong>, a reset link is on its way. It expires in one hour.</p>
        <a routerLink="/auth/sign-in" class="btn btn-primary mt-8">Back to sign in</a>
      </div>
    } @else {
      <a routerLink="/auth/sign-in" class="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><app-icon name="arrow-left" [size]="15" /> Back to sign in</a>
      <h1 class="font-display text-[2.6rem] leading-tight text-ink">Forgot your password?</h1>
      <p class="mt-2 text-muted">Enter your email and we will send you a link to choose a new one.</p>
      <form class="mt-8 grid gap-4" (ngSubmit)="submit()" novalidate>
        <div>
          <label for="fp-email" class="field-label">Email</label>
          <input id="fp-email" type="email" class="field" [formControl]="email" autocomplete="email" [attr.aria-invalid]="email.invalid && email.touched" />
          @if (email.invalid && email.touched) {
            <p class="field-error" role="alert">Please enter a valid email.</p>
          }
        </div>
        @if (error()) {
          <p class="rounded-xl bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2.5 text-sm text-danger" role="alert">{{ error() }}</p>
        }
        <button type="submit" class="btn btn-primary btn-lg w-full" [disabled]="busy() || !auth.enabled">Send reset link</button>
      </form>
    }
  `,
})
export default class ForgotPasswordPage {
  protected readonly auth = inject(AuthService);
  protected readonly email = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] });
  protected readonly busy = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal('');

  protected async submit(): Promise<void> {
    this.email.markAsTouched();
    if (this.email.invalid) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.resetPassword(this.email.value);
      this.sent.set(true);
    } catch (e) {
      this.error.set(authMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
