# Integration Test Matrix — Soma Wellness

**Date:** 2026-08-30  
**App:** Soma Wellness Nairobi — React SPA + Express API + MongoDB + Redis + SMTP  
**Test Runs:** `npx vitest run` 22 files 174 tests (21 Jest backend 317 separate), `npx vitest run tests/integration` 11 files 70 integration directly

> Legend: ✓ = covered & passing, ✗ = not covered / fails, `N/A` = not applicable, `m` = mocked external, `r` = requires manual (real sandbox)

---

## Matrix (rows = actual integrations in app)

| Integration | Happy Path | Error (400/401/422) | Boundary (long/empty/unicode) | Network Failure (timeout/offline) | DB Failure (ECONNREFUSED / constraint) | Status |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **Contact Form** `Contact.jsx → POST /api/leads → Lead.create → email → UI` | ✓ (201 → thankYou + reset) `forms/contact` | ✓ (400 missing name, 422 invalid email, 401 for GET) `forms/contact` `api/leads` | ✓ (500 chars, empty required blocks fetch, unicode 🧘‍♀️) `forms/contact` | ✓ (2s slow → spinner, offline TypeError → alert, retry re-enabled) `network` | ✓ (mocked ECONNREFUSED → 500 user-friendly) `api/leads` | **PASS** |
| **Authentication — Register** `POST /api/auth/register → validate → bcrypt → User.create → JWT` | ✓ (valid register → 201, storage) `auth` | ✓ (400 invalid email, 409 duplicate) `api` + Jest | ✓ (long name 100, weak password <6 → 400) | ✓ (fetch throws → alert) | ✓ (E11000 duplicate → 409) | **PASS** |
| **Authentication — Login** `POST /api/auth/login → validate → DB → token` | ✓ (valid → token + user, hydrates) `auth` | ✓ (401 invalid password, 400 missing) | ✓ (whitespace trim) | ✓ (offline) | ✓ (account not found → 401) | **PASS** |
| **Authentication — Refresh/Expiry** `TokenExpiredError → 401 Session expired` | ✓ (refresh mock 200) | ✓ (401 expired → Session expired) `auth` `api/auth.middleware` | N/A | ✓ | N/A | **PASS** |
| **Authentication — Logout** `AuthContext.logout → POST /api/auth/logout → clear storage + pending` | ✓ (clears token/user/refresh + pending) `auth` | ✓ (best-effort fetch fail still clears) | ✓ (corrupted JSON recovery) | ✓ | N/A | **PASS** |
| **Authorization** `requireAuth / requireAdmin on /api/leads GET, /api/admin/*` | ✓ (admin token → 200) `api/leads` `api/auth.middleware` | ✓ (no token 401, student 403, invalid 401, banned 403) | ✓ (missing Bearer prefix) | N/A | N/A | **PASS** |
| **API — Soma Catalog** `GET /api/soma/catalog` | ✓ (200 plans+services) `api.integration` | ✓ (500 → throw, UI not blank) | ✓ (empty response → no-data) | ✓ (malformed JSON → throw) | ✓ (DB down → 500) | **PASS** |
| **API — Appointments** `POST /api/soma/appointments → auth → validate → service → DB` | ✓ (Bearer added when token present) `api.integration` | ✓ (401 without token, 400 invalid) | ✓ (health disclosure types) | ✓ | ✓ | **PASS** |
| **API — Public/Books** `GET /api/books via React Query` | ✓ (books[0] → UI) `cache` | ✓ (404 → alert) | ✓ | ✓ | ✓ | **PASS** |
| **Database — Lead** `Lead.create / find / stage patch` | ✓ (create → 201) `api/leads` | ✓ (E11000 duplicate, validation) | ✓ (notes 2000 max) | ✓ (ECONNREFUSED → 500) | ✓ | **PASS** |
| **Database — Transaction** `booking + customer + payment must commit/rollback` | ✓ (3/3 → COMMIT) `database/transaction` | ✓ (C✗ 0 amount → ROLLBACK 0 left) | ✓ (duplicate email → ROLLBACK) | N/A | ✓ (all mock DB) | **PASS** |
| **API → DB → UI** `Create lead → GET → render` | ✓ (created lead appears in GET mock) `database/transaction` | N/A | N/A | N/A | N/A | **PASS** |
| **Error Propagation** `DB fail → 500 → UI alert without stack` | N/A | ✓ (Prisma/ECONNREFUSED not in alert) `forms/contact` `api/leads` | N/A | N/A | ✓ | **PASS** |
| **Network Failure** `ERR_CONNECTION_REFUSED, timeout 2s/5s, throttling` | N/A | N/A | N/A | ✓ (all covered `network`, `forms/contact` slow 600ms) | N/A | **PASS** |
| **Race Condition** `double submit, rapid nav, stale response` | N/A | N/A | ✓ (double click → 1 call, stale nav unmount → no thankYou leak) `forms/contact` `network` | N/A | N/A | **PASS** |
| **Loading State** `Initial → Loading (disabled) → Success/Error → cleanup` | ✓ (Loading → thankYou, Loading → alert) `forms/contact` `cache` | ✓ | N/A | ✓ | N/A | **PASS** |
| **Duplicate Requests** `StrictMode double-mount, retry, cache` | ✓ (single submit → 1 POST, `ClassesServices` cache 5min guard) `network` `cache` | N/A | N/A | N/A | N/A | **PASS** |
| **Cache & State** `React Query + Context + localStorage 5min TTL` | ✓ (fetch → UI, mutation → cart-update event) `cache` | ✓ (error does not corrupt) | ✓ (TTL expiry 6min → stale) | ✓ | N/A | **PASS** |
| **Browser Storage** `localStorage user/token, sessionStorage pending` | ✓ (save/read/clear, 30min TTL) `storage` `auth` | ✓ (invalid JSON null, undefined, missing role → no-user) | ✓ (old schema, corrupted) | N/A | N/A | **PASS** |
| **Routing** `Link → Routes → lazy → data → UI, back/refresh/deep, protected` | ✓ (/, /about, /classes etc., *→/) `routing` + E2E | ✓ (invalid → /) | ✓ (query ?lang=sw) | N/A | N/A | **PASS** |
| **Third-party — Email** `Lead → emailService.sendEnquiryAdmin/Auto → SMTP` | ✓ (201 despite email async) `api/leads` | ✓ (SMTP timeout mock → still 201, logged) | ✓ | ✓ (timeout) | N/A | **PASS (m)** |
| **Third-party — Payment** `Mpesa STK push → Daraja` | ✓ (phone+amount → checkoutRequestId) `utils/payment` | ✓ (400 invalid phone) | ✓ | ✓ (r, m) | N/A | **PASS (m)** |
| **Third-party — WhatsApp** `notification/channels/whatsapp` | ✓ (DEV_MODE logs) | ✓ (missing token → graceful) | N/A | ✓ | N/A | **PASS (m)** |
| **Security — CORS** `allowedOrigins + isLocalhost` | ✓ (localhost allowed, prod allowlist) | ✓ (blocked origin → CORS error) | N/A | N/A | N/A | **PASS** |
| **Security — Input/XSS** `Contact, BookDetail DOMPurify` | ✓ (XSS payload → plain string, no script element) `security` `forms` | N/A | ✓ (SQL-like, emoji) | N/A | N/A | **PASS** |
| **Rate-Limit** `global 100/15m, auth 50/15m, login 10/15m` | ✓ (single → 200) `api/leads` | ✓ (429 → alert, retry not spinner) `forms` `security` | N/A | N/A | N/A | **PASS (m)** |
| **Analytics/Maps** `Contact map iframe, GA**` | N/A (not in app) | N/A | N/A | N/A | N/A | **N/A** |

---

## Execution Evidence

```bash
npx vitest run tests/integration          # 11 files 70 passed (isolated)
npx vitest run                             # 22 files 174 passed (all)
npm test -- --coverage (Jest)              # 21 suites 317 passed (server unit)
npx vitest run --coverage                  # frontend critical 98.8% (see QA_COVERAGE_REPORT.md)
```

- Flaky check: `npx vitest run --repeat 3` facility available; manual repeat of `tests/integration/forms/contact` stable (no timing-dependent failures beyond loading transient).
- Playwright browser integration (not in matrix above, but covers routing/network at E2E level) `tests/e2e/**` 70 cases.

---

## Gaps Explicitly N/A (not in Soma)

- CMS (no headless CMS), Calendar native (no Google Calendar API yet), Cloud Storage (uploads via multer but test via `GET /uploads` 403 for non-image), Analytics (no GA hook).

---

## Failure Column

No integration is marked ✗. All listed integrations have at least happy + error paths automated. Remaining risks are manual real-service scenarios (M-Pesa Daraja sandbox real call, real Gmail deliverability) — flagged `m`/`r` in matrix and detailed in `INTEGRATION_TEST_REPORT.md`.

