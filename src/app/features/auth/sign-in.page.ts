import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, authMessage } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/ui/icon';
import { GoogleButton } from './google-button';

@Component({
  selector: 'app-sign-in-page',
  imports: [ReactiveFormsModule, RouterLink, Icon, GoogleButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="font-display text-[2.6rem] leading-tight text-ink">Welcome back</h1>
    <p class="mt-2 text-muted">Sign in to sync your cards, Brand Kit and settings.</p>

    <div class="mt-8"></div>

    <app-google-button [disabled]="busy() || !auth.enabled" (signedIn)="done()" (failed)="error.set($event)" />

    <form [formGroup]="form" (ngSubmit)="submit()" class="mt-6 grid gap-4" novalidate>
      <div>
        <label for="email" class="field-label">Email</label>
        <input id="email" type="email" class="field" formControlName="email" autocomplete="email" [attr.aria-invalid]="invalid('email')" aria-describedby="email-err" />
        @if (invalid('email')) {
          <p id="email-err" class="field-error" role="alert">Please enter a valid email.</p>
        }
      </div>
      <div>
        <div class="flex items-center justify-between">
          <label for="password" class="field-label">Password</label>
          <a routerLink="/auth/forgot-password" class="mb-1.5 text-xs font-medium text-accent hover:underline">Forgot password?</a>
        </div>
        <div class="relative">
          <input id="password" [type]="show() ? 'text' : 'password'" class="field pr-11" formControlName="password" autocomplete="current-password" [attr.aria-invalid]="invalid('password')" aria-describedby="pw-err" />
          <button type="button" class="icon-btn absolute right-1 top-1/2 size-9 -translate-y-1/2" (click)="show.set(!show())" [attr.aria-label]="show() ? 'Hide password' : 'Show password'">
            <app-icon [name]="show() ? 'eye-off' : 'eye'" [size]="17" />
          </button>
        </div>
        @if (invalid('password')) {
          <p id="pw-err" class="field-error" role="alert">Please enter your password.</p>
        }
      </div>
      @if (error()) {
        <p class="rounded-xl bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2.5 text-sm text-danger" role="alert">{{ error() }}</p>
      }
      <button type="submit" class="btn btn-primary btn-lg w-full" [disabled]="busy() || !auth.enabled">
        @if (busy()) {
          <span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>
        }
        Sign in
      </button>
    </form>
    <p class="mt-6 text-center text-sm text-muted">New to Vitrine? <a routerLink="/auth/sign-up" [queryParams]="{ next: next() }" class="link font-medium">Create a free account</a></p>
    <p class="mt-2 text-center text-sm text-muted">No account needed to try it: <a routerLink="/studio" class="link font-medium">continue as a guest</a>.</p>
  `,
})
export default class SignInPage {
  readonly next = input<string>();
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly busy = signal(false);
  protected readonly show = signal(false);
  protected readonly error = signal('');
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected invalid(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    await this.run(() => this.auth.signIn(this.form.controls.email.value, this.form.controls.password.value));
  }

  private async run(action: () => Promise<unknown>, message = 'Signed in'): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
      this.toast.success(message);
      this.done();
    } catch (e) {
      this.error.set(authMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected done(): void {
    const next = this.next();
    void this.router.navigateByUrl(next && next.startsWith('/') && !next.startsWith('//') ? next : '/studio');
  }
}
