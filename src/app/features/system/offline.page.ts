import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Emoji } from '../../shared/ui/emoji';
import { Icon } from '../../shared/ui/icon';
import { Logo } from '../../shared/ui/logo';

@Component({
  selector: 'app-offline-page',
  imports: [RouterLink, Logo, Icon, Emoji],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid min-h-dvh place-items-center bg-bg px-6' },
  template: `
    <main id="main" class="max-w-md text-center">
      <app-logo [size]="44" />
      <div class="mx-auto mt-10 grid size-28 place-items-center rounded-full bg-surface-2 shadow-lux">
        <app-emoji name="night-with-stars" [size]="72" />
      </div>
      <h1 class="mt-8 font-display text-4xl text-ink">You are offline</h1>
      <p class="mt-3 text-muted">
        No connection right now. Your saved cards and settings are safe on this device. Generation and cloud sync will resume when you are back online.
      </p>
      <div class="mt-8 flex justify-center gap-3">
        <button type="button" class="btn btn-primary" (click)="reload()"><app-icon name="refresh" [size]="16" /> Try again</button>
        <a routerLink="/library" class="btn btn-outline">Open Library</a>
      </div>
    </main>
  `,
})
export default class OfflinePage {
  protected reload(): void {
    location.reload();
  }
}
