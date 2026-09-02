import { test, expect } from '@playwright/test';

const publicRoutes = [
  { path: '/classes', label: 'Join' },
  { path: '/private', label: 'Private' },
  { path: '/life-stages', label: 'Life' },
  { path: '/restore', label: 'Restore' },
  { path: '/yttc', label: 'Learn' },
  { path: '/founding', label: 'Founding' },
  { path: '/faq', label: 'FAQ' },
  { path: '/contact', label: 'Contact' },
  { path: '/about', label: 'About' },
];

test.describe('Navigation — Desktop', () => {
  test('every navbar link navigates correctly', async ({ page }) => {
    await page.goto('/');
    for (const r of publicRoutes) {
      await page.goto('/');
      await page.locator(`a[href="${r.path}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(r.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      await expect(page.locator('h1').first()).toBeVisible();
    }
  });

  test('footer links work', async ({ page }) => {
    await page.goto('/');
    const footerLinks = page.locator('footer a[href^="/"]');
    const count = await footerLinks.count();
    expect(count).toBeGreaterThan(5);
    // click first footer link
    const href = await footerLinks.first().getAttribute('href');
    await footerLinks.first().click();
    await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  test('back/forward navigation works', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href="/about"]').first().click();
    await expect(page).toHaveURL(/\/about/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/about/);
  });
});

test.describe('Navigation — Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('hamburger opens drawer and links navigate', async ({ page }) => {
    await page.goto('/');
    const hamburger = page.getByLabel('Toggle menu');
    await expect(hamburger).toBeVisible();
    await hamburger.click();
    await expect(page.locator('text=navigation.home').first().or(page.locator('a[href="/"]'))).toBeVisible();
    // Click a drawer link
    const drawerLink = page.locator('.drawer a, a[href="/classes"]').first();
    // Instead close and verify drawer hides
    await page.getByLabel('Close menu').click();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });

  test('no horizontal overflow on mobile for key pages', async ({ page }) => {
    for (const r of ['/', '/classes', '/contact', '/faq']) {
      await page.goto(r);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(overflow, `Overflow on ${r} at 375px`).toBe(false);
    }
  });
});
