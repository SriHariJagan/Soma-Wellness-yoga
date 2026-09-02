import { test, expect } from '@playwright/test';

test.describe('Homepage Journey (P0)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') console.log('console.error:', msg.text());
    });
  });

  test('loads with correct title, heading and no console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto('/');
    await expect(page).toHaveTitle(/Soma Wellness/i);
    await expect(page.locator('h1').first()).toBeVisible();
    // Check footer present
    await expect(page.locator('footer')).toBeVisible();
    // Navbar
    await expect(page.getByLabel('Soma Wellness — Home')).toBeVisible();

    // No uncaught exceptions
    expect(errors, `Unexpected console/page errors: ${errors.join('\n')}`).toEqual([]);
  });

  test('primary CTA navigates to /classes and back', async ({ page }) => {
    await page.goto('/');
    // CTA is link to /classes — could be multiple; pick first
    const cta = page.locator('a[href="/classes"]').first();
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/classes/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('footer')).toBeVisible();
  });

  test('scroll through major sections without horizontal overflow', async ({ page }) => {
    await page.goto('/');
    // Scroll gradually
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, 'Unexpected horizontal overflow detected').toBe(false);
  });

  test('deep link and refresh works', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('h1').first()).toBeVisible();
    await page.reload();
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page).toHaveURL(/\/about/);
  });

  test('404 catch-all redirects to home', async ({ page }) => {
    await page.goto('/this-does-not-exist-xyz-123');
    // App catches all as Navigate to "/" — URL should become "/"
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
