import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Fluent Emoji 3D (MIT, Microsoft) served from /emoji as small WebP files. */
@Component({
  selector: 'app-emoji',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block shrink-0' },
  template: `<img
    [src]="'emoji/' + name() + '.webp'"
    [width]="size()"
    [height]="size()"
    [alt]="alt()"
    [attr.aria-hidden]="alt() ? null : 'true'"
    loading="lazy"
    decoding="async"
    draggable="false"
    class="block select-none object-contain"
    [style.width.px]="size()"
    [style.height.px]="size()"
  />`,
})
export class Emoji {
  readonly name = input.required<string>();
  readonly size = input(32);
  readonly alt = input('');
}
