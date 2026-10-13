// ============================================================
// tests/e2e/full-app.e2e.spec.js
//
// Full-application post-remediation E2E — REAL APPLICATION EVIDENCE.
//
// SAFETY: every /api/** call is intercepted with page.route().fulfill().
// The live backend at :5000 is backed by a MongoDB Atlas cluster (shared
// / production data), so NO request from this spec is allowed to reach it.
// Nothing here reads or writes real customer data.
//
// Screenshots -> reports/evidence/full-e2e-<timestamp>/screenshots
// ============================================================
import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DIR = fs.readFileSync(path.join(ROOT, '.e2e-dir.txt'), 'utf8').trim();
const SHOTS = path.join(ROOT, DIR, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

export const evidence = {};

// ── Synthetic accounts (no real PII, no real credentials) ──
export const STUDENT = {
  _id: 'stu-e2e-0001', name: 'E2E Test Student', email: 'e2e.student@example.test',
  role: 'student', status: 'active', city: 'Nairobi', country: 'Kenya',
};
export const ADMIN = {
  _id: 'adm-e2e-0001', name: 'E2E Admin', email: 'e2e.admin@example.test',
  role: 'admin', status: 'active',
};
export const RECEPTION = {
  _id: 'rcp-e2e-0001', name: 'E2E Reception', email: 'e2e.reception@example.test',
  role: 'reception', status: 'active',
  permissions: ['customers.view', 'customers.create', 'customers.edit', 'bookings.view',
    'bookings.create', 'bookings.edit', 'bookings.cancel', 'classes.view',
    'classes.attendance', 'attendance.view', 'attendance.create'],
};

export async function seedAuth(page, user) {
  await page.addInitScript(({ u }) => {
    try {
      localStorage.setItem('token', 'e2e-mock-token');
      localStorage.setItem('user', JSON.stringify(u));
    } catch { /* storage unavailable */ }
  }, { u: user });
}

export async function shot(page, id, name, opts = {}) {
  const file = `${id}_${name}.png`;
  const target = path.join(SHOTS, file);
  try {
    await page.screenshot({ path: target, fullPage: opts.fullPage ?? false, animations: 'disabled' });
    evidence[id] = { file: path.posix.join(DIR, 'screenshots', file), url: page.url(), notes: opts.notes || '' };
    return file;
  } catch (err) {
    evidence[id] = { file: null, url: page.url(), notes: `SCREENSHOT FAILED: ${err.message}` };
    return null;
  }
}

/** Collect console errors + failed requests for a page. */
/**
 * SAFETY GUARD — install BEFORE any navigation.
 *
 * The app calls the API at an absolute origin (`VITE_API_URL=http://localhost:5000`),
 * so a mock that returns a real provider `redirectUrl` will send the browser to
 * a LIVE payment page. This blocks every non-localhost request outright and
 * records it, so an evidence run can never reach Pesapal (or anything else).
 */
export async function blockExternal(page) {
  const attempted = [];
  await page.route('**/*', async (route) => {
    const host = new URL(route.request().url()).hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1') {
      return route.fallback();
    }
    attempted.push(`${route.request().method()} ${route.request().url().slice(0, 160)}`);
    return route.abort('blockedbyclient');
  });
  return attempted;
}

export function attachDiagnostics(page) {
  const bag = { console: [], network: [] };
  page.on('console', (m) => { if (m.type() === 'error') bag.console.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => { bag.console.push(`pageerror: ${String(e.message).slice(0, 300)}`); });
  page.on('requestfailed', (r) => {
    const f = r.failure();
    bag.network.push(`${r.method()} ${r.url().slice(0, 160)} :: ${f ? f.errorText : 'failed'}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400) bag.network.push(`${r.status()} ${r.request().method()} ${r.url().slice(0, 160)}`);
  });
  return bag;
}

/**
 * Deterministic readiness gate. The app lazy-loads every route through
 * <Suspense>, so a fixed sleep either screenshots the spinner or races the
 * catch-all redirect. Wait for network idle, then until the rendered text
 * length has stopped growing for two consecutive polls.
 */
export async function settle(page, { quiet = 600, maxMs = 15000, minMs = 400 } = {}) {
  try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch { /* keep going */ }
  const started = Date.now();
  let last = -1;
  let stableSince = Date.now();
  while (Date.now() - started < maxMs) {
    const len = await textLength(page, 2);
    if (len !== last) { last = len; stableSince = Date.now(); }
    if (len > 0 && Date.now() - stableSince > quiet && Date.now() - started > minMs) break;
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(250);
  return last;
}

// ── Canonical mock data ──
const CATALOG = {
  tiers: [
    { key: 'JUA', label: 'SOMA JUA', monthly: 12000 },
    { key: 'AMANI', label: 'SOMA AMANI', monthly: 16500 },
    { key: 'UZIMA', label: 'SOMA UZIMA', monthly: 22500 },
    { key: 'FAMILY', label: 'SOMA FAMILY', monthly: 35000 },
  ],
  somaReset: { label: 'SOMA RESET', price: 32000, includes: { assessment: 1, yogaSessions: 12, meditation: 6, massages60: 2 } },
};

const CART = {
  cart: { _id: 'cart-e2e-1' },
  items: [{
    _id: 'ci-e2e-1', cart: 'cart-e2e-1', itemType: 'service', itemId: 'svc-e2e-1',
    name: 'One-to-One Yoga', image: '', price: 5500, discount: 0, finalPrice: 5500,
    quantity: 1, coupon: null,
  }],
  summary: { subtotal: 5500, discount: 0, couponCode: '', couponDiscount: 0, tax: 0, total: 5500, itemCount: 1 },
};

const ORDER_ROW = {
  _id: 'ord-e2e-1', orderNumber: 'ORD-2026-E2E001', status: 'completed', paymentMethod: 'Pesapal',
  subtotal: 5500, discount: 0, tax: 0, total: 5500, couponCode: '', couponDiscount: 0, coupon: null,
  transactionId: 'chk_e2e_001', itemCount: 1, createdAt: '2026-10-11T06:31:27.000Z',
  student: { _id: STUDENT._id, name: STUDENT.name, email: STUDENT.email, phone: '+254700000000' },
  payment: {
    _id: 'pay-e2e-1', invoiceNo: 'INV-2026-E2E001', merchant_reference: 'PAY-20261011-E2E001',
    provider_transaction_id: 'E2E-CONF-0001', payment_provider: 'pesapal',
    paymentStatus: 'captured', amount: 550000, capturedAt: '2026-10-11T06:33:00.000Z',
  },
  items: [{ name: 'One-to-One Yoga', itemType: 'service', itemId: 'svc-e2e-1', price: 5500, discount: 0, finalPrice: 5500 }],
};
const ORDER_DETAIL = {
  ...ORDER_ROW,
  enrollments: [{ itemType: 'service', name: 'One-to-One Yoga', status: 'active' }],
  timeline: [{ action: 'payment_verified', createdAt: '2026-10-11T06:33:00.000Z', meta: { invoiceNo: 'INV-2026-E2E001', merchantReference: 'PAY-20261011-E2E001' } }],
};

const ADMIN_PAYMENTS = [
  { _id: 'p-e2e-1', merchant_reference: 'PAY-20261011-E2E001', invoiceNo: 'INV-2026-E2E001', paymentStatus: 'captured', amount: 550000, currency: 'KES', createdAt: '2026-10-11T06:33:00.000Z', user: { name: STUDENT.name, email: STUDENT.email }, label: 'Order One-to-One Yoga' },
  { _id: 'p-e2e-2', merchant_reference: 'PAY-20261011-E2E002', invoiceNo: 'INV-2026-E2E002', paymentStatus: 'pending', amount: 1200000, currency: 'KES', createdAt: '2026-10-11T07:00:00.000Z', user: { name: 'E2E Second Student', email: 'e2e.student2@example.test' }, label: 'Order SOMA AMANI' },
];

const ok = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

/**
 * Install a catch-all API mock. EVERY /api/** call is fulfilled locally so the
 * live backend (Atlas-backed) is never contacted.
 * @param extra optional array of [matcher, handler] applied AFTER the catch-all.
 */
/**
 * Anchor on the ORIGIN-ROOT api prefix only.
 * A bare `**\/api\/**` glob also matches Vite module URLs such as
 * `\/src\/components\/api\/PesapalServices.js`, which would fulfil JS modules
 * with JSON and stop the app booting. Use the URL's pathname instead.
 */
export const API_ROOT = /^https?:\/\/[^/]+\/api\//;

export async function mockApi(page, extra = [], sessionUser = null) {
  const state = { leads: [], initiated: [] };
  const me = sessionUser || STUDENT;

  await page.route(API_ROOT, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const u = new URL(url);
    const p = u.pathname;

    // Specific overrides first (registered below are applied last-wins, so the
    // caller can pass more specific handlers through `extra`).
    for (const [matcher, handler] of extra) {
      const rx = matcher instanceof RegExp ? matcher : new RegExp(matcher);
      if (rx.test(p)) return handler(route, { url, method, p, state });
    }

    // ---- auth ----
    if (p === '/api/auth/login') return route.fulfill(ok({ success: true, msg: 'Welcome back', token: 'e2e-mock-token', user: me, mustChangePassword: false }));
    if (p === '/api/auth/register') return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, msg: 'Registration successful', user: STUDENT }) });
    // MUST echo the seeded session user: App.jsx replaces localStorage.user with
    // this response, so always returning STUDENT silently downgrades an
    // admin/reception session to the student workspace.
    if (p === '/api/auth/profile') return route.fulfill(ok({ success: true, user: me }));
    if (p === '/api/auth/refresh' || p === '/api/auth/logout') return route.fulfill(ok({ success: true }));
    if (p === '/api/auth/forgot-password') return route.fulfill(ok({ success: true, msg: 'If that email exists we have sent a reset link' }));

    // ---- public catalog / content ----
    if (p === '/api/soma/catalog') return route.fulfill(ok({ success: true, ...CATALOG }));
    if (p === '/api/soma/founding/status') return route.fulfill(ok({ success: true, founding: { active: true, remaining: 42, cap: 100 } }));
    if (p === '/api/soma/pricing/membership') return route.fulfill(ok({ success: true, tiers: CATALOG.tiers }));
    if (p === '/api/soma/daily/content') return route.fulfill(ok({ success: true, items: [] }));
    if (p === '/api/public/services') return route.fulfill(ok({ success: true, services: [{ _id: 'svc-e2e-1', name: 'One-to-One Yoga', category: 'Private', price: 5500 }] }));
    if (p === '/api/public/courses') return route.fulfill(ok({ success: true, courses: [] }));
    if (p === '/api/public/plans') return route.fulfill(ok({ success: true, plans: CATALOG.tiers }));
    if (p === '/api/public/settings') return route.fulfill(ok({ success: true, settings: {} }));
    if (p === '/api/public/batches' || p === '/api/public/workshops' || p === '/api/public/events') return route.fulfill(ok({ success: true, items: [] }));
    if (p === '/api/public/wellness-circle') return route.fulfill(ok({ success: true, circle: { price: 36500 } }));
    // NOTE: the real public endpoints return BARE ARRAYS
    // (offeringController.js:63 `res.json(offerings)`), not envelopes.
    // Returning an object here breaks NewClasses.jsx:59 (`offerings.filter`).
    if (p === '/api/offerings') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
      { _id: 'off-e2e-1', name: 'SOMA JUA – 10-Class Pass', slug: 'jua-10-class-pass', category: 'group_yoga', price: 22000, status: 'active' },
      { _id: 'off-e2e-2', name: 'One-to-One Yoga', slug: 'one-to-one-yoga', category: 'private', price: 5500, status: 'active' },
    ]) });
    if (p === '/api/offerings/categories') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ category: 'group_yoga', count: 1 }, { category: 'private', count: 1 }]) });
    if (p.startsWith('/api/blogs')) return route.fulfill(ok({ success: true, blogs: [], posts: [] }));
    if (p === '/api/pesapal/config') return route.fulfill(ok({ success: true, provider: 'pesapal', configured: true, baseUrl: 'MOCKED-SANDBOX-URL-REDACTED', hasIpnId: true, hasCallbackUrl: true }));
    if (p === '/api/chatbot/config') return route.fulfill(ok({ success: true, enabled: false }));
    if (p === '/api/gallery' || p === '/api/public/gallery') return route.fulfill(ok({ success: true, images: [] }));
    if (p === '/api/leads' && method === 'POST') { state.leads.push(route.request().postDataJSON()); return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, lead: { _id: 'lead-e2e-1', stage: 'New' } }) }); }

    // ---- student ----
    if (p === '/api/student/cart') return route.fulfill(ok(CART));
    if (p === '/api/student/cart/count') return route.fulfill(ok({ success: true, count: CART.items.length }));
    if (p === '/api/student/cart/add') return route.fulfill(ok({ success: true, cart: CART.cart, msg: 'Added to cart', cartCount: CART.items.length }));
    if (p.startsWith('/api/student/cart/item/')) return route.fulfill(ok({ success: true, cartCount: 0 }));
    if (p === '/api/student/cart/apply-coupon') return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Invalid coupon code' }) });
    if (p === '/api/student/cart/remove-coupon') return route.fulfill(ok({ success: true }));
    if (p === '/api/student/cart/checkout') return route.fulfill(ok({
      success: true, msg: 'Checkout initiated. Complete payment via Pesapal to activate items.',
      order: { _id: 'ord-e2e-1', orderNumber: ORDER_ROW.orderNumber, total: 5500, itemCount: 1, status: 'pending' },
      payment: { _id: 'pay-e2e-1', amount: 550000, status: 'pending', method: 'pesapal', merchantReference: ORDER_ROW.payment.merchant_reference, orderTrackingId: 'TRK-E2E-001' },
      pesapal: { merchantReference: ORDER_ROW.payment.merchant_reference, orderTrackingId: 'TRK-E2E-001', redirectUrl: 'http://localhost:5173/payment/return?OrderTrackingId=TRK-E2E-001&OrderMerchantReference=PAY-20261011-E2E001', amount: 550000, currency: 'KES' },
      redirectUrl: 'http://localhost:5173/payment/return?OrderTrackingId=TRK-E2E-001&OrderMerchantReference=PAY-20261011-E2E001',
      merchantReference: ORDER_ROW.payment.merchant_reference, orderTrackingId: 'TRK-E2E-001', requiresPayment: true,
    }));
    if (p === '/api/student/orders') return route.fulfill(ok({ success: true, orders: [ORDER_ROW], total: 1 }));
    if (p.startsWith('/api/student/orders/')) return route.fulfill(ok({ success: true, order: ORDER_DETAIL }));
    if (p === '/api/student/payments') return route.fulfill(ok({ success: true, payments: [ORDER_ROW.payment] }));
    if (p === '/api/student/membership' || p === '/api/student/membership/status' || p === '/api/student/membership/active') return route.fulfill(ok({ success: true, membership: null, active: false }));
    if (p === '/api/student/membership-plans') return route.fulfill(ok({ success: true, plans: CATALOG.tiers }));
    if (p === '/api/student/attendance') return route.fulfill(ok({ success: true, attendance: [] }));
    if (p === '/api/student/services') return route.fulfill(ok({ success: true, services: [{ _id: 'svc-e2e-1', name: 'One-to-One Yoga', price: 5500 }] }));
    if (p === '/api/student/classes') return route.fulfill(ok({ success: true, classes: [] }));
    if (p === '/api/student/workshops') return route.fulfill(ok({ success: true, workshops: [] }));
    if (p === '/api/student/events') return route.fulfill(ok({ success: true, events: [] }));
    if (p === '/api/student/notifications' || p === '/api/student/notifications/unread-count') return route.fulfill(ok({ success: true, notifications: [], unreadCount: 0, count: 0 }));
    if (p === '/api/student/downloads') return route.fulfill(ok({ success: true, downloads: [] }));
    if (p === '/api/student/consultations') return route.fulfill(ok({ success: true, consultations: [] }));
    if (p === '/api/student/all-enrollments') return route.fulfill(ok({ success: true, enrollments: [] }));
    if (p === '/api/student/referral') return route.fulfill(ok({ success: true, referral: { code: 'E2EREF', count: 0 } }));
    if (p === '/api/student/trial/check-eligibility') return route.fulfill(ok({ success: true, eligible: true }));
    if (p === '/api/student/yttc/status') return route.fulfill(ok({ success: true, status: null }));
    if (p === '/api/student/invites') return route.fulfill(ok({ success: true, invites: [] }));

    // ---- admin ----
    // NOTE the shape: getStudents and getPayments return BARE ARRAYS
    // (adminController `res.json(students)` / `res.json(payments)`), while
    // getOverview returns an object. Returning envelopes breaks the admin UI
    // with e.g. "students.slice is not a function".
    if (p === '/api/admin/students') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
      { _id: 'stu-e2e-1', name: STUDENT.name, email: STUDENT.email, role: 'student', status: 'active', createdAt: '2026-10-01T08:00:00.000Z' },
      { _id: 'stu-e2e-2', name: 'E2E Second Student', email: 'e2e.student2@example.test', role: 'student', status: 'active', createdAt: '2026-10-02T08:00:00.000Z' },
    ]) });
    if (p === '/api/admin/payments') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ADMIN_PAYMENTS) });
    if (p === '/api/admin/orders') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([ORDER_ROW]) });
    if (p === '/api/admin/leads') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ _id: 'lead-e2e-1', name: 'E2E Lead', email: 'e2e.lead@example.test', stage: 'New', createdAt: '2026-10-10T08:00:00.000Z' }]) });
    if (p === '/api/admin/overview') return route.fulfill(ok({
      revenue: 1750000, orders: 2, students: 3, sessions: 0, todayBookings: 0,
      monthRevenue: 1750000, lastMonthRevenue: 1200000, newStudents: 3, activeMemberships: 2,
    }));
    if (p.startsWith('/api/admin/')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });

    // ---- reception ----
    if (p === '/api/reception/overview') return route.fulfill(ok({ success: true, today: 2, week: 9, month: 31 }));
    if (p === '/api/reception/catalog') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
      { _id: 'svc-e2e-1', name: 'One-to-One Yoga', category: 'Private', price: 5500 },
    ]) });
    if (p.startsWith('/api/reception/')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });

    // ---- payments (DEF-006 surface) ----
    if (p === '/api/payments/initiate' || p === '/api/pesapal/initiate') {
      state.initiated.push(route.request().postDataJSON() || {});
      const body = route.request().postDataJSON() || {};
      const key = body.idempotencyKey || null;
      return route.fulfill(ok({
        success: true, paymentId: 'pay-e2e-1',
        merchantReference: ORDER_ROW.payment.merchant_reference,
        orderTrackingId: 'TRK-E2E-001',
        redirectUrl: 'http://localhost:5173/payment/return?OrderTrackingId=TRK-E2E-001&OrderMerchantReference=PAY-20261011-E2E001',
        amount: 550000, currency: 'KES', idempotent: Boolean(key && state.initiated.filter((i) => i.idempotencyKey === key).length > 1),
      }));
    }
    if (p.startsWith('/api/payments/') && p.endsWith('/status')) return route.fulfill(ok({ success: true, paymentStatus: 'pending', providerStatus: 'Pending', amount: 550000, currency: 'KES', merchantReference: ORDER_ROW.payment.merchant_reference, orderTrackingId: 'TRK-E2E-001', refreshed: false, pending: true }));
    if (p.startsWith('/api/pesapal/status')) return route.fulfill(ok({ success: true, paymentStatus: 'pending', amount: 550000, currency: 'KES', merchantReference: ORDER_ROW.payment.merchant_reference, orderTrackingId: 'TRK-E2E-001', pending: true }));

    return route.fulfill(ok({ success: true }));
  });

  return state;
}

/**
 * Rendered-text length, read straight from the DOM.
 * `page.locator('body').innerText()` can throw under parallel load; swallowing
 * that with .catch() silently reports "page empty", which is a wrong diagnosis.
 */
export async function textLength(page, attempts = 3) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await page.evaluate(() => document.body?.innerText?.trim().length ?? 0);
    } catch {
      await page.waitForTimeout(400); // execution context busy/destroyed - retry
    }
  }
  return -1; // measurement failed - distinguishable from a genuinely empty page
}

test.describe.configure({ mode: 'parallel' });