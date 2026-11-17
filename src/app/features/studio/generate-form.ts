import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CURRENCIES, LANGUAGES, LIMITS, TONES, type CurrencyId, type LanguageId, type ToneId } from '../../../../shared/constants';
import { BrandKitService } from '../../core/brand-kit.service';
import { StudioStore, type StudioForm } from '../../state/studio.store';
import { Icon } from '../../shared/ui/icon';
import { CategoryPicker } from './category-picker';

function meaningful(control: AbstractControl<string>): ValidationErrors | null {
  const v = (control.value ?? '').trim();
  if (!v) return null;
  return /[\p{L}\p{N}]/u.test(v) ? null : { meaningful: true };
}

function featuresValidator(control: AbstractControl<string>): ValidationErrors | null {
  const lines = (control.value ?? '').split('\n').filter((l) => l.trim());
  if (lines.length > LIMITS.featuresMaxCount) return { tooMany: true };
  if (lines.some((l) => l.trim().length > LIMITS.featureMax)) return { tooLong: true };
  return null;
}

@Component({
  selector: 'app-generate-form',
  imports: [ReactiveFormsModule, CategoryPicker, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="surface p-5 md:p-6" aria-labelledby="form-title">
      <div class="flex items-center justify-between">
        <div>
          <p class="eyebrow">Step 1</p>
          <h2 id="form-title" class="font-display text-[1.7rem] leading-tight text-ink">Describe your product</h2>
        </div>
        @if (store.hasCard()) {
          <button type="button" class="btn btn-ghost btn-sm" (click)="startOver()" title="Clear the form and card">
            <app-icon name="refresh" [size]="15" /> Start over
          </button>
        }
      </div>

      <div class="mt-5 grid gap-5">
        <div>
          <label for="name" class="field-label">Product name <span class="text-gilt" aria-hidden="true">*</span></label>
          <input
            id="name"
            type="text"
            class="field"
            formControlName="name"
            autocomplete="off"
            [attr.maxlength]="limits.nameMax"
            placeholder="e.g. Handwoven Banarasi silk saree"
            [attr.aria-invalid]="showError('name')"
            aria-describedby="name-hint name-error"
            aria-required="true"
          />
          <div class="flex justify-between">
            @if (showError('name')) {
              <p id="name-error" class="field-error" role="alert"><app-icon name="warning" [size]="14" /> {{ nameError() }}</p>
            } @else {
              <p id="name-hint" class="field-hint">Be specific: material, style or model helps the AI.</p>
            }
            <span class="field-hint tabular-nums">{{ nameLength() }}/{{ limits.nameMax }}</span>
          </div>
        </div>

        <div>
          <label for="category" class="field-label">Category <span class="text-gilt" aria-hidden="true">*</span></label>
          <app-category-picker formControlName="category" inputId="category" [invalid]="showError('category')" describedBy="category-error" />
          @if (showError('category')) {
            <p id="category-error" class="field-error" role="alert"><app-icon name="warning" [size]="14" /> Please choose a category.</p>
          }
        </div>

        <button
          type="button"
          class="flex items-center justify-between rounded-xl px-1 text-sm font-semibold text-ink-soft"
          (click)="more.set(!more())"
          [attr.aria-expanded]="more()"
          aria-controls="more-options"
        >
          <span class="flex items-center gap-2"><app-icon name="sliders" [size]="16" class="text-gilt" /> More options</span>
          <span class="flex items-center gap-2 text-xs font-normal text-muted">
            {{ optionsSummary() }}
            <app-icon name="chevron-down" [size]="16" class="transition-transform duration-300" [class.rotate-180]="more()" />
          </span>
        </button>

        @if (more()) {
          <div id="more-options" class="grid animate-rise gap-5 border-t hairline pt-5">
            <div>
              <label for="audience" class="field-label">Audience</label>
              <input id="audience" class="field" formControlName="audience" [attr.maxlength]="limits.audienceMax" placeholder="e.g. new parents, home baristas" />
            </div>

            <fieldset>
              <legend class="field-label">Tone</legend>
              <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Tone">
                @for (t of tones; track t.id) {
                  <button type="button" role="radio" class="chip" [attr.aria-checked]="form.controls.tone.value === t.id" [class.is-active]="form.controls.tone.value === t.id" (click)="form.controls.tone.setValue(t.id)">
                    {{ t.label }}
                  </button>
                }
              </div>
            </fieldset>

            <div>
              <label for="features" class="field-label">Key features <span class="font-normal text-muted">(one per line, up to 5)</span></label>
              <textarea id="features" class="field" rows="3" formControlName="features" placeholder="Pure zari border&#10;Hand-loomed in Varanasi" [attr.aria-invalid]="showError('features')"></textarea>
              @if (showError('features')) {
                <p class="field-error" role="alert"><app-icon name="warning" [size]="14" /> Up to 5 features, {{ limits.featureMax }} characters each.</p>
              }
            </div>

            <div class="grid grid-cols-[1fr_7rem] gap-3">
              <div>
                <label for="price" class="field-label">Price <span class="font-normal text-muted">(optional)</span></label>
                <input id="price" class="field" inputmode="decimal" formControlName="price" placeholder="4999" [attr.aria-invalid]="showError('price')" />
                @if (showError('price')) {
                  <p class="field-error" role="alert"><app-icon name="warning" [size]="14" /> Numbers only, e.g. 4999 or 49.99</p>
                }
              </div>
              <div>
                <label for="currency" class="field-label">Currency</label>
                <select id="currency" class="field" formControlName="currency">
                  @for (c of currencies; track c) {
                    <option [value]="c">{{ c }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="language" class="field-label">Language</label>
                <select id="language" class="field" formControlName="language">
                  @for (l of languages; track l.id) {
                    <option [value]="l.id">{{ l.label }}</option>
                  }
                </select>
              </div>
              <fieldset>
                <legend class="field-label">Variations</legend>
                <div class="flex h-[2.875rem] rounded-[0.9rem] border border-[var(--line-strong)] p-1" role="radiogroup" aria-label="Number of variations">
                  @for (n of [1, 3]; track n) {
                    <button
                      type="button"
                      role="radio"
                      [attr.aria-checked]="form.controls.variations.value === n"
                      class="flex-1 rounded-[0.65rem] text-sm font-semibold transition-colors"
                      [class.bg-accent]="form.controls.variations.value === n"
                      [class.text-accent-ink]="form.controls.variations.value === n"
                      [class.text-muted]="form.controls.variations.value !== n"
                      (click)="form.controls.variations.setValue($any(n))"
                    >
                      {{ n }}
                    </button>
                  }
                </div>
              </fieldset>
            </div>

            <p class="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-xs text-muted">
              <app-icon name="palette" [size]="15" class="text-gilt" />
              @if (brandKit.forRequest()) {
                Brand Kit is on: your voice and colours are applied.
              } @else {
                <span>Add your brand voice in the <a routerLink="/brand-kit" class="link">Brand Kit</a> to personalise every card.</span>
              }
            </p>
          </div>
        }

        <div class="grid gap-2">
          <button type="submit" class="btn btn-gold btn-lg w-full" [disabled]="store.busy() || cooldown() > 0" data-testid="generate">
            @if (store.phase() === 'generating') {
              <span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>
              Writing your card…
            } @else if (cooldown() > 0) {
              <app-icon name="clock" [size]="18" /> Try again in {{ cooldown() }}s
            } @else {
              <app-icon name="sparkles" [size]="18" /> Generate details
            }
          </button>
          <p class="text-center text-xs text-muted">
            <span class="kbd">{{ mod }}</span> <span class="kbd">Enter</span> to generate · AI can make mistakes, review before publishing.
          </p>
        </div>
      </div>
    </form>
  `,
})
export class GenerateForm {
  protected readonly store = inject(StudioStore);
  protected readonly brandKit = inject(BrandKitService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly limits = LIMITS;
  protected readonly tones = TONES;
  protected readonly languages = LANGUAGES;
  protected readonly currencies = CURRENCIES;
  protected readonly mod = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
  protected readonly more = signal(false);
  protected readonly submitted = signal(false);
  private readonly now = signal(Date.now());

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(LIMITS.nameMin), Validators.maxLength(LIMITS.nameMax), meaningful] }),
    category: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    audience: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(LIMITS.audienceMax)] }),
    tone: new FormControl<ToneId>('luxurious', { nonNullable: true }),
    features: new FormControl('', { nonNullable: true, validators: [featuresValidator] }),
    price: new FormControl('', { nonNullable: true, validators: [Validators.pattern(/^\d{1,9}(\.\d{1,2})?$/)] }),
    currency: new FormControl<CurrencyId>('INR', { nonNullable: true }),
    language: new FormControl<LanguageId>('en', { nonNullable: true }),
    variations: new FormControl<1 | 3>(1, { nonNullable: true }),
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly nameLength = computed(() => (this.value().name ?? '').length);
  protected readonly optionsSummary = computed(() => {
    const v = this.value();
    const tone = TONES.find((t) => t.id === v.tone)?.label ?? '';
    const lang = LANGUAGES.find((l) => l.id === v.language)?.label ?? '';
    return `${tone} · ${lang} · ${v.variations} ${v.variations === 1 ? 'variation' : 'variations'}`;
  });
  protected readonly cooldown = computed(() => Math.max(0, Math.ceil((this.store.cooldownUntil() - this.now()) / 1000)));

  constructor() {
    // Store → form (initial load, library "open", template prefill)
    effect(() => {
      const f = this.store.form();
      untracked(() => {
        const current = this.form.getRawValue();
        if (JSON.stringify(current) !== JSON.stringify(f)) this.form.setValue(f, { emitEvent: false });
      });
    });
    // Form → store
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.store.patchForm(this.form.getRawValue() as StudioForm));
    // Tick the cooldown label
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  protected showError(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected nameError(): string {
    const e = this.form.controls.name.errors ?? {};
    if (e['required']) return 'Please enter a product name.';
    if (e['minlength']) return `Use at least ${LIMITS.nameMin} characters.`;
    if (e['maxlength']) return `Keep it under ${LIMITS.nameMax} characters.`;
    if (e['meaningful']) return 'Use letters or numbers, not just symbols.';
    return 'Please check the product name.';
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      if (this.form.controls.features.invalid || this.form.controls.price.invalid) this.more.set(true);
      const first = this.form.controls.name.invalid ? 'name' : this.form.controls.category.invalid ? 'category' : this.form.controls.price.invalid ? 'price' : 'features';
      setTimeout(() => document.getElementById(first)?.focus(), 0);
      return;
    }
    this.store.patchForm(this.form.getRawValue() as StudioForm);
    const ok = await this.store.generate();
    if (ok && window.matchMedia('(max-width: 1023px)').matches) {
      document.getElementById('card-stage')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  protected startOver(): void {
    this.store.reset();
    this.submitted.set(false);
    this.form.markAsUntouched();
  }
}
