import { expect, test as base, type Page } from '@playwright/test';

/** Every test starts with the cookie choice made, so the banner never covers controls. */
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        if (!localStorage.getItem('vitrine.cookie-consent')) {
          localStorage.setItem('vitrine.cookie-consent', JSON.stringify({ necessary: true, preferences: false, decidedAt: Date.now(), version: 1 }));
        }
      } catch {
        /* ignore */
      }
    });
    // Each test looks like a different client so the real per-IP rate limiter stays on
    // without parallel tests throttling each other.
    const octet = () => Math.floor(Math.random() * 250) + 1;
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': `10.${octet()}.${octet()}.${octet()}` });
    await use(page);
  },
});

export { expect };

export async function fillProduct(page: Page, name: string, categoryLabel = 'Fashion & Apparel'): Promise<void> {
  await page.getByLabel('Product name').fill(name);
  await page.locator('#category').click();
  await page.getByRole('menuitemradio', { name: new RegExp(categoryLabel.replace(/[&]/g, '.')) }).click();
}

export async function generate(page: Page): Promise<void> {
  await page.getByTestId('generate').click();
  await expect(page.getByTestId('product-card')).toBeVisible();
}
