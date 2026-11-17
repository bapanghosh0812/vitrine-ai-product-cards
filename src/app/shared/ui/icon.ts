import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICONS, type IconName } from './icons';

/** Renders a Lucide icon node as inline SVG (no innerHTML, CSP friendly, tree-shaken). */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0', '[attr.aria-hidden]': '!label()', '[attr.role]': 'label() ? "img" : null', '[attr.aria-label]': 'label() || null' },
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="stroke()"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
    >
      @for (node of nodes(); track $index) {
        @switch (node[0]) {
          @case ('path') {
            <path [attr.d]="node[1]['d']" />
          }
          @case ('circle') {
            <circle [attr.cx]="node[1]['cx']" [attr.cy]="node[1]['cy']" [attr.r]="node[1]['r']" />
          }
          @case ('rect') {
            <rect
              [attr.x]="node[1]['x']"
              [attr.y]="node[1]['y']"
              [attr.width]="node[1]['width']"
              [attr.height]="node[1]['height']"
              [attr.rx]="node[1]['rx']"
              [attr.ry]="node[1]['ry']"
            />
          }
          @case ('line') {
            <line [attr.x1]="node[1]['x1']" [attr.y1]="node[1]['y1']" [attr.x2]="node[1]['x2']" [attr.y2]="node[1]['y2']" />
          }
          @case ('polyline') {
            <polyline [attr.points]="node[1]['points']" />
          }
          @case ('polygon') {
            <polygon [attr.points]="node[1]['points']" />
          }
          @case ('ellipse') {
            <ellipse [attr.cx]="node[1]['cx']" [attr.cy]="node[1]['cy']" [attr.rx]="node[1]['rx']" [attr.ry]="node[1]['ry']" />
          }
        }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input<number>(18);
  readonly stroke = input<number>(1.75);
  readonly label = input<string>('');
  protected readonly nodes = computed(() => ICONS[this.name()] as unknown as [string, Record<string, string | number>][]);
}
