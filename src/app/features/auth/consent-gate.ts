import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRIVACY_VERSION, TERMS_VERSION } from '../../../../shared/constants';
import { AuthService } from '../../core/auth.service';
import { ProfileService } from '../../core/profile.service';
import { ToastService } from '../../core/toast.service';
import { Emoji } from '../../shared/ui/emoji';
import { TermsModal } from './terms-modal';

/** Blocks a signed-in user whose recorded consent is missing or for an older document version. */
@Component({
  selector: 'app-consent-gate',
  imports: [A11yModule, RouterLink, Emoji, TermsModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (profile.needsConsent() && !reading()) {
      <div class="fixed inset-0 z-[84] grid place-items-center bg-black/45 p-4 backdrop-blur-sm animate-fade">
        <div role="alertdialog" aria-modal="true" aria-labelledby="cg-title" aria-describedby="cg-desc" class="surface shadow-float w-full max-w-lg animate-pop p-7 !rounded-3xl" cdkTrapFocus [cdkTrapFocusAutoCapture]="true">
          <app-emoji name="locked" [size]="56" />
          <h2 id="cg-title" class="mt-4 font-display text-3xl text-ink">{{ hasOld() ? 'Our terms have changed' : 'One last step' }}</h2>
          <p id="cg-desc" class="mt-2 text-sm leading-relaxed text-muted">
            To keep using your account, please review and accept the
            <strong class="text-ink-soft">Terms of Service (v{{ terms }})</strong> and the <strong class="text-ink-soft">Privacy Policy (v{{ privacy }})</strong>.
            You can read the <a routerLink="/legal/privacy" class="link" target="_blank">Privacy Policy here</a>.
          </p>
          <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" class="btn btn-ghost" (click)="signOut()">Sign out instead</button>
            <button type="button" class="btn btn-primary" (click)="reading.set(true)">Read &amp; accept</button>
          </div>
        </div>
      </div>
    }
    <app-terms-modal [open]="reading()" (accepted)="accept()" (closed)="reading.set(false)" />
  `,
})
export class ConsentGate {
  protected readonly profile = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly reading = signal(false);
  protected readonly terms = TERMS_VERSION;
  protected readonly privacy = PRIVACY_VERSION;

  protected hasOld(): boolean {
    return !!this.profile.profile()?.consent;
  }

  protected async accept(): Promise<void> {
    try {
      await this.profile.acceptCurrentTerms();
      this.reading.set(false);
      this.toast.success('Thanks!', 'Your consent has been recorded.');
    } catch {
      this.toast.error('Could not save your consent', 'Please check your connection and try again.');
    }
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
  }
}
