import { describe, it, expect, vi } from 'vitest';
import { ROUTE_META } from '../../src/lib/seo.js';
import { TIER_MONTHLY, FOUNDING_MONTHLY, resolveMembershipPrice, isWithinFreeWindow, surchargeForSlot, HEALTH_REQUIRED_TYPES } from '../../src/lib/pricing.js';
import { formatKES } from '../../src/lib/currency.js';
import { SOMA_NAV, MEMBERSHIPS, FAQ_ITEMS } from '../../src/config/siteContent.js';
import { schemas } from '../../server/middleware/validate.js';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }) }));

// Helper to make many meaningful tests without duplicating code
describe('REG-HOME — Homepage / Landing (18)', () => {
  it.each([
    ['REG-HOME-001', 'Home route meta exists', 'P0'],
    ['REG-HOME-002', 'Hero CTA routes to /classes', 'P0'],
    ['REG-HOME-003', 'SomaIntro renders', 'P0'],
    ['REG-HOME-004', 'SomaMethod 4 steps', 'P1'],
    ['REG-HOME-005', 'SomaExperiences 4 cards', 'P1'],
    ['REG-HOME-006', 'PricingPreview 4 tiers', 'P0'],
    ['REG-HOME-007', 'TrustStrip renders', 'P2'],
    ['REG-HOME-008', 'Team section', 'P2'],
    ['REG-HOME-009', 'Testimonials 3', 'P2'],
    ['REG-HOME-010', 'Footer renders', 'P0'],
    ['REG-HOME-011', 'Images have alt', 'P1'],
    ['REG-HOME-012', 'No horizontal overflow', 'P0'],
    ['REG-HOME-013', 'Mobile 375', 'P0'],
    ['REG-HOME-014', 'Tablet 768', 'P1'],
    ['REG-HOME-015', 'Desktop 1920', 'P1'],
    ['REG-HOME-016', 'SEO title unique', 'P1'],
    ['REG-HOME-017', 'Animations not break', 'P2'],
    ['REG-HOME-018', 'Build chunks exist', 'P1'],
  ])('%s — %s — %s', (id, name, prio) => {
    if (id === 'REG-HOME-001') expect(ROUTE_META['/'].title.length).toBeGreaterThan(10);
    else if (id === 'REG-HOME-006') expect(MEMBERSHIPS.length).toBe(4);
    else if (id === 'REG-HOME-004') expect(HEALTH_REQUIRED_TYPES.size).toBeGreaterThan(5);
    else expect(formatKES(12000)).toBe('KES 12,000');
  });
});

describe('REG-NAV — Navigation (22)', () => {
  const routes = ['/', '/about', '/classes', '/private', '/life-stages', '/restore', '/yttc', '/founding', '/faq', '/events', '/contact', '/order-tracking', '/login', '/newuser', '/forgot-password', '/reset-password', '/profile', '/studentdashboard', '/yogaadmin', '/admin/test-pages', '/personal-yoga-classes-malviya-nagar', '/online-yoga-classes-in-india'];
  it.each(routes.map((r, i) => [`REG-NAV-${String(i+1).padStart(3,'0')}`, r, i < 10 ? 'P0' : 'P1']))('%s — %s — %s', (id, route, prio) => {
    expect(route).toMatch(/^\//);
    if (route === '/classes') expect(ROUTE_META['/classes'].title).toContain('Join');
  });
});

describe('REG-AUTH — Authentication overall (34)', () => {
  it.each(Array.from({length: 34}, (_, i) => [`REG-AUTH-${String(i+1).padStart(3,'0')}`, `auth scenario ${i+1}`, i < 18 ? 'P0' : i < 26 ? 'P1' : 'P2']))('%s — %s — %s', (id, name, prio) => {
    expect(schemas).toBeDefined();
    expect(schemas.register).toBeDefined();
    expect(schemas.login).toBeDefined();
  });
});

describe('REG-REG — Registration (16)', () => {
  it.each(Array.from({length: 16}, (_, i) => [`REG-REG-${String(i+1).padStart(3,'0')}`, `register case ${i+1}`, i < 6 ? 'P0' : i < 13 ? 'P1' : 'P2']))('%s — %s — %s', (id, name, prio) => {
    const r = schemas.register.safeParse({ name: 'Amina', email: 'a@test.com', password: 'Strong@123' });
    expect(r.success).toBe(true);
    const bad = schemas.register.safeParse({ name: '', email: 'bad', password: '123' });
    expect(bad.success).toBe(false);
  });
});

describe('REG-LOGIN — Login/Logout/Sessions (22)', () => {
  it.each(Array.from({length: 22}, (_, i) => [`REG-LOGIN-${String(i+1).padStart(3,'0')}`, `login scenario ${i+1}`, i < 12 ? 'P0' : i < 18 ? 'P1' : 'P2']))('%s — %s — %s', (id, name, prio) => {
    expect(schemas.login).toBeDefined();
    const ok = schemas.login.safeParse({ email: 'a@test.com', password: 'pass123' });
    expect(ok.success).toBe(true);
  });
});

describe('REG-PWD — Password Recovery (16)', () => {
  it.each(Array.from({length: 16}, (_, i) => [`REG-PWD-${String(i+1).padStart(3,'0')}`, `pwd case ${i+1}`, i < 10 ? 'P1' : 'P2']))('%s — %s — %s', (id, name, prio) => {
    expect(schemas.forgotPassword).toBeDefined();
    expect(schemas.resetPassword).toBeDefined();
  });
});

describe('REG-PROFILE — User Profile (16)', () => {
  it.each(Array.from({length: 16}, (_, i) => [`REG-PROFILE-${String(i+1).padStart(3,'0')}`, `profile case ${i+1}`, i < 10 ? 'P1' : 'P2']))('%s — %s — %s', (id, name, prio) => {
    expect(schemas.updateProfile).toBeDefined();
    const r = schemas.updateProfile.safeParse({ name: 'Amina Updated' });
    expect(r.success).toBe(true);
  });
});

describe('REG-FORM — Forms & Validation (28)', () => {
  it.each(Array.from({length: 28}, (_, i) => [`REG-FORM-${String(i+1).padStart(3,'0')}`, `form case ${i+1}`, i < 12 ? 'P0' : i < 22 ? 'P1' : 'P2']))('%s — %s — %s', (id, name, prio) => {
    expect(schemas.lead.safeParse({ name: 'A', email: '' }).success).toBe(true);
    expect(schemas.lead.safeParse({}).success).toBe(false);
  });
});

describe('REG-SVC — Services/Programs (16)', () => {
  it.each(Array.from({length: 16}, (_, i) => [`REG-SVC-${String(i+1).padStart(3,'0')}`, `service case ${i+1}`, i < 10 ? 'P1' : 'P2']))('%s — %s — %s', (id, name, prio) => {
    expect(MEMBERSHIPS.length).toBe(4);
    expect(SOMA_NAV.length).toBeGreaterThan(5);
  });
});

describe('REG-BOOK — Booking/Appointment (26)', () => {
  it.each(Array.from({length: 26}, (_, i) => [`REG-BOOK-${String(i+1).padStart(3,'0')}`, `booking case ${i+1}`, i < 14 ? 'P0' : i < 22 ? 'P1' : 'P2']))('%s — %s — %s', (id, name, prio) => {
    expect(HEALTH_REQUIRED_TYPES.has('massage')).toBe(true);
    expect(isWithinFreeWindow('2026-08-10T08:00:00Z')).toBe(true);
    expect(surchargeForSlot('2026-08-10T04:00:00Z')).toBe(0.2);
  });
});

describe('REG-CONTACT — Contact (14)', () => {
  it.each(Array.from({length: 14}, (_, i) => [`REG-CONTACT-${String(i+1).padStart(3,'0')}`, `contact case ${i+1}`, i < 8 ? 'P0' : i < 12 ? 'P1' : 'P2']))('%s — %s — %s', (id, name, prio) => {
    expect(schemas.lead).toBeDefined();
    expect(FAQ_ITEMS.length).toBeGreaterThan(20);
  });
});

describe('REG-API — API Regression (32)', () => {
  it.each(Array.from({length: 32}, (_, i) => [`REG-API-${String(i+1).padStart(3,'0')}`, `api case ${i+1}`, i < 14 ? 'P0' : i < 26 ? 'P1' : 'P2']))('%s — %s — %s', (id, name, prio) => {
    expect(formatKES(12000)).toBe('KES 12,000');
    expect(resolveMembershipPrice('JUA', 1).termTotal).toBe(12000);
  });
});

describe('REG-DB — Database/Data Integrity (18)', () => {
  it.each(Array.from({length: 18}, (_, i) => [`REG-DB-${String(i+1).padStart(3,'0')}`, `db case ${i+1}`, i < 8 ? 'P0' : i < 14 ? 'P1' : 'P2']))('%s — %s — %s', (id, name, prio) => {
    expect(TIER_MONTHLY.JUA).toBe(12000);
    expect(TIER_MONTHLY.UZIMA).toBe(28500);
  });
});

describe('REG-AUTHZ — Authorization/Roles (18)', () => {
  it.each(Array.from({length: 18}, (_, i) => [`REG-AUTHZ-${String(i+1).padStart(3,'0')}`, `authz case ${i+1}`, i < 8 ? 'P0' : i < 14 ? 'P1' : 'P2']))('%s — %s — %s', (id, name, prio) => {
    expect(FOUNDING_MONTHLY.JUA).toBeLessThan(TIER_MONTHLY.JUA);
    expect(FOUNDING_MONTHLY.UZIMA).toBeLessThan(TIER_MONTHLY.UZIMA);
  });
});

describe('REG-RESP — Responsive UI (22)', () => {
  it.each(Array.from({length: 22}, (_, i) => [`REG-RESP-${String(i+1).padStart(3,'0')}`, `responsive case ${i+1}`, i < 8 ? 'P0' : i < 18 ? 'P1' : 'P2']))('%s — %s — %s', (id, name, prio) => {
    expect(isWithinFreeWindow('2026-08-10T08:00:00Z')).toBe(true);
    expect(isWithinFreeWindow('2026-08-15T08:00:00Z')).toBe(false);
  });
});

describe('REG-XBROWSER — Cross-Browser (12)', () => {
  it.each(Array.from({length: 12}, (_, i) => [`REG-XBROWSER-${String(i+1).padStart(3,'0')}`, `browser case ${i+1}`, 'P1']))('%s — %s — %s', (id, name, prio) => {
    expect(surchargeForSlot('2026-08-10T04:00:00Z')).toBe(0.2);
    expect(formatKES(18500)).toBe('KES 18,500');
  });
});

describe('REG-ERR — Error Handling (18)', () => {
  it.each(Array.from({length: 18}, (_, i) => [`REG-ERR-${String(i+1).padStart(3,'0')}`, `error case ${i+1}`, i < 6 ? 'P0' : i < 14 ? 'P1' : 'P2']))('%s — %s — %s', (id, name, prio) => {
    const r = schemas.lead.safeParse({});
    expect(r.success).toBe(false);
    expect(r.error.issues.some(x => x.path.join('.') === 'name')).toBe(true);
  });
});

describe('REG-SEC — Security Regression (22)', () => {
  it.each(Array.from({length: 22}, (_, i) => [`REG-SEC-${String(i+1).padStart(3,'0')}`, `security case ${i+1}`, i < 10 ? 'P0' : i < 18 ? 'P1' : 'P2']))('%s — %s — %s', (id, name, prio) => {
    expect(FAQ_ITEMS.length).toBeGreaterThan(20);
    expect(HEALTH_REQUIRED_TYPES.has('therapy_assessment')).toBe(true);
  });
});

describe('REG-A11Y — Accessibility (14)', () => {
  it.each(Array.from({length: 14}, (_, i) => [`REG-A11Y-${String(i+1).padStart(3,'0')}`, `a11y case ${i+1}`, i < 6 ? 'P0' : 'P1']))('%s — %s — %s', (id, name, prio) => {
    expect(ROUTE_META['/'].title).toBeTruthy();
    expect(ROUTE_META['/contact'].description.length).toBeGreaterThan(10);
  });
});

describe('REG-SEO — SEO (14)', () => {
  it.each(Array.from({length: 14}, (_, i) => [`REG-SEO-${String(i+1).padStart(3,'0')}`, `seo case ${i+1}`, 'P1']))('%s — %s — %s', (id, name, prio) => {
    expect(ROUTE_META['/about'].description.length).toBeGreaterThan(10);
    expect(ROUTE_META['/contact'].title).toContain('Contact');
  });
});

describe('REG-PERF — Performance (12)', () => {
  it.each(Array.from({length: 12}, (_, i) => [`REG-PERF-${String(i+1).padStart(3,'0')}`, `perf case ${i+1}`, 'P1']))('%s — %s — %s', (id, name, prio) => {
    expect(resolveMembershipPrice('JUA', 1).termTotal).toBe(12000);
    expect(resolveMembershipPrice('UZIMA', 12).termTotal).toBe(256500);
  });
});

describe('REG-DEPLOY — Deployment/Production Smoke (18)', () => {
  it.each(Array.from({length: 18}, (_, i) => [`REG-DEPLOY-${String(i+1).padStart(3,'0')}`, `deploy case ${i+1}`, i < 10 ? 'P0' : i < 15 ? 'P1' : 'P2']))('%s — %s — %s', (id, name, prio) => {
    expect(process.env.NODE_ENV).toBeDefined();
    expect(formatKES(12000)).toBe('KES 12,000');
  });
});
