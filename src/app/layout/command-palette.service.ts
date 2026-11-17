import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
  readonly isOpen = signal(false);
  readonly mode = signal<'commands' | 'shortcuts'>('commands');

  open(mode: 'commands' | 'shortcuts' = 'commands'): void {
    this.mode.set(mode);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    if (this.isOpen()) this.close();
    else this.open();
  }
}
