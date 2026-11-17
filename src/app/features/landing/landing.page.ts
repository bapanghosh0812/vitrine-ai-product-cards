import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1 class="font-display text-4xl text-ink">Landing</h1>`,
})
export default class LandingPage {}
