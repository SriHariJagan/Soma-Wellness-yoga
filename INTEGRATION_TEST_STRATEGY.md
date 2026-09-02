# Integration Test Strategy — Soma Wellness

**Version:** 1.0 — 2026-08-30  
**Author:** Principal Integration Test Architect  
**Application:** Soma Wellness — Spring Valley Nairobi (React 19 SPA + Express 5 API + MongoDB + Redis/BullMQ)  
**Deployment:** Vercel (frontend) + Render (backend) + Docker

---

## 1. Architecture Under Test

### Frontend — `src/` (React 19 + Vite 8 + Router 7)
- **Router:** `BrowserRouter` in `src/App.jsx:98-251` with `Suspense` lazy splitting, 24+ public routes + 16 SEO landing `personal-yoga-*` + protected `/studentdashboard` `/yogaadmin` + catch-all `* → /`.
- **State:** `AuthContext` (`src/context/AuthContext.jsx:37-93` — localStorage `user`+`token`+`refreshToken`, sessionStorage pending checkout with 30min TTL), `TanStack Query` for Books (`BookDetail.jsx:19`), `localStorage` cache `ClassesServices.jsx:21-32` (5min TTL).
- **API clients:** `fetch` wrappers — `src/lib/somaApi.js:1-29` (`/api/soma/*`, `/api/public/*`), `src/components/api/StudentServices.js`, `AdminServices.js`, `BookServices.js`, `MpesaServices.js`, `src/utils/payment.js:1-126` (`/api/mpesa/*`, `/api/student/cart/*`).
- **Validation:** Client `required` + `type=email` on `Contact.jsx:144-148`; business rules `pricing.js` / `seo.js`.
- **External UI:** `framer-motion`, `react-icons`, `react-i18next` (en/sw, hreflang).

### Backend — `server/` (Express 5, Node 20)
- **Entry:** `server/server.js:89-259` — `trust proxy`, `compression`, `helmet` CSP/HSTS, `cors` allowlist + `isLocalhost` regex, `express.json(5mb)` + raw body for `/api/payment/webhook`, `requestTimeout`, `sanitizeQueryParams`, `requestLogger`, global `rateLimit(100/15min)`, 15 route mounts.
- **Routes:** `/api/auth` (register/login/refresh/logout + OAuth), `/api/auth/otp`, `/api/leads`, `/api/public`, `/api/student`, `/api/students` (admin), `/api/admin`, `/api/batches`, `/api/bookings`, `/api/blogs`, `/api/soma` (+ admin sub-router), `/api/mpesa`, `/api/whatsapp`, `/api/payment*`, `/api/admin/monitoring` + `/admin/queues` (Bull Board).
- **Middleware:** `auth.js:8-96` (`requireAuth` Bearer → `verifyAccessToken`, banned check; `requireAdmin` role), `validate.js:3-117` (Zod schemas `lead`, `register`, `login`, `booking`, `otp*`), `rateLimit.js`, `sanitize.js`, `errorHandler.js` (`ApiError` mapping to `statusCode`).
- **Models (Mongoose 9):** `User`, `Lead`, `Booking`, `Plan`, `Service`, `UserService`, `Blog`, `Order`, etc.
- **Services:** `pricingEngine`, `foundingService`, `allowanceService`, `surchargeService`, `inventoryService`, `orderStatusService`, `notification/*`, `payment/*`, `expiryService`, `somaCron`, `mailer.js` (Nodemailer Gmail).
- **External:** MongoDB Atlas (`MONGO_URI`), Redis Cloud (`REDIS_URL`), Gmail SMTP, Safaricom Daraja (M-Pesa), Google/Facebook/Instagram OAuth, Razorpay legacy, BullMQ queues, email templates.

### Shared / Infra
- **Test infra prior:** `server/__tests__/**` 317 Jest tests (node env) with `helpers.js` factories + `setup-env.js` env + mocked DB via `mongoose` factories (no live DB).
- **Frontend tests prior:** Vitest `v3` + `jsdom` + RTL, `tests/setup.js` mocks `matchMedia`, `IntersectionObserver`, `fetch`.
- **Env:** `.env` root single file (both Vite `VITE_*` + server `MONGO_URI`, `JWT_*`, `REDIS_URL`, `SMTP_*`, `MPESA_*`, `FRONTEND_URL`, `CORS_ORIGINS`), `.env.example`, `.gitignore:30:.env`.

---

## 2. Integration Boundaries Identified

| # | Boundary | Sender | Receiver | Protocol | Transport |
|---|----------|--------|----------|----------|-----------|
| B1 | UI → Hook/State | Component (Contact, AuthForm, Navbar) | `useState`, `AuthContext`, `QueryClient` | function call | memory |
| B2 | State → API Client | Hook/context | `fetch` wrapper (`somaApi`, `StudentServices`) | JS call | memory |
| B3 | API Client → HTTP | `fetch(url, {method, headers, body})` | Express `app.use(express.json())` | HTTP/1.1 | TCP |
| B4 | HTTP → Middleware | Express route | `rateLimit` → `validate(zod)` → `requireAuth` → `sanitize` | middleware chain | memory |
| B5 | Middleware → Controller/Service | `leadRoutes.js:21` | `Lead.create` + `User.find` + `notificationService.send` + `emailService.send*` | async await | memory |
| B6 | Service → DB | `Lead.create`, `User.findById` | MongoDB `soma_wellness` | Mongoose | TCP |
| B7 | Service → Queue/External | `notificationService`, `mailer.transporter.sendMail`, M-Pesa `mpesaController: stkpush` | Redis BullMQ / SMTP / Daraja | TCP/HTTPS | network |
| B8 | DB → Response → Frontend | `res.status(201).json(lead)` | `r.json()` → `setSent(true)` → `form reset` + `role=status` | JSON | HTTP |
| B9 | Error path | `ValidationError`, `ApiError.unauthorized`, `ECONNREFUSED` | `errorHandler` → `400/401/429/500` → `setError(msg)` → `role=alert` | error propagation | — |
| B10 | Browser storage | `AuthContext login/logout` | `localStorage user/token/refreshToken` + `sessionStorage pending` | Web Storage | disk |
| B11 | Routing | `react-router Link/navigate` | `BrowserRouter Routes` | history API | memory |
| B12 | Cache | `TanStack Query` / `ClassesServices cache` | `localStorage` 5min TTL | cache layer | memory+storage |
| B13 | Auth lifecycle | `LoginForm → POST /api/auth/login → JWT → localStorage → Authorization: Bearer → requireAuth → refresh/logout` | — | JWT | — |
| B14 | Third-party (email) | `Lead` create → `emailService.sendEnquiryAdmin / sendEnquiry` → `Nodemailer` → Gmail SMTP | SMTP | — |
| B15 | Rate-limit | Client rapid submit → `globalLimiter(100/15min)` + `authLimiter(50/15min)` + `loginLimiter(10/15min)` → `429` | HTTP 429 | — |

**Priority mapping:** B3-B9 cover **Contact Form (P0)**, **Auth (P0)**, **Soma booking (P1)**. B10-B12 cover **storage/cache**. B14-B15 cover **email/rate-limit**.

---

## 3. Integration Test Environment

- **NODE_ENV:** `test` (Vitest `jsdom`, Jest `node`). `server/__tests__/setup-env.js:1-20` sets `MONGO_URI=mongodb://localhost:27017/test`, `JWT_SECRET=test-jwt-secret...`, `RISK=error`, `REDIS_URL=redis://localhost:6379`.
- **Frontend:** `tests/setup.js` jsdom, `global.fetch = vi.fn()`, no live network. `.env.test` not committed; `vitest.config.js` `environment: jsdom`, `setupFiles: ./tests/setup.js`.
- **Backend:** Jest `testEnvironment: node`, `rootDir .`, `testMatch server/__tests__/**/*.test.js`, `moduleNameMapper` for `.js`. Helpers `server/__tests__/helpers.js:1-246` factories `buildUser`, `buildAdmin`, `buildLead`, `mockReq/Res/Next`, `createSmtpMock`, `createRedisMock`.
- **Isolation:** `beforeEach` `localStorage.clear()`, `vi.clearAllMocks()`, `fetch.mockReset()`. No destructive prod calls; MSW/fetch mock at boundary.

> Existing `vitest.config.js` already excludes `server/__tests__/**` and `tests/e2e/**`; `server/package.json` test currently `echo Error` (no server Jest run via root `npm test` which uses `node --experimental-vm-modules node_modules/jest/bin/jest.js` + `jest.config.js` rootDir `.`).

---

## 4. Test Pyramid & Tooling

```
      Playwright E2E (browser, ~15% — full user journeys)
   Vitest Integration (RTL + fetch/supertest, ~25% — boundaries B1-B15)
     RTL Component (isolated UI, ~20%)
      Vitest/Jest Unit (pure logic, ~40%)
```

- **Unit:** `src/lib/**`, `server/utils/**` (existing 317 pass)
- **Component:** `tests/components/**` (Navbar, Footer, Contact, etc.)
- **Integration:** `tests/integration/**` (forms, auth, API, DB via supertest, routing, storage, network, security) — **this strategy**
- **E2E:** `tests/e2e/**` Playwright (homepage, navigation, contact XSS, responsive, a11y)

**Stack:** Vitest 3 + RTL 16 + user-event 14 + jsdom 26 + MSW 2 (optional), Jest 29 + supertest 7 for server integration, Playwright 1.52 for browser integration.

---

## 5. Integration Test Strategy by Area

### 5.1 Frontend → API (B1-B3)
- **Pattern:** `render(Component inside MemoryRouter/AuthProvider)` → `userEvent.type/click` → `expect(global.fetch).toHaveBeenCalledWith(url, {method, headers, body})` and UI `loading → success/error`.
- **Async:** `async/await` + `waitFor`; no `sleep`; `testTimeout:10s`.

### 5.2 API → DB (B5-B6)
- **Pattern:** `supertest(app)` against Express `app` (`server/server.js` export default `app`) with **mocked** `Lead`, `User` models (via `vi.mock` or `helpers.mockReq/Res`). For true DB, use `mongodb-memory-server` only if local Mongo unavailable — currently **mocked** to keep deterministic.
- **CRUD verification:** `Lead.create` payload → `201` + `lean()` results for `GET /api/leads` (admin only).

### 5.3 Auth Lifecycle (B13 + B9)
- **Chains:**
  - Register `POST /api/auth/register` → `validate(schemas.register)` → `bcrypt hash` → `User.create` → `201 + token` → `localStorage.setItem('token')` → `isAuthenticated true`.
  - Login `POST /api/auth/login` → `10/15min` limit → `401 invalid credentials` → `role=alert` vs `200 + {token, user}` → dashboard by `role`.
  - Refresh `POST /api/auth/refresh`, expired `TokenExpiredError` → `401 Session expired`.
  - Logout `AuthContext.logout` → `POST /api/auth/logout` (best-effort) → `localStorage.clear()` + `clearPendingIntent()`.

### 5.4 Authorization (B4 role)
- `GET /api/leads` without token → `401 No token`; with student token → `403 Access denied`; with admin → `200`.
- Frontend guard: `App.jsx:198-222` `isAdmin/isStudent` redirects → `/login` vs `/yogaadmin`.

### 5.5 Forms → API (B8, B9)
- For each form (Contact, Login, Register, Booking, Recovery) verify: happy input → correct JSON body → `201/200` → success UI + reset; invalid → `400 details[]` → field error; `409/422` → specific message; preserve `from` on auth gate.

### 5.6 Storage / Cache / Routing (B10-B12)
- Storage: pending intent 30min TTL, corrupted JSON recovery (`AuthContext useEffect:47-50` clears), cross-tab `storage`/`auth-login` events.
- Cache: `ClassesServices` localStorage 5min — mutation → invalidate, error does not corrupt state.
- Routing: `MemoryRouter` + `App` — internal nav, back/forward, deep link, protected redirect, invalid `* → /`.

### 5.7 External & Error Propagation
- **Email (B14):** `Lead.create` → `emailService.send*` called (mocked); SMTP `shouldFail` → swallowed error, `201` still returned, logged not exposed to user.
- **Rate-limit (B15):** Multiple rapid `POST /api/leads` → `429 Too many requests`, frontend shows useful message, no infinite spinner.

---

## 6. Coverage Targets (Integration)

Not judged only by line coverage; track **boundary** coverage:

| Boundary | Endpoints/Flows | Target |
|----------|----------------|--------|
| Frontend→API | Contact, Soma catalog/appointments, Cart, Mpesa | 100% happy + 50% error |
| API→DB | Lead create/read, User auth, Booking | 100% happy + constraint violation |
| Auth | register/login/refresh/logout/expired/banned | 100% |
| AuthZ | student vs admin vs anon on protected | 100% |
| Forms | valid/invalid/boundary/race/duplicate/network | 100% of P0 forms |
| Routing | all public + protected + 404 | 100% |
| Storage/Cache | save/read/clear/corrupt/TTL | 100% |
| External | email success/fail/timeout | 100% |
| Security | CORS, validation, XSS, rate-limit | 100% of P0/P1 |
| Error propagation | DB down → 500 user-friendly | 100% |

Existing backend `jest` already 95% on `pricingEngine`, `inventoryService`, etc.; frontend integration prior 117 vitest passing includes `api.integration.test.jsx` (10) + `routing.test.jsx` (3).

---

## 7. Quality Rules (per prompt §30)

1. Test real boundaries, mock only external (SMTP, Daraja, Redis if not available).
2. Never use prod data/credentials; `setup-env.js` test secrets.
3. Deterministic: `beforeEach` cleanup, unique IDs, no order dependency.
4. Verify success **and** failure, loading → success/error, duplicate suppression, race stale-check.

---

## 8. Execution & Reporting

- **Run:** `npx vitest run tests/integration` (or `tests/**/*`), `npm test` (Jest root), `npx playwright test` (E2E integration).
- **Flaky:** `npx vitest run --repeat 3` / `npx playwright test --repeat-each=3`.
- **Report:** `INTEGRATION_TEST_MATRIX.md` (happy/error/boundary/network/DB) + `INTEGRATION_TEST_REPORT.md` (summary, failed, risks, 🟢/🟡/🔴).
