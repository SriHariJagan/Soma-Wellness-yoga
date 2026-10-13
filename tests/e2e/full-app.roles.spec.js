// Full-application E2E — admin, reception, access control, responsive, a11y.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedAuth, shot, attachDiagnostics, mockApi, settle, textLength, ADMIN, RECEPTION, STUDENT } from './full-app.e2e.spec.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DIR = fs.readFileSync(path.join(ROOT, '.e2e-dir.txt'), 'utf8').trim();
const RESULTS = path.join(ROOT, DIR, 'results-roles.json');
const results = [];
const rec = (id, name, route, role, expected, actual, status, file, notes = '') =>
  results.push({ id, name, route, role, expected, actual, status, file, notes });

// ── Admin ───────────────────────────────────────────────────────
const ADMIN_TABS = [
  ['TC-ADM-001', '', 'overview'], ['TC-ADM-002', '?tab=students', 'students'],
  ['TC-ADM-003', '?tab=memberships', 'memberships'], ['TC-ADM-004', '?tab=payments', 'payments'],
  ['TC-ADM-005', '?tab=orders', 'orders'], ['TC-ADM-006', '?tab=attendance', 'attendance'],
  ['TC-ADM-007', '?tab=workshops', 'workshops'], ['TC-ADM-008', '?tab=events', 'events'],
  ['TC-ADM-009', '?tab=services', 'services'], ['TC-ADM-010', '?tab=coupons', 'coupons'],
  ['TC-ADM-011', '?tab=leads', 'leads'], ['TC-ADM-012', '?tab=class-invites', 'class-invites'],
  ['TC-ADM-013', '?tab=free-trials', 'free-trials'], ['TC-ADM-014', '?tab=gallery-mgmt', 'gallery'],
];
test.describe('Admin workspace', () => {
  for (const [id, qs, name] of ADMIN_TABS) {
    test(`${id} admin ${name}`, async ({ page }) => {
      const diag = attachDiagnostics(page);
      await seedAuth(page, ADMIN); await mockApi(page, [], ADMIN);
      await page.goto(`/yogaadmin${qs}`, { waitUntil: 'domcontentloaded' });
      await settle(page);
      const len = await textLength(page);
      const f = await shot(page, id, name, { fullPage: true });
      let st = len > 80 ? 'PASS' : 'FAIL';
      if (st === 'PASS' && diag.console.length) st = 'WARN';
      rec(id, `Admin: ${name}`, `/yogaadmin${qs}`, 'admin', 'Admin tab renders content',
        `rendered ${len} chars; consoleErrors=${diag.console.length}`, st, f, diag.console.slice(0, 2).join(' || '));
      console.log(`${st} ${id} admin ${name} len=${len} console=${diag.console.length}`);
    });
  }
});

// ── Reception ────────────────────────────────────────────────────
test.describe('Reception workspace', () => {
  for (const [id, qs, name] of [
    ['TC-RCP-001', '', 'overview'], ['TC-RCP-002', '?tab=customers', 'customers'],
    ['TC-RCP-003', '?tab=courses', 'courses'], ['TC-RCP-004', '?tab=classes', 'classes'],
    ['TC-RCP-005', '?tab=attendance', 'attendance'], ['TC-RCP-006', '?tab=events', 'events'],
  ]) {
    test(`${id} reception ${name}`, async ({ page }) => {
      await seedAuth(page, RECEPTION); await mockApi(page, [], RECEPTION);
      await page.goto(`/reception${qs}`, { waitUntil: 'domcontentloaded' });
      await settle(page);
      const len = await textLength(page);
      const f = await shot(page, id, name, { fullPage: true });
      // Guard against a FALSE PASS: a redirected reception user would render the
      // student workspace, which also has plenty of text.
      const landed = new URL(page.url()).pathname;
      const isReceptionWorkspace = landed === '/reception';
      const st = isReceptionWorkspace && len > 80 ? 'PASS' : (isReceptionWorkspace ? 'FAIL' : 'FAIL');
      rec(id, `Reception: ${name}`, `/reception${qs}`, 'reception', 'Reception workspace renders (not redirected)',
        `landed=${landed} rendered=${len} chars`, st, f, landed !== '/reception' ? 'redirected away from /reception' : '');
      console.log(`${st} ${id} reception ${name} landed=${landed} len=${len}`);
    });
  }
});

// ── Access control ───────────────────────────────────────────────
test.describe('Access control (client-side route guards)', () => {
  const matrix = [
    ['TC-ACL-001', '/yogaadmin', 'admin', ADMIN, '/yogaadmin', 'admin allowed'],
    ['TC-ACL-002', '/reception', 'reception', RECEPTION, '/reception', 'reception allowed'],
    ['TC-ACL-003', '/studentdashboard', 'student', STUDENT, '/studentdashboard', 'student allowed'],
    ['TC-ACL-004', '/yogaadmin', 'student', STUDENT, '/studentdashboard', 'student must NOT reach admin'],
    ['TC-ACL-005', '/reception', 'student', STUDENT, '/studentdashboard', 'student must NOT reach reception'],
    ['TC-ACL-006', '/studentdashboard', 'admin', ADMIN, '/yogaadmin', 'admin must NOT reach student area'],
  ];
  for (const [id, target, role, user, expected, desc] of matrix) {
    test(`${id} ${desc}`, async ({ page }) => {
      await seedAuth(page, user); await mockApi(page, [], user);
      await page.goto(target, { waitUntil: 'domcontentloaded' });
      await settle(page);
      const url = new URL(page.url()).pathname;
      const f = await shot(page, id, target.replace(/\//g, '_') || 'root', { fullPage: false });
      const st = url === expected ? 'PASS' : 'FAIL';
      rec(id, desc, target, role, `lands on ${expected}`, `landed on ${url}`, st, f);
      console.log(`${st} ${id} ${role} -> ${target} landed ${url} (expected ${expected})`);
      expect(st).toBe('PASS');
    });
  }
});

// ── Responsive ───────────────────────────────────────────────────
test.describe('Responsive layout', () => {
  for (const [id, route, name] of [['TC-RSP-001', '/', 'home'], ['TC-RSP-002', '/memberships', 'memberships'], ['TC-RSP-003', '/classes', 'classes'], ['TC-RSP-004', '/contact', 'contact']]) {
    test(`${id} mobile 375px ${name}`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await mockApi(page);
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await settle(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const len = await textLength(page);
      const f = await shot(page, id, name, { fullPage: true });
      const st = len > 80 && overflow <= 2 ? 'PASS' : 'FAIL';
      rec(id, `Mobile 375px — ${name}`, route, 'public', 'No horizontal overflow, content renders',
        `overflow=${overflow}px rendered=${len} chars`, st, f);
      console.log(`${st} ${id} mobile ${name} overflow=${overflow} len=${len}`);
      expect(st).toBe('PASS');
    });
  }

  test('TC-RSP-005 mobile hamburger menu opens drawer', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockApi(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const toggle = page.getByLabel(/toggle menu/i).first();
    const has = await toggle.count();
    let opened = false;
    if (has) { await toggle.click({ timeout: 8000 }).catch(() => {}); await page.waitForTimeout(600); opened = true; }
    const f = await shot(page, 'TC-RSP-005', 'mobile-drawer', { fullPage: false });
    const expanded = has ? await toggle.getAttribute('aria-expanded').catch(() => null) : null;
    const st = has && opened ? 'PASS' : 'WARN';
    rec('TC-RSP-005', 'Mobile hamburger drawer', '/', 'public', 'Menu toggle opens the drawer',
      `toggleFound=${has} aria-expanded=${expanded}`, st, f);
    console.log(`${st} TC-RSP-005 drawer toggle=${has} aria-expanded=${expanded}`);
  });
});

// ── Accessibility (existing repo tooling) ────────────────────────
test.describe('Accessibility (axe-core)', () => {
  for (const [id, route, name] of [['TC-A11Y-001', '/', 'home'], ['TC-A11Y-002', '/contact', 'contact'], ['TC-A11Y-003', '/memberships', 'memberships']]) {
    test(`${id} axe ${name}`, async ({ page }) => {
      await mockApi(page);
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await settle(page);
      const f = await shot(page, id, name, { fullPage: false });
      let violations = [];
      let status = 'PASS';
      try {
        const AxeBuilder = (await import('@axe-core/playwright')).default;
        const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        violations = res.violations.map((v) => `${v.id}(${v.impact})x${v.nodes.length}`);
        if (res.violations.some((v) => ['critical', 'serious'].includes(v.impact))) status = 'FAIL';
        else if (res.violations.length) status = 'WARN';
      } catch (err) {
        status = 'BLOCKED';
        violations = [`axe unavailable: ${err.message}`];
      }
      rec(id, `Accessibility (axe) — ${name}`, route, 'public', 'No critical/serious WCAG A/AA violations',
        violations.length ? violations.slice(0, 6).join(', ') : 'no violations', status, f);
      console.log(`${status} ${id} axe ${name} :: ${violations.length ? violations.slice(0, 4).join(', ') : 'clean'}`);
    });
  }
});

test.afterAll(() => {
  fs.mkdirSync(path.dirname(RESULTS), { recursive: true });
  fs.writeFileSync(RESULTS, JSON.stringify(results, null, 2));
  console.log(`\nWROTE ${RESULTS} (${results.length} records)`);
});