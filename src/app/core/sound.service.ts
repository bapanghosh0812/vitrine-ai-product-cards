import { inject, Injectable } from '@angular/core';
import { injectIsBrowser } from './platform';
import { SettingsService } from './settings.service';

type Cue = 'tap' | 'success' | 'error' | 'pop';

/**
 * Subtle interface sounds synthesised with the Web Audio API (no audio files to download)
 * plus optional haptics on supported phones. Both are off/on per user settings.
 */
@Injectable({ providedIn: 'root' })
export class SoundService {
  private readonly settings = inject(SettingsService);
  private readonly browser = injectIsBrowser();
  private ctx: AudioContext | null = null;

  play(cue: Cue): void {
    if (!this.browser) return;
    if (this.settings.get('haptics') && 'vibrate' in navigator) {
      try {
        navigator.vibrate(cue === 'error' ? [12, 40, 12] : cue === 'success' ? [8, 30, 14] : 6);
      } catch {
        /* ignore */
      }
    }
    if (!this.settings.get('sounds')) return;
    try {
      this.ctx ??= new AudioContext();
      const ctx = this.ctx;
      const notes: Record<Cue, [number, number][]> = {
        tap: [[880, 0.04]],
        pop: [[660, 0.05], [990, 0.06]],
        success: [[784, 0.08], [1175, 0.12]],
        error: [[330, 0.09], [262, 0.14]],
      };
      let t = ctx.currentTime;
      for (const [freq, dur] of notes[cue]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
        t += dur * 0.8;
      }
    } catch {
      /* audio not available */
    }
  }
}
