# QA Coverage Report — Soma Wellness

**Date:** 2026-08-30  
**Tooling:** Vitest `v8` (frontend) + Jest (backend) + Playwright (E2E not in coverage)

---

## Summary

| Area | Statements | Branches | Functions | Lines | Status |
|------|:---:|:---:|:---:|:---:|--------|
| **Frontend critical libs** (`lib/currency, pricing, seo, utils/payment, somaApi, context/Auth`) | **98.8%** | **93.3%** | **77.7%** | **98.8%** | ✅ Excellent |
| **Frontend overall** (`src/**/*`) | 11.5% | 49.8% | 23.7% | 11.5% | 🟡 Partial — critical paths covered |
| **Backend critical services** | ~88% avg | ~73% avg | ~83% avg | ~90% avg | ✅ Excellent |
| **Backend overall** (all `server/**/*.js`) | 7.89% | 6.3% | 8.0% | 8.5% | 🟡 Low overall due to untested cron/email/templates |
| **Components tested (RTL)** | Navbar, Footer, Contact, Hero, SEO headings | — | — | — | ✅ P0 covered |
| **Integration** | Contact → /api/leads (200/400/429/500/network), soma catalog, appointment auth, XSS/long/unicode | — | — | — | ✅ |
| **E2E** (Playwright, 13 spec files) | Homepage, Navigation (desktop+mobile), Contact, Responsive (5 viewports × 9 routes), A11y (axe) | — | — | — | ✅ Written (requires running dev server) |

---

## Frontend Detailed

### High-Coverage Modules (P0/P1 — Target 90%+)

| File | Statements | Branches | Functions | Lines | Uncovered Lines |
|------|----------:|---------|----------:|------:|-----------------|
| `src/lib/currency.js` | 100 | 100 | 100 | 100 | — |
| `src/lib/pricing.js` | 100 | 100 | 100 | 100 | — |
| `src/lib/somaApi.js` | 100 | 93.33 | 72.72 | 100 | 12 |
| `src/lib/seo.js` | 98.36 | 90 | 83.33 | 98.36 | 127-128 |
| `src/utils/payment.js` | 100 | 85.18 | 100 | 100 | 5,61,93,106 |
| `src/context/AuthContext.jsx` | 80.23 | 86.95 | 100 | 80.23 | 56-58,62-76 |
| `src/pages/Contact.jsx` | 98.85 | 95.45 | 100 | 98.85 | 49-50 |
| `src/pages/FAQ.jsx` | 98.46 | 70 | 16.66 | 98.46 | 191-193 |

Component libs:
- `src/lib/motion.js` 98.55% statements
- `src/components/soma/SomaIntro` etc. 90-100% where rendered in Home smoke
- `src/components/Navbar` not in coverage table (requires DOM mock fully) but RTL tests 7 scenarios passing
- `src/components/Footer` RTL 6 scenarios passing

### Low / Zero Coverage (Documented, P2/P3)

These are intentionally not targeted for 90% in this phase (non-critical or admin):

| Area | Coverage | Risk | Action |
|------|----------|------|--------|
| `src/pages/BookDetail.jsx`, `Books.jsx`, `BookCheckout.jsx` | 0% | Medium — hidden redirect flows, but XSS fix applied | Add tests if bookstore re-enabled |
| `src/pages/Classes.jsx`, `Private.jsx`, `LifeStages.jsx`, `Restore.jsx`, `YTTC.jsx` | 0% | P1 — static content heavy, covered via E2E heading checks | Add component snapshot tests next iteration |
| `src/components/Admin/**` | 0% | Low — admin not public, covered by backend integration tests | Manual admin QA required |
| `src/components/Profile/**` | 0% | Medium | Add auth-gated tests after E2E auth |
| `src/components/common/*` Reveal, FloatingWhatsApp, Motion | 0-62% | Low | Minor |

### Test Counts (Frontend Vitest)

```
Test Files: 13 passed
Tests:      117 passed, 0 failed
Duration:   ~28s
```

Breakdown:
- `tests/unit/lib` — currency (10), pricing (17), seo (15), somaApi (5) = 47 unit
- `tests/unit/utils` — payment (19), auth context (6 + pending TTL) = 25 unit
- `tests/components` — Navbar (7), Footer (6), Contact (8), Hero (2), SEOComponent (5) = 28 component
- `tests/integration` — routing smoke (3), api integration (10) + others = 17 integration

Branch coverage highlights:
- `payment.js` branch 85% (missing: graceful `json()` failure, token absent paths covered)
- `AuthContext` branch 86% (missing: async logout fetch failure, storage empty)
- `seo.js` branch 90% (missing: locale fallback edge)

---

## Backend Detailed (Jest)

```
Test Suites: 21 passed
Tests:       317 passed
```

Per-service high coverage:

| Service | Statements | Branches | Functions | Notes |
|---------|----------:|--------:|----------:|-------|
| `pricingEngine.js` | 95.65 | 67.44 | 100 | core membership math |
| `inventoryService.js` | 93.87 | 76.27 | 100 | stock/reservation |
| `cancellationService.js` | 93.33 | 84.61 | 100 | fee calc |
| `orderStatusService.js` | 92.30 | 68.75 | 100 | status machine |
| `NotificationDispatcher.js` | 95 | 73.97 | 83.33 | |
| `allowanceService.js` | 81.66 | 57.14 | 85.71 | SOMA allowances |
| `foundingService.js` | 78.12 | 68.75 | 42.85 | window/rollover |
| `shippingService.js` | 81.57 | 80.19 | 77.77 | PIN/charge |
| `surchargeService.js` | 87.5 | 83.33 | 100 | free window 10-15 |
| `utils/token.js` | 100 | 84.61 | 100 | |
| `utils/ApiError.js` | 100 | 100 | 100 | |
| `middleware/*` | 85-100% for auth, validate, sanitize, rateLimit, errorHandler | | | |

Low overall (7.89%) reflects:
- `server/services/cron`, `email/templates`, `notificationService`, `bookCleanup`, `attendanceService` etc. — functional but not unit-covered, exercised via scheduler/integration tests `server/__tests__/integration/{soma, payment}` (bookingFlows, activationChain).
- Routes/controllers: mostly integration-tested via API but not counted in `collectCoverageFrom`? `server/__tests__/**` excluded plus many services not yet mock-tested.

**Recommendation:** Do not raise global thresholds to 70% artificially by excluding files. Instead add targeted coverage for:
- `somaCron`, `bookOrderCleanupService`, `otpService`, `paymentExpiryService` next quarter.
- Backend threshold currently 70% `config` expects 70 but actual 8% fails CI — adjust `jest.config.js` to per-file thresholds for critical services vs global, or enable `collectCoverageFrom` narrowing.

---

## E2E / Manual

Not counted in unit coverage; E2E specs written for Playwright:
- `homepage.spec.js` (5)
- `navigation.spec.js` (5)
- `contact.spec.js` (5)
- `responsive.spec.js` (45 = 5 viewports × 9 routes)
- `a11y.spec.js` (10)

Total E2E cases: ~70 (chromium × 1; with 5 browsers matrix = 350 executions on CI).

Manual checklist covered: keyboard nav, focus, screen-reader labels, responsive overflow detection (`scrollWidth <= clientWidth`), SEO meta via axe/static, security headers via code review, performance bundle audit.

---

## Gaps & Next Steps

1. Add Vitest tests for `Private`, `LifeStages`, `Restore`, `YTTC` — currently only E2E heading smoke.
2. Add Playwright authenticated E2E for `studentdashboard`/`yogaadmin` login flow (requires seeding test user or MSW).
3. Raise backend unit coverage for `somaAdminController`, `somaController` via supertest API tests (do not call live Daraja).
4. Visual regression with Playwright `toHaveScreenshot` for Home/Classes/Contact at 375/768/1280.
5. Re-enable coverage thresholds after gap #1 is closed (target lines 80% for `src/pages/*`).

---

## How to Reproduce

```bash
# Frontend unit + component + integration
npx vitest run
npx vitest run --coverage   # html at coverage/frontend/index.html

# Backend unit + integration
npm test                    # jest node
npm test -- --coverage

# E2E (requires dev server or preview)
npx playwright test
npx playwright test --project=chromium
npx playwright show-report

# Lint + Build (must pass)
npx eslint src
npm run build
```
