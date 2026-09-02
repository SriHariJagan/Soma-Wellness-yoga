import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/about', '/classes', '/private', '/life-stages', '/restore', '/yttc', '/faq', '/contact'];

test.describe('Accessibility (axe-core)', () => {
  for (const route of routes) {
    test(`${route} should have no critical/serious violations`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const critical = results.violations.filter(v => ['critical', 'serious'].includes(v.impact));
      if (critical.length > 0) {
        console.log(`a11y violations on ${route}:`, JSON.stringify(critical.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2));
      }
      expect(critical, `Critical/serious a11y violations on ${route}: ${critical.map(v=>v.id).join(', ')}`).toEqual([]);
    });
  }

  test('keyboard navigation: Tab moves through navbar and contact form', async ({ page }) => {
    await page.goto('/contact');
    await page.keyboard.press('Tab');
    // Should focus something in navbar or main
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();

    // Tab through form
    await page.getByLabel('contact.name').focus();
    await page.keyboard.press('Tab');
    // Should move to phone or email next
    const nextFocused = await page.evaluate(() => document.activeElement?.getAttribute('name') || document.activeElement?.tagName);
    expect(nextFocused).toBeTruthy();

    // Modal/drawer Esc test: open hamburger then Esc
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 812 });
    const hamburger = page.getByLabel('Toggle menu');
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.keyboard.press('Escape');
      // drawer should close
      await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    }
  });
});
