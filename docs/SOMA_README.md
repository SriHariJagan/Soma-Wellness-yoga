# SOMA Wellness Center — Nairobi (Spring Valley) — Implementation Notes

## Overview
Spring Valley, Nairobi · KES VAT-inclusive · All pricing is configurable data (DB/config, not hardcoded UI) · Proposed launch prices subject to management approval.

## New Environment Variables
None required beyond existing `MONGO_URI`, `JWT_SECRET`, etc. Optional:
- `FOUNDING_OPENING_DATE` — ISO date to override singleton openingDate (defaults to 2026-08-01T00:00:00+03:00 EAT).
- `SOMA_CURRENCY=KES` (already default).

## Migrations / Seeds
On boot (`server/server.js:723`):
- `seedSomaPlans()` — upserts 8 Plan docs: SOMA JUA/AMANI/UZIMA/FAMILY (isSoma=true, with termPricing + foundingMonthly + allowances), 5/10-class passes, SOMA DAILY monthly/annual.
- `seedSomaServices()` — upserts 14+ Service docs: relaxation/aromatherapy/deep tissue/short/scrub/meditation, STILLNESS/ACACIA/FOR TWO, MAMA/MAMA+/YOUNG/AGEWELL, therapy assessment, single private, SOMA RESET 32k.
- `seedSomaCourses()` — upserts 3 Course docs: Yoga Foundations 25h 30k, SOMA 100 100h 85k, SOMA 200 200h 165k (early 145k, cap 12).
- `seedFoundingSettings()` — singleton `{ key:'global', openingDate:2026-08-01 EAT, cap:100, windowDays:90 }`.

Existing Indian plans/services remain for regression; SOMA data is additive (isSoma flag).

## Cron Jobs
- `resetDueAllowances` (hourly) — checks Membership.nextResetAt ≤ now, calls resetAllowances() (no rollover) and pushes nextResetAt +1 month.
- `expireVouchers` (hourly) — marks GiftVoucher status expired when expiresAt ≤ now.
- `checkFoundingWindow` (hourly) — logs when founding window passes.
- `rolloverFoundingRates` (hourly) — when founding_rate_expires_at ≤ now, clears isFounding and pushes history entry.

Managed by `server/services/cron/somaCron.js:startSomaCron()/stopSomaCron()` started after DB connect.

## API Endpoints (new)
Public (`/api/soma/*`):
- `GET /api/soma/catalog` — full KES catalog
- `GET /api/soma/founding/status` — live counter + window
- `GET /api/soma/pricing/membership?tier=UZIMA&termMonths=6&founding=true`
- `GET /api/soma/pricing/service?basePrice=5500&tierKey=UZIMA&slotStart=...`
- `GET /api/soma/appointments/slots?date=YYYY-MM-DD`
- `POST /api/soma/quote` — home/hotel or corporate quote (distance, groupSize, duration, venue, headcount, programme)
- `POST /api/soma/corporate-lead`
- `GET /api/soma/daily/content`

Authenticated:
- `POST /api/soma/appointments` — instant booking (validates health disclosure + therapy disclaimer, enforces double-book, computes surcharge+discount)
- `POST /api/soma/appointments/:id/cancel` — cancellation fee calculator (free ≥12h, 50% <12h, 100% no-show)
- `POST /api/soma/gift-vouchers` + `POST /api/soma/gift-vouchers/redeem` + `GET /api/soma/gift-vouchers/:code`
- `GET /api/soma/me/dashboard` — membership/tier/allowanceUsage/passes/vouchers/appointments/reset/packages/daily
- `POST /api/soma/daily/subscribe` (monthly/annual) — standalone digital independent of facility
- `POST /api/soma/passes/purchase` (5_CLASS/10_CLASS) — activated_at on first use, expiry 6w/3m from activation
- `POST /api/soma/reset/purchase` + `POST /api/soma/reset/:id/progress`

Admin (`/api/soma/admin/*` requireAuth+requireAdmin):
- `GET/PUT /api/soma/admin/founding` — counter, openingDate, remainingSlots, daysRemaining, per-member lock expiry
- `GET/POST /api/soma/admin/vouchers` + `PATCH .../void`
- `GET/PATCH /api/soma/admin/corporate-leads`
- `GET/PATCH /api/soma/admin/appointments`
- `GET /api/soma/admin/health-disclosures`, `/passes`, `/resets`
- `GET/POST/PUT/DELETE /api/soma/admin/daily-content`
- `GET/PUT /api/soma/admin/catalog` — Settings.soma overrides

## Frontend Routes (updated)
Navigation now exactly: Join (/classes) / One-to-One (/private) / Life Stages (/life-stages) / Restore (/restore) / Learn & Partner (/yttc) / Founding Members (/founding).
- `src/pages/FoundingMembers.jsx` — live founding counter, pay-ahead selector with founding math.
- `src/components/soma/FoundingBanner.jsx` — wired to /api/soma/founding/status.
- `src/components/soma/PayAheadSelector.jsx`, `MembershipComparison.jsx`, `BookingFlow.jsx` (InstantCheckout + HealthDisclosureStep + QuoteForm + CorporateQuoteForm).
- `src/components/Profile/SomaDashboard.jsx` — allowance "3 of 8 used", passes, RESET tracker (assessmentDone...), vouchers expiry, upcoming bookings with fee preview.
- `src/lib/currency.js`, `src/lib/pricing.js`, `src/lib/somaApi.js` — KES formatting `KES 12,000`, surcharge EAT window helper, API wrappers.
- `src/config/siteContent.js:SOMA_NAV` updated.

## Currency
All displays use `Intl.NumberFormat('en-KE')` via `formatKES()` — e.g. `KES 28,500`. VAT-inclusive, no separate tax line.

## Input Validation & Error Handling
- All booking endpoints validate required fields, health disclosure consent, therapy disclaimer, child age, slot future, double-booking.
- Quote forms validate name+email, distance/group/duration numbers.
- Voucher min 100 KES, unique code `SOMA-XXXX-XXXX`.
- Rate limits on booking (30/min) and quote (5/15min).

## Testing
Run: `node --experimental-vm-modules node_modules/jest/bin/jest.js --no-coverage`
- 21 suites, 317 tests passing (covers pricing engine, allowance, surcharge boundary at 15:00, cancellation at exactly 12h, founding 100th/day90-91, package activated_at expiry, booking health-check blocking, double-booking prevention, founding 100-slot race, admin catalog live reflect).
- Build: `npm run build` → 694 modules, built in 4.4s, no errors.

## Mobile / Accessibility
- All new pages use clamp(), grid fallbacks, backdrop-filter blur, WCAG contrast; Navbar sticky, drawer for mobile, pay-ahead grid collapses on <768px.

## Logging
Payment/booking/cancellation events logged via `notification/logger.js` with MODULE tags.

