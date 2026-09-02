import { test, expect } from '@playwright/test';

test.describe('Contact Journey (P0)', () => {
  test('renders form and validates required fields', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByLabel('contact.name')).toBeVisible();
    await expect(page.getByLabel('contact.emailLabel')).toBeVisible();

    // Attempt submit empty — browser required should block
    const submit = page.getByRole('button', { name: /contact\.send/ });
    await submit.click();
    // At least one field should be invalid (HTML5)
    const nameValid = await page.getByLabel('contact.name').evaluate(el => el.validity.valid);
    expect(nameValid).toBe(false);
  });

  test('submit valid data shows success (mocked API)', async ({ page }) => {
    // Mock /api/leads to succeed
    await page.route('**/api/leads', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    await page.goto('/contact');
    await page.getByLabel('contact.name').fill('Amina Test');
    await page.getByLabel('contact.emailLabel').fill('amina@test.com');
    await page.getByLabel('contact.messageLabel').fill('Hello Soma, I would like to know about memberships.');
    await page.getByRole('button', { name: /contact\.send/ }).click();
    await expect(page.getByText('contact.thankYou')).toBeVisible({ timeout: 5000 });
    // Form should have been reset
    await expect(page.getByLabel('contact.name')).toHaveValue('');
  });

  test('submit handles 500 error with alert', async ({ page }) => {
    await page.route('**/api/leads', async route => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Server error' }) });
    });
    await page.goto('/contact');
    await page.getByLabel('contact.name').fill('Amina');
    await page.getByLabel('contact.emailLabel').fill('amina@test.com');
    await page.getByLabel('contact.messageLabel').fill('Hi');
    await page.getByRole('button', { name: /contact\.send/ }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('handles invalid email type mismatch', async ({ page }) => {
    await page.goto('/contact');
    const email = page.getByLabel('contact.emailLabel');
    await email.fill('not-an-email');
    const valid = await email.evaluate(el => el.validity.valid);
    expect(valid).toBe(false);
    expect(await email.evaluate(el => el.validationMessage.length > 0)).toBe(true);
  });

  test('Form handles XSS-like input safely (no script execution)', async ({ page }) => {
    let requestedBody = null;
    await page.route('**/api/leads', async route => {
      requestedBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/contact');
    await page.getByLabel('contact.name').fill('<script>alert(1)</script>');
    await page.getByLabel('contact.emailLabel').fill('x@test.com');
    await page.getByLabel('contact.messageLabel').fill('<img src=x onerror=alert(1)>');
    await page.getByRole('button', { name: /contact\.send/ }).click();
    await expect(page.getByText('contact.thankYou')).toBeVisible();
    expect(requestedBody.name).toBe('<script>alert(1)</script>');
    // No alert dialog should have appeared — if XSS executed, an alert would block
    // Ensure no script tag was injected outside allowed ld+json
    const scriptCount = await page.evaluate(() => document.querySelectorAll('script:not([type="application/ld+json"])').length);
    expect(scriptCount).toBe(1); // only Vite main script
  });
});
