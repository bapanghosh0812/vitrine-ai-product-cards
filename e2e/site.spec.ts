import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

test.describe('Public pages and SEO', () => {
  test('landing page is prerendered with SEO metadata', async ({ page, request }) => {
    const raw = await (await request.get('/')).text();
    expect(raw).toContain('Products,');
    expect(raw).toContain('application/ld+json');
    expect(raw).toContain('"@type": "SoftwareApplication"');
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('beautifully');
    await expect(page).toHaveTitle(/Vitrine/);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/^https:\/\//);
    expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toContain('/brand/og-image.png');
  });

  test('hero call to action opens the Studio without signing in', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('hero-cta').click();
    await expect(page).toHaveURL(/\/studio$/);
    await expect(page.getByRole('heading', { name: 'Describe your product' })).toBeVisible();
  });

  test('help center search filters articles and opens one', async ({ page }) => {
    await page.goto('/help');
    await page.getByLabel('Search help articles').fill('export png');
    await expect(page.getByRole('link', { name: /Export PNG, JSON and HTML/ })).toBeVisible();
    await page.getByRole('link', { name: /Export PNG, JSON and HTML/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Export PNG, JSON and HTML' })).toBeVisible();
  });

  test('legal pages render the long Terms with a table of contents', async ({ page, isMobile }) => {
    await page.goto('/legal/terms');
    await expect(page.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /23\. Governing law/ })).toBeAttached();
    if (!isMobile) await expect(page.getByRole('navigation', { name: 'On this page' }).locator('ol a')).toHaveCount(26);
  });

  test('sitemap and robots are published', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('<urlset');
    expect(sitemap).toContain('/legal/privacy');
    expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap:');
  });

  test('unknown routes show the 404 page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.getByRole('heading', { name: /This shelf is/ })).toBeVisible();
  });
});

test.describe('App shell', () => {
  test('theme can be switched to dark from Settings', async ({ page }) => {
    await page.goto('/settings/appearance');
    await page.getByRole('radio', { name: /^Dark/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('settings search jumps to a section', async ({ page }) => {
    await page.goto('/settings');
    await page.getByLabel('Search settings').fill('watermark');
    await page.getByRole('link', { name: /Watermark/ }).click();
    await expect(page).toHaveURL(/\/settings\/export$/);
  });

  test('sign-up requires reading the Terms to the end before accepting', async ({ page }) => {
    await page.goto('/auth/sign-up');
    await page.getByRole('button', { name: 'Terms of Service' }).click();
    const accept = page.getByTestId('terms-accept');
    await expect(accept).toBeDisabled();
    await page.getByTestId('terms-scroll').evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(accept).toBeEnabled();
    await accept.click();
    await expect(page.locator('#su-terms')).toBeChecked();
  });

  test('sign-in offers a passwordless email link', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await page.getByTestId('use-link').click();
    await expect(page.getByTestId('send-link')).toBeVisible();
    await expect(page.locator('#password')).toHaveCount(0);
    await page.getByTestId('send-link').click();
    await expect(page.getByText('Please enter a valid email.')).toBeVisible();
    await page.getByRole('button', { name: 'Sign in with a password instead' }).click();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('forgot password validates the email without reloading the page', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText('Please enter a valid email.')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/forgot-password$/);
  });

  test('a fake email sign-in link is rejected', async ({ page }) => {
    await page.goto('/auth/email-link?mode=signIn&oobCode=not-a-real-code');
    await expect(page.getByTestId('link-invalid')).toBeVisible();
  });

  test('mobile shows the bottom navigation', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile only');
    await page.goto('/studio');
    const nav = page.getByRole('navigation', { name: 'Primary' }).last();
    await expect(nav.getByRole('link', { name: 'Library' })).toBeVisible();
  });
});

test.describe('Ask Kabir support bot', () => {
  test('answers from the help center with sources', async ({ page }) => {
    await page.goto('/studio');
    await page.getByTestId('kabir-launcher').click();
    const panel = page.getByTestId('kabir-panel');
    await expect(panel).toBeVisible();
    await panel.getByTestId('kabir-input').fill('How do I export a PNG?');
    await panel.getByRole('button', { name: 'Send' }).click();
    await expect(panel.locator('[data-role="assistant"]').last()).toContainText(/Export/i);
    await expect(panel.getByText('Sources:')).toBeVisible();
  });

  test('guests can open a support ticket and get a ticket ID', async ({ page }) => {
    await page.goto('/help');
    await page.getByTestId('kabir-launcher').click();
    await page.getByRole('button', { name: /Talk to a human/ }).click();
    const panel = page.getByTestId('kabir-panel');
    await panel.getByLabel('Your name').fill('Asha Rao');
    await panel.getByLabel('Email').fill('asha@example.com');
    await panel.getByLabel(/Phone/).fill('+91 98765 43210');
    await panel.getByLabel('Subject').fill('PNG export question');
    await panel.getByLabel('How can we help?').fill('My PNG export looks blurry on my phone. Any tips?');
    await panel.getByTestId('ticket-submit').click();
    await expect(panel.getByTestId('ticket-id')).toHaveText(/^VT-[A-Z0-9]{6}$/);
    await expect(panel.getByText('A confirmation is on its way to')).toBeVisible();
  });
});

test.describe('Accessibility (axe, WCAG 2.1 AA)', () => {
  for (const path of ['/', '/studio', '/help', '/legal/privacy', '/settings', '/auth/sign-in', '/templates']) {
    test(`no serious violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.length} node(s) e.g. ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
    });
  }
});
