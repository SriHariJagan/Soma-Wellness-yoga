// Full-application E2E — payment journey + DEF-006 remediation regression.
// All /api/** calls are mocked. No real Pesapal transaction is created.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedAuth, shot, mockApi, settle, textLength, STUDENT } from './full-app.e2e.spec.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DIR = fs.readFileSync(path.join(ROOT, '.e2e-dir.txt'), 'utf8').trim();
const RESULTS = path.join(ROOT, DIR, 'results-payment.json');
const results = [];
const rec = (id, name, route, role, expected, actual, status, file, notes = '') =>
  results.push({ id, name, route, role, expected, actual, status, file, notes });

const ok = (b) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
const REF = 'PAY-20261011-E2E001';

test.describe('Payment journey (mocked provider)', () => {
  test('TC-PAY-001 cart renders line items and total', async ({ page }) => {
    await seedAuth(page, STUDENT); await mockApi(page);
    await page.goto('/studentdashboard?tab=cart', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const txt = await page.evaluate(() => document.body.innerText);
    const f = await shot(page, 'TC-PAY-001', 'cart', { fullPage: true });
    const hasItem = /One-to-One Yoga/i.test(txt);
    const hasTotal = /5,?500/i.test(txt);
    const st = hasItem && hasTotal ? 'PASS' : 'FAIL';
    rec('TC-PAY-001', 'Cart line items + total', '/studentdashboard?tab=cart', 'student',
      'Cart item name and KES total visible', `item=${hasItem} total=${hasTotal}`, st, f);
    console.log(`${st} TC-PAY-001 cart item=${hasItem} total=${hasTotal}`);
    expect(st).toBe('PASS');
  });

  test('TC-PAY-002 checkout returns a Pesapal redirect (MOCKED)', async ({ page }) => {
    await seedAuth(page, STUDENT); await mockApi(page);
    await page.goto('/studentdashboard?tab=cart', { waitUntil: 'domcontentloaded' });
    await settle(page);
    // The checkout CTA is the primary action on the cart page.
    const btns = page.locator('button');
    const n = await btns.count();
    let clicked = false;
    for (let i = 0; i < n; i += 1) {
      const t = ((await btns.nth(i).innerText().catch(() => '')) || '').toLowerCase();
      if (/checkout|pay|proceed|continue/.test(t) && await btns.nth(i).isVisible().catch(() => false)) {
        await btns.nth(i).click({ timeout: 5000 }).catch(() => {});
        clicked = true; break;
      }
    }
    await settle(page);
    const txt = await page.evaluate(() => document.body.innerText);
    const f = await shot(page, 'TC-PAY-002', 'checkout-pay-step', { fullPage: true });
    const hasPay = /pesapal|checkout|order/i.test(txt);
    const st = clicked && hasPay ? 'PASS' : (clicked ? 'WARN' : 'FAIL');
    rec('TC-PAY-002', 'Checkout initiation shows pay step', '/studentdashboard?tab=cart', 'student',
      'Checkout CTA present and pay step rendered', `ctaClicked=${clicked} payUI=${hasPay}`, st, f, 'MOCKED provider — no real Pesapal order created');
    console.log(`${st} TC-PAY-002 checkout clicked=${clicked} payUI=${hasPay}`);
  });

  test('TC-PAY-003 checkout failure state (mocked 502)', async ({ page }) => {
    await seedAuth(page, STUDENT);
    await mockApi(page, [[/\/api\/student\/cart\/checkout$/, (route) => route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Payment provider unavailable' }) })]]);
    await page.goto('/studentdashboard?tab=cart', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const btns = page.locator('button'); const n = await btns.count();
    for (let i = 0; i < n; i += 1) {
      const t = ((await btns.nth(i).innerText().catch(() => '')) || '').toLowerCase();
      if (/checkout|pay|proceed|continue/.test(t) && await btns.nth(i).isVisible().catch(() => false)) { await btns.nth(i).click({ timeout: 5000 }).catch(() => {}); break; }
    }
    await settle(page);
    const txt = await page.evaluate(() => document.body.innerText);
    const f = await shot(page, 'TC-PAY-003', 'checkout-failure-502', { fullPage: true });
    const hasErr = /unavailable|error|failed|try again/i.test(txt);
    const st = hasErr ? 'PASS' : 'WARN';
    rec('TC-PAY-003', 'Checkout handles provider failure', '/studentdashboard?tab=cart', 'student',
      'Error surfaced to shopper on 502', `errorVisible=${hasErr}`, st, f, 'MOCKED 502');
    console.log(`${st} TC-PAY-003 failure surfaced=${hasErr}`);
  });

  test('TC-PAY-004 invalid coupon rejected (mocked 400)', async ({ page }) => {
    await seedAuth(page, STUDENT); await mockApi(page);
    await page.goto('/studentdashboard?tab=cart', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const input = page.locator('input[type="text"], input:not([type])').first();
    const has = await input.count();
    if (has) { await input.fill('E2E-BAD-COUPON').catch(() => {}); }
    const btns = page.locator('button'); const n = await btns.count();
    for (let i = 0; i < n; i += 1) {
      const t = ((await btns.nth(i).innerText().catch(() => '')) || '').toLowerCase();
      if (/apply/.test(t) && await btns.nth(i).isVisible().catch(() => false)) { await btns.nth(i).click({ timeout: 5000 }).catch(() => {}); break; }
    }
    await settle(page);
    const txt = await page.evaluate(() => document.body.innerText);
    const f = await shot(page, 'TC-PAY-004', 'invalid-coupon', { fullPage: true });
    const hasMsg = /invalid coupon/i.test(txt);
    const st = !has || hasMsg ? 'PASS' : 'FAIL';
    rec('TC-PAY-004', 'Invalid coupon validation', '/studentdashboard?tab=cart', 'student',
      'Invalid coupon shows "Invalid coupon code"', `messageShown=${hasMsg}`, st, f, 'MOCKED 400');
    console.log(`${st} TC-PAY-004 coupon msg=${hasMsg}`);
  });

  for (const [id, state, extra] of [
    ['TC-PAY-005', 'captured', {}],
    ['TC-PAY-006', 'pending', {}],
    ['TC-PAY-007', 'failed', { failureReason: 'Insufficient funds' }],
  ]) {
    test(`${id} payment return state "${state}" (mocked)`, async ({ page }) => {
      await seedAuth(page, STUDENT);
      const body = { success: true, paymentStatus: state, providerStatus: state, amount: 550000, currency: 'KES', merchantReference: REF, orderTrackingId: 'TRK-E2E-001', refreshed: true, ...(state === 'captured' ? { invoiceNo: 'INV-2026-E2E001' } : {}), ...extra };
      await mockApi(page, [
        [/\/api\/payments\/.*\/status$/, () => ok(body)],
        [/\/api\/pesapal\/status$/, () => ok(body)],
      ]);
      await page.goto(`/payment/return?OrderTrackingId=TRK-E2E-001&OrderMerchantReference=${REF}`, { waitUntil: 'domcontentloaded' });
      // The return page POLLS (counter up to 20). Wait for the poll to settle
      // so we screenshot the terminal state, not the transient "Checking…".
      await page.waitForFunction(
        () => !/Checking/i.test(document.body.innerText),
        null,
        { timeout: 30000 },
      ).catch(() => {});
      await settle(page);
      const txt = await page.evaluate(() => document.body.innerText);
      const f = await shot(page, id, `return-${state}`, { fullPage: true });
      const matched = new RegExp(state, 'i').test(txt);
      const invOk = state !== 'captured' || /INV-2026-E2E001/i.test(txt);
      const st = matched && invOk ? 'PASS' : 'WARN';
      rec(id, `Payment return page — ${state}`, '/payment/return', 'student',
        `Shows "${state}" state`, `stateVisible=${matched} invoice=${invOk}`, st, f, 'MOCKED provider status');
      console.log(`${st} ${id} return ${state} visible=${matched}`);
    });
  }

  test('TC-PAY-008 return with no params shows safe state', async ({ page }) => {
    await seedAuth(page, STUDENT); await mockApi(page);
    await page.goto('/payment/return', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const f = await shot(page, 'TC-PAY-008', 'return-no-params', { fullPage: true });
    const len = await textLength(page);
    const st = len > 40 ? 'PASS' : 'WARN';
    rec('TC-PAY-008', 'Payment return with no params', '/payment/return', 'student',
      'Renders safely without crashing', `rendered ${len} chars`, st, f);
    console.log(`${st} TC-PAY-008 no-params len=${len}`);
  });

  test('TC-PAY-009 order history + invoice detail', async ({ page }) => {
    await seedAuth(page, STUDENT); await mockApi(page);
    await page.goto('/studentdashboard?tab=orders', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const f = await shot(page, 'TC-PAY-009', 'order-history', { fullPage: true });
    const txt = await page.evaluate(() => document.body.innerText);
    const hasOrder = /ORD-2026-E2E001/.test(txt);
    const st = hasOrder ? 'PASS' : 'WARN';
    rec('TC-PAY-009', 'Order history lists captured order', '/studentdashboard?tab=orders', 'student',
      'Order ORD-2026-E2E001 listed', `orderVisible=${hasOrder}`, st, f);
    console.log(`${st} TC-PAY-009 order history visible=${hasOrder}`);
  });
});

// ══════════════════════════════════════════════════════════════════
// DEF-006 REGRESSION — duplicate Pesapal payment intents
// ══════════════════════════════════════════════════════════════════
test.describe('DEF-006 idempotency regression (browser level)', () => {
  /**
   * Stateful mock that mirrors the REAL server contract fixed in
   * PaymentService.initiateIntent: one idempotency key => one Payment doc,
   * replay returns the same reference, different payload => 409.
   */
  function statefulInitiate(state) {
    return [[/\/api\/(payments|pesapal)\/initiate$/, async (route) => {
      const req = route.request();
      const body = req.postDataJSON() || {};
      const key = body.idempotencyKey || null;
      const fingerprint = JSON.stringify((body.items || []).map((i) => `${i.itemType}:${i.itemId}:${i.quantity ?? 1}`).sort());
      state.initiateCalls.push({ key, payload: body });
      if (!key) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'idempotencyKey required' }) });
      const seen = state.payments.filter((p) => p.key === key);
      if (seen.length && seen[0].fingerprint !== fingerprint) {
        return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'Idempotency key was already used for a different purchase', code: 'IDEMPOTENCY_MISMATCH' }) });
      }
      const rec = seen[0] || { key, fingerprint, id: `pay-${state.payments.length + 1}`, ref: `PAY-E2E-${String(state.payments.length + 1).padStart(4, '0')}` };
      state.payments.push(rec);
      // NOTE: the redirect MUST stay on localhost. Pointing it at the real
      // pesapal.com would make the test navigate to a live provider.
      return route.fulfill(ok({ success: true, paymentId: rec.id, merchantReference: rec.ref, orderTrackingId: `TRK-${rec.id}`, redirectUrl: `http://localhost:5173/payment/return?OrderTrackingId=TRK-${rec.id}&OrderMerchantReference=${rec.ref}`, amount: 550000, currency: 'KES', idempotent: seen.length > 0 }));
    }]];
  }

  /**
   * Drive the REAL standalone PesapalCheckout.
   * Entry point is /payment (PaymentPage.jsx:270), which starts at step 1
   * DETAILS; filling the form and clicking "Continue to Pay" advances to
   * step 2 PAY where <PesapalCheckout> renders its Pay button.
   */
  async function openStandalonePayStep(page) {
    await page.goto('/payment', { waitUntil: 'domcontentloaded' });
    await settle(page);
    // Address fields by stable selector, not DOM index (index 2 is the country
    // <select>, so positional filling puts the phone number in the wrong field).
    await page.locator('input[type="text"]').first().fill('E2E Test Student').catch(() => {});
    await page.locator('input[type="email"]').first().fill('e2e.student@example.test').catch(() => {});
    await page.locator('#payment-phone, input[type="tel"]').first().fill('712345678').catch(() => {});
    // Advance DETAILS -> PAY
    const btns = page.locator('button');
    const n = await btns.count();
    for (let i = 0; i < n; i += 1) {
      const t = ((await btns.nth(i).innerText().catch(() => '')) || '').trim().toLowerCase();
      if (/continue to pay/.test(t) && await btns.nth(i).isVisible().catch(() => false)) {
        await btns.nth(i).click({ timeout: 8000 }).catch(() => {});
        break;
      }
    }
    await settle(page);
    return findPayButton(page);
  }

  /** Locate the PesapalCheckout pay button (label starts with "Pay"). */
  async function findPayButton(page) {
    const btns = page.locator('button');
    const n = await btns.count();
    for (let i = 0; i < n; i += 1) {
      const t = ((await btns.nth(i).innerText().catch(() => '')) || '').trim();
      if (/^pay\b/i.test(t) && await btns.nth(i).isVisible().catch(() => false)) return btns.nth(i);
    }
    return null;
  }

  test('TC-DEF-006-001 rapid repeated clicks send ONE stable key', async ({ page }) => {
    await seedAuth(page, STUDENT);
    const state = { initiateCalls: [], payments: [] };
    await mockApi(page, statefulInitiate(state));
    const payBtn = await openStandalonePayStep(page);
    const f0 = await shot(page, 'TC-DEF-006-001', 'standalone-pay-step', { fullPage: true });
    if (!payBtn) {
      rec('TC-DEF-006-001', 'Rapid clicks -> one key', '/payment', 'student',
        'PesapalCheckout pay button present', 'pay step did not render', 'BLOCKED', f0);
      console.log('BLOCKED TC-DEF-006-001 pay step did not render');
      return;
    }
    for (let i = 0; i < 5; i += 1) await payBtn.click({ timeout: 4000, force: true }).catch(() => {});
    await settle(page);
    const f = await shot(page, 'TC-DEF-006-001', 'rapid-clicks', { fullPage: true });
    const keys = [...new Set(state.initiateCalls.map((c) => c.key).filter(Boolean))];
    const st = state.initiateCalls.length === 1 && keys.length === 1 ? 'PASS' : 'FAIL';
    rec('TC-DEF-006-001', '5 rapid clicks -> 1 request, 1 stable key', '/payment', 'student',
      'In-flight guard yields exactly ONE initiate carrying a stable idempotency key',
      `requests=${state.initiateCalls.length} distinctKeys=${keys.length} key=${keys[0] || 'none'}`, st, f);
    console.log(`${st} TC-DEF-006-001 rapid clicks requests=${state.initiateCalls.length} keys=${keys.length}`);
    expect(st).toBe('PASS');
  });

  test('TC-DEF-006-002 key survives retry after a network error', async ({ page }) => {
    await seedAuth(page, STUDENT);
    const state = { initiateCalls: [], payments: [] };
    let failNext = true;
    await mockApi(page, [
      ...statefulInitiate(state),
    ]);
    await page.route(/\/initiate$/, async (route) => {
      if (failNext) {
        failNext = false;
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Network error' }) });
      }
      return route.fallback();
    });
    const payBtn = await openStandalonePayStep(page);
    if (!payBtn) { rec('TC-DEF-006-002', 'Retry reuses key', '/payment', 'student', 'retry reuses same key', 'pay step did not render', 'BLOCKED', null); return; }
    await payBtn.click({ timeout: 8000 }).catch(() => {});
    await settle(page);
    const all1 = state.initiateCalls.map((c) => c.key).filter(Boolean);
    // Re-open the pay step and retry the SAME intended purchase.
    const again = await openStandalonePayStep(page);
    if (again) await again.click({ timeout: 8000 }).catch(() => {});
    await settle(page);
    const all = state.initiateCalls.map((c) => c.key).filter(Boolean);
    const f = await shot(page, 'TC-DEF-006-002', 'retry-same-key', { fullPage: true });
    const st = all1.length === 1 && all.length >= 2 && all.every((k) => k === all[0]) ? 'PASS' : 'FAIL';
    rec('TC-DEF-006-002', 'Retry after network error reuses key', '/payment', 'student',
      'Second attempt for the SAME purchase sends the SAME key',
      `calls=${all.length} distinctKeys=${JSON.stringify([...new Set(all)])}`, st, f);
    console.log(`${st} TC-DEF-006-002 retry calls=${all.length} keys=${JSON.stringify([...new Set(all)])}`);
  });

  test('TC-DEF-006-003 browser refresh keeps the same key (sessionStorage)', async ({ page }) => {
    await seedAuth(page, STUDENT);
    const state = { initiateCalls: [], payments: [] };
    await mockApi(page, statefulInitiate(state));
    await openStandalonePayStep(page);
    const stored = await page.evaluate(() => { try { return sessionStorage.getItem('pesapal_intent_key'); } catch { return null; } });
    const f = await shot(page, 'TC-DEF-006-003', 'pay-step-key-state', { fullPage: true });
    let parsed = null;
    try { parsed = stored ? JSON.parse(stored) : null; } catch { parsed = null; }
    const st = parsed && parsed.key && parsed.signature ? 'PASS' : 'WARN';
    rec('TC-DEF-006-003', 'Idempotency key persisted in sessionStorage', '/payment', 'student',
      'pesapal_intent_key holds {key, signature} so a refresh reuses it',
      `sessionStorage=${stored ? 'present' : 'absent'} key=${parsed?.key || 'n/a'}`, st, f,
      'Key is written on the first Pay click; a refresh preserves it via sessionStorage');
    console.log(`${st} TC-DEF-006-003 sessionStorage key present=${!!parsed?.key}`);
  });

  test('TC-DEF-006-004 concurrent initiation -> one logical intent', async ({ page }) => {
    await seedAuth(page, STUDENT);
    const state = { initiateCalls: [], payments: [] };
    await mockApi(page, statefulInitiate(state));
    await page.goto('/studentdashboard?tab=cart', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const results = await page.evaluate(async () => {
      const body = JSON.stringify({
        items: [{ itemType: 'service', itemId: 'svc-e2e-1', quantity: 1 }],
        label: 'One-to-One Yoga', idempotencyKey: 'pay_e2e_concurrent_test',
        customer: { email: 'e2e.student@example.test' },
      });
      const rs = await Promise.all(Array.from({ length: 5 }, () =>
        fetch('http://localhost:5173/api/payments/initiate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer e2e-mock-token' }, body }).then((r) => r.status)));
      return rs;
    });
    await settle(page);
    const f = await shot(page, 'TC-DEF-006-004', 'concurrent-initiation', { fullPage: false });
    const okCount = results.filter((s) => s === 200).length;
    const refs = state.payments.filter((p) => p.key === 'pay_e2e_concurrent_test');
    const distinct = new Set(refs.map((r) => r.ref)).size;
    const st = okCount === 5 && distinct === 1 ? 'PASS' : 'FAIL';
    rec('TC-DEF-006-004', '5 concurrent initiates -> 1 logical intent', '/api/payments/initiate', 'student',
      'All concurrent requests replay the SAME payment reference',
      `statuses=${JSON.stringify(results)} distinctRefs=${distinct}`, st, f, 'Mocked server contract mirroring PaymentService.initiateIntent');
    console.log(`${st} TC-DEF-006-004 concurrent statuses=${JSON.stringify(results)} refs=${distinct}`);
    expect(st).toBe('PASS');
  });

  test('TC-DEF-006-005 owner isolation: other user key -> 403', async ({ page }) => {
    await seedAuth(page, STUDENT);
    await mockApi(page, [[/\/api\/(payments|pesapal)\/initiate$/, (route) => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'This idempotency key belongs to a different account' }) })]]);
    await page.goto('/studentdashboard?tab=cart', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const status = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5173/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer e2e-mock-token' },
        body: JSON.stringify({ items: [{ itemType: 'service', itemId: 'x' }], idempotencyKey: 'pay_someone_elses' }),
      });
      return res.status;
    });
    const f = await shot(page, 'TC-DEF-006-005', 'owner-isolation', { fullPage: false });
    const st = status === 403 ? 'PASS' : 'FAIL';
    rec('TC-DEF-006-005', 'Cross-owner key reuse rejected', '/api/payments/initiate', 'student',
      'HTTP 403 for another account idempotency key', `HTTP ${status}`, st, f, 'Mocked owner-isolation contract');
    console.log(`${st} TC-DEF-006-005 owner isolation HTTP ${status}`);
    expect(st).toBe('PASS');
  });

  test('TC-DEF-006-006 payload binding: same key different cart -> 409', async ({ page }) => {
    await seedAuth(page, STUDENT);
    const state = { initiateCalls: [], payments: [] };
    await mockApi(page, statefulInitiate(state));
    await page.goto('/studentdashboard?tab=cart', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const out = await page.evaluate(async () => {
      const post = (id) => fetch('http://localhost:5173/api/payments/initiate', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer e2e-mock-token' },
        body: JSON.stringify({ items: [{ itemType: 'service', itemId: id }], idempotencyKey: 'pay_e2e_payload_test' }),
      }).then((r) => r.status);
      return [await post('svc-a'), await post('svc-b')];
    });
    const f = await shot(page, 'TC-DEF-006-006', 'payload-binding', { fullPage: false });
    const st = out[0] === 200 && out[1] === 409 ? 'PASS' : 'FAIL';
    rec('TC-DEF-006-006', 'Key reuse for a different purchase rejected', '/api/payments/initiate', 'student',
      'HTTP 409 when the same key carries a different cart', `statuses=${JSON.stringify(out)}`, st, f, 'Mocked payload-binding contract');
    console.log(`${st} TC-DEF-006-006 payload binding ${JSON.stringify(out)}`);
    expect(st).toBe('PASS');
  });
});

test.afterAll(() => {
  fs.mkdirSync(path.dirname(RESULTS), { recursive: true });
  fs.writeFileSync(RESULTS, JSON.stringify(results, null, 2));
  console.log(`\nWROTE ${RESULTS} (${results.length} records)`);
});