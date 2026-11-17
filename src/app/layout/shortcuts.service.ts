import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { injectIsBrowser } from '../core/platform';
import { CommandPaletteService } from './command-palette.service';

export const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'Mod K', label: 'Open the command palette' },
  { keys: 'Mod Enter', label: 'Generate details (Studio)' },
  { keys: 'Mod Z', label: 'Undo (Studio)' },
  { keys: 'Mod Shift Z', label: 'Redo (Studio)' },
  { keys: 'Mod S', label: 'Save card (Studio)' },
  { keys: 'G S', label: 'Go to Studio' },
  { keys: 'G L', label: 'Go to Library' },
  { keys: 'G T', label: 'Go to Templates' },
  { keys: 'G B', label: 'Go to Brand Kit' },
  { keys: '?', label: 'Show keyboard shortcuts' },
  { keys: 'Esc', label: 'Close dialogs and menus' },
];

/** Global keyboard shortcuts (ignored while typing in a field). */
@Injectable({ providedIn: 'root' })
export class ShortcutsService {
  private readonly router = inject(Router);
  private readonly palette = inject(CommandPaletteService);
  private readonly doc = inject(DOCUMENT);
  private readonly browser = injectIsBrowser();
  private attached = false;
  private pendingG = 0;
  /** Studio registers handlers here while it is on screen. */
  readonly studioHandlers = signal<{ generate: () => void; undo: () => void; redo: () => void; save: () => void } | null>(null);

  attach(): void {
    if (!this.browser || this.attached) return;
    this.attached = true;
    this.doc.addEventListener('keydown', (e) => this.onKey(e));
  }

  showHelp(): void {
    this.palette.open('shortcuts');
  }

  private typing(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null;
    return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }

  private onKey(e: KeyboardEvent): void {
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (mod && key === 'k') {
      e.preventDefault();
      this.palette.toggle();
      return;
    }
    const studio = this.studioHandlers();
    if (studio && mod && key === 'enter') {
      e.preventDefault();
      studio.generate();
      return;
    }
    if (studio && mod && key === 's') {
      e.preventDefault();
      studio.save();
      return;
    }
    if (this.typing(e) || e.altKey) return;
    if (studio && mod && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) studio.redo();
      else studio.undo();
      return;
    }
    if (studio && mod && key === 'y') {
      e.preventDefault();
      studio.redo();
      return;
    }
    if (mod) return;
    if (e.key === '?') {
      e.preventDefault();
      this.showHelp();
      return;
    }
    if (key === 'g') {
      this.pendingG = Date.now();
      return;
    }
    if (Date.now() - this.pendingG < 1200) {
      const map: Record<string, string> = { s: '/studio', l: '/library', t: '/templates', b: '/brand-kit', h: '/help' };
      const path = map[key];
      this.pendingG = 0;
      if (path) {
        e.preventDefault();
        void this.router.navigateByUrl(path);
      }
    }
  }
}
