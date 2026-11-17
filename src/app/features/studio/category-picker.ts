import { CdkMenu, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CATEGORIES } from '../../../../shared/constants';
import { Emoji } from '../../shared/ui/emoji';
import { Icon } from '../../shared/ui/icon';

/** Category select with 3D icons. Implements ControlValueAccessor for reactive forms. */
@Component({
  selector: 'app-category-picker',
  imports: [CdkMenuTrigger, CdkMenu, CdkMenuItemRadio, Emoji, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CategoryPicker), multi: true }],
  template: `
    <button
      type="button"
      [id]="inputId()"
      class="field flex items-center gap-3 text-left"
      [cdkMenuTriggerFor]="panel"
      [attr.aria-invalid]="invalid()"
      [attr.aria-describedby]="describedBy() || null"
      aria-haspopup="menu"
      [disabled]="disabled()"
      (cdkMenuClosed)="onTouched()"
    >
      @if (selected(); as c) {
        <app-emoji [name]="c.emoji" [size]="30" />
        <span class="min-w-0 flex-1">
          <span class="block truncate font-medium text-ink">{{ c.label }}</span>
          <span class="block truncate text-xs text-muted">{{ c.hint }}</span>
        </span>
      } @else {
        <span class="grid size-[30px] place-items-center rounded-full border border-dashed border-[var(--line-strong)] text-muted"><app-icon name="grid" [size]="15" /></span>
        <span class="flex-1 text-muted">Choose a category</span>
      }
      <app-icon name="chevron-down" [size]="17" class="text-gilt" />
    </button>

    <ng-template #panel>
      <div cdkMenu class="surface shadow-float scrollbar-thin mt-2 max-h-[min(26rem,60vh)] w-[min(24rem,calc(100vw-2rem))] animate-pop overflow-y-auto !rounded-2xl p-2" aria-label="Categories">
        @for (c of categories; track c.id) {
          <button
            type="button"
            cdkMenuItemRadio
            [cdkMenuItemChecked]="c.id === value()"
            (cdkMenuItemTriggered)="select(c.id)"
            class="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left outline-none transition-colors hover:bg-[color-mix(in_oklab,var(--accent)_8%,transparent)] focus:bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]"
            [class.bg-[color-mix(in_oklab,var(--gilt)_14%,transparent)]]="c.id === value()"
          >
            <app-emoji [name]="c.emoji" [size]="34" />
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium text-ink">{{ c.label }}</span>
              <span class="block truncate text-xs text-muted">{{ c.hint }}</span>
            </span>
            @if (c.id === value()) {
              <app-icon name="check" [size]="16" class="text-gilt" />
            }
          </button>
        }
      </div>
    </ng-template>
  `,
})
export class CategoryPicker implements ControlValueAccessor {
  readonly inputId = input('category');
  readonly invalid = input(false);
  readonly describedBy = input('');
  protected readonly categories = CATEGORIES;
  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly selected = computed(() => CATEGORIES.find((c) => c.id === this.value()) ?? null);

  private onChange: (v: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  protected select(id: string): void {
    this.value.set(id);
    this.onChange(id);
    this.onTouched();
  }

  writeValue(v: string | null): void {
    this.value.set(v ?? '');
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }
}
