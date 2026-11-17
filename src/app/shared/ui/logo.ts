import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Hand-drawn Vitrine mark (gold arch + product card + sparkle) with optional wordmark. */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-2.5' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 64 64" aria-hidden="true" class="shrink-0 drop-shadow-sm">
      <defs>
        <linearGradient [attr.id]="id + 'bg'" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#1A7A5D" />
          <stop offset=".55" stop-color="#0E4D3A" />
          <stop offset="1" stop-color="#05261C" />
        </linearGradient>
        <linearGradient [attr.id]="id + 'gold'" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#F6E3AE" />
          <stop offset=".5" stop-color="#D8B46A" />
          <stop offset="1" stop-color="#A7802F" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" [attr.fill]="'url(#' + id + 'bg)'" />
      <rect x="1" y="1" width="62" height="62" rx="14" fill="none" stroke="#7FD1B0" stroke-opacity=".18" />
      <path d="M20.5 47.5V28.5a11.5 11.5 0 0 1 23 0v19" fill="none" [attr.stroke]="'url(#' + id + 'gold)'" stroke-width="3.2" stroke-linecap="round" />
      <rect x="15.5" y="46.5" width="33" height="5" rx="2.5" [attr.fill]="'url(#' + id + 'gold)'" />
      <g transform="rotate(-11 32 35.5)">
        <rect x="24.5" y="26.5" width="15" height="18" rx="3.2" [attr.fill]="'url(#' + id + 'gold)'" />
        <path d="M29.4 32.2h5.2l.7 4.6h-6.6z" fill="#0E4D3A" fill-opacity=".9" />
        <path d="M30.7 32.2v-.9a1.3 1.3 0 0 1 2.6 0v.9" fill="none" stroke="#0E4D3A" stroke-opacity=".9" stroke-width="1" />
        <rect x="27.6" y="39" width="8.8" height="1.5" rx=".75" fill="#0E4D3A" fill-opacity=".55" />
      </g>
      <path d="M45.5 11.5c.5 3.1 1.7 4.3 4.8 4.8-3.1.5-4.3 1.7-4.8 4.8-.5-3.1-1.7-4.3-4.8-4.8 3.1-.5 4.3-1.7 4.8-4.8z" fill="#FBEFC8" />
    </svg>
    @if (wordmark()) {
      <span class="font-display text-[1.6rem] leading-none tracking-tight text-ink">Vitrine</span>
    }
  `,
})
export class Logo {
  readonly size = input(34);
  readonly wordmark = input(true);
  protected readonly id = `lg${Math.random().toString(36).slice(2, 7)}`;
}
