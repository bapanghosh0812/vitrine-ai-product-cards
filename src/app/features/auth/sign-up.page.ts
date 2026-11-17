import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, authMessage } from '../../core/auth.service';
import { currentConsent, ProfileService } from '../../core/profile.service';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/ui/icon';
import { GoogleButton } from './google-button';
import { TermsModal } from './terms-modal';

export function passwordStrength(control: AbstractControl<string>): ValidationErrors | null {
  const v = control.value ?? '';
  if (!v) return null;
  if (v.length < 8) return { short: true };
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return { mix: true };
  return null;
}

@Component({
  selector: 'app-sign-up-page',
  imports: [ReactiveFormsModule, RouterLink, Icon, GoogleButton, TermsModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="font-display text-[2.6rem] leading-tight text-ink">Create your account</h1>
    <p class="mt-2 text-muted">Free forever for personal use. Your cards sync across devices.</p>

    <form [formGroup]="form" (ngSubmit)="submit()" class="mt-8 grid gap-4" novalidate>
      <div>
        <label for="su-name" class="field-label">Your name</label>
        <input id="su-name" class="field" formControlName="name" autocomplete="name" maxlength="60" [attr.aria-invalid]="invalid('name')" />
        @if (invalid('name')) {
          <p class="field-error" role="alert">Please enter your name (2 to 60 characters).</p>
        }
      </div>
      <div>
        <label for="su-email" class="field-label">Email</label>
        <input id="su-email" type="email" class="field" formControlName="email" autocomplete="email" [attr.aria-invalid]="invalid('email')" />
        @if (invalid('email')) {
          <p class="field-error" role="alert">Please enter a valid email.</p>
        }
      </div>
      <div>
        <label for="su-password" class="field-label">Password</label>
        <div class="relative">
          <input id="su-password" [type]="show() ? 'text' : 'password'" class="field pr-11" formControlName="password" autocomplete="new-password" [attr.aria-invalid]="invalid('password')" aria-describedby="pw-meter" />
          <button type="button" class="icon-btn absolute right-1 top-1/2 size-9 -translate-y-1/2" (click)="show.set(!show())" [attr.aria-label]="show() ? 'Hide password' : 'Show password'">
            <app-icon [name]="show() ? 'eye-off' : 'eye'" [size]="17" />
          </button>
        </div>
        <div id="pw-meter" class="mt-2 flex items-center gap-2" aria-live="polite">
          @for (i of [0, 1, 2, 3]; track i) {
            <span class="h-1.5 flex-1 rounded-full transition-colors" [class]="i < strength() ? (strength() >= 3 ? 'bg-jade-500' : 'bg-gold-500') : 'bg-surface-2'"></span>
          }
          <span class="w-16 text-right text-xs text-muted">{{ strengthLabel() }}</span>
        </div>
        @if (invalid('password')) {
          <p class="field-error" role="alert">Use at least 8 characters with a letter and a number.</p>
        }
      </div>

      <div class="rounded-2xl border hairline bg-surface-2/60 p-4">
        <div class="flex items-start gap-3">
          <input id="su-terms" type="checkbox" class="mt-1 size-5 shrink-0 accent-[var(--accent)]" formControlName="terms" (click)="onTermsClick($event)" [attr.aria-invalid]="invalid('terms')" aria-describedby="terms-desc" />
          <label for="su-terms" id="terms-desc" class="text-sm leading-relaxed text-ink-soft">
            I have read and accept the
            <button type="button" class="link font-medium" (click)="openTerms()">Terms of Service</button>
            and the <a routerLink="/legal/privacy" target="_blank" class="link font-medium">Privacy Policy</a>, and I understand that product details I enter are processed by AI providers.
          </label>
        </div>
        @if (invalid('terms')) {
          <p class="field-error ml-8" role="alert">Please read and accept the Terms to continue.</p>
        }
      </div>

      @if (error()) {
        <p class="rounded-xl bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2.5 text-sm text-danger" role="alert">{{ error() }}</p>
      }
      <button type="submit" class="btn btn-primary btn-lg w-full" [disabled]="busy() || !auth.enabled">
        @if (busy()) {
          <span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>
        }
        Create account
      </button>
    </form>

    <div class="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-muted"><span class="divider flex-1"></span>or<span class="divider flex-1"></span></div>
    <app-google-button label="Sign up with Google" [disabled]="busy() || !auth.enabled || !termsValue()" (signedIn)="googleDone()" (failed)="error.set($event)" />
    @if (!termsValue()) {
      <p class="mt-2 text-center text-xs text-muted">Accept the Terms above to enable Google sign-up.</p>
    }
    <p class="mt-6 text-center text-sm text-muted">Already have an account? <a routerLink="/auth/sign-in" [queryParams]="{ next: next() }" class="link font-medium">Sign in</a></p>

    <app-terms-modal [open]="termsOpen()" (accepted)="acceptTerms()" (closed)="termsOpen.set(false)" />
  `,
})
export default class SignUpPage {
  readonly next = input<string>();
  protected readonly auth = inject(AuthService);
  private readonly profile = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly busy = signal(false);
  protected readonly show = signal(false);
  protected readonly error = signal('');
  protected readonly termsOpen = signal(false);
  private readonly termsRead = signal(false);

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(60)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, passwordStrength] }),
    terms: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  private readonly pw = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  protected readonly termsValue = toSignal(this.form.controls.terms.valueChanges, { initialValue: false });
  protected readonly strength = computed(() => {
    const v = this.pw();
    let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Za-z]/.test(v) && /\d/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    if (v.length >= 12) s++;
    return s;
  });
  protected readonly strengthLabel = computed(() => ['', 'Weak', 'Okay', 'Strong', 'Excellent'][this.strength()]);

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  /** Ticking the box first opens the Terms; it only stays ticked after reading to the end. */
  protected onTermsClick(e: Event): void {
    if (!this.termsRead() && !this.form.controls.terms.value) {
      e.preventDefault();
      this.openTerms();
    }
  }

  protected openTerms(): void {
    this.termsOpen.set(true);
  }

  protected acceptTerms(): void {
    this.termsRead.set(true);
    this.form.controls.terms.setValue(true);
    this.termsOpen.set(false);
    // Recorded with the first profile write (email or Google sign-up).
    this.profile.setPendingConsent(currentConsent());
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.profile.setPendingConsent(currentConsent());
      const { name, email, password } = this.form.getRawValue();
      await this.auth.signUp(name, email, password);
      this.toast.success('Account created', 'We sent a verification link to your email.');
      void this.router.navigateByUrl('/auth/verify-email');
    } catch (e) {
      this.error.set(authMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected googleDone(): void {
    this.toast.success('Welcome to Vitrine');
    const next = this.next();
    void this.router.navigateByUrl(next && next.startsWith('/') && !next.startsWith('//') ? next : '/studio');
  }
}
