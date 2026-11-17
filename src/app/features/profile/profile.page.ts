import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1 class="font-display text-4xl text-ink">Profile</h1>`,
})
export default class ProfilePage {}
