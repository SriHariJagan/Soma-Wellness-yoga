# QA Test Strategy — Soma Wellness Website

**Version:** 1.0 — 2026-08-30  
**Author:** Principal QA / SDET  
**Application:** Soma Wellness — Premium Yoga & Conscious Living  
**Stack:** React 19 + Vite 8 + React Router 7 + Framer Motion + i18next | Express 5 + Mongoose 9 + BullMQ + Redis + MongoDB | Deployment: Vercel (frontend) + Render (backend) + Docker

---

## 1. Application Overview

Soma Wellness is a premium yoga and conscious living studio operating from Spring Valley, Nairobi, Kenya. The website serves as:

- Marketing / brochure site (Home, About, Classes/Memberships, Private Yoga, Life Stages, Restore, YTTC Academy, FAQ, Contact, Events, Landing SEO pages)
- Authenticated member portal (Student Dashboard with Plans, Services, Bookings, Attendance, Blogs, Consultations, Bookstore, Payments)
- Admin CMS (YogaAdmin — Plans, Services, Bookings, Leads, Students, Batches, Content, Book Store, Shipping, Reports)
- Booking & commerce flows (Membership enrollment, service booking, M-Pesa STK push, Book cart/checkout, Gift vouchers, Passes, SOMA DAILY subscription, Corporate leads)

Business domains: Memberships (JUA/AMANI/UZIMA/FAMILY), SOMA catalog (services, plans, passes), Private/Therapy, Life Stages (Mama/Young/AgeWell), Restore (massage/signature), SOMA Academy (YTTC), SOMA Daily, Gift Vouchers, Book Store, Corporate Wellness, Payments (M-Pesa, Razorpay legacy).

---

## 2. Architecture Overview

### Frontend (`/src`)
- **Framework:** React 19.2.4, Vite 8.0.12, React Router DOM 7.14.2 (BrowserRouter), lazy route splitting
- **State:** React Context (`AuthContext`), TanStack Query 5.101 (Books), localStorage + sessionStorage for auth/persistence
- **Animation:** Framer Motion 12.40
- **i18n:** i18next 26 + react-i18next + browser language detector (en/sw bilingual, hreflang handling)
- **Styling:** CSS modules + global CSS (`App.css`, `index.css`, component CSS), no Tailwind
- **Icons:** react-icons 5.6, Tabler Icons webfont
- **SEO helper:** `src/lib/seo.js` — per-route meta, OG, canonical, hreflang via DOM manipulation
- **Pricing:** `src/lib/pricing.js` (mirrors backend pricingEngine), `src/lib/currency.js` (KES formatting)
- **API layer:** `fetch` wrappers — `src/lib/somaApi.js`, `src/components/api/{Student,Admin,Book,WhatsApp,Mpesa}Services.js`, `src/utils/payment.js`
- **Build:** Vite with manual chunk grouping (react-vendor, motion, icons, calendar), codeSplitting.groups via `rolldownOptions` (note: check Vite 8 compatibility)

### Backend (`/server`)
- **Runtime:** Node 20, Express 5.2.1, Mongoose 9.6.2, modular routes/controllers/models
- **Auth:** JWT (access 2h, refresh 30d) + httpOnly cookie, bcryptjs, Passport (Google/Facebook/Instagram OAuth)
- **Validation:** Zod, custom validate middleware, sanitize middleware
- **Security:** helmet (CSP + HSTS), cors (allowlist + localhost regex), compression, rateLimit, requestTimeout, sanitizeQueryParams, errorHandler
- **Queues:** BullMQ + ioredis (notifications, payment webhooks, scheduler)
- **Email:** Nodemailer + Gmail SMTP, transactional templates, bulk invite flows
- **Payments:** M-Pesa Daraja (STK push), Razorpay legacy, PaymentStateMachine, WebhookQueue
- **Services:** pricingEngine, foundingService, allowanceService, cancellationService, surchargeService, inventory/shipping/orderStatus, expiry cron, SOMA cron
- **Uploads:** multer → `server/uploads` (image-only static serve with cache headers)

### Routes Inventory (Frontend)

| Path | Component | Type | Notes |
|------|-----------|------|-------|
| `/` | Home | public | Eager |
| `/about` | About | public | lazy |
| `/classes` | Classes (Join) | public | Memberships |
| `/private` | Private | public | 1:1 therapy |
| `/life-stages` | LifeStages | public | Mama/Young/AgeWell |
| `/restore` | Restore | public | Massage/signatures |
| `/yttc` | YTTC | public | Academy |
| `/founding` | FoundingMembers | public | Founding window |
| `/faq` | FAQ | public | 25-item FAQ with search |
| `/events` | Events | public | Redirects to Restore |
| `/contact` | Contact | public | Lead form + map |
| `/books` → `/` | Books | redirect | Hidden, legacy |
| `/books/:slug` → `/` | BookDetail | redirect | Hidden |
| `/bulk-orders` → `/` | BulkOrders | redirect | Hidden |
| `/order-tracking` | OrderTracking | public | Order lookup |
| `/checkout` | BookCheckout | protected (student) | Auth gate |
| `/payment` | PaymentPage | dashboard-only | M-Pesa flow |
| `/login` | Login | public (redirect if authed) | |
| `/newuser` | New (Register) | public | |
| `/forgot-password` | ForgotPassword | public | |
| `/reset-password` | ResetPassword | public | |
| `/profile` | Profile | lazy | |
| `/studentdashboard` | StudentDashboard | protected student | |
| `/yogaadmin` | YogaAdmin | protected admin | |
| `/social/success` | SocialSuccess | OAuth callback | |
| `/admin/test-pages` | AdminTestPages | public? | Should be admin? |
| `/personal-yoga-classes-malviya-nagar` + 15 more | LandingPage | public SEO | 16 landing slugs |
| `*` → `/` | catch-all | redirect | SPA fallback |

Backend API prefixes: `/api/health`, `/api/auth`, `/api/auth/otp`, `/api/student`, `/api/students`, `/api/admin`, `/api/batches`, `/api/bookings`, `/api/leads`, `/api/public`, `/api/blogs`, `/api/soma`, `/api/mpesa`, `/api/whatsapp`, `/api/payment`, `/admin/queues`

---

## 3. Testing Scope

**In Scope:** All frontend routes & components, hooks, utils, pricing/currency, SEO meta, auth flow, forms (contact, login, register, booking, checkout), API integration (mocked), security headers, accessibility (WCAG 2.2 AA), responsive, performance budget, SEO metadata, error handling, console/network hygiene, i18n, production config.

**Out of Scope (manual/specialized):** Real M-Pesa Daraja STK push against Safaricom sandbox, real SMTP delivery, real Redis/Mongo in isolation (covered by server unit/integration), visual pixel-perfect via Chromatic, load testing via k6.

---

## 4. Testing Methodology

- Risk-based: P0 journeys first, then P1/P2.
- Pyramid: 60% unit, 25% component/integration, 15% E2E.
- Shift-left: Vitest + RTL for fast feedback; Playwright for critical flows on CI.
- Deterministic: MSW / fetch mocks, no live network in unit/component. Isolated, order-independent.
- Accessibility-first: axe-core automated + keyboard manual checklist.
- Security as quality gate: static audit + dependency audit + CSP verification.

---

## 5. Test Pyramid

```
            E2E (Playwright)
     Integration (API → State → UI)
        Component (RTL + user-event)
              Unit (Vitest)
```

- **Unit:** Pure functions (currency, pricing, SEO, payment helpers), validators, hooks, services.
- **Component:** Navbar, Footer, Hero variants, PricingBanner, BookingFlow, Auth forms, Contact form, SOMA sections, Modals.
- **Integration:** Frontend → mocked API → state → UI (cart add, checkout gate, membership fetch, lead submit).
- **E2E:** Homepage → Navigate → Contact submit (valid/invalid), Auth register → login → dashboard gate, deep-link + refresh, 404 catch-all.

---

## 6. Unit Testing Strategy

Tool: **Vitest + jsdom** (frontend), **Jest (node)** (server — existing)

**Frontend targets:**
- `src/lib/currency.js` — `formatKES`, `formatKESCompact` (number, 0, NaN, negative, large, decimals, with/without symbol)
- `src/lib/pricing.js` — `resolveMembershipPrice`, `isWithinFreeWindow`, `surchargeForSlot`, `HEALTH_REQUIRED_TYPES` (all tiers × terms × founding flag, invalid tier error, boundary time windows)
- `src/lib/seo.js` — `getLocalizedMeta`, `applyMeta` (known routes, unknown fallback, i18n override, canonical/hreflang/og injection, idempotent)
- `src/utils/payment.js` — `parsePrice`, `formatKES`, `getAuthHeaders`, `isLoggedIn`, `getCurrentUser` (empty, malformed JSON, missing token)
- `src/lib/motion.js` + `src/hooks/useScrollToSection.js` — reduced-motion, scroll target parsing
- `src/data/landingPages.js`, `src/config/siteContent.js` — shape invariants

**Backend (existing Jest, keep):** `server/utils/*`, `server/services/*`, `server/middleware/*`, `server/__tests__/integration/*` (317 tests passing).

Assertions: happy + empty + null/undefined + invalid type + boundary + unexpected whitespace/special chars. No test of implementation detail.

Coverage target: statements 90%+, branches 85%+, functions 90%+, lines 90% for frontend utils/hooks.

---

## 7. Component Testing Strategy

Tool: **React Testing Library + user-event**, Vitest jsdom

Each component verified for Rendering / Interaction / State / Accessibility from user perspective, using `getByRole` / `getByLabel` / `getByText`.

| Component | Key behaviours |
|-----------|---------------|
| Navbar | renders navLinks, active state, hamburger toggles drawer, outside-click closes dropdown, user cluster shows initials, logout navigates, scroll behavior |
| Footer | links render, socials have aria-label + target _blank rel noreferrer, newsletter validates email, shows "Joined" feedback, language switcher present |
| Hero (+ variants) | heading, CTA routes to /classes, image alt, reduced-motion disables animation |
| SomaMethod / Experiences / PricingPreview / Team | correct card count, href correctness, price formatting KES |
| Contact form | required validation (name/email/message), email type, submit loading→success→reset, error alert on network failure, trims whitespace |
| Auth forms | Register: required + password match, Login: invalid creds shows error, OTP modal flow |
| BookingFlow / EnrollModal | auth gate redirects to login, health disclosure required types block without acknowledgment |
| PayAheadSelector | term totals match pricing.js, founding badge when eligible |
| SomaLoader, BackToTop, ScrollProgress | renders, accessibility hidden where appropriate |

Avoid: CSS class assertions, internal state spies. Test behaviour.

---

## 8. Integration Testing Strategy

Tool: **Vitest + MSW (or fetch mock) + RTL**

Scenarios:
- `GET /api/soma/catalog` → Classes page renders memberships; failure shows error/empty state, no blank screen.
- `POST /api/leads` (Contact) — 200 shows thank-you + resets; 400 shows field errors; 429 shows rate-limit message; 500 shows generic retry.
- `POST /api/student/cart/add` (Books) — unauth redirects to /login with `from`, auth adds and dispatches `cart-update` + toast.
- `GET /api/student/bookings` etc. — auth header includes Bearer token, 401 triggers refresh attempt or logout.
- `POST /api/mpesa/stkpush` — phone validation, amount coercion, error message propagation.
- i18n: switching language updates `html[lang]`, SEO meta title via `getLocalizedMeta`, hreflang links appear.

Mock at network boundary; assert UI reflects success/error/loading correctly.

---

## 9. API Testing Strategy

Frontend viewpoint (mocked): contract tests for request shape, header, and response handling.

For each endpoint used (leads, public catalog, auth login/register/otp, mpesa, cart, soma appointments/quotes):
- Correct request (method, path, Content-Type, Authorization when needed, body shape)
- Invalid request (missing required fields, wrong type, empty body) → frontend validates before send OR shows API 400 error.
- HTTP responses 200/201/204/400/401/403/404/409/422/429/500 → correct UI feedback.
- Frontend integration: success → state update; failure → error state (no infinite spinner, no unhandled rejection).

No live production calls in CI. Use MSW fixtures under `tests/fixtures/`.

---

## 10. End-to-End Testing Strategy

Tool: **Playwright** (Chromium/Firefox/WebKit)

Critical journeys:

**J1 — Homepage Journey (P0)**
1. Goto `/`, expect 200, title contains "Soma Wellness", H1 present, no console.error
2. Navbar visible, scroll through sections (Hero, Method, Experiences, PricingPreview, TrustStrip, Testimonials, CTA)
3. Click primary CTA "Book" → `/classes`, verify, back to `/`, footer links work

**J2 — Navigation (P0)**
- Desktop: every nav link navigates, active style applied
- Mobile (375px): hamburger opens drawer, links inside drawer navigate, drawer focus trap, Esc closes

**J3 — Contact Journey (P0)**
- `/contact` renders info cards + map iframe + form
- Invalid: submit empty → browser required validation; invalid email → typeMismatch
- Valid: fill + submit (mock 200) → status "Thank you", form reset
- Failure: mock 500 → alert role message, form not reset

**J4 — Auth Journey (P0)**
- `/newuser` register → success → redirects or shows login link
- `/login` valid → dashboard by role; invalid → error; unauth access to `/studentdashboard` redirects to `/login`
- Logout clears storage and navigates

**J5 — Deep-link & Refresh (P1)**
- Direct open each public route, refresh, verify still renders, SPA vercel rewrite holds

**J6 — 404 (P1)**
- Unknown route `/nope-xyz` → redirects to `/` (current catch-all) — document as product choice; verify no blank.

Each E2E collects console errors, page errors, failed requests; P0 fails on any unexpected error.

---

## 11. Accessibility Testing

Target **WCAG 2.2 AA**, tool **axe-core (jest-axe / @axe-core/playwright)** + manual keyboard audit.

Automated per page: run axe after load (include `color-contrast`).

Manual checklist:
- Keyboard: Tab / Shift+Tab order logical, Enter/Space activates buttons/links, Esc closes drawers/modals, arrow keys where applicable.
- Focus: visible focus ring, no trap, modal focus moves inside and restores on close.
- Semantics: one H1 per page, heading hierarchy no skip, landmarks (`header`, `nav`, `main`, `footer`), images have meaningful alt (decorative alt="" or aria-hidden), form labels associated, error messages linked via aria-describedby/role=alert.
- Screen reader: button/link have accessible name, icon-only buttons have aria-label (hamburger, close, socials).

Report violations grouped by impact (critical/serious/moderate/minor).

---

## 12. Responsive Testing

Playwright projects at: 320, 360, 375, 390, 414 (mobile), 768, 820, 1024 (tablet), 1280, 1440, 1920, 2560 (desktop).

Per route: check `document.documentElement.scrollWidth <= clientWidth` (no horizontal overflow), no clipped text (`offsetWidth >= scrollWidth` for headings), no overlapping via bounding-box collision, nav collapses to hamburger below breakpoint, cards grid reflows, forms remain usable, images not stretched.

Also verify `vite.config` proxies are dev only, not relied upon in production.

---

## 13. Security Testing (Defensive)

- Static scan: search source for `dangerouslySetInnerHTML`, ensure DOMPurify sanitization where used (BookDetail, BlogDetail already uses DOMPurify — verify Books description also would if it rendered HTML; BookDetail line 210 `__html: book.description` is **unsanitized** — flag P1).
- Storage: localStorage holds JWT (`token`) — XSS risk; verify no sensitive data (password) stored; HttpOnly cookie for refresh is better (currently localStorage — note risk).
- `npm audit` — triage high/moderate (brace-expansion, vite, react-router, qs, postcss, nanoid) — recommend `npm audit fix` non-breaking then targeted upgrades.
- Secrets: `.env` committed? Check — file IS present with real credentials (MONGO_URI, JWT_SECRET, SMTP_PASS, MPESA keys, Clerk keys, Gmail app password) — **P0: rotate and gitignore enforcement**. `.gitignore` inspection required.
- Headers: verify `helmet` CSP (scriptSrc unsafe-inline present — document), HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff via `vercel.json` + server.
- Input validation: contact form, lead endpoints, blog HTML — test `<script>`, SQL-like, long strings for safe handling.
- CORS: allowlist includes prod + localhost; localhost allowed as isLocalhost — ensure prod does not widen overly.
- API calls: verify no `http://` in prod, no `localhost` hardcoded in fetch URLs (VITE_API_URL fallback `''` is OK due to proxy).

Do not print secrets in reports; use `SECRET DETECTED — rotate credential`.

---

## 14. Performance Testing

Targets (Lighthouse / Web Vitals):
- LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms, TBT ≤ 200ms, FCP ≤ 1.8s
- JS bundle: vendor split helps; `dist/assets/index ~468kB` (raw) — verify gzip ~120kB acceptable; warn if >250kB gz.
- Images: check for unoptimized.unsplash direct vs optimized webp, missing `loading="lazy"`, missing width/height causing CLS.
- Fonts: preconnect + print-media trick correct; verify no FOIT flash.
- Requests: count, duplicate fetches (e.g., `ClassesServices` caching for 5 min), no localhost calls in prod.

Method: Lighthouse CI / Playwright trace + `performance.getEntriesByType('navigation')` in E2E.

---

## 15. SEO Testing

Every public page must have: unique title, meta description, canonical (via `applyMeta`), OG title/description/url/image, `og:locale`, `robots.txt` respects disallow, `sitemap.xml` entries valid.

Verify:
- `index.html` has title, description, canonical, OG, twitter, JSON-LD (HealthAndBeautyBusiness) — present ✓
- `seo.js` SITE url is `somawellness.co.ke` but `index.html`/sitemap use `somawellness.in` vs `somawellness.co.ke` — **P1 inconsistency** (canonical domain drift).
- Sitemap contains legacy Jaipur landing pages (`malviya-nagar`, `jaipur`) while current content is Nairobi — stale URLs, 10+ entries will 404 or redirect — **P2**.
- `robots.txt` Sitemap URL must match canonical domain (currently `somawellness.in`).
- Heading hierarchy per page: exactly one H1.
- `trailing slash` and `deep link` behaviour for SEO.
- `src/lib/seo.js` `rolldownOptions` chunk naming — verify build still emits `assets/*` correctly.

Automated checks: crawl sitemap, fetch each `<loc>` expecting 200, check meta tags.

---

## 16. Browser Compatibility

Matrix: Chromium (latest), Firefox (latest), WebKit (Playwright webkit ~ Safari 17)

Critical flows rerun on each: homepage render, nav, contact submit, login, cart add. Verify CSS (motion, grid) degrades, JS no unsupported API (no optional chaining beyond es2020 target `es2020` ✓).

---

## 17. Regression Testing

Full suite rerun (`npm test` + Playwright) on every PR. Gate deployment if P0/P1 fail. Baseline screenshots for visual regression (optional): capture Home/Classes/Contact/FAQ at 375/768/1280 via Playwright `toHaveScreenshot`.

---

## 18. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Real secrets in `.env` committed to git | High | Critical | Rotate, add `.env` to `.gitignore`, use env example only |
| Unsanitized `dangerouslySetInnerHTML` (BookDetail) | Medium | High (XSS) | Sanitize via DOMPurify |
| Domain mismatch (`.in` vs `.co.ke`) causes duplicate indexing | Medium | High | Unify SITE + index.html + sitemap to single canonical |
| build `rolldownOptions` ignored by Vite 8 (should be `rollupOptions`) — chunk splitting not applied, larger bundle | Medium | Medium | Rename to `rollupOptions` |
| localStorage JWT vulnerable to XSS | Medium | Medium | Consider httpOnly cookie + short TTL, CSP strict |
| Stale sitemap Jaipur URLs | High | Medium | Regenerate sitemap matching current landing slugs |
| Vulnerabilities in deps (react-router, vite, brace-expansion) | High | Medium | `npm audit fix` + pinned upgrades after test pass |
| `/admin/test-pages` publicly accessible without admin check | Medium | Medium | Gate or remove in prod |
| Booking/health-disclosure without validation | Low | Medium | Add frontend + backend check |

---

## 19. Critical User Journeys (P0)

1. Homepage loads (no JS error, LCP good)
2. Navigation works (desktop + mobile)
3. Contact form submits validly + shows success; invalid handled
4. Auth: register → login → dashboard gate; unauth redirect; logout
5. Booking: attempt enroll without auth → login redirect with `from` preservation
6. Deep-link + refresh any public route succeeds (SPA rewrite)

P1: FAQ search, Classes membership pricing, Footer newsletter, Language switch, Order tracking lookup, Admin login guard.

---

## 20. Test Environments

- **Local dev:** Vite `5173` proxy `/api` → `localhost:5000`, Mongo `127.0.0.1:27017/soma_wellness`, Redis `127.0.0.1:6379`
- **CI:** node 20, mocked Mongo/Redis (or in-memory via helpers), jsdom for frontend, Playwright browsers
- **Prod-like:** `NODE_ENV=production`, `VITE_API_URL` = canonical domain (`https://somawellness.co.ke`), CSP/HSTS on

Tests never hit prod services; fixtures under `tests/fixtures/`.

---

## 21. Required Test Data

- Users: `student@qa.test` / `admin@qa.test` (hashed pw mock)
- Memberships & Services: OFFICIAL_PLANS / OFFICIAL_SERVICES fixtures from `server.js` seeds
- Book: sample book with `stock`, `allowBackorder`, `sku`
- Leads, Bookings, Blogs, Comments — via factories in `server/__tests__/helpers.js`

---

## 22. CI/CD Testing Strategy

```
Install
  → Typecheck (tsc --noEmit / js check)
  → Lint (eslint)
  → Unit (Vitest + Jest) + coverage
  → Build (vite build must pass)
  → E2E (Playwright, depends on built preview or dev server)
  → a11y (axe on key routes)
  → Reports (junit + html) → fail PR if P0/P1 fail
```

Suggested GitHub Actions job: `qa.yml` running `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npx playwright test`.

---

## 23. Defect Severity Guide

- **P0 Blocker:** homepage down, nav broken, primary CTA dead, contact unreachable, auth broken, JS runtime crash, secrets exposed.
- **P1 Critical:** major feature broken (booking/payment), payment flow cannot complete, XSS unsanitized HTML, canonical mismatch.
- **P2 Major:** responsive overflow, missing alt, stale sitemap, audit high vuln, error state shows blank.
- **P3 Minor:** copy typo, spacing, non-critical a11y moderate.
- **P4 Cosmetic:** pixel alignment, animation easing.

---

## 24. Deliverables

- `QA_TEST_STRATEGY.md` (this file)
- `tests/unit`, `tests/components`, `tests/integration`, `tests/e2e` (+ fixtures/mocks)
- `vitest.config.js` + Playwright config
- `QA_COVERAGE_REPORT.md`
- `BUG_REPORT.md`
- `FINAL_QA_REPORT.md` with production readiness (🟢/🟡/🔴)

---

## 25. Open Items / Assumptions

- Bilingual content verified only for nav/keys present in `locales/`; full Swahili coverage is best-effort.
- M-Pesa will be mocked; advise manual smoke on Daraja sandbox before launch.
- Book store currently redirect-hidden; tests cover BookDetail sanitization regardless.
- Roles assumed: `admin`, `student` only; any other role treated as `student`.

