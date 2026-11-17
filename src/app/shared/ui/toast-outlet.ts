import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { Icon } from './icon';

@Component({
  selector: 'app-toast-outlet',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      aria-live="polite"
      aria-label="Notifications"
      class="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-auto md:left-auto md:right-6 md:top-5 md:items-end"
    >
      @for (t of toasts.toasts(); track t.id) {
        <div
          class="glass shadow-float pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-2xl px-4 py-3"
          [attr.role]="t.kind === 'error' ? 'alert' : 'status'"
        >
          <span
            class="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full"
            [class]="
              t.kind === 'success'
                ? 'bg-jade-100 text-jade-800'
                : t.kind === 'error'
                  ? 'bg-red-100 text-red-700'
                  : t.kind === 'warning'
                    ? 'bg-gold-100 text-gold-800'
                    : 'bg-jade-50 text-jade-700'
            "
          >
            <app-icon [name]="t.kind === 'success' ? 'circle-check' : t.kind === 'error' ? 'circle-x' : t.kind === 'warning' ? 'warning' : 'info'" [size]="16" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-ink">{{ t.title }}</p>
            @if (t.message) {
              <p class="mt-0.5 text-[0.82rem] leading-snug text-muted">{{ t.message }}</p>
            }
            @if (t.action) {
              <button type="button" class="link mt-1 text-sm font-medium" (click)="t.action.run(); toasts.dismiss(t.id)">{{ t.action.label }}</button>
            }
          </div>
          <button type="button" class="icon-btn -mr-2 -mt-1 size-8" (click)="toasts.dismiss(t.id)" aria-label="Dismiss notification">
            <app-icon name="x" [size]="15" />
          </button>
        </div>
      }
    </section>
  `,
})
export class ToastOutlet {
  protected readonly toasts = inject(ToastService);
}
