/**
 * Captures documentation screenshots from the production build (served with production
 * headers). Product copy comes from a fixed sample response so images are reproducible.
 *   PORT=4176 APPLY_HEADERS=1 npx tsx scripts/serve-dist.ts
 *   npx tsx scripts/screenshots.ts http://localhost:4176
 */
import { mkdirSync, rmSync } from 'node:fs';
import { chromium, devices, type Page } from '@playwright/test';
import sharp from 'sharp';

const BASE = (process.argv[2] ?? 'http://localhost:4176').replace(/\/+$/, '');
const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

const SAMPLE = {
  variations: [
    {
      title: 'Banarasi Silk Saree with Pure Zari Border',
      description: 'Hand-woven by Varanasi artisans, this silk saree glows with a pure zari border that catches every light. Heirloom drape for weddings and festive evenings.',
      keywords: ['banarasi saree', 'silk saree', 'zari border', 'wedding saree', 'handloom', 'festive wear'],
    },
    {
      title: 'Heirloom Banarasi Silk Saree, Hand-Woven',
      description: 'Six yards of Varanasi silk, woven slowly by hand. A saree you will pass on, made for the moments you will never forget.',
      keywords: ['heirloom saree', 'varanasi silk', 'bridal saree', 'handwoven', 'gift for her'],
    },
    {
      title: 'Banarasi Silk Saree for Weddings & Festivals',
      description: 'Lustrous silk, intricate zari and a drape that flatters every figure. Ready for weddings, Diwali and every celebration in between.',
      keywords: ['wedding wear', 'diwali saree', 'silk saree online', 'zari work', 'ethnic wear'],
    },
  ],
  // Labelled honestly as sample copy: no live AI call is made while capturing.
  provider: 'mock',
  model: 'sample-copy',
  latencyMs: 0,
  fallbackUsed: false,
};

async function prepare(page: Page, theme: 'light' | 'dark' = 'light') {
  await page.addInitScript((t) => {
    localStorage.setItem('vitrine.cookie-consent', JSON.stringify({ necessary: true, preferences: true, decidedAt: 1, version: 1 }));
    localStorage.setItem('vitrine.settings', JSON.stringify({ theme: t, toasts: false }));
    localStorage.setItem('vitrine.theme-hint', JSON.stringify(t));
  }, theme);
  await page.route('**/api/generate', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLE) }));
}

async function generate(page: Page, variations = 1) {
  await page.goto(`${BASE}/studio`);
  await page.getByLabel('Product name').fill('Handwoven Banarasi silk saree');
  await page.locator('#category').click();
  await page.getByRole('menuitemradio', { name: /Fashion/ }).click();
  if (variations === 3) {
    await page.getByRole('button', { name: /More options/ }).click();
    await page.getByLabel('Price').fill('18900');
    await page.getByRole('radio', { name: '3' }).click();
  }
  await page.getByTestId('generate').click();
  await page.getByTestId('product-card').waitFor();
  await page.waitForTimeout(900);
}

async function shot(page: Page, name: string, fullPage = false) {
  const png = await page.screenshot({ fullPage, animations: 'disabled' });
  await sharp(png).webp({ quality: 84 }).toFile(`${OUT}/${name}.webp`);
  console.log(`${OUT}/${name}.webp`);
}

const browser = await chromium.launch();
try {
  const desktop = { viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1, serviceWorkers: 'block' as const };

  let ctx = await browser.newContext(desktop);
  let page = await ctx.newPage();
  await prepare(page);
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(800);
  await shot(page, 'landing');

  await generate(page, 3);
  await shot(page, 'studio');
  await page.getByRole('radio', { name: 'Marketplace listing' }).click();
  await page.waitForTimeout(500);
  await shot(page, 'studio-marketplace');
  await page.getByTestId('save').click();
  await page.goto(`${BASE}/templates`);
  await page.waitForTimeout(600);
  await shot(page, 'templates');
  await page.goto(`${BASE}/library`);
  await page.waitForTimeout(600);
  await shot(page, 'library');
  await page.goto(`${BASE}/settings/appearance`);
  await page.waitForTimeout(400);
  await shot(page, 'settings');
  await page.goto(`${BASE}/help`);
  await page.getByTestId('kabir-launcher').click();
  await page.getByTestId('kabir-input').fill('How do I export my card as a PNG?');
  await page.getByRole('button', { name: 'Send' }).click();
  await page.locator('[data-role="assistant"]').last().getByText('Sources:').waitFor().catch(() => undefined);
  await page.waitForTimeout(1200);
  await shot(page, 'ask-kabir');
  await page.goto(`${BASE}/auth/sign-up`);
  await page.getByRole('button', { name: 'Terms of Service' }).click();
  await page.waitForTimeout(500);
  await shot(page, 'terms-consent');
  await ctx.close();

  ctx = await browser.newContext(desktop);
  page = await ctx.newPage();
  await prepare(page, 'dark');
  await generate(page, 1);
  await page.getByRole('radio', { name: 'Glass' }).click();
  await page.waitForTimeout(500);
  await shot(page, 'studio-dark');
  await ctx.close();

  ctx = await browser.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  page = await ctx.newPage();
  await prepare(page);
  await generate(page, 1);
  await page.getByTestId('product-card').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await shot(page, 'mobile-studio');
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(700);
  await shot(page, 'mobile-landing');
  await ctx.close();
} finally {
  await browser.close();
}
rmSync('test-results', { recursive: true, force: true });
