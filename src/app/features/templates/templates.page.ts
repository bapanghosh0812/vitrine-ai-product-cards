import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TEMPLATES, type TemplateId } from '../../../../shared/constants';
import type { ProductCopy } from '../../../../shared/types';
import { StudioStore } from '../../state/studio.store';
import { ProductCard } from '../../shared/card/product-card';
import { Icon } from '../../shared/ui/icon';

const SAMPLE: Record<TemplateId, { copy: ProductCopy; category: string; price?: string }> = {
  minimal: {
    category: 'home',
    price: '3490',
    copy: {
      title: 'Brass & Teak Table Lamp',
      description: 'Hand-turned teak meets brushed brass in a lamp that pours warm, even light over your reading nook. Quietly beautiful, built to last decades.',
      keywords: ['table lamp', 'teak wood', 'brass decor', 'reading light', 'handcrafted'],
    },
  },
  luxe: {
    category: 'fashion',
    price: '18900',
    copy: {
      title: 'Banarasi Silk Saree, Zari Weave',
      description: 'Woven by master artisans in Varanasi, its pure zari border catches every light. Heirloom drape for weddings and festive evenings.',
      keywords: ['banarasi saree', 'silk saree', 'zari border', 'wedding wear', 'handloom'],
    },
  },
  glass: {
    category: 'audio',
    price: '7999',
    copy: {
      title: 'Aura Pro Noise-Cancelling Earbuds',
      description: 'Adaptive noise cancelling, 32-hour battery and a feather-light fit. Music that follows you from metro rides to midnight deadlines.',
      keywords: ['wireless earbuds', 'noise cancelling', 'bluetooth 5.3', 'long battery', 'gift for him'],
    },
  },
  bold: {
    category: 'footwear',
    price: '5499',
    copy: {
      title: 'Stride X Running Shoes',
      description: 'Responsive foam, breathable knit and grip that bites on wet roads. Built for your fastest 10K yet.',
      keywords: ['running shoes', 'marathon', 'breathable', 'lightweight'],
    },
  },
  instagram: {
    category: 'kitchen',
    price: '649',
    copy: {
      title: 'Single-Origin Cold Brew Coffee',
      description: 'Slow-steeped for 18 hours from Chikmagalur beans. Chocolatey, smooth and ready to pour over ice.',
      keywords: ['cold brew', 'indian coffee', 'chikmagalur', 'iced coffee', 'small batch'],
    },
  },
  marketplace: {
    category: 'watches',
    price: '12499',
    copy: {
      title: 'Meridian Automatic Watch, 40 mm Steel',
      description: 'A self-winding movement, sapphire crystal and a sunburst emerald dial. Water resistant to 100 m for every day and every occasion.',
      keywords: ['automatic watch', 'steel watch', 'sapphire crystal', 'emerald dial', 'men watch', 'gift'],
    },
  },
};

@Component({
  selector: 'app-templates-page',
  imports: [ProductCard, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-2xl">
      <p class="eyebrow">Templates</p>
      <h1 class="font-display text-5xl leading-tight text-ink">Six ways to tell it</h1>
      <p class="mt-2 text-muted">The same AI copy, styled six ways. Switch templates any time in the Studio; your words stay the same.</p>
    </div>
    <ul class="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      @for (t of templates; track t.id) {
        <li class="surface flex flex-col p-5">
          <div class="grid flex-1 place-items-center rounded-2xl bg-[radial-gradient(70%_60%_at_50%_35%,var(--hero-glow),transparent_70%)] p-4">
            <div class="w-full" [style.max-width.px]="t.id === 'marketplace' ? 560 : 340">
              <app-product-card [copy]="sample(t.id).copy" [template]="t.id" [category]="sample(t.id).category" [price]="sample(t.id).price" [watermark]="false" />
            </div>
          </div>
          <div class="mt-5 flex items-end justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-ink">{{ t.label }}</h2>
              <p class="text-sm text-muted">{{ t.blurb }}</p>
            </div>
            <button type="button" class="btn btn-primary btn-sm shrink-0" (click)="use(t.id)">Use template <app-icon name="arrow-right" [size]="14" /></button>
          </div>
        </li>
      }
    </ul>
  `,
})
export default class TemplatesPage {
  private readonly router = inject(Router);
  private readonly studio = inject(StudioStore);
  protected readonly templates = TEMPLATES;

  protected sample(id: TemplateId) {
    return SAMPLE[id];
  }

  protected use(id: TemplateId): void {
    this.studio.setTemplate(id);
    void this.router.navigate(['/studio'], { queryParams: { template: id } });
  }
}
