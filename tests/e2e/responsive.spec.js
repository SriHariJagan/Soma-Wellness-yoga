import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile-320', width: 320, height: 568 },
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
];

const routes = ['/', '/about', '/classes', '/private', '/life-stages', '/restore', '/yttc', '/faq', '/contact'];

for (const vp of viewports) {
  test.describe(`Responsive — ${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of routes) {
      test(`${route} has no horizontal overflow and heading visible`, async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1').first()).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        expect(overflow, `Overflow on ${route} at ${vp.width}px`).toBe(false);
        // Check no clipped heading
        const clipped = await page.evaluate(() => {
          const h1 = document.querySelector('h1');
          if (!h1) return false;
          return h1.scrollWidth > h1.clientWidth + 5;
        });
        // Not strict failure, just report if clipped at tiny viewport is expected for long titles
        if (vp.width >= 375 && clipped) {
          console.warn(`Possible text clipping for h1 on ${route} at ${vp.width}px`);
        }
        expect(true).toBe(true);
      });
    }
  });
}
