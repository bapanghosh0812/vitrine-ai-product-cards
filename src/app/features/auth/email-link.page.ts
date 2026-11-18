import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, authMessage } from '../../core/auth.service';
import { injectIsBrowser } from '../../core/platform';
import { ToastService } from '../../core/toast.service';
import { Emoji } from '../../shared/ui/emoji';
import { Icon } from '../../shared/ui/icon';

type State = 'checking' | 'confirm' | 'working' | 'invalid' | 'error';

/**
 * Finishes passwordless sign-in. If the link is opened on another device the email is not
 * stored locally, so we ask for it again (this stops a forwarded link signing in someone else).
 */
@Component({
  selector: 'app-email-link-page',
  imports: [ReactiveFormsModule, RouterLink, Icon, Emoji],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text-center">
      <app-emoji [name]="state() === 'invalid' || state() === 'error' ? 'locked' : 'bell'" [size]="72" />
      @switch (state()) {
        @case ('confirm') {
          <h1 class="mt-6 font-display text-4xl text-ink">Confirm your email</h1>
          <p class="mt-3 text-muted">For your security, enter the email address the sign-in link was sent to.</p>
        }
        @case ('invalid') {
          <h1 class="mt-6 font-display text-4xl text-ink">This link can't be used</h1>
          <p class="mt-3 text-muted" data-testid="link-invalid">It is not a Vitrine sign-in link, or it has already been used. Request a new one from the sign-in page.</p>
          <a routerLink="/auth/sign-in" class="btn btn-primary mt-8">Back to sign in</a>
        }
        @case ('error') {
          <h1 class="mt-6 font-display text-4xl text-ink">We couldn't sign you in</h1>
          <p class="mt-3 text-muted" role="alert">{{ error() }}</p>
          <a routerLink="/auth/sign-in" class="btn btn-primary mt-8">Request a new link</a>
        }
        @default {
          <h1 class="mt-6 font-display text-4xl text-ink">Signing you in…</h1>
          <p class="mt-3 text-muted" role="status">Checking your secure link.</p>
        }
      }
    </div>
    @if (state() === 'confirm') {
      <form [formGroup]="form" class="mt-8 grid gap-4" (ngSubmit)="confirm()" novalidate>
        <div>
          <label for="el-email" class="field-label">Email</label>
          <input id="el-email" type="email" class="field" formControlName="email" autocomplete="email" [attr.aria-invalid]="email.invalid && email.touched" />
          @if (email.invalid && email.touched) {
            <p class="field-error" role="alert">Please enter a valid email.</p>
          }
        </div>
        <button type="submit" class="btn btn-primary btn-lg w-full">Sign in <app-icon name="arrow-right" [size]="17" /></button>
      </form>
    }
  `,
})
export default class EmailLinkPage implements OnInit {
  readonly next = input<string>();
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly browser = injectIsBrowser();

  protected readonly state = signal<State>('checking');
  protected readonly error = signal('');
  protected readonly email = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] });
  protected readonly form = new FormGroup({ email: this.email });
  private href = '';

  ngOnInit(): void {
    if (!this.browser) return;
    this.href = location.href;
    void this.start();
  }

  private async start(): Promise<void> {
    try {
      if (!(await this.auth.isSignInLink(this.href))) {
        this.state.set('invalid');
        return;
      }
    } catch (e) {
      this.error.set(authMessage(e));
      this.state.set('error');
      return;
    }
    const saved = this.auth.linkEmail();
    if (saved) await this.finish(saved);
    else this.state.set('confirm');
  }

  protected async confirm(): Promise<void> {
    this.email.markAsTouched();
    if (this.email.invalid) return;
    await this.finish(this.email.value);
  }

  private async finish(email: string): Promise<void> {
    this.state.set('working');
    try {
      await this.auth.completeSignInLink(email, this.href);
      this.toast.success('Signed in');
      const next = this.next();
      await this.router.navigateByUrl(next && next.startsWith('/') && !next.startsWith('//') ? next : '/studio', { replaceUrl: true });
    } catch (e) {
      this.error.set(authMessage(e));
      this.state.set('error');
    }
  }
}
