import { inject, Injectable, signal } from '@angular/core';
import { SettingsService } from './settings.service';
import { SoundService } from './sound.service';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  action?: { label: string; run: () => void };
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly settings = inject(SettingsService);
  private readonly sound = inject(SoundService);
  private seq = 0;
  private readonly list = signal<Toast[]>([]);
  readonly toasts = this.list.asReadonly();

  show(kind: ToastKind, title: string, message?: string, options: { action?: Toast['action']; duration?: number; force?: boolean } = {}): void {
    if (kind === 'success') this.sound.play('success');
    if (kind === 'error') this.sound.play('error');
    // Errors always show; success/info toasts respect the user's notification setting.
    if (!options.force && kind !== 'error' && kind !== 'warning' && !this.settings.get('toasts')) return;
    const toast: Toast = { id: ++this.seq, kind, title, message, action: options.action, duration: options.duration ?? (kind === 'error' ? 7000 : 4200) };
    this.list.update((l) => [...l.slice(-3), toast]);
    if (toast.duration > 0) setTimeout(() => this.dismiss(toast.id), toast.duration);
  }

  success(title: string, message?: string, options?: { action?: Toast['action']; duration?: number }): void {
    this.show('success', title, message, options);
  }
  error(title: string, message?: string, options?: { action?: Toast['action']; duration?: number }): void {
    this.show('error', title, message, options);
  }
  info(title: string, message?: string, options?: { action?: Toast['action']; duration?: number }): void {
    this.show('info', title, message, options);
  }
  warning(title: string, message?: string, options?: { action?: Toast['action']; duration?: number }): void {
    this.show('warning', title, message, options);
  }

  dismiss(id: number): void {
    this.list.update((l) => l.filter((t) => t.id !== id));
  }
}
