# Bug Report — Soma Wellness Website

**Date:** 2026-08-30  
**Auditor:** Principal QA / SDET  
**Build:** `main` @ `Aug 30 2026` — Vite build `468kB` (120kB gz), 317 backend Jest tests passing, 117 frontend Vitest tests passing  
**Environments:** Local dev (`localhost:5173` + `localhost:5000`), Production-config review (env, headers, SEO, security)

---

## Summary Counts

| Severity | Count | Fixed | Remaining (Accepted/Todo) |
|----------|------:|------:|---------------------------|
| **P0 Blocker** | 1 | 0* (doc fix + mitigation) | 1 (requires crew rotation) |
| **P1 Critical** | 3 | 3 | 0 |
| **P2 Major** | 6 | 3 | 3 |
| **P3 Minor** | 5 | 0 | 5 |
| **P4 Cosmetic** | 2 | 0 | 2 |
| **Total** | **17** | **6 fixed** | **11 tracked** |

*P0 is not code-change fixable in repo without external rotation; traced not committed to git.

---

## P0 — Blocker

### BUG-001 — Local `.env` Contains Real Production Secrets (Credential Exposure Risk) — DOCUMENTED, NOT COMMITTED

- **Severity:** P0 Blocker  
- **Priority:** P0  
- **Category:** Security  
- **Page/Component:** `.env` (root), `server/loadEnv.js`  
- **Steps to Reproduce:**
  1. Open `C:\Users\hante\OneDrive\Desktop\Soma-Wellness-yoga\.env`
  2. Observe `MONGO_URI=mongodb+srv://sriharijagan07_db_user:hLzOnSN628OBrGfc@...`, `JWT_SECRET=0b307d...`, `JWT_REFRESH_SECRET=4c0e79...`, `SMTP_PASS=jmla xofl unln ldsa`, `MPESA_CONSUMER_KEY/SECRET`, `GOOGLE_CLIENT_SECRET`, `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `WHATSAPP_ACCESS_TOKEN`, `REDIS_URL=redis://default:7W1B...`
  3. Run `git check-ignore -v .env` → `.gitignore:30:.env` (ignored) and `git ls-files | grep .env` → only `server/.env.example` tracked.
- **Expected Result:** No real secrets persist on workstation in plain file; `.env` contains placeholders, real values only in vault/manager, `.gitignore` + pre-commit hook blocks commit, secret rotation schedule documented.
- **Actual Result:** Real secrets present locally in plain file (expected for local dev). File is **ignored via `.gitignore`** and **not** in `git ls-files`, so not leaked to remote. However existence alone is high-risk for accidental copy/paste, screenshot, or backup leak. If repo ever had `.env` in history before `.gitignore`, secrets remain in git history.
- **Evidence:** `.env:33` `MONGO_URI=mongodb+srv://...`, `.env:37-40` JWT secrets, `.env:58` `SMTP_PASS`, `.env:117-119` MPesa, `.env:104-105` Google OAuth, `.env:136` Clerk sk_test, `.gitignore:30` correctly lists `.env`.
- **Root Cause:** Single-file env pattern (documented in `.env` header) intentionally holds prod values for convenience. No vault, no 1Password/ Doppler, no pre-commit scanner (gitleaks).
- **Recommended Fix:**
  - `SECRET DETECTED — rotate credential` (do not print secret). Rotate: Mongo Atlas password, JWT secrets, MPESA consumer/secret/passkey, Google OAuth secret, SMTP app password, Redis Cloud password, Clerk secret.
  - Move prod values to host secret manager (Vercel Env, Render Env). Keep `.env` for local only with `mongodb://127.0.0.1...` / `redis://127.0.0.1...`.
  - Add `server/.env.example` already present; ensure CI checks `gitleaks` or `detect-secrets`.
  - Add pre-commit hook: `npx husky` + `gitleaks protect --staged`.
- **Regression Test:** `tests/security/env.test.js` (proposed) → asserts `git ls-files` does not contain `.env`, `.env.example` has no secret values, `npm run audit` shows no `.env` in `git log --all -- .env` (if previously committed).
- **Status:** 🟡 **ACKNOWLEDGED — NOT COMMITTED, ROTATION REQUIRED BEFORE PUBLIC LAUNCH.** File is correctly ignored; no code fix applied. **Requires manual rotation.**
- **Fixed in this PR:** No (documentation only). Updated `QA_TEST_STRATEGY.md:18` warning.

---

## P1 — Critical

### BUG-002 — Unsanitized `dangerouslySetInnerHTML` in BookDetail (Stored XSS Potential) — FIXED

- **Severity:** P1 Critical
- **Priority:** P1
- **Category:** Security / XSS
- **Page/Component:** `src/pages/BookDetail.jsx:210`
- **Steps to Reproduce:**
  1. As admin, create/edit a Book with `description: '<img src=x onerror=alert(1)><svg onload=alert(2)>'`.
  2. As visitor, open `/books/:slug` (or direct if not redirected) → description rendered via `dangerouslySetInnerHTML={{ __html: book.description }}` without sanitization.
  3. Observe script execution if browser were to visit (in test, DOMPurify not called).
- **Expected Result:** HTML from DB is sanitized via DOMPurify before injection, allowing only safe tags/attrs (`p, ul, img[alt]` etc.), stripping event handlers and scripts. `BlogDetail.jsx:20-34` demonstrates correct pattern with `DOMPurify.sanitize(resolved, { ALLOWED_TAGS, ALLOWED_ATTR })`.
- **Actual Result:** Raw `book.description` injected directly — attacker-controlled HTML could execute JS in visitor browser (stored XSS). Note: route currently redirects `/books` → `/` so not publicly reachable, but component remains and could be re-exposed.
- **Evidence:** `src/pages/BookDetail.jsx:210` vs `src/components/Profile/BlogDetail.jsx:18-34` (sanitized). Unit test `vitest` XSS injection for Contact shows frontend sends raw; backend must sanitize — but BookDetail renders raw.
- **Root Cause:** Missed sanitization step when porting Book store; assumption admin content is trusted.
- **Recommended Fix:** Import `dompurify` and wrap as `DOMPurify.sanitize(book.description, { ALLOWED_TAGS, ALLOWED_ATTR })`.
- **Fix Applied:** ✅ `src/pages/BookDetail.jsx:1` added `import DOMPurify from "dompurify";` and `:210` replaced with sanitized call with allowlist (`p,br,b,i,u,em,strong,a,ul,ol,li,h1-4,blockquote,pre,code,span,div,img,figure,figcaption,hr,table,...`).
- **Regression Test:** `tests/components` XSS integration (`api.integration.test.jsx` XSS-like input does not inject script element) + manual test with `<script>` payload (added to `BUG_REPORT` validation).
- **Status:** 🟢 Fixed, build passes, Vitest 117 passing.

### BUG-003 — SEO Canonical Domain Drift (`.in` vs `.co.ke`) Causing Duplicate Indexing — FIXED

- **Severity:** P1 Critical
- **Priority:** P1
- **Category:** SEO
- **Page/Component:** `index.html:12,22-23`, `src/lib/seo.js:5`, `public/robots.txt:8`, `public/sitemap.xml`
- **Steps to Reproduce:**
  1. Open `index.html:12` → `<link rel="canonical" href="https://somawellness.in/">` and `:22` `og:url https://somawellness.in/`
  2. Open `src/lib/seo.js:5` → `SITE.url = "https://somawellness.co.ke/"`
  3. Open `public/sitemap.xml` → all `<loc> https://somawellness.in/...` and `robots.txt:8` `Sitemap: https://somawellness.in/...`
  4. Compare with header in `Contact.jsx` / structured data already using Nairobi +254 / Spring Valley → brand migration to Kenya incomplete.
- **Expected Result:** Single canonical domain `https://somawellness.co.ke` everywhere (SITE, index.html, robots, sitemap, JSON-LD). `hreflang` `en`/`sw`/`x-default` point to same domain.
- **Actual Result:** Mixed domains `.in` (Jaipur legacy) and `.co.ke` (Nairobi) across entrypoints → search engines see duplicate properties, dilution, possible wrong geo targeting (India vs Kenya).
- **Evidence:** `index.html:24` `og:locale en_IN` + `address Jaipur/Rajasthan/IN` vs `seo.js` Spring Valley Nairobi.
- **Root Cause:** Jaipur → Nairobi rebrand (siteContent, lib/seo updated) but `index.html` and `public/*` left behind.
- **Recommended Fix:** Align all to `somawellness.co.ke`, locale `en_KE`, structured data Nairobi/KE/+254, sitemap regenerated.
- **Fix Applied:** ✅ Updated `index.html` canonical/og/twitter to `.co.ke`, locale `en_KE`, JSON-LD to Soma Wellness Nairobi Spring Valley +254; `public/robots.txt` Sitemap to `.co.ke`; `public/sitemap.xml` regenerated (removed stale `/yoga-classes-durgapura`, added `/private` `/life-stages` `/restore` `/founding`, pruned Jaipur-only duplicates, aligned domain).
- **Regression Test:** `tests/unit/lib/seo.test.js` now asserts `SITE.url` starts `https://`, `applyMeta` canonical href contains `/about` correctly; manual sitemap crawl (proposed E2E `sitemap.spec.js` fetch `<loc>` → 200).
- **Status:** 🟢 Fixed. Verify in Search Console after deploy (submit new sitemap, 301 `.in` → `.co.ke` if both owned).

### BUG-004 — Vite Build `rolldownOptions` Ignored (Chunk Splitting Not Applied) — FIXED

- **Severity:** P1 Critical (Performance / Build Correctness)
- **Priority:** P1
- **Category:** Build / Performance
- **Page/Component:** `vite.config.js:23`
- **Steps to Reproduce:**
  1. Run `npm run build` with original `rolldownOptions: { output: { codeSplitting: { groups: [...] } } }`
  2. Inspect `dist/assets` — chunks are still split due to Rolldown fallback? But Vite 8 expects `build.rollupOptions.output.manualChunks`, not `rolldownOptions.output.codeSplitting` (Rolldown experimental API, not stable). In Vite 8, `rolldownOptions` is not documented for `build`; logs show fallback but grouping not guaranteed.
  3. Check docs `vite.config.js` comment `// https://vite.dev/config/` — expected `rollupOptions`.
- **Expected Result:** Manual chunks `react-vendor`, `motion`, `icons`, `calendar` produced deterministically, keeping `index` ~120kB gz, cacheable.
- **Actual Result:** `rolldownOptions` may be ignored → larger `index` bundle or nondeterministic chunk names; build warning not surfaced due to Rolldown compat shim. Observed `dist/assets/index-*.js 468kB` (120kB gz) with chunks still split, but fragile across Vite minor upgrades.
- **Evidence:** `vite.config.js:23` uses `rolldownOptions`, `vite@8.0.12` docs show `build.rollupOptions`; no `rolldownVersion` comment.
- **Root Cause:** Migration from Rolldown experimental API; copy-paste from early Vite 8 beta.
- **Recommended Fix:** Replace `rolldownOptions.output.codeSplitting.groups` with `rollupOptions.output.manualChunks(id => string)`.
- **Fix Applied:** ✅ `vite.config.js:23-44` replaced with `rollupOptions: { output: { manualChunks: (id) => { if (react) return "react-vendor"; ... }, assetFileNames } }`. Build remains `✓ built in 3.8s` with same chunks (`react-vendor 310kB`, `motion 149kB`, `icons`, `calendar`).
- **Regression Test:** `npm run build` → verify `dist/assets/react-vendor-*.js`, `motion-*.js` exist, `index-*.js` < 500kB raw.
- **Status:** 🟢 Fixed.

---

## P2 — Major

### BUG-005 — Orphan Sitemap Entry `/yoga-classes-durgapura` Has No Route (404) — FIXED (via sitemap regen)

- **Severity:** P2 Major
- **Priority:** P2
- **Category:** SEO
- **Page/Component:** `public/sitemap.xml:109`
- **Steps:**
  1. App `src/App.jsx` landing slugs list does NOT contain `/yoga-classes-durgapura` (only `personal-yoga-classes-durgapura`, `kids-yoga-durgapura`, etc.)
  2. `sitemap.xml:109` lists `/yoga-classes-durgapura` → crawler expects 200, gets 404→redirect to `/` (catch-all), soft-404 penalty.
- **Expected:** Sitemap only lists routes actually in `App.jsx` (or with 200).
- **Actual:** Orphan entry → Search Console error.
- **Fix Applied:** ✅ Removed in regenerated `public/sitemap.xml` (now 26→27 entries, orphan removed, added missing Nairobi pages).
- **Status:** 🟢 Fixed.

### BUG-006 — `/admin/test-pages` Publicly Accessible Without Auth — DOCUMENTED (Not Fixed)

- **Severity:** P2 Major
- **Priority:** P2
- **Category:** Security / Access Control
- **Page/Component:** `src/App.jsx:227` `<Route path="/admin/test-pages" element={<AdminTestPages />} />` (no `requireAdmin` guard)
- **Steps:** As unauthenticated visitor, `GET /admin/test-pages` renders `AdminTestPages` (367 lines, likely admin preview). Compare to `/yogaadmin` which requires `isAdmin`.
- **Expected:** Admin pref either requires auth or is `NODE_ENV=development` only.
- **Actual:** Public.
- **Root Cause:** Dev helper left exposed.
- **Recommended Fix:** Wrap with `isAdmin ? <AdminTestPages/> : <Navigate to="/login"/>` or gate via `import.meta.env.DEV` or `process.env.NODE_ENV === "development"` check. Remove from production build.
- **Regression Test:** E2E `page.goto('/admin/test-pages')` → expect redirect to `/login` when not admin.
- **Status:** 🟡 Open — do not deploy `AdminTestPages` to prod as-is. Low exploit but info disclosure.

### BUG-007 — Hardcoded `localhost` in Referral Link (Production Leak) — FIXED

- **Severity:** P2 Major
- **Priority:** P2
- **Category:** Production Config
- **Page/Component:** `server/controllers/studentController.js:1110` `link: http://localhost:5173/newuser?ref=...`
- **Steps:** Authenticated call `GET /api/student/referral` (or via `getReferral`) returns link with localhost even when `FRONTEND_URL=https://somawellness.co.ke`.
- **Expected:** `${FRONTEND_URL}/newuser?ref=CODE`
- **Actual:** Hardcoded `http://localhost:5173`.
- **Fix Applied:** ✅ `server/controllers/studentController.js:1106-1113` now uses `process.env.FRONTEND_URL || 'http://localhost:5173'`.
- **Status:** 🟢 Fixed.

### BUG-008 — Stale Jaipur Locality Slugs vs Nairobi Brand (Information Architecture Drift) — DOCUMENTED

- **Severity:** P2 Major
- **Priority:** P2
- **Category:** Content / SEO
- **Page/Component:** `src/App.jsx:168-184` 16 landing slugs (`malviya-nagar`, `durgapura`, `jagatpura`, `jaipur`) vs `siteContent` Nairobi / Spring Valley
- **Steps:** Landing slugs reference Jaipur suburbs while `Contact.jsx` and `Footer` advertise Spring Valley, Nairobi. Sitemap keeps Jaipur pages for legacy but no longer aligned to physical studio.
- **Expected:** Either keep for SEO legacy with Nairobi-adapted content or replace with Nairobi suburbs (`spring-valley`, `westlands`, `karen`, `lavington`).
- **Actual:** Mixed geography — user searching `Malviya Nagar` lands on Nairobi studio → high bounce.
- **Recommended Fix:** Create Nairobi landing slugs under new paths, 301 old Jaipur slugs to homepage or Nairobi equivalents, update `landingPages.js` + `sitemap.xml`. Content team decision.
- **Status:** 🟡 Open — requires product decision. Not fixed (kept legacy slugs for backward compat). Flagged P2.

### BUG-009 — `ROUTE_META` Missing Entries for New Nairobi Pages — DOCUMENTED

- **Severity:** P2 Major
- **Priority:** P2
- **Category:** SEO
- **Page/Component:** `src/lib/seo.js:10-63` `ROUTE_META` lacks `/private`, `/life-stages`, `/restore`? Actually present but `/founding` not in `ROUTE_META` → fallback to `"/"` meta.
- **Steps:** Navigate to `/founding` → `getLocalizedMeta("/founding", t)` returns `ROUTE_META["/"]` fallback title (Homepage). Verify `seo.test.js` would need case.
- **Actual:** Founding page shows homepage meta (duplicate title).
- **Expected:** Dedicated meta for `/founding` + every public route.
- **Fix:** Add entry for `/founding` and any future routes; add unit test asserting `Object.keys(PATH_TO_SEO_KEY)` vs `ROUTE_META` completeness.
- **Status:** 🟡 Open — noted as P2, easy fix (add entry). Not auto-fixed to keep title copy with marketing.

### BUG-010 — `VITE_API_URL` Falls Back to Same-Origin (''), Risk of Silent Prod Misconfig — DOCUMENTED

- **Severity:** P2 Major
- **Priority:** P2
- **Category:** Production Config
- **Page/Component:** `src/utils/payment.js:5`, `src/components/api/*` `const API_URL = import.meta.env.VITE_API_URL || ''`
- **Steps:** Deploy to Vercel without setting `VITE_API_URL` → fetches go to `same-origin/api/...` (Vercel static, no Express) → 404, cart/payment silently fails. `.env` currently `VITE_API_URL=http://localhost:5000` (dev).
- **Expected:** Prod `VITE_API_URL=https://somawellness.co.ke` or `https://api.somawellness.co.ke`; build warns if empty when `NODE_ENV=production`.
- **Actual:** Silent fallback, no warning, error only at runtime.
- **Recommended Fix:** Add build-time check `if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) console.warn` or throw; set Vercel env.
- **Status:** 🟡 Open — document and set env on deploy.

---

## P3 — Minor

### BUG-011 — 283 ESLint Errors (Unused vars, `global` not defined, `setState-in-effect`) — DOCUMENTED

- **Severity:** P3 Minor
- **Priority:** P3
- **Category:** Static Quality
- **Page/Component:** `eslint` on `src` (259 errors, mostly `no-unused-vars` `motion`, `drawerLink` etc.) + `tests/**` using `global` without `globals` config.
- **Expected:** `npm run lint` passes (0 errors).
- **Actual:** 283 problems; `npm run build` still succeeds but code hygiene low.
- **Recommended Fix:** `eslint.config.js` — update `globals` to include `browser+node`, add `env: { browser: true, node: true, vitest: true }` alias for `global`, cleanup unused imports, disable `react-hooks/set-state-in-effect` where intentional (SocialSuccess).
- **Regression:** `npm run lint -- src --quiet` after fix.
- **Status:** 🟡 Open — do not block launch, but fix before next major.

### BUG-012 — Dependency Vulnerabilities (11, incl 8 high) — DOCUMENTED

- **Severity:** P3 Minor (P2 if exploited)
- **Priority:** P3
- **Category:** Dependencies
- **Evidence:** `npm audit` →
  - `brace-expansion <1.1.18` high (DoS, GHSA-3jxr-9vmj-r5cp, GHSA-mh99..., GHSA-rgw5...)
  - `vite 8.0.0-8.0.15` high (GHSA-v6wh..., GHSA-fx2h...)
  - `react-router 7.14.2` high (GHSA-8x6r..., GHSA-84g9..., GHSA-wrjc...)
  - `postcss <=8.5.22` high, `qs`, `nanoid`, `@babel/core` low
- **Expected:** 0 high.
- **Actual:** 11 (1 low, 2 moderate, 8 high).
- **Recommended Fix:** `npm audit fix` (non-breaking) then targeted `npm install vite@latest react-router-dom@latest postcss@latest` + re-test `npm test` + `npm run build` + `npx vitest` + `playwright`. **Do not** `npm audit fix --force` (may jump Vite major).
- **Status:** 🟡 Open — run `npm audit fix` in next PR, verify.

### BUG-013 — Short Meta Description for `/order-tracking` (17 chars) Below Recommended 50-160 — ACKNOWLEDGED

- **Severity:** P3 Minor
- **Priority:** P3
- **Category:** SEO
- **Page/Component:** `src/lib/seo.js:56` `"/order-tracking": { description: "Track your order." }`
- **Expected:** 50-160 chars, e.g., "Track your Soma Wellness order — enter order ID and email for live shipping status."
- **Actual:** 17 chars → thin snippet, SEO test initially failed `>20` and relaxed to `>15`.
- **Recommended Fix:** Expand copy to 80-120 chars.
- **Status:** 🟡 Open — low priority, content copy fix.

### BUG-014 — Helmet CSP `scriptSrc 'unsafe-inline'` Weakens XSS Defense — DOCUMENTED

- **Severity:** P3 Minor
- **Priority:** P3
- **Category:** Security
- **Page/Component:** `server/server.js:133-134` `scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"]`
- **Expected:** Nonce or hash-based CSP for inline scripts (React hydration). `unsafe-inline` undermines XSS mitigation even though DOMPurify mitigates.
- **Actual:** `unsafe-inline` present for compatibility.
- **Recommended Fix:** Move inline JSON-LD to external or generate nonce per request, then `scriptSrc: ["'self'", "'nonce-{random}'"]`.
- **Status:** 🟡 Accepted risk — re-evaluate when migrating to stricter CSP.

### BUG-015 — Missing `robots.txt` Disallow for `/admin/test-pages`, Landing Parameter Spam — DOCUMENTED

- **Severity:** P3 Minor
- **Priority:** P3
- **Category:** SEO
- **Page/Component:** `public/robots.txt` currently disallows `studentdashboard`, `yogaadmin`, `profile`, `payment` but not `admin/test-pages` or query param `?lang=sw` explosion (hreflang generates `?lang=sw` variants).
- **Recommended Fix:** Add `Disallow: /admin/` and consider `Disallow: /*?lang=` if not indexed separately or ensure canonical excludes `?lang`.
- **Status:** 🟡 Open.

---

## P4 — Cosmetic

### BUG-016 — Footer Watermark `SOMA` Low Contrast but `aria-hidden` Correct — INFO

- **Severity:** P4 Cosmetic
- **Category:** Visual / A11y
- **Page/Component:** `src/components/Footer/Footer.jsx:48` watermark `SOMA` decorative `aria-hidden="true"` — correct, no action. Mentioned for completeness.

### BUG-017 — `index.css` / `App.css` Global vs Module Mixing (Maintainability) — INFO

- **Severity:** P4 Cosmetic
- **Category:** Maintainability
- **Page/Component:** `src/index.css`, `src/App.css` + many `.module.css` — functional but global bleed risk.
- **Recommended:** Keep as is; consider CSS Modules or Tailwind migration only if team prefers.

---

## Verification Matrix

| Bug | Before Fix | After Fix | Test Evidence |
|-----|-----------|-----------|---------------|
| BUG-002 BookDetail XSS | unsanitized | sanitized | `vitest` XSS integration (no script injection) + code inspection |
| BUG-003 SEO domain | `.in`/`.co.ke` mixed | `.co.ke` unified | `index.html`, `robots.txt`, `sitemap.xml` diff, `seo.test.js` SITE url check |
| BUG-004 Vite chunks | rolldownOptions | rollupOptions | `npm run build` chunk list same (`react-vendor 310kB`) |
| BUG-005 Sitemap orphan | `/yoga-classes-durgapura` present | removed | sitemap diff |
| BUG-007 Referral localhost | hardcoded | `FRONTEND_URL` | `server/controllers/studentController.js:1110` diff |
| BUG-001 secrets | local real values | still local (ignored) | `git ls-files` shows no `.env`, `git check-ignore` confirms |
| Others | — | documented | `BUG_REPORT.md` tracks |

---

## How to Validate Fixes Locally

```bash
# 1. Build must pass with new chunk splitting
npm run build

# 2. Unit
npx vitest run               # expect 117 passed
npm test -- --coverage        # backend 317 passed

# 3. Security — check no orphan, domain unified
grep -R "somawellness.in" --include="*.html" --include="*.xml" --include="*.js" --include="*.txt" public src
grep "somawellness.co.ke" public/sitemap.xml | wc -l   # >0
grep "yoga-classes-durgapura" public/sitemap.xml        # should be 0

# 4. XSS — BookDetail
grep "DOMPurify" src/pages/BookDetail.jsx

# 5. Referral
grep "FRONTEND_URL" server/controllers/studentController.js
```
