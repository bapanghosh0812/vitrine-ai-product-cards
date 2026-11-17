import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Accessible toggle switch (role="switch") with a springy thumb. */
@Component({
  selector: 'app-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
      [attr.aria-describedby]="describedBy() || null"
      [disabled]="disabled()"
      (click)="toggled.emit(!checked())"
      class="relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-300"
      [class.bg-accent]="checked()"
      [class.border-transparent]="checked()"
      [class.bg-surface-2]="!checked()"
      [class.border-[var(--line-strong)]]="!checked()"
      [class.opacity-50]="disabled()"
    >
      <span
        class="absolute top-[3px] size-5 rounded-full shadow-md transition-[left,background] duration-500 ease-[var(--ease-spring-bouncy)]"
        [style.left.px]="checked() ? 24 : 3"
        [class.bg-[var(--accent-ink)]]="checked()"
        [class.bg-[var(--surface)]]="!checked()"
      ></span>
    </button>
  `,
})
export class Switch {
  readonly checked = input(false);
  readonly label = input.required<string>();
  readonly describedBy = input('');
  readonly disabled = input(false);
  readonly toggled = output<boolean>();
}

export interface SegmentOption<T> {
  value: T;
  label: string;
}

/** Segmented control (radiogroup). */
@Component({
  selector: 'app-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inline-flex flex-wrap gap-1 rounded-2xl border border-[var(--line-strong)] bg-surface-2 p-1" role="radiogroup" [attr.aria-label]="label()">
      @for (o of options(); track o.value) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="o.value === value()"
          class="h-8 rounded-xl px-3 text-sm font-medium transition-all duration-300"
          [class.bg-surface]="o.value === value()"
          [class.text-ink]="o.value === value()"
          [class.shadow-lux]="o.value === value()"
          [class.text-muted]="o.value !== value()"
          (click)="changed.emit(o.value)"
        >
          {{ o.label }}
        </button>
      }
    </div>
  `,
})
export class Segmented<T extends string | number> {
  readonly options = input.required<SegmentOption<T>[]>();
  readonly value = input.required<T>();
  readonly label = input.required<string>();
  readonly changed = output<T>();
}
