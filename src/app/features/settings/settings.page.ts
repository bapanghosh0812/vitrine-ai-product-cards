import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1 class="font-display text-4xl text-ink">Settings</h1>`,
})
export default class SettingsPage {}
