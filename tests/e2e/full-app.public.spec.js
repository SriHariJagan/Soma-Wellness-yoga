// Full-application E2E — public pages, auth, catalog, student journey.
// All /api/** calls are mocked (live backend is Atlas/production-backed).
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedAuth, shot, attachDiagnostics, mockApi, settle, textLength, STUDENT } from './full-app.e2e.spec.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DIR = fs.readFileSync(path.join(ROOT, '.e2e-dir.txt'), 'utf8').trim();
const RESULTS = path.join(ROOT, DIR, 'results-public.json');
const results = [];

function record(id, name, route, role, expected, actual, status, file, notes = '') {
  results.push({ id, name, route, role, expected, actual, status, file, notes });
}

const PUBLIC_ROUTES = [
  ['TC-PUB-001', '/', 'Home'],
  ['TC-PUB-002', '/about', 'About'],
  ['TC-PUB-003', '/services', 'Services'],
  ['TC-PUB-004', '/classes', 'Classes'],
  ['TC-PUB-005', '/memberships', 'Memberships'],
  ['TC-PUB-006', '/restore', 'Restore'],
  ['TC-PUB-007', '/private', 'Private'],
  ['TC-PUB-008', '/life-stages', 'LifeStages'],
  ['TC-PUB-009', '/courses', 'Courses'],
  ['TC-PUB-010', '/spa-rituals', 'SpaRituals'],
  ['TC-PUB-011', '/yttc', 'YTTC'],
  ['TC-PUB-012', '/founding', 'FoundingMembers'],
  ['TC-PUB-013', '/faq', 'FAQ'],
  ['TC-PUB-014', '/gallery', 'Gallery'],
  ['TC-PUB-015', '/blogs', 'Blogs'],
  ['TC-PUB-016', '/events', 'Events'],
  ['TC-PUB-017', '/contact', 'Contact'],
  ['TC-PUB-018', '/offerings', 'Offerings'],
];

test.describe('Public pages', () => {
  for (const [id, route, name] of PUBLIC_ROUTES) {
    test(`${id} ${route}`, async ({ page }) => {
      const diag = attachDiagnostics(page);
      await mockApi(page);
      let status = 'PASS';
      let actual = '';
      let file = null;
      try {
        const resp = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await settle(page);
        const title = await page.title();
        const bodyLen = await textLength(page);
        file = await shot(page, id, route.replace(/\//g, '') || 'home', { fullPage: true, notes: title });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        actual = `HTTP ${resp ? resp.status() : '?'}; title="${title}"; text=${bodyLen} chars; hOverflow=${overflow}px`;
        if (!resp || resp.status() >= 400) { status = 'FAIL'; actual += ' — navigation error'; }
        else if (bodyLen < 80) { status = 'FAIL'; actual += ' — page rendered empty'; }
        else if (overflow > 2) { status = 'FAIL'; actual += ' — horizontal overflow'; }
        else if (diag.console.length) { status = 'WARN'; actual += ` — ${diag.console.length} console error(s)`; }
      } catch (err) {
        status = 'FAIL'; actual = `ERROR: ${err.message}`;
        file = await shot(page, id, 'error').catch(() => null);
      }
      record(id, `${name} public page`, route, 'public',
        'HTTP 2xx, non-empty render, no horizontal overflow',
        `${actual} | console=${diag.console.length} net4xx/5xx=${diag.network.filter((n) => /^\d{3} /.test(n)).length}`,
        status, file, diag.console.slice(0, 2).join(' || '));
      console.log(`${status} ${id} ${route} :: ${actual}`);
      expect(status).not.toBe('FAIL');
    });
  }

  test('TC-PUB-019 unknown route redirects to home', async ({ page }) => {
    await mockApi(page);
    await page.goto('/this-route-does-not-exist-e2e', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const url = new URL(page.url()).pathname;
    const f = await shot(page, 'TC-PUB-019', 'catchall-redirect', { fullPage: false });
    const st = url === '/' ? 'PASS' : 'FAIL';
    record('TC-PUB-019', 'Catch-all redirect', '/this-route-does-not-exist-e2e', 'public', "redirects to '/'", `landed on ${url}`, st, f);
    console.log(`${st} TC-PUB-019 catch-all -> ${url}`);
  });
});

test.describe('Authentication', () => {
  test('TC-AUTH-001 login page renders', async ({ page }) => {
    await mockApi(page);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const f = await shot(page, 'TC-AUTH-001', 'login-page', { fullPage: true });
    const hasForm = await page.locator('form').count();
    const st = hasForm > 0 ? 'PASS' : 'FAIL';
    record('TC-AUTH-001', 'Login page', '/login', 'public', 'Login form present', `${hasForm} form(s) found`, st, f);
    console.log(`${st} TC-AUTH-001 login forms=${hasForm}`);
    expect(st).toBe('PASS');
  });

  test('TC-AUTH-002 registration page renders', async ({ page }) => {
    await mockApi(page);
    await page.goto('/newuser', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const f = await shot(page, 'TC-AUTH-002', 'register-page', { fullPage: true });
    const hasForm = await page.locator('form').count();
    const st = hasForm > 0 ? 'PASS' : 'FAIL';
    record('TC-AUTH-002', 'Registration page', '/newuser', 'public', 'Register form present', `${hasForm} form(s) found`, st, f);
    console.log(`${st} TC-AUTH-002 register forms=${hasForm}`);
    expect(st).toBe('PASS');
  });

  test('TC-AUTH-003 forgot-password page renders', async ({ page }) => {
    await mockApi(page);
    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const f = await shot(page, 'TC-AUTH-003', 'forgot-password', { fullPage: true });
    const hasForm = await page.locator('form').count();
    const st = hasForm > 0 ? 'PASS' : 'FAIL';
    record('TC-AUTH-003', 'Forgot password page', '/forgot-password', 'public', 'Form present', `${hasForm} form(s)`, st, f);
    console.log(`${st} TC-AUTH-003 forgot-password forms=${hasForm}`);
  });

  test('TC-AUTH-004 protected route redirects anonymous user to /login', async ({ page }) => {
    await mockApi(page);
    await page.goto('/studentdashboard', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const url = new URL(page.url()).pathname;
    const f = await shot(page, 'TC-AUTH-004', 'anon-redirect', { fullPage: false });
    const st = url === '/login' ? 'PASS' : 'FAIL';
    record('TC-AUTH-004', 'Anonymous access to student dashboard blocked', '/studentdashboard', 'anonymous', "redirects to '/login'", `landed on ${url}`, st, f);
    console.log(`${st} TC-AUTH-004 anon->studentdashboard -> ${url}`);
    expect(st).toBe('PASS');
  });

  test('TC-AUTH-005 admin route redirects anonymous user to /login', async ({ page }) => {
    await mockApi(page);
    await page.goto('/yogaadmin', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const url = new URL(page.url()).pathname;
    const f = await shot(page, 'TC-AUTH-005', 'admin-anon-redirect', { fullPage: false });
    const st = url === '/login' ? 'PASS' : 'FAIL';
    record('TC-AUTH-005', 'Anonymous access to admin blocked', '/yogaadmin', 'anonymous', "redirects to '/login'", `landed on ${url}`, st, f);
    console.log(`${st} TC-AUTH-005 anon->yogaadmin -> ${url}`);
    expect(st).toBe('PASS');
  });

  test('TC-AUTH-006 reception route redirects anonymous user to /login', async ({ page }) => {
    await mockApi(page);
    await page.goto('/reception', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const url = new URL(page.url()).pathname;
    const f = await shot(page, 'TC-AUTH-006', 'reception-anon-redirect', { fullPage: false });
    const st = url === '/login' ? 'PASS' : 'FAIL';
    record('TC-AUTH-006', 'Anonymous access to reception blocked', '/reception', 'anonymous', "redirects to '/login'", `landed on ${url}`, st, f);
    console.log(`${st} TC-AUTH-006 anon->reception -> ${url}`);
  });

  test('TC-AUTH-007 student session persists across reload', async ({ page }) => {
    await seedAuth(page, STUDENT);
    await mockApi(page);
    await page.goto('/studentdashboard', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const before = new URL(page.url()).pathname;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await settle(page);
    const after = new URL(page.url()).pathname;
    const f = await shot(page, 'TC-AUTH-007', 'session-persist-reload', { fullPage: false });
    const st = before === '/studentdashboard' && after === '/studentdashboard' ? 'PASS' : 'FAIL';
    record('TC-AUTH-007', 'Student session survives reload', '/studentdashboard', 'student', 'stays on /studentdashboard after reload', `${before} -> ${after}`, st, f);
    console.log(`${st} TC-AUTH-007 session persist ${before} -> ${after}`);
  });
});

test.describe('Student dashboard journey (mocked API)', () => {
  const TABS = [
    ['TC-STU-001', '', 'overview'],
    ['TC-STU-002', '?tab=cart', 'cart'],
    ['TC-STU-003', '?tab=orders', 'orders'],
    ['TC-STU-004', '?tab=payments', 'payments'],
    ['TC-STU-005', '?tab=profile', 'profile'],
    ['TC-STU-006', '?tab=services', 'services'],
    ['TC-STU-007', '?tab=classes', 'classes'],
    ['TC-STU-008', '?tab=attendance', 'attendance'],
    ['TC-STU-009', '?tab=notifications', 'notifications'],
    ['TC-STU-010', '?tab=browsePlans', 'browse-plans'],
  ];
  for (const [id, qs, name] of TABS) {
    test(`${id} student dashboard ${name}`, async ({ page }) => {
      const diag = attachDiagnostics(page);
      await seedAuth(page, STUDENT);
      await mockApi(page);
      let st = 'PASS'; let actual = '';
      await page.goto(`/studentdashboard${qs}`, { waitUntil: 'domcontentloaded' });
      await settle(page);
      const f = await shot(page, id, name, { fullPage: true });
      const len = await textLength(page);
      actual = `rendered ${len} chars; url=${new URL(page.url()).pathname}${new URL(page.url()).search}`;
      if (len < 80) { st = 'FAIL'; actual += ' — empty render'; }
      else if (diag.console.length) { st = 'WARN'; actual += ` — ${diag.console.length} console error(s)`; }
      record(id, `Student dashboard: ${name}`, `/studentdashboard${qs}`, 'student', 'Dashboard tab renders', actual, st, f, diag.console.slice(0, 2).join(' || '));
      console.log(`${st} ${id} ${name} :: ${actual}`);
    });
  }
});

test.afterAll(() => {
  fs.mkdirSync(path.dirname(RESULTS), { recursive: true });
  fs.writeFileSync(RESULTS, JSON.stringify(results, null, 2));
  console.log(`\nWROTE ${RESULTS} (${results.length} records)`);
});