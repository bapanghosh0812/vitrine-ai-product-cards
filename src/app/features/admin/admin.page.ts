import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-admin-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1 class="font-display text-4xl text-ink">Admin</h1>`,
})
export default class AdminPage {}
