import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SHOT = (n) => `evidence/screenshots/${n}`;

test.describe('email template renders (read-only)', () => {
  test.use({ viewport: { width: 1280, height: 2000 } });
  for (const [file, out] of [
    ['server/email-previews/04-payment-success.html', 'PAY-046_payment-confirmed-email.png'],
    ['server/email-previews/07-invoice.html', 'PAY-045_tax-invoice-email.png'],
  ]) {
    test(`template ${out} (mocked)`, async ({ page }) => {
      fs.mkdirSync('evidence/screenshots', { recursive: true });
      await page.goto(pathToFileURL(path.resolve(file)).href);
      await page.waitForTimeout(1500);
      const s = await page.context().newCDPSession(page);
      const { data } = await s.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      fs.writeFileSync(SHOT(out), Buffer.from(data, 'base64'));
      await s.detach().catch(() => {});
    });
  }
});
