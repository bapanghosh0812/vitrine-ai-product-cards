import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ProductCopy } from '../../../../shared/types';
import { SiteFooter } from '../../layout/site-footer';
import { SiteHeader } from '../../layout/site-header';
import { ProductCard } from '../../shared/card/product-card';
import { Emoji } from '../../shared/ui/emoji';
import { Icon } from '../../shared/ui/icon';
import type { IconName } from '../../shared/ui/icons';

const HERO_CARDS: { copy: ProductCopy; template: 'luxe' | 'glass' | 'minimal'; category: string; price: string }[] = [
  {
    template: 'luxe',
    category: 'jewellery',
    price: '24999',
    copy: {
      title: 'Kundan Polki Choker, 22K Gold Finish',
      description: 'Hand-set uncut stones and meenakari detailing, made by Jaipur karigars for the bride who loves heritage with a modern line.',
      keywords: ['kundan choker', 'bridal jewellery', 'polki necklace', 'jaipur craft'],
    },
  },
  {
    template: 'glass',
    category: 'audio',
    price: '7999',
    copy: {
      title: 'Aura Pro Noise-Cancelling Earbuds',
      description: 'Adaptive noise cancelling and 32-hour battery in a feather-light fit. Music that follows you everywhere.',
      keywords: ['wireless earbuds', 'anc', 'long battery', 'gift'],
    },
  },
  {
    template: 'minimal',
    category: 'plants',
    price: '899',
    copy: {
      title: 'Monstera Deliciosa in Terracotta',
      description: 'A glossy, easy-going statement plant in a hand-thrown terracotta pot. Brings a slice of the tropics to any corner.',
      keywords: ['indoor plant', 'monstera', 'terracotta pot', 'home decor'],
    },
  },
];

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'sparkles', title: 'Three variations', body: 'Compare an emotional, a practical and an aspirational take side by side, then pick a favourite.' },
  { icon: 'refresh', title: 'Regenerate one field', body: 'Love the title but not the description? Rewrite just that part, keep the rest.' },
  { icon: 'palette', title: 'Brand Kit', body: 'Your voice, banned words and colours go into every prompt, so every card sounds like you.' },
  { icon: 'download', title: 'PNG, JSON, HTML', body: 'Export a crisp image for socials, structured data for feeds, or a safe HTML snippet.' },
  { icon: 'library', title: 'Library & favourites', body: 'Save, search and star cards. Guests keep them in the browser, accounts sync everywhere.' },
  { icon: 'message', title: 'Ask Kabir', body: 'A support assistant grounded only in our Help Center, with a human ticket when you need one.' },
  { icon: 'moon-star', title: 'Light, dark & OLED', body: 'Ivory by day, emerald-black by night, true black for OLED screens. Or follow your system.' },
  { icon: 'shield', title: 'Private by design', body: 'Keys stay on the server, data is locked to your account, essential storage only by default.' },
];

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, SiteHeader, SiteFooter, ProductCard, Emoji, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block bg-bg' },
  template: `
    <app-site-header />
    <main id="main" tabindex="-1" class="outline-none">
      <!-- Hero -->
      <section class="relative overflow-hidden">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_60%_at_78%_35%,var(--hero-glow),transparent_70%),radial-gradient(40%_40%_at_10%_10%,rgb(42_147_114/0.10),transparent_70%)]" aria-hidden="true"></div>
        <div class="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-12 md:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
          <div class="animate-rise">
            <p class="eyebrow inline-flex items-center gap-2"><app-icon name="sparkle" [size]="13" /> AI product-card generator</p>
            <h1 class="mt-5 font-display text-[3.4rem] leading-[0.98] tracking-tight text-ink sm:text-[4.6rem] lg:text-[5.4rem]">
              Products,<br /><em class="gilded pr-2">beautifully</em> told.
            </h1>
            <p class="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Type a product name and a category. Vitrine writes the <strong class="text-ink">title</strong>, a <strong class="text-ink">short description</strong> and
              <strong class="text-ink">SEO keywords</strong>, then dresses them in a card worth a boutique window.
            </p>
            <div class="mt-9 flex flex-wrap items-center gap-3">
              <a routerLink="/studio" class="btn btn-gold btn-lg" data-testid="hero-cta"><app-icon name="wand" [size]="18" /> Open the Studio</a>
              <a routerLink="/templates" class="btn btn-outline btn-lg">See templates</a>
            </div>
            <ul class="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <li class="flex items-center gap-2"><app-icon name="check" [size]="15" class="text-gilt" /> Works as a guest, no sign-up</li>
              <li class="flex items-center gap-2"><app-icon name="check" [size]="15" class="text-gilt" /> Groq + Gemini fallback</li>
              <li class="flex items-center gap-2"><app-icon name="check" [size]="15" class="text-gilt" /> 6 templates, 8 languages</li>
            </ul>
          </div>

          <!-- Vitrine window -->
          <div class="relative mx-auto h-[34rem] w-full max-w-[34rem] sm:h-[38rem]" aria-hidden="true">
            <div class="absolute inset-x-[12%] bottom-[6%] top-[4%] rounded-t-full border-[3px] border-[color-mix(in_oklab,var(--gilt)_70%,transparent)] bg-[linear-gradient(180deg,rgb(214_182_114/0.10),transparent_60%)] shadow-[inset_0_0_80px_rgb(214_182_114/0.15)]"></div>
            <div class="absolute inset-x-[6%] bottom-[3%] h-5 rounded-full bg-[linear-gradient(180deg,#f6e3ae,#c9a35b_55%,#8f6e33)] shadow-[0_18px_30px_-10px_rgb(143_110_51/0.6)]"></div>
            <img src="brand/kabir-full.webp" alt="" width="370" height="1010" fetchpriority="high" class="absolute bottom-[5%] left-1/2 h-[86%] w-auto -translate-x-1/2 drop-shadow-[0_30px_40px_rgba(0,0,0,0.25)]" />
            <div class="float-card left-[-2%] top-[8%] w-[46%] [--float-rot:-8deg] sm:w-[42%]">
              <app-product-card [copy]="cards[0].copy" [template]="cards[0].template" [category]="cards[0].category" [price]="cards[0].price" [watermark]="false" />
            </div>
            <div class="float-card right-[-3%] top-[22%] w-[40%] [--float-rot:7deg] [animation-delay:-2s] sm:w-[37%]">
              <app-product-card [copy]="cards[1].copy" [template]="cards[1].template" [category]="cards[1].category" [price]="cards[1].price" [watermark]="false" />
            </div>
            <div class="float-card bottom-[9%] right-[4%] hidden w-[34%] [--float-rot:-4deg] [animation-delay:-4s] sm:block">
              <app-product-card [copy]="cards[2].copy" [template]="cards[2].template" [category]="cards[2].category" [price]="cards[2].price" [watermark]="false" />
            </div>
            <span class="absolute right-[18%] top-[2%] text-4xl text-gold-300 drop-shadow">✦</span>
          </div>
        </div>
      </section>

      <!-- How it works -->
      <section class="border-y hairline bg-bg-soft" aria-labelledby="how-title">
        <div class="mx-auto max-w-6xl px-5 py-20 md:px-6">
          <p class="eyebrow text-center">How it works</p>
          <h2 id="how-title" class="mt-3 text-center font-display text-5xl text-ink">From a name to a showpiece in three steps</h2>
          <ol class="mt-14 grid gap-6 md:grid-cols-3">
            @for (s of steps; track s.title; let i = $index) {
              <li class="surface relative p-7">
                <span class="absolute right-6 top-5 font-display text-6xl text-[color-mix(in_oklab,var(--gilt)_35%,transparent)]">{{ i + 1 }}</span>
                <app-emoji [name]="s.emoji" [size]="64" />
                <h3 class="mt-5 text-xl font-semibold text-ink">{{ s.title }}</h3>
                <p class="mt-2 leading-relaxed text-muted">{{ s.body }}</p>
              </li>
            }
          </ol>
        </div>
      </section>

      <!-- Features -->
      <section class="mx-auto max-w-6xl px-5 py-20 md:px-6" aria-labelledby="features-title">
        <div class="max-w-2xl">
          <p class="eyebrow">Everything in the box</p>
          <h2 id="features-title" class="mt-3 font-display text-5xl leading-tight text-ink">Made for sellers who care about the details</h2>
        </div>
        <ul class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          @for (f of features; track f.title) {
            <li class="surface p-6 transition-transform duration-500 ease-[var(--ease-spring)] hover:-translate-y-1">
              <span class="grid size-11 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--gilt)_16%,transparent)] text-gilt"><app-icon [name]="f.icon" [size]="20" /></span>
              <h3 class="mt-5 font-semibold text-ink">{{ f.title }}</h3>
              <p class="mt-1.5 text-sm leading-relaxed text-muted">{{ f.body }}</p>
            </li>
          }
        </ul>
      </section>

      <!-- AI transparency -->
      <section class="mx-auto max-w-6xl px-5 pb-20 md:px-6" aria-labelledby="ai-title">
        <div class="surface grid gap-10 overflow-hidden p-8 md:grid-cols-[1fr_1.1fr] md:p-12">
          <div>
            <p class="eyebrow">Honest AI</p>
            <h2 id="ai-title" class="mt-3 font-display text-4xl leading-tight text-ink">You stay the editor. AI writes the first draft.</h2>
            <p class="mt-4 leading-relaxed text-muted">
              Copy is generated on our server by Groq, with Google Gemini as an automatic fallback. Every answer must pass a strict JSON schema, links and HTML are
              stripped, and everything is shown as plain text. AI can still be wrong, so review facts like materials and sizes before you publish.
            </p>
            <a routerLink="/legal/ai-disclaimer" class="link mt-5 inline-block text-sm font-medium">Read the AI Disclaimer</a>
          </div>
          <dl class="grid grid-cols-2 gap-4 self-center">
            @for (s of stats; track s.label) {
              <div class="rounded-2xl border hairline bg-surface-2 p-5">
                <dt class="text-xs uppercase tracking-[0.14em] text-muted">{{ s.label }}</dt>
                <dd class="mt-2 font-display text-3xl text-ink">{{ s.value }}</dd>
              </div>
            }
          </dl>
        </div>
      </section>

      <!-- CTA -->
      <section class="px-5 pb-24 md:px-6">
        <div class="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[radial-gradient(80%_120%_at_20%_0%,#1a7a5d,#0e4d3a_45%,#05231a)] px-8 py-14 text-ivory-50 md:px-14">
          <div class="absolute inset-0 bg-grain opacity-60" aria-hidden="true"></div>
          <div class="relative max-w-xl">
            <h2 class="font-display text-5xl leading-tight">Give your next product the spotlight.</h2>
            <p class="mt-4 text-ivory-200/85">Free to use. No credit card. Your first card takes about ten seconds.</p>
            <a routerLink="/studio" class="btn btn-gold btn-lg mt-8"><app-icon name="sparkles" [size]="18" /> Create a card</a>
          </div>
          <img src="brand/kabir-bust.webp" alt="" width="390" height="470" loading="lazy" class="absolute -bottom-2 right-6 hidden h-[115%] w-auto drop-shadow-2xl md:block" />
        </div>
      </section>
    </main>
    <app-site-footer />
  `,
  styles: `
    .float-card {
      position: absolute;
      filter: drop-shadow(0 24px 30px rgb(0 0 0 / 0.22));
      animation: float 7s ease-in-out infinite;
      transform: rotate(var(--float-rot));
    }
  `,
})
export default class LandingPage {
  protected readonly cards = HERO_CARDS;
  protected readonly features = FEATURES;
  protected readonly steps = [
    { emoji: 'magic-wand', title: 'Describe it', body: 'A product name and a category are enough. Add audience, tone, features or price if you like.' },
    { emoji: 'sparkles', title: 'Generate details', body: 'AI returns a title, a short description and keywords as validated JSON, in a few seconds.' },
    { emoji: 'package', title: 'Style & export', body: 'Pick one of six templates, polish the words, then save or export as PNG, JSON or HTML.' },
  ];
  protected readonly stats = [
    { label: 'Templates', value: '6' },
    { label: 'Languages', value: '8' },
    { label: 'AI providers', value: '2' },
    { label: 'Price', value: '₹0' },
  ];
}
