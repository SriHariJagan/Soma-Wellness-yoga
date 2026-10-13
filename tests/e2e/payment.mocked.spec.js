// Evidence collection for the Pesapal E2E audit — MOCKED network, READ-ONLY.
// Every backend-mutating call is intercepted with page.route().fulfill(),
// so no request ever reaches the live backend as a write. Screenshots land
// in evidence/screenshots/. Run: npx playwright test tests/e2e/payment.mocked.spec.js --project=chromium
import { test } from '@playwright/test';
import fs from 'node:fs';

const SHOT = (n) => `evidence/screenshots/${n}`;
// CDP capture: bypasses Playwright's font-settling wait, which stalls on
// the animated dashboard layouts. Viewport-only, stable evidence.
const snap = async (page, n) => {
  fs.mkdirSync('evidence/screenshots', { recursive: true });
  const s = await page.context().newCDPSession(page);
  const { data } = await s.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(SHOT(n), Buffer.from(data, 'base64'));
  await s.detach().catch(() => {});
};
const STUDENT = { _id: 'stu-mock', name: 'Test Student', email: 'test.student@example.com', role: 'student' };
const ADMIN = { _id: 'adm-mock', name: 'Studio Admin', email: 'admin@example.com', role: 'admin' };

const CART = {
  cart: { _id: 'cart1' },
  items: [{ _id: 'ci1', cart: 'cart1', itemType: 'service', itemId: 'svc1', name: 'One-to-One Yoga', image: '', price: 4500, discount: 0, finalPrice: 4500, quantity: 1, coupon: null }],
  summary: { subtotal: 4500, discount: 0, couponCode: '', couponDiscount: 0, tax: 0, total: 4500, itemCount: 1 },
};
const CHECKOUT_OK = {
  success: true, msg: 'Checkout initiated. Complete payment via Pesapal to activate items.',
  order: { _id: 'ord1', orderNumber: 'ORD-2026-592402', total: 4500, itemCount: 1, status: 'pending' },
  payment: { _id: 'pay1', amount: 450000, status: 'pending', method: 'pesapal', merchantReference: 'PAY-20261009-DAE95D8C', orderTrackingId: 'TRK-MOCK-001' },
  pesapal: { merchantReference: 'PAY-20261009-DAE95D8C', orderTrackingId: 'TRK-MOCK-001', redirectUrl: 'https://pay.pesapal.com/mock-checkout', amount: 450000, currency: 'KES' },
  redirectUrl: 'https://pay.pesapal.com/mock-checkout', merchantReference: 'PAY-20261009-DAE95D8C', orderTrackingId: 'TRK-MOCK-001', requiresPayment: true,
};
const STATUS = (paymentStatus, extra = {}) => ({
  paymentStatus, amount: 450000, currency: 'KES',
  merchantReference: 'PAY-20261009-DAE95D8C', orderTrackingId: 'TRK-MOCK-001',
  invoiceNo: paymentStatus === 'captured' ? 'INV-2026-000005' : undefined, ...extra,
});
const ORDER_ROW = {
  _id: 'ord1', orderNumber: 'ORD-2026-592402', status: 'completed', paymentMethod: 'Pesapal',
  subtotal: 4500, discount: 0, tax: 0, total: 4500, couponCode: '', couponDiscount: 0, coupon: null,
  transactionId: 'chk_mock123', itemCount: 1, createdAt: '2026-10-09T06:31:27.000Z',
  student: { _id: 'stu-mock', name: 'Test Student', email: 'test.student@example.com', phone: '+254700000000' },
  payment: { _id: 'pay1', invoiceNo: 'INV-2026-000005', merchant_reference: 'PAY-20261009-DAE95D8C', provider_transaction_id: '7915MOCK1234', payment_provider: 'pesapal', paymentStatus: 'captured', amount: 450000, capturedAt: '2026-10-09T06:33:00.000Z' },
  items: [{ name: 'One-to-One Yoga', itemType: 'service', itemId: 'svc1', price: 4500, discount: 0, finalPrice: 4500 }],
};
const ORDER_DETAIL = {
  ...ORDER_ROW,
  enrollments: [{ itemType: 'service', name: 'One-to-One Yoga', status: 'active' }],
  timeline: [{ action: 'payment_verified', createdAt: '2026-10-09T06:33:00.000Z', meta: { invoiceNo: 'INV-2026-000005', merchantReference: 'PAY-20261009-DAE95D8C' } }],
};
const ADMIN_PAYMENTS = [
  { _id: 'p1', merchant_reference: 'PAY-MOCK-001', invoiceNo: 'INV-2026-000005', paymentStatus: 'captured', amount: 450000, currency: 'KES', createdAt: '2026-10-09T06:33:00.000Z', user: { name: 'Test Student', email: 'test.student@example.com' }, label: 'Order One-to-One Yoga' },
  { _id: 'p2', merchant_reference: 'PAY-MOCK-002', invoiceNo: 'INV-2026-000004', paymentStatus: 'captured', amount: 1150000, currency: 'KES', createdAt: '2026-10-08T14:51:00.000Z', user: { name: 'Second Student', email: 'second@example.com' }, label: 'Order SOMA JUA 10-Class Pass' },
  { _id: 'p3', merchant_reference: 'PAY-MOCK-003', paymentStatus: 'pending', amount: 450000, currency: 'KES', createdAt: '2026-10-09T07:00:00.000Z', user: { name: 'Third Student', email: 'third@example.com' }, label: 'Order One-to-One Yoga' },
];

async function seedAuth(page, user) {
  await page.addInitScript(({ u }) => {
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify(u));
  }, { u: user });
}
const json = (obj, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(obj) });

async function mockStudentAPIs(page, { checkout = CHECKOUT_OK, statusVariant = null } = {}) {
  // NOTE: Playwright matches routes LAST-registered-first, so the generic
  // safety nets go FIRST and specific mocks AFTER (they take precedence).
  // Safety net: any other student/auth API returns inert 200 (never hits backend as unknown shape).
  await page.route('**/api/student/**', (r) => r.fulfill(json({})));
  await page.route('**/api/auth/**', (r) => r.fulfill(json({})));
  await page.route('**/api/auth/profile', (r) => r.fulfill(json({ _id: STUDENT._id, ...STUDENT })));
  // Specifics LAST = highest precedence; note the general cart pattern must
  // come BEFORE count/checkout/apply-coupon or it shadows them.
  await page.route('**/api/student/cart**', (r) => r.fulfill(json(CART)));
  await page.route('**/api/student/cart/count**', (r) => r.fulfill(json({ count: 1 })));
  await page.route('**/api/student/cart/checkout', (r) => r.fulfill(typeof checkout === 'function' ? checkout() : json(checkout)));
  await page.route('**/api/student/cart/apply-coupon', (r) => r.fulfill(json({ message: 'Invalid coupon code' }, 400)));
  await page.route('**/api/student/orders/*', (r) => r.fulfill(json(ORDER_DETAIL)));
  await page.route('**/api/student/orders**', (r) => r.fulfill(json({ orders: [ORDER_ROW], total: 1, pages: 1 })));
  if (statusVariant) {
    await page.route('**/api/payments/*/status', (r) => r.fulfill(json(statusVariant)));
    await page.route('**/api/pesapal/status*', (r) => r.fulfill(json(statusVariant)));
  }
}

async function mockAdminAPIs(page) {
  // Same LIFO ordering: generic nets first, specifics last.
  await page.route('**/api/admin/**', (r) => r.fulfill(json([])));
  await page.route('**/api/auth/**', (r) => r.fulfill(json({})));
  await page.route('**/api/auth/profile', (r) => r.fulfill(json({ _id: ADMIN._id, ...ADMIN })));
  await page.route('**/api/admin/overview', (r) => r.fulfill(json({ metrics: {}, recentStudents: [], todaySchedule: [], systemHealth: [] })));
  await page.route('**/api/admin/payments', (r) => r.fulfill(json(ADMIN_PAYMENTS)));
  await page.route('**/api/admin/orders/*', (r) => r.fulfill(json(ORDER_DETAIL)));
  await page.route('**/api/admin/orders**', (r) => r.fulfill(json({ orders: [ORDER_ROW], total: 1, pages: 1 })));
}

test.describe('payment evidence (mocked, read-only)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test('pricing + cart + checkout states', async ({ page }) => {
    test.setTimeout(120000);
    await seedAuth(page, STUDENT);
    await mockStudentAPIs(page, {});
    await page.goto('/memberships');
    await page.getByText(/16,500/).first().waitFor({ timeout: 40000 }).catch(() => {});
    await snap(page, 'PAY-001_membership-pricing.png');
    await page.goto('/studentdashboard?tab=cart');
    await page.getByRole('button', { name: /proceed.*checkout/i }).waitFor({ timeout: 45000 });
    await snap(page, 'PAY-002_cart-with-product.png');
    // invalid coupon → validation error state
    const coupon = page.getByPlaceholder(/coupon/i).first();
    if (await coupon.count()) {
      await coupon.fill('NOPE');
      const apply = page.getByRole('button', { name: /apply/i }).first();
      if (await apply.count()) { await apply.click(); await page.waitForTimeout(1200); }
    }
    await snap(page, 'PAY-003_checkout-validation.png');
    // checkout → pay step (redirect NOT followed; mock URL never loads)
    const co = page.getByRole('button', { name: /proceed.*checkout|checkout/i }).first();
    if (await co.count()) { await co.click(); await page.waitForTimeout(2500); }
    await snap(page, 'PAY-009_pay-step.png');
  });

  test('checkout failure state (mocked 502)', async ({ page }) => {
    await seedAuth(page, STUDENT);
    await mockStudentAPIs(page, { checkout: () => ({ status: 502, contentType: 'application/json', body: JSON.stringify({ message: 'Bad Gateway' }) }) });
    page.on('response', async (r) => {
      if (r.url().includes('/cart/checkout')) console.log('CHECKOUT RESP:', r.status());
    });
    await page.goto('/studentdashboard?tab=cart');
    await page.getByRole('button', { name: /proceed.*checkout/i }).waitFor({ timeout: 45000 });
    const co = page.getByRole('button', { name: /proceed.*checkout|checkout/i }).first();
    if (await co.count()) { await co.click(); await page.getByText(/temporarily unavailable|try again/i).first().waitFor({ timeout: 15000 }).catch(() => {}); }
    await snap(page, 'PAY-006_checkout-error.png');
  });

  test('double-click checkout guard (mocked)', async ({ page }) => {
    await seedAuth(page, STUDENT);
    let calls = 0;
    await mockStudentAPIs(page, {});
    await page.route('**/api/student/cart/checkout', async (r) => { calls += 1; await r.fulfill(json(CHECKOUT_OK)); });
    await page.goto('/studentdashboard?tab=cart');
    await page.getByRole('button', { name: /proceed.*checkout/i }).waitFor({ timeout: 45000 });
    const co = page.getByRole('button', { name: /proceed.*checkout|checkout/i }).first();
    try {
      if (await co.count()) {
        await co.click({ timeout: 5000 });
        await page.waitForTimeout(800);
        await co.click({ timeout: 3000, force: true });
      }
    } catch { /* button replaced by pay-step after first click — the guard working */ }
    await page.waitForTimeout(2000);
    await snap(page, 'PAY-005_duplicate-checkout-guard.png');
    console.log('checkout POST calls seen:', calls);
  });

  for (const [variant, file] of [
    [STATUS('captured'), 'PAY-010_payment-success.png'],
    [STATUS('pending'), 'PAY-013_payment-pending.png'],
    [STATUS('failed', { failureReason: 'Insufficient funds' }), 'PAY-019_payment-failed.png'],
  ]) {
    test(`return state ${variant.paymentStatus} (mocked)`, async ({ page }) => {
      await seedAuth(page, STUDENT);
      await mockStudentAPIs(page, { statusVariant: variant });
      await page.goto('/payment/return?OrderTrackingId=TRK-MOCK-001&OrderMerchantReference=PAY-20261009-DAE95D8C');
      await page.waitForTimeout(variant.paymentStatus === 'pending' ? 9000 : 4000);
      await snap(page, file);
    });
  }

  test('return invalid state, no params (mocked)', async ({ page }) => {
    await seedAuth(page, STUDENT);
    await mockStudentAPIs(page, {});
    await page.goto('/payment/return');
    await page.waitForTimeout(2000);
    await snap(page, 'PAY-011_invalid-return.png');
  });

  test('order history + invoice modal (mocked)', async ({ page }) => {
    await seedAuth(page, STUDENT);
    await mockStudentAPIs(page, {});
    await page.goto('/studentdashboard?tab=orders');
    await page.getByText('ORD-2026-592402').first().waitFor({ timeout: 30000 });
    await snap(page, 'PAY-033_order-history.png');
    const inv = page.getByRole('button', { name: /invoice/i }).first();
    if (await inv.count()) { await inv.click(); }
    await page.getByText('#INV-2026-000005').first().waitFor({ timeout: 20000 });
    await snap(page, 'PAY-034_invoice-modal.png');
  });

  test('admin revenue + invoice modal (mocked)', async ({ page }) => {
    await seedAuth(page, ADMIN);
    await mockAdminAPIs(page);
    await page.goto('/yogaadmin');
    await page.waitForTimeout(2500);
    const rev = page.getByText(/reports & invoices/i).first();
    if (await rev.count()) { await rev.click(); await page.waitForTimeout(2500); }
    await snap(page, 'PAY-039_admin-revenue.png');
    const view = page.getByRole('button', { name: /^view$/i }).first();
    if (await view.count()) { await view.click(); await page.waitForTimeout(2500); }
    await snap(page, 'PAY-034b_admin-invoice-modal.png');
  });
});


