import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, viewChild } from '@angular/core';
import { TEMPLATES } from '../../../../shared/constants';
import { BrandKitService } from '../../core/brand-kit.service';
import { SettingsService } from '../../core/settings.service';
import { ToastService } from '../../core/toast.service';
import { labelFor, StudioStore } from '../../state/studio.store';
import { ProductCard } from '../../shared/card/product-card';
import { Icon } from '../../shared/ui/icon';
import { ExportService, type ExportInput } from './export.service';
import { compressImage, ImageError } from './image-compress';

const SAMPLES = [
  { name: 'Handwoven Banarasi silk saree', category: 'fashion' },
  { name: 'Noise-cancelling wireless earbuds', category: 'audio' },
  { name: 'Single-origin cold brew coffee', category: 'kitchen' },
  { name: 'Brass and teak table lamp', category: 'home' },
];

@Component({
  selector: 'app-card-stage',
  imports: [ProductCard, Icon, CdkMenuTrigger, CdkMenu, CdkMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="card-stage" class="surface relative overflow-hidden p-4 md:p-6" aria-labelledby="stage-title">
      <div class="flex flex-wrap items-center gap-3">
        <div class="mr-auto">
          <p class="eyebrow">Step 2</p>
          <h2 id="stage-title" class="font-display text-[1.7rem] leading-tight text-ink">Your card</h2>
        </div>
        <div class="flex items-center gap-1" role="toolbar" aria-label="Card actions">
          <button type="button" class="icon-btn" (click)="store.undo()" [disabled]="!store.canUndo()" aria-label="Undo" title="Undo (Ctrl/Cmd+Z)"><app-icon name="undo" /></button>
          <button type="button" class="icon-btn" (click)="store.redo()" [disabled]="!store.canRedo()" aria-label="Redo" title="Redo (Ctrl/Cmd+Shift+Z)"><app-icon name="redo" /></button>
          <span class="mx-1 h-6 w-px bg-[var(--line)]" aria-hidden="true"></span>
          <button type="button" class="icon-btn" (click)="fileInput.click()" [disabled]="!store.hasCard()" aria-label="Add or replace image" title="Add image"><app-icon name="image-plus" /></button>
          @if (store.image()) {
            <button type="button" class="icon-btn" (click)="store.setImage(null)" aria-label="Remove image, use 3D icon" title="Remove image"><app-icon name="trash" /></button>
          }
          <input #fileInput type="file" accept="image/jpeg,image/png,image/webp" class="hidden" (change)="onFile($event)" aria-label="Upload product image" />
          <button type="button" class="icon-btn" [cdkMenuTriggerFor]="exportMenu" [disabled]="!store.hasCard()" aria-label="Export" title="Export"><app-icon name="download" /></button>
          <button type="button" class="btn btn-primary btn-sm ml-1" (click)="store.save()" [disabled]="!store.hasCard() || store.busy()" data-testid="save">
            <app-icon name="save" [size]="15" /> {{ store.savedId() && !store.dirty() ? 'Saved' : 'Save' }}
          </button>
        </div>
      </div>

      <ng-template #exportMenu>
        <div cdkMenu class="glass shadow-float mt-2 w-56 animate-pop rounded-2xl p-2">
          <button cdkMenuItem class="menu-item" (click)="exportPng()"><app-icon name="image-plus" [size]="16" /> PNG image</button>
          <button cdkMenuItem class="menu-item" (click)="exporter.json(exportData()!)"><app-icon name="file-json" [size]="16" /> JSON data</button>
          <button cdkMenuItem class="menu-item" (click)="exporter.html(exportData()!)"><app-icon name="code" [size]="16" /> HTML snippet</button>
          <div class="divider my-1"></div>
          <button cdkMenuItem class="menu-item" (click)="exporter.copyText(store.copy()!)"><app-icon name="copy" [size]="16" /> Copy text</button>
        </div>
      </ng-template>

      <!-- Template switcher -->
      <div class="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Card template">
        @for (t of templates; track t.id) {
          <button
            type="button"
            role="radio"
            class="chip shrink-0"
            [attr.aria-checked]="store.template() === t.id"
            [class.is-active]="store.template() === t.id"
            (click)="store.setTemplate(t.id)"
            [title]="t.blurb"
          >
            {{ t.label }}
          </button>
        }
      </div>

      <!-- Stage -->
      <div class="relative mt-4 grid min-h-[26rem] place-items-center overflow-hidden rounded-[1.4rem] bg-[radial-gradient(70%_60%_at_50%_35%,var(--hero-glow),transparent_70%)] px-3 py-8 md:px-8">
        <div class="pointer-events-none absolute inset-x-10 bottom-6 h-10 rounded-[50%] bg-[radial-gradient(closest-side,rgb(0_0_0/0.16),transparent)] blur-md" aria-hidden="true"></div>
        @if (store.phase() === 'generating') {
          <div class="w-full animate-fade" [style.max-width.px]="stageWidth()" aria-busy="true" aria-label="Generating card">
            <div class="surface !rounded-[1.4rem] p-6">
              <div class="skeleton mx-auto size-36 !rounded-full"></div>
              <div class="skeleton mx-auto mt-6 h-3 w-24"></div>
              <div class="skeleton mt-4 h-7 w-4/5"></div>
              <div class="skeleton mt-2 h-7 w-3/5"></div>
              <div class="skeleton mt-5 h-3 w-full"></div>
              <div class="skeleton mt-2 h-3 w-11/12"></div>
              <div class="skeleton mt-2 h-3 w-2/3"></div>
              <div class="mt-5 flex gap-2">
                <div class="skeleton h-6 w-16 !rounded-full"></div>
                <div class="skeleton h-6 w-20 !rounded-full"></div>
                <div class="skeleton h-6 w-14 !rounded-full"></div>
              </div>
            </div>
            <p class="mt-4 flex items-center justify-center gap-2 text-sm text-muted" role="status">
              <img src="brand/kabir-head.webp" alt="" width="24" height="24" class="size-6 animate-bounce rounded-full" /> Kabir is polishing your words…
            </p>
          </div>
        } @else if (store.copy(); as copy) {
          <div #cardEl class="w-full animate-rise" [style.max-width.px]="stageWidth()" data-testid="product-card">
            <app-product-card
              [copy]="copy"
              [template]="store.template()"
              [category]="store.form().category"
              [image]="store.image()"
              [price]="store.form().price"
              [currency]="store.form().currency"
              [brandName]="brandKit.kit().brandName"
              [brandColours]="brandKit.enabled() ? brandKit.kit().colours : undefined"
              [watermark]="settings.settings().watermark"
            />
          </div>
        } @else {
          <div class="max-w-sm text-center animate-fade">
            <img src="brand/kabir-bust.webp" alt="Kabir, the Vitrine mascot" width="190" height="229" class="mx-auto h-auto w-40 drop-shadow-xl" />
            <h3 class="mt-4 font-display text-2xl text-ink">Your card will appear here</h3>
            <p class="mt-2 text-sm text-muted">Enter a product name, pick a category and press Generate. Or try one of these:</p>
            <div class="mt-4 flex flex-wrap justify-center gap-2">
              @for (s of samples; track s.name) {
                <button type="button" class="chip hover:border-[var(--gilt)]" (click)="useSample(s)">{{ s.name }}</button>
              }
            </div>
          </div>
        }
      </div>

      @if (store.meta(); as m) {
        <p class="mt-3 flex flex-wrap items-center justify-center gap-x-2 text-xs text-muted" data-testid="provider-meta">
          <app-icon name="zap" [size]="13" class="text-gilt" />
          Written by <strong class="text-ink-soft">{{ provider() }}</strong>
          <span aria-hidden="true">·</span> <span>{{ m.model }}</span>
          <span aria-hidden="true">·</span> <span>{{ (m.latencyMs / 1000).toFixed(1) }}s</span>
          @if (m.fallbackUsed) {
            <span class="chip !h-5 !px-2 !text-[0.65rem]">fallback</span>
          }
        </p>
      }
    </section>
  `,
  styles: `
    .menu-item {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 0.65rem;
      height: 2.5rem;
      padding: 0 0.75rem;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      color: var(--ink-soft);
      outline: none;
    }
    .menu-item:hover,
    .menu-item:focus {
      background: color-mix(in oklab, var(--accent) 8%, transparent);
      color: var(--ink);
    }
  `,
})
export class CardStage {
  protected readonly store = inject(StudioStore);
  protected readonly settings = inject(SettingsService);
  protected readonly brandKit = inject(BrandKitService);
  protected readonly exporter = inject(ExportService);
  private readonly toast = inject(ToastService);
  private readonly cardEl = viewChild<ElementRef<HTMLElement>>('cardEl');

  protected readonly templates = TEMPLATES;
  protected readonly samples = SAMPLES;
  protected readonly provider = computed(() => labelFor(this.store.meta()?.provider ?? ''));
  protected readonly stageWidth = computed(() => {
    const t = this.store.template();
    return t === 'marketplace' ? 620 : t === 'instagram' ? 460 : 410;
  });
  protected readonly exportData = computed<ExportInput | null>(() => {
    const copy = this.store.copy();
    if (!copy) return null;
    const f = this.store.form();
    return {
      copy,
      name: f.name,
      category: f.category,
      template: this.store.template(),
      price: f.price || undefined,
      currency: f.currency,
      language: f.language,
      provider: this.store.meta()?.provider,
      model: this.store.meta()?.model,
      image: this.store.image(),
    };
  });

  protected useSample(s: { name: string; category: string }): void {
    this.store.patchForm({ name: s.name, category: s.category });
    void this.store.generate();
  }

  protected async exportPng(): Promise<void> {
    const node = this.cardEl()?.nativeElement.querySelector('app-product-card') as HTMLElement | null;
    const data = this.exportData();
    if (node && data) await this.exporter.png(node, data);
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      this.store.setImage(dataUrl);
      this.toast.success('Image added', `Compressed to ${Math.round((dataUrl.length * 0.75) / 1024)} KB in your browser.`);
    } catch (error) {
      this.toast.error('Could not use this image', error instanceof ImageError ? error.message : 'Please try another file.');
    }
  }
}
