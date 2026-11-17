import { expect, fillProduct, generate, test } from './fixtures';

test.describe('Studio: core flow (assignment requirements)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio');
    await expect(page.getByRole('heading', { name: 'Describe your product' })).toBeVisible();
  });

  test('validates required fields before calling the AI', async ({ page }) => {
    let calls = 0;
    page.on('request', (r) => r.url().includes('/api/generate') && calls++);
    await page.getByTestId('generate').click();
    await expect(page.getByText('Please enter a product name.')).toBeVisible();
    await expect(page.getByText('Please choose a category.')).toBeVisible();
    expect(calls).toBe(0);
  });

  test('generates title, description and keywords and renders a styled card', async ({ page }) => {
    await fillProduct(page, 'Handwoven Banarasi silk saree');
    await generate(page);
    const card = page.getByTestId('product-card');
    await expect(card).toContainText('Handwoven Banarasi silk saree');
    await expect(page.getByTestId('keywords').locator('li')).not.toHaveCount(0);
    await expect(page.getByTestId('provider-meta')).toContainText('Offline mock engine');
    await expect(page.getByTestId('edit-title')).not.toHaveValue('');
    await expect(page.getByTestId('edit-description')).not.toHaveValue('');
  });

  test('inline edit updates the card, undo and redo restore it', async ({ page }) => {
    await fillProduct(page, 'Brass and teak table lamp', 'Home & Living');
    await generate(page);
    const title = page.getByTestId('edit-title');
    const original = await title.inputValue();
    await title.fill('A lamp worth a spotlight');
    await expect(page.getByTestId('product-card')).toContainText('A lamp worth a spotlight');
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByTestId('product-card')).toContainText(original);
    await page.getByRole('button', { name: 'Redo' }).click();
    await expect(page.getByTestId('product-card')).toContainText('A lamp worth a spotlight');
  });

  test('switches between the six templates', async ({ page }) => {
    await fillProduct(page, 'Aura Pro earbuds', 'Audio');
    await generate(page);
    for (const name of ['Minimal', 'Glass', 'Bold', 'Instagram post', 'Marketplace listing', 'Luxe Gold']) {
      await page.getByRole('radio', { name }).click();
      await expect(page.getByRole('radio', { name })).toHaveAttribute('aria-checked', 'true');
    }
  });

  test('three variations can be compared', async ({ page }) => {
    await fillProduct(page, 'Single-origin cold brew coffee', 'Food & Gourmet');
    await page.getByRole('button', { name: /More options/ }).click();
    await page.getByRole('radio', { name: '3' }).click();
    await generate(page);
    await expect(page.getByRole('tab')).toHaveCount(3);
    await page.getByRole('tab', { name: 'Variation 3' }).click();
    await expect(page.getByRole('tab', { name: 'Variation 3' })).toHaveAttribute('aria-selected', 'true');
  });

  test('regenerates a single field', async ({ page }) => {
    await fillProduct(page, 'Kundan polki choker', 'Jewellery');
    await generate(page);
    const before = await page.getByTestId('edit-title').inputValue();
    await page.getByRole('button', { name: 'Regenerate title' }).click();
    await expect(page.getByTestId('edit-title')).not.toHaveValue(before);
  });

  test('saves to the guest library', async ({ page }) => {
    await fillProduct(page, 'Monstera in terracotta', 'Plants & Garden');
    await generate(page);
    await page.getByTestId('save').click();
    await expect(page.getByText('Saved to Library')).toBeVisible();
    await page.goto('/library');
    await expect(page.getByRole('heading', { name: 'Your cards' })).toBeVisible();
    await expect(page.getByText('Monstera in terracotta', { exact: true })).toBeVisible();
  });

  test('exports JSON with the generated copy', async ({ page }) => {
    await fillProduct(page, 'Meridian automatic watch', 'Watches');
    await generate(page);
    await page.getByRole('button', { name: 'Export' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'JSON data' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.json$/);
  });

  test('shows a friendly error and cooldown when rate limited', async ({ page }) => {
    await page.route('**/api/generate', (route) =>
      route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { code: 'rate_limited', message: 'Easy there! Please wait 20s before trying again.', retryAfter: 20 } }) }),
    );
    await fillProduct(page, 'Stride X running shoes', 'Footwear');
    await page.getByTestId('generate').click();
    await expect(page.getByText('Slow down a little')).toBeVisible();
    await expect(page.getByTestId('generate')).toContainText('Try again in');
  });
});

test.describe('Security: XSS', () => {
  test('AI output containing HTML is rendered as text, not executed', async ({ page }) => {
    await page.route('**/api/generate', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          variations: [
            {
              title: '<img src=x onerror="window.__xss=1">Pwned',
              description: '<script>window.__xss=2</script> A long enough description to look like product copy for testing.',
              keywords: ['<b>bold</b>', 'safe', 'text', 'only'],
            },
          ],
          provider: 'mock',
          model: 'evil',
          latencyMs: 1,
          fallbackUsed: false,
        }),
      }),
    );
    await page.goto('/studio');
    await fillProduct(page, 'Test product');
    await generate(page);
    await expect(page.getByTestId('product-card')).toContainText('<img src=x onerror="window.__xss=1">Pwned');
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    expect(await page.getByTestId('product-card').locator('img[onerror], script, b').count()).toBe(0);
  });
});
