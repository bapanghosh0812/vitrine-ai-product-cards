import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LIMITS } from '../../../../shared/constants';
import { StudioStore } from '../../state/studio.store';
import { Icon } from '../../shared/ui/icon';

const QUICK = [
  { label: 'Shorter', icon: 'minus', prompt: 'Make it shorter and punchier, but keep the key benefit.' },
  { label: 'More luxurious', icon: 'gem', prompt: 'Make it feel more luxurious and premium, with refined, elegant wording.' },
  { label: 'Warmer', icon: 'heart', prompt: 'Make the tone warmer and more personal, as if a trusted friend recommends it.' },
  { label: 'Playful', icon: 'sparkle', prompt: 'Make it more playful and fun, while still feeling classy.' },
  { label: 'Add urgency', icon: 'clock', prompt: 'Add a gentle sense of urgency without being pushy.' },
  { label: 'SEO boost', icon: 'search', prompt: 'Make the title and keywords stronger for search, using phrases shoppers actually type.' },
  { label: 'Simpler words', icon: 'type', prompt: 'Use simpler, everyday words that anyone can understand.' },
  { label: 'Gift angle', icon: 'package', prompt: 'Position it as a thoughtful gift and say who would love to receive it.' },
] as const;

/** "Ask AI": revise the card with your own words. Enter adds a new line; only Send submits. */
@Component({
  selector: 'app-refine-panel',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.copy()) {
      <div class="grid gap-5">
        <div class="ask" [class.is-busy]="working()">
          <div class="flex items-start gap-3">
            <img src="brand/kabir-head.webp" alt="" width="36" height="36" class="size-9 shrink-0 rounded-full ring-2 ring-[var(--gilt)]" />
            <div>
              <p class="text-sm font-semibold text-ink">Tell Kabir what to change</p>
              <p class="text-xs leading-relaxed text-muted">Write as much as you like. He keeps the facts, follows your note and rewrites the card.</p>
            </div>
          </div>
          <label for="ask-input" class="sr-only">Your instruction for the AI</label>
          <textarea
            id="ask-input"
            class="ask__input"
            rows="4"
            [value]="draft()"
            (input)="draft.set($any($event.target).value)"
            (keydown)="onKey($event)"
            [attr.maxlength]="max"
            [disabled]="working()"
            placeholder="e.g. Make it warmer and a little shorter. Mention free shipping across India and end with a soft call to action."
            data-testid="ask-input"
          ></textarea>
          <div class="flex items-center justify-between gap-3">
            <span class="text-[0.7rem] text-muted"><span class="tabular-nums">{{ draft().length }}/{{ max }}</span> · <span class="kbd">Enter</span> new line</span>
            <button type="button" class="btn btn-gold btn-sm shrink-0" (click)="send()" [disabled]="!canSend()" [title]="'Send (' + mod + ' + Enter)'" data-testid="ask-send">
              @if (working()) {
                <span class="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span> Rewriting…
              } @else {
                <app-icon name="send" [size]="15" /> Send
              }
            </button>
          </div>
        </div>

        <div>
          <p class="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-gilt">Quick refinements</p>
          <div class="flex flex-wrap gap-2">
            @for (q of quick; track q.label) {
              <button type="button" class="chip hover:border-[var(--gilt)]" (click)="send(q.prompt)" [disabled]="store.busy()">
                <app-icon [name]="q.icon" [size]="13" class="text-gilt" /> {{ q.label }}
              </button>
            }
          </div>
        </div>

        @if (store.refineLog().length) {
          <div class="rounded-2xl bg-surface-2 p-4">
            <p class="text-xs font-semibold text-ink-soft">Applied this session</p>
            <ul class="mt-2 grid gap-1.5">
              @for (entry of store.refineLog(); track $index) {
                <li class="flex items-start gap-2 text-xs text-muted"><app-icon name="check" [size]="13" class="mt-0.5 shrink-0 text-gilt" /> <span class="line-clamp-2">{{ entry }}</span></li>
              }
            </ul>
            <p class="mt-3 text-[0.7rem] text-muted">Prefer the earlier version? Press Undo above the card.</p>
          </div>
        }
      </div>
    } @else {
      <div class="rounded-2xl border border-dashed border-[var(--line-strong)] p-5 text-center">
        <app-icon name="sparkles" [size]="22" class="mx-auto text-gilt" />
        <p class="mt-2 text-sm text-muted">Generate a card first, then ask Kabir to rewrite it in your own words.</p>
      </div>
    }
  `,
  styles: `
    .ask {
      display: grid;
      gap: 0.85rem;
      padding: 1rem;
      border-radius: 1.25rem;
      border: 1px solid color-mix(in oklab, var(--gilt) 40%, var(--line));
      background:
        radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--gilt) 10%, transparent), transparent 60%),
        var(--surface);
      box-shadow: 0 14px 34px -24px color-mix(in oklab, var(--gilt) 80%, transparent);
      transition: box-shadow 0.3s;
    }
    .ask:focus-within {
      box-shadow:
        0 0 0 3px color-mix(in oklab, var(--gilt) 22%, transparent),
        0 14px 34px -24px color-mix(in oklab, var(--gilt) 80%, transparent);
    }
    .ask.is-busy {
      opacity: 0.85;
    }
    .ask__input {
      width: 100%;
      min-height: 7rem;
      max-height: 20rem;
      resize: vertical;
      field-sizing: content;
      padding: 0.8rem 0.9rem;
      border-radius: 0.9rem;
      border: 1px solid var(--line);
      background: var(--surface-2);
      color: var(--ink);
      font-size: 0.9rem;
      line-height: 1.55;
      outline: none;
    }
    .ask__input:focus {
      border-color: var(--gilt);
      background: var(--surface);
    }
  `,
})
export class RefinePanel {
  protected readonly store = inject(StudioStore);
  protected readonly quick = QUICK;
  protected readonly max = LIMITS.instructionMax;
  protected readonly mod = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
  protected readonly draft = signal('');
  protected readonly working = computed(() => this.store.phase() === 'regenerating' && !this.store.regeneratingField());
  protected readonly canSend = computed(() => this.draft().trim().length >= 3 && !this.store.busy());

  /** Plain Enter keeps its normal job (a new line). Ctrl/Cmd+Enter sends without triggering Generate. */
  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.stopPropagation();
      void this.send();
    }
  }

  protected async send(prompt?: string): Promise<void> {
    const text = (prompt ?? this.draft()).trim();
    if (text.length < 3 || this.store.busy()) return;
    const ok = await this.store.refine(text);
    if (ok && !prompt) this.draft.set('');
  }
}
