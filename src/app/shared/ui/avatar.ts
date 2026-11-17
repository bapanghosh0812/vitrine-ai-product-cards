import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export const AVATARS = [
  'kabir',
  'lion',
  'fox',
  'panda',
  'tiger-face',
  'unicorn',
  'koala',
  'owl',
  'penguin',
  'octopus',
  'butterfly',
  'peacock',
  'cat-face',
  'dog-face',
  'rabbit-face',
  'frog',
] as const;

/** Round avatar: Kabir (mascot art) or a Fluent Emoji 3D animal. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-grid shrink-0 place-items-center overflow-hidden rounded-full', '[style.width.px]': 'size()', '[style.height.px]': 'size()' },
  template: `
    <span
      class="grid size-full place-items-center rounded-full ring-1 ring-inset ring-[color:var(--line-strong)]"
      [style.background]="isKabir() ? 'radial-gradient(circle at 50% 30%, #f6e3ae, #c9a35b 55%, #8f6e33)' : 'radial-gradient(circle at 50% 35%, var(--surface), var(--surface-2))'"
    >
      <img
        [src]="src()"
        [alt]="alt()"
        [width]="size()"
        [height]="size()"
        decoding="async"
        draggable="false"
        [class]="isKabir() ? 'size-full translate-y-[6%] scale-110 object-cover object-top' : 'size-[72%] object-contain'"
      />
    </span>
  `,
})
export class Avatar {
  readonly name = input<string>('kabir');
  readonly size = input(36);
  readonly alt = input('');
  protected readonly isKabir = computed(() => !this.name() || this.name() === 'kabir');
  protected readonly src = computed(() => (this.isKabir() ? 'brand/kabir-avatar.webp' : `emoji/${this.name()}.webp`));
}
