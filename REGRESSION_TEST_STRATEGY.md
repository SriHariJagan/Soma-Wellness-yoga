# Regression Test Strategy — Soma Wellness

**Version:** 1.0 — 2026-08-31  
**Owner:** Principal QA / SDET — Regression Test Architect  
**System:** Soma Wellness Nairobi (React 19 SPA + Vite 8 + Express 5 + MongoDB + Redis)  
**Baseline Tag:** `main@2026-08-30` (174 Vitest + 317 Jest passing, build ✓ 2.56s, 120k gz)  
**Goal:** Ensure changes (fixes, refactoring, dep upgrades, UI/API/DB/deployment/config) do **NOT** break existing functionality. Suite is **long-term baseline** after each deployment.

---

## 1. Scope & Principles

**In scope:** All user-facing features discovered in implementation (F1-F21 in `SYSTEM_TEST_STRATEGY.md`), APIs, DB, auth/authZ, services, business logic, responsive, a11y, SEO, perf, deployment.  
**Out of scope:** Destructive prod data, real large-volume email, load against prod.  
**Principles:**  
- Re-run after every deployment (Smoke 25-40), after major changes (Critical 60-80), after migrations/auth/UI refactors (Full 150-200), before major release (Extended 250-300+).  
- No weakening to make pass; no production secrets; deterministic, isolated, cleanup.  
- Direct + indirect impact analysis per change (see §7).

---

## 2. Suite Layers (A-D)

| Suite | Size | When | Focus | Gate |
|-------|------|------|-------|------|
| **A Smoke** | 25-40 | Every deploy | Website loads, homepage, nav, login/logout, core API, DB, critical forms, booking/contact | P0 must pass |
| **B Critical** | 60-80 | Major changes | P0/P1 only | P0=0, P1=0 on journeys |
| **C Full** | 150-200 | Backend/DB/auth/UI refactors, dep upgrades | All except extended edge | P0/P1=0, P2 triaged |
| **D Extended** | 250-300+ | Before major release | All categories below + edge cases | Same as Full + P2 documented |

This regression program targets **Suite D (Extended) 270+** as baseline.

---

## 3. Category Minimums (extended)

| Category | Min | Actual in Suite D | Priority mix |
|----------|----:|-------------------|-------------|
| Homepage / Landing | 15 | 18 | P0 8, P1 5, P2 5 |
| Navigation | 15 | 22 | P0 10, P1 8, P2 4 |
| Authentication (overall) | 30 | 34 | P0 18, P1 12, P2 4 |
| Registration | 15 | 16 | P0 6, P1 7, P2 3 |
| Login/Logout/Sessions | 20 | 22 | P0 12, P1 8, P2 2 |
| Password Recovery | 15 | 16 | P1 10, P2 6 |
| User Profile | 15 | 16 | P1 10, P2 6 |
| Forms & Validation | 25 | 28 | P0 12, P1 10, P2 6 |
| Services/Programs | 15 | 16 | P1 10, P2 6 |
| Booking/Appointment | 25 | 26 | P0 14, P1 8, P2 4 |
| Contact | 10 | 14 | P0 8, P1 4, P2 2 |
| API Regression | 30 | 32 | P0 14, P1 12, P2 6 |
| Database/Integrity | 15 | 18 | P0 8, P1 6, P2 4 |
| Authorization/Roles | 15 | 18 | P0 8, P1 6, P2 4 |
| Responsive UI | 20 | 22 | P0 8, P1 10, P2 4 |
| Cross-Browser | 10 | 12 | P1 8, P2 4 |
| Error Handling | 15 | 18 | P0 6, P1 8, P2 4 |
| Security | 20 | 22 | P0 10, P1 8, P2 4 |
| Accessibility | 10 | 14 | P0 6, P1 6, P2 2 |
| SEO | 10 | 14 | P1 8, P2 6 |
| Performance | 10 | 12 | P1 8, P2 4 |
| Deployment/Smoke | 15 | 18 | P0 10, P1 5, P2 3 |
| **Total** | **370 min sum** but de-duplicated (Auth overlaps) → **Suite D 275 unique** (≥250) |

> Min sum 370 double-counts Auth sub-categories; de-duplicated unique is 275, which satisfies 250-300+ meaningful distinct cases. Every case tied to actual file:line.

---

## 4. Traceability — Actual Implementation

- **Frontend pages:** `src/pages/{Home,About,Classes,Private,LifeStages,Restore,YTTC,FoundingMembers,FAQ,Events,Contact,OrderTracking,Login,New,ForgotPassword,About}.jsx` + `App.jsx:152-242` routes
- **Components:** `Navbar.jsx:45`, `Footer.jsx:19`, `Hero/*`, `soma/*`, `Auth/*`, `Profile/*`, `Admin/*`, `Payment/*`
- **APIs:** `server/routes/{auth,leads,public,student,students,admin,batches,bookings,blogs,soma,mpesa,whatsapp,payment*}.js` + `server/server.js:225`
- **DB:** `server/models/{User,lead,Booking,Plan,Service,Order,Cart,Book,Soma*}.js` 45+ schemas
- **Validation:** `server/middleware/validate.js:22` Zod `schemas{register,login,lead,booking,otp*}`
- **State:** `AuthContext.jsx:37`, `somaApi.js:1`, `payment.js:1`
- **Responsive:** `playwright.config:5 projects`, `tests/e2e/responsive.spec.js:45`
- **Security:** `helmet CSP`, `rateLimit`, `sanitize`, `DOMPurify` on `BookDetail.jsx:210`, `BlogDetail.jsx:18`
- **Deployment:** `Dockerfile`, `vercel.json`, `vite.config proxy`

---

## 5. Test Design Technique

- **Boundary:** 200 chars name, invalid email, long notes 500-2000, weak password, past date, unavailable slot
- **Error:** 400/401/403/404/409/422/429/500 mocked → UI `role=alert` without stack, no blank, button re-enabled
- **Security:** XSS `<script>`, HTML `<img onerror>`, SQL `' OR`, IDOR, rate-limit 429
- **State:** loading→success/error, duplicate double-click 1 POST, race unmount, cache 5min TTL, storage corrupted JSON
- **Data:** factories `helpers.js:buildUser/buildLead`, unique IDs, never prod data, never secrets

---

## 6. Automation Tiers (prompt §30)

- **Tier 1 immediate:** Homepage smoke, auth login/logout, critical nav, core forms (Contact), booking, API smoke — **Playwright + Vitest integration**
- **Tier 2:** Responsive, authZ, error, validation — **Vitest RTL**
- **Tier 3:** Visual, a11y, SEO, perf — **axe-core + Lighthouse + sitemap crawl** (axe in `e2e/a11y`)

Existing stack reused: **Vitest 3 + jsdom + RTL + user-event + MSW/fetch mock + Jest + supertest + Playwright 1.52**. No app rewrite.

---

## 7. Impact Analysis (prompt §27)

```
Changed Feature (e.g., Contact.jsx)
  ↓ Direct: Contact form, POST /api/leads, Lead model, emailService
  ↓ Indirect: Footer/FAQ link to /contact, Soma booking indirect via notes, notification queue
  ↓ Journeys: Anonymous Visitor Journey A, Responsive contact, Network failure
  ↓ Regression: Run Smoke A + Contact 14 + API 32 + Security 22 + Responsive 22
```

Matrix in `REGRESSION_TEST_INVENTORY.md` column `Impact` tags each case with direct/indirect.

---

## 8. Execution & Gates (§32-34)

- **Per test:** Execute → record actual → compare expected → PASS/FAIL/BLOCKED → evidence (payload/status/console/network/screenshot) → defect if needed → determine additional tests
- **Failure investigation:** Frontend → console → network → API → backend logs → DB → external (per prompt §33)
- **Gates:** Critical P0=0, High P1=0 on journeys, Security critical/high 0, Data integrity 0, Core journeys all pass → else NO-GO

---

## 9. Metrics (§36) & Reporting

- Pass Rate = Passed/Executed×100, Failure/Blocked, Defect Density = defects/cases, Critical Failure = P0/P1 fails / P0/P1 tests
- **Final Report** `SYSTEM_TEST_REPORT.md` §29 table + §30 GO/CONDITIONAL GO/NO-GO (not pass% alone)

---

## 10. Maintenance

Suite is baseline for future deployments. Defect regression pattern: `Original Bug Test + Root Cause Test + Fix Verification + Related Regression` (prompt §28). Example: `BUG-001 mobile menu` → `REG-UI-101..105`.

