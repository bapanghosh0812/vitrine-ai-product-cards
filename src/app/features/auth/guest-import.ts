import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { CardRepository } from '../../core/card-repository.service';
import { ProfileService } from '../../core/profile.service';
import { StorageService } from '../../core/storage.service';
import { ToastService } from '../../core/toast.service';
import { Emoji } from '../../shared/ui/emoji';

/** After signing in, offers to move cards made in guest mode into the account. */
@Component({
  selector: 'app-guest-import',
  imports: [A11yModule, Emoji],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (count() > 0) {
      <div class="fixed inset-0 z-[83] grid place-items-center bg-black/35 p-4 backdrop-blur-sm animate-fade">
        <div role="dialog" aria-modal="true" aria-labelledby="gi-title" class="surface shadow-float w-full max-w-md animate-pop p-7 !rounded-3xl" cdkTrapFocus [cdkTrapFocusAutoCapture]="true" (keydown.escape)="later()">
          <app-emoji name="package" [size]="56" />
          <h2 id="gi-title" class="mt-4 font-display text-3xl text-ink">Bring your cards along?</h2>
          <p class="mt-2 text-sm text-muted">
            You made <strong class="text-ink-soft">{{ count() }} card{{ count() === 1 ? '' : 's' }}</strong> as a guest in this browser. Import them into your account to see them on every device.
          </p>
          <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" class="btn btn-ghost" (click)="later()">Not now</button>
            <button type="button" class="btn btn-primary" (click)="importAll()" [disabled]="busy()">Import {{ count() }} card{{ count() === 1 ? '' : 's' }}</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class GuestImport {
  private readonly auth = inject(AuthService);
  private readonly profile = inject(ProfileService);
  private readonly repo = inject(CardRepository);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);
  protected readonly count = signal(0);
  protected readonly busy = signal(false);

  constructor() {
    effect(() => {
      const uid = this.auth.user()?.uid;
      const ready = this.profile.loaded() && !this.profile.needsConsent();
      untracked(() => {
        if (!uid || !ready) return this.count.set(0);
        const dismissed = this.storage.get<string[]>('guest-import-dismissed', [], 'essential');
        if (dismissed.includes(uid)) return this.count.set(0);
        this.count.set(this.repo.guestCards().length);
      });
    });
  }

  protected later(): void {
    const uid = this.auth.user()?.uid;
    if (uid) this.storage.set('guest-import-dismissed', [...this.storage.get<string[]>('guest-import-dismissed', [], 'essential'), uid].slice(-10), 'essential');
    this.count.set(0);
  }

  protected async importAll(): Promise<void> {
    this.busy.set(true);
    try {
      const n = await this.repo.importGuestCards();
      this.toast.success(`Imported ${n} card${n === 1 ? '' : 's'}`, 'They are now in your Library.');
      this.count.set(0);
    } catch {
      this.toast.error('Import failed', 'Please check your connection and try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
