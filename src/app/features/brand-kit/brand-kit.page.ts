import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LIMITS } from '../../../../shared/constants';
import type { ProductCopy } from '../../../../shared/types';
import { AuthService } from '../../core/auth.service';
import { BrandKitService } from '../../core/brand-kit.service';
import { SettingsService } from '../../core/settings.service';
import { ToastService } from '../../core/toast.service';
import { ProductCard } from '../../shared/card/product-card';
import { Icon } from '../../shared/ui/icon';

const PRESETS = [
  { name: 'Emerald & Gold', colours: ['#0e4d3a', '#d6b672'] },
  { name: 'Ink & Saffron', colours: ['#1b1f3b', '#f4a259'] },
  { name: 'Rose & Pearl', colours: ['#7a2e4a', '#f1d6c9'] },
  { name: 'Ocean & Sand', colours: ['#0f4c75', '#e8d5b7'] },
];

const PREVIEW: ProductCopy = {
  title: 'Your product, in your voice',
  description: 'This preview uses your brand colours. Every generation also follows your brand voice and avoids the words you list.',
  keywords: ['brand voice', 'consistent', 'on-brand copy', 'your colours'],
};

@Component({
  selector: 'app-brand-kit-page',
  imports: [ReactiveFormsModule, Icon, ProductCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="max-w-2xl">
        <p class="eyebrow">Brand Kit</p>
        <h1 class="font-display text-5xl leading-tight text-ink">Sound like you, every time</h1>
        <p class="mt-2 text-muted">Your brand voice, words to avoid and colours are added to every generation while the Brand Kit is on.</p>
      </div>
      <label class="flex items-center gap-3 rounded-full border hairline bg-surface px-4 py-2 text-sm font-medium text-ink-soft">
        <input type="checkbox" role="switch" class="size-4 accent-[var(--accent)]" [checked]="settings.settings().useBrandKit" (change)="settings.update({ useBrandKit: $any($event.target).checked })" />
        Use Brand Kit in generations
      </label>
    </div>

    <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <form [formGroup]="form" (ngSubmit)="save()" class="surface grid gap-5 p-6" novalidate>
        <div>
          <label for="bk-name" class="field-label">Brand name</label>
          <input id="bk-name" class="field" formControlName="brandName" [attr.maxlength]="limits.brandNameMax" placeholder="e.g. Kashi Looms" />
        </div>
        <div>
          <label for="bk-voice" class="field-label">Brand voice</label>
          <textarea id="bk-voice" class="field" rows="3" formControlName="voice" [attr.maxlength]="limits.brandVoiceMax" placeholder="Warm, modern Indian craft. Confident but never boastful."></textarea>
          <p class="field-hint">{{ form.controls.voice.value.length }}/{{ limits.brandVoiceMax }} · Describe personality, not facts.</p>
        </div>
        <div>
          <label for="bk-avoid" class="field-label">Words to avoid</label>
          <input id="bk-avoid" class="field" formControlName="avoid" [attr.maxlength]="limits.brandAvoidMax" placeholder="cheap, best ever, guaranteed" />
          <p class="field-hint">Separate with commas.</p>
        </div>
        <fieldset>
          <legend class="field-label">Brand colours <span class="font-normal text-muted">(up to 5)</span></legend>
          <div class="flex flex-wrap items-center gap-3">
            @for (c of colours(); track $index) {
              <div class="flex items-center gap-2 rounded-full border hairline bg-surface-2 py-1 pl-1 pr-2">
                <input type="color" class="size-8 cursor-pointer rounded-full border-0 bg-transparent p-0" [value]="c" (input)="setColour($index, $any($event.target).value)" [attr.aria-label]="'Brand colour ' + ($index + 1)" />
                <span class="font-mono text-xs text-ink-soft">{{ c }}</span>
                <button type="button" class="icon-btn size-6" (click)="removeColour($index)" [attr.aria-label]="'Remove colour ' + c"><app-icon name="x" [size]="12" /></button>
              </div>
            }
            @if (colours().length < limits.brandColoursMax) {
              <button type="button" class="chip" (click)="addColour()"><app-icon name="plus" [size]="13" /> Add colour</button>
            }
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            @for (p of presets; track p.name) {
              <button type="button" class="chip" (click)="colours.set(p.colours)">
                <span class="flex">
                  @for (c of p.colours; track c) {
                    <span class="-mr-1 size-3.5 rounded-full ring-2 ring-[var(--surface-2)]" [style.background]="c"></span>
                  }
                </span>
                <span class="ml-1">{{ p.name }}</span>
              </button>
            }
          </div>
        </fieldset>
        <div class="flex flex-wrap items-center gap-3 border-t hairline pt-5">
          <button type="submit" class="btn btn-primary" [disabled]="saving()"><app-icon name="save" [size]="16" /> Save Brand Kit</button>
          <button type="button" class="btn btn-ghost" (click)="clear()">Clear</button>
          <p class="text-xs text-muted">{{ auth.isSignedIn() ? 'Saved to your account.' : 'Saved in this browser (guest mode).' }}</p>
        </div>
      </form>

      <aside class="surface p-6">
        <p class="eyebrow">Live preview</p>
        <div class="mt-4 grid gap-4">
          <app-product-card [copy]="preview" template="luxe" category="other" [brandName]="form.controls.brandName.value" [brandColours]="colours()" [watermark]="false" />
          <app-product-card [copy]="preview" template="bold" category="other" [brandColours]="colours()" [watermark]="false" class="hidden sm:block" />
        </div>
      </aside>
    </div>
  `,
})
export default class BrandKitPage {
  protected readonly kit = inject(BrandKitService);
  protected readonly settings = inject(SettingsService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly limits = LIMITS;
  protected readonly presets = PRESETS;
  protected readonly preview = PREVIEW;
  protected readonly saving = signal(false);
  protected readonly colours = signal<string[]>([]);
  protected readonly form = new FormGroup({
    brandName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(LIMITS.brandNameMax)] }),
    voice: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(LIMITS.brandVoiceMax)] }),
    avoid: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(LIMITS.brandAvoidMax)] }),
  });
  protected readonly empty = computed(() => this.kit.isEmpty());

  constructor() {
    effect(() => {
      const k = this.kit.kit();
      untracked(() => {
        this.form.setValue({ brandName: k.brandName ?? '', voice: k.voice ?? '', avoid: k.avoid ?? '' }, { emitEvent: false });
        this.colours.set([...(k.colours ?? [])]);
      });
    });
  }

  protected setColour(i: number, value: string): void {
    this.colours.update((list) => list.map((c, idx) => (idx === i ? value.toLowerCase() : c)));
  }
  protected addColour(): void {
    this.colours.update((list) => [...list, list.length ? '#c9a35b' : '#0e4d3a'].slice(0, LIMITS.brandColoursMax));
  }
  protected removeColour(i: number): void {
    this.colours.update((list) => list.filter((_, idx) => idx !== i));
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);
    try {
      await this.kit.save({ ...this.form.getRawValue(), colours: this.colours() });
      this.toast.success('Brand Kit saved', this.settings.settings().useBrandKit ? 'It will be used in your next generation.' : 'Switch it on to use it in generations.');
    } catch {
      this.toast.error('Could not save the Brand Kit');
    } finally {
      this.saving.set(false);
    }
  }

  protected async clear(): Promise<void> {
    this.form.reset({ brandName: '', voice: '', avoid: '' });
    this.colours.set([]);
    await this.save();
  }
}
