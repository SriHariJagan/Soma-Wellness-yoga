# System Test Strategy — Soma Wellness

**Version:** 1.0 — 2026-08-30  
**Author:** Principal QA / SDET — System Test Architect  
**Application:** Soma Wellness Nairobi — Spring Valley (yoga · therapy · meditation · wellness)  
**Environments:** Local (`vite 5173` + `express 5000` + `mongodb://127.0.0.1:27017/soma_wellness` + `redis://127.0.0.1:6379`), CI (jsdom/node), Production-like (`https://somawellness.co.ke`)

---

## 1. System Architecture Understanding

### 1.1 Layered View Tested as One System

```
Browser (React 19 SPA, Framer Motion, i18next en/sw)
  ↓ fetch (somaApi, Student/Admin/Book/MpesaServices, payment.js)
HTTP (Helmet CSP/HSTS, CORS allowlist + isLocalhost, compression, rateLimit, requestTimeout, sanitize)
  ↓ Express 5 (trust proxy, requestLogger, auth/validate/rateLimit middleware)
Backend Services (pricingEngine, foundingService, allowance/surcharge, inventory/shipping, notification, payment, expiry/cron)
  ↓ Mongoose 9 → MongoDB (Atlas) + ioredis/BullMQ + Nodemailer/Gmail SMTP + Daraja M-Pesa + OAuth (Google/Facebook) + Razorpay legacy
  ↓ JSON response → frontend state (AuthContext, TanStack Query, localStorage/sessionStorage) → UI (Navbar, Hero, Pricing, Contact, Dashboard)
```

**Frontend `src/` inventory:** `App.jsx:98` BrowserRouter + lazy 24+ public routes + 16 SEO landing `personal-yoga-*` + protected `/studentdashboard`/`/yogaadmin`/`/checkout` + catch-all `*→/`; `components/Navbar`, `Footer`, `Hero/*`, `soma/*`, `Services/*`, `Auth/*`, `Profile/StudentDashboard`, `Admin/YogaAdmin`; `context/AuthContext.jsx:37` (localStorage `user`/`token`/`refreshToken`, sessionStorage `soma_pending_checkout` 30m TTL, `storage` + `auth-login` listeners); `lib/{seo,currency,pricing,somaApi}`, `hooks/useScrollToSection`, `utils/payment`.

**Backend `server/` inventory:** 18 route mounts — `/api/health`, `/api/auth` (register/login/refresh/logout, forgot/reset, OAuth), `/api/auth/otp`, `/api/leads` (public create, admin list/stage/delete), `/api/public`, `/api/student` (cart, profile), `/api/students` (admin), `/api/admin` (CRUD plans/services/batches), `/api/batches`, `/api/bookings`, `/api/blogs`, `/api/soma` (catalog/founding/appointments/quotes/gift-vouchers/daily/passes + admin sub-router), `/api/mpesa` (stkpush/query/callback), `/api/whatsapp`, `/api/payment*` (orders/verify/webhook), `/api/admin/monitoring` + `/admin/queues` Bull Dashboard; `models/` 45+ Mongoose (User, Lead, Booking, Plan, Service, Book, Order, Cart, Soma*, Coupon, etc.); `middleware/` auth/validate(zod)/rateLimit/sanitize/errorHandler; `services/` pricing/allowance/surcharge/inventory/shipping/orderStatus/expiry/somaCron/email; `mailer.js` Nodemailer; `payment/` Razorpay/M-Pesa.

**External integrations:** Gmail SMTP (lead admin + auto-reply), Redis Cloud BullMQ (notifications + webhook queue), M-Pesa Daraja (STK push sandbox/production), OAuth (Google/Facebook/Instagram), Razorpay (legacy), Bull Board.

**Deployment:** Vercel frontend (`vercel.json` rewrites → `index.html` SPA fallback + immutable asset headers), Docker (`Dockerfile` node:20-alpine + tini), Render backend, Atlas MongoDB, Redis Cloud. `vite.config.js` proxy `/api→localhost:5000` dev-only; `SERVER_URL`, `FRONTEND_URL`, `CORS_ORIGINS`, `VITE_API_URL` env-driven.

### 1.2 State Management Tested
- **Auth:** `AuthContext` localStorage + memo `isAuthenticated/isAdmin/isStudent`, `App.jsx:92-95` `isAdmin/isStudent` derived from `syncedUser||user`, protected route redirects.
- **Query cache:** `TanStack Query` for Books, `ClassesServices` localStorage 5min TTL.
- **Storage:** `savePendingIntent` both storages, corrupted JSON recovery `AuthContext.jsx:47-50`.

---

## 2. System Test Inventory — User-Facing Features

| # | Feature / Page | URL(s) | Purpose | Components | User Actions | API Calls | Auth | Expected Success | Expected Failure |
|---|----------------|--------|---------|------------|--------------|-----------|------|------------------|------------------|
| F1 | Home | `/` | Premium brochure, 300-member promise, CTA to Join | `Home.jsx`, `Hero`, `SomaIntro/Method/Experiences/Immersive/PricingPreview/TrustStrip/Team/Testimonials/CTA` | Scroll, click CTA, view pricing | `GET /api/soma/catalog` (lazy via ClassesPreview), `GET /api/public` optional | Guest | Render 200, H1, no console error, CTA→`/classes`, sections visible | API down → empty state not blank |
| F2 | Join (Classes/Memberships) | `/classes` | Tiers JUA/AMANI/UZIMA/FAMILY, pay-ahead, SOMA DAILY | `Classes.jsx`, `SomaPricingPreview`, `PayAheadSelector` | Compare, select tier, enroll | `GET /api/soma/catalog`, `POST /api/soma/appointments` (auth) | Public view, enroll needs student | Cards KES, founding banner if eligible | Enroll unauth → `/login?from` |
| F3 | Private (One-to-One/Therapy) | `/private` | 5,500/session, assessment 6,500 | `Private.jsx` | Book private | `POST /api/soma/appointments` | Needs auth for book | Flow blocks if health disclosure missing (HEALTH_REQUIRED_TYPES) | 401→login, 400→field error |
| F4 | Life Stages | `/life-stages` | Mama/Mama+/Young/AgeWell blocks 4/8 | `LifeStages.jsx` | Browse, quote | `GET /api/soma/catalog` | Public | Blocks render, prices KES | API 500 → empty |
| F5 | Restore | `/restore` | Massage 5,500-6,500, meditation 1,800, Stillness 11k/Acacia 18.5k/ForTwo 22.5k | `Restore.jsx` | Book treatment | `POST /api/soma/appointments` | Auth to book | Signatures displayed | Health disclosure gate |
| F6 | Academy (YTTC) | `/yttc` | 25h/100h/200h, Corporate wellness | `YTTC.jsx` | Enquire, corporate lead | `POST /api/soma/corporate-lead` | Public | Corporate form validates | 400→specific |
| F7 | Founding Members | `/founding` | 17-19% savings, window rollover | `FoundingMembers.jsx` | Check status | `GET /api/soma/founding/status` | Public | Status + allowance | Outside window → normal price |
| F8 | FAQ | `/faq` | 25 questions A-E, search | `FAQ.jsx`, `PageFAQSection` | Search, expand | none (siteContent) | Public | 25 items, search filters | No results → friendly msg |
| F9 | Events | `/events` | Redirect brochure → Restore | `Events.jsx` | Navigate | none | Public | Redirect/section | — |
| F10 | Contact | `/contact` | Info cards + map + lead form | `Contact.jsx` | Fill name/email/message, submit | `POST /api/leads` | Public | 201 → thankYou+reset, info cards+map iframe | 400/429/500 → alert, no stack |
| F11 | Order Tracking | `/order-tracking` | Lookup by ID/email | `OrderTracking.jsx` | Enter ID, track | `GET /api/public/orders/:id` | Public | Order state + shipping | 404 → not found |
| F12 | Auth — Login | `/login` | Student/admin entry | `Login.jsx` + `AuthContext` | Enter email/pass | `POST /api/auth/login` (10/15m) | Guest | Valid→dashboard by role, token→localStorage | 401 invalid, 400 missing, 429 too many |
| F13 | Auth — Register | `/newuser` | `New.jsx` | `AuthCard/RegisterForm` | Name/email/pass | `POST /api/auth/register` (50/15m) | Guest | 201→login link, duplicate→409 | Weak pass, invalid email→400 |
| F14 | Auth — Forgot/Reset | `/forgot-password`, `/reset-password` | Reset via token | `ForgotPassword`, `ResetPassword` | Enter email → token | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password/:token` | Guest | Email sent, new pass works | Expired token→400 |
| F15 | Auth — SocialSuccess | `/social/success` | OAuth callback | `SocialSuccess.jsx` | Callback handle | `GET /api/auth/google/callback` etc. | Guest | Store token, redirect | Hash missing → error |
| F16 | Student Dashboard | `/studentdashboard` | Plans/services/bookings/attendance/blogs/cart | `StudentDashboard` | Browse, bookings | `GET /api/student/*`, `GET /api/monitoring/health/*` | Student | Active plan banner if `isStudent` | Guest/admin → redirect |
| F17 | Admin Dashboard | `/yogaadmin` | Plans/services/leads/students/reports/queues | `YogaAdmin` | Admin CRUD | `/api/admin/*`, `/api/admin/monitoring`, `/admin/queues` | Admin | Admin chrome, no student access | Student→redirect, 401 on direct API |
| F18 | Book Checkout | `/checkout` | Cart → payment | `BookCheckout` | Checkout | `GET /api/student/cart`, `POST /api/mpesa/stkpush` | Student | Cart totals KES | Guest→login, outOfStock→blocked |
| F19 | Payment | `/payment` | M-Pesa STK | `PaymentPage` | Phone+amount | `POST /api/mpesa/stkpush`, `POST /api/mpesa/query` | Dashboard-only | Success/Fail feedback | Invalid phone→400, timeout→retry |
| F20 | Landing SEO | 16 slugs `personal-yoga-*`, `kids-yoga-*`, `prenatal-*`, `therapeutic-*`, `corporate-*`, `online-*`, `best-yoga-*` | Jaipur legacy + Nairobi | `LandingPage` | Direct deep-link, refresh | none (siteContent) | Public | `*` → home if unknown, SEO meta per `seo.js` | Orphan sitemap → soft 404 tracked |
| F21 | Admin Test Pages | `/admin/test-pages` | Dev helper (gated?) | `AdminTestPages` | View | none | Should be admin, currently public | Displays | Guest should ideally redirect (known gap) |

**Shared:** Navbar (desktop links + hamburger drawer + user cluster + logout), Footer (explore links, socials `target _blank rel noreferrer`, newsletter email `required`, language switcher), ScrollProgress/BackToTop, PageTransition, ErrorHandler (500→generic, not stack), RateLimit (global 100/15m, auth 50/15m, login 10/15m), CORS allowlist + `isLocalhost`.

---

## 3. Test Approach

**Type:** SYSTEM — validate deployed system end-to-end as one, across personas:
- P1 Anonymous visitor (mobile/tablet/desktop, fast/slow/offline, malicious input)
- P2 Registered user / Returning user (login → refresh → close/reopen, expired session)
- P3 Administrator (leads, monitoring, queues)
- Edge: slow 3G, unstable, invalid/malicious data

**Pyramid location:** Above integration: `E2E Playwright` (browser) + `Supertest + Vitest integration` (API→DB mocked) + `RTL system` (frontend+API mock). Unit is below, not in scope.

**Technique:** Risk-based, journey-driven, boundary + error + security + performance/accessibility/SEO/deployment.

**Test data:** `server/__tests__/helpers.js:buildUser/buildLead/buildBooking` factories, `helpers.signToken`, `mockReq/Res/Next`, `createSmtpMock`, `createRedisMock`; `.env.test` isolated (`MONGO_URI` test DB, `JWT_SECRET` test-*, `REDIS_URL` localhost, `LOG_LEVEL=error`).

**Environment isolation:** Never destructive against prod; `.env.test` + `setup-env.js` + `localStorage.clear()` + `fetch` mock at boundary.

---

## 4. Entry / Exit Criteria

**Entry:** Build `npm run build` ✓, `npx vitest run` 174 pass, `npm test` (Jest) 317 pass, lint not blocking.

**Exit / Coverage:** System Test Case Matrix 100% of F1-F21 happy + error; API workflows 200/201/400/401/403/404/409/422/429/500 mapped; database create/read/update/delete + transaction + unavailable; responsive 13 viewports, cross-browser 3, security XSS/IDOR/CORS/rate-limit, performance bundle/LCP/CLS, accessibility WCAG 2.2 AA (axe critical 0), deployment HTTPS/CORS/SPA fallback.

**Regression:** Smoke (F1→F2→F10), Sanity (changed files), Full regression on every defect fix.

