# SOMA Wellness Center — Implementation Plan
**Generated:** 2026-08-26 | **Stack Audit:** React 19 + Vite, Express 5 + Mongoose, Razorpay, MongoDB, BullMQ/Redis

## 1. Stack Audit Summary
- **Frontend:** React 19, React Router 7, Framer Motion, TanStack Query, Vite 8, light/dark SOMA design system (CSS vars: --soma-forest, --soma-gold etc). Code-splitting via React.lazy.
- **Backend:** Express 5, Mongoose 9, Razorpay 2.9, JWT + bcrypt, Helmet, CORS, rateLimit, BullMQ/IORedis for notifications & webhooks, Nodemailer SMTP.
- **DB:** MongoDB via Mongoose. Existing models: User, Membership, Plan, Service, UserService, Booking, Course, etc. No SOMA-specific models yet.
- **Payments:** Unified PaymentService with Razorpay order + verify → FulfillmentService. Supports membership/service/workshop/consultation/course/yttc/booking/order/book.
- **Conventions:** `server/shared/constants/*.types.js` for enums, `server/models/*.js` Mongoose schemas, `server/controllers/*` + `server/routes/*`, `server/payment/*` for payments, `src/config/siteContent.js` for site copy, `src/components/soma/*` for SOMA UI.

## 2. Requirement Mapping

### 2.1 Business Overview (6 categories)
| Requirement | Status | Target Files |
|---|---|---|
| 6-category nav: Join / One-to-One / Life Stages / Restore / Learn & Partner / Founding | Existing — will modify | `src/config/siteContent.js:6`, `src/components/Navbar/Navbar.jsx:10`, `src/App.jsx:139` |
| KES VAT-inclusive, Spring Valley, configurable pricing | Existing — will modify | `server/config/somaCatalog.js` (new), `server/models/Settings.js`, `src/lib/currency.js` (new) |

### 2.2 JOIN — Memberships & Passes
| Item | Status | File |
|---|---|---|
| Trial 7d 3000 + Single 2500 | Existing — will modify | `server/config/somaCatalog.js` + `src/pages/Classes.jsx:21` |
| Tiers JUA/AMANI/UZIMA/FAMILY + inheritance | Existing — will modify | `server/models/Membership.js`, `server/models/Plan.js`, `src/config/siteContent.js:36`, `src/pages/Classes.jsx:62` |
| Pay-ahead 3/6/12 mo discounts | Existing — will modify | `src/config/siteContent.js:43`, `src/pages/Classes.jsx:165`, `server/services/pricingEngine.js` (new) |
| Class passes 5/10 + registration waive + guest/mat/towel | New — will create | `server/models/SomaPass.js` (new), `server/config/somaCatalog.js` |
| SOMA DAILY digital sub (podcast/daily/short/monthly/notes) 1500/15000 | New — will create | `server/models/SomaDailySubscription.js` + `server/models/SomaContent.js` (new) |
| Rules: upgrade next-cycle, no rollover, tier discount auto, waive logic | New — will create | `server/services/allowanceService.js`, `server/services/pricingEngine.js` |

### 2.3 ONE-TO-ONE — Private Yoga & Therapy
| Item | Status | File |
|---|---|---|
| Rate card 6500/5500/25000/46000/8000/9500/9500+ | Existing — will modify | `src/pages/Private.jsx:9`, `src/config/siteContent.js:73` |
| Flow assessment → 5 or 10 package | Existing — will modify | `server/services/serviceService.js`, `server/models/Service.js` |
| Quote flow home/hotel | New — will create | `server/models/QuoteRequest.js`, `src/components/soma/QuoteForm.jsx` (new) |
| Therapy disclaimer checkbox | New — will create | `server/models/HealthDisclosure.js`, frontend booking flow |

### 2.4 LIFE STAGES
| Item | Status | File |
|---|---|---|
| 4 programmes blocks 4/8 + single/camp | Existing — will modify | `src/pages/LifeStages.jsx`, `src/config/siteContent.js:83` |
| Age grouping for YOUNG | New — will create | `server/services/lifeStagesService.js`, frontend DOB capture |
| Medical clearance flag pregnancy/seniors | New — will create | `server/models/HealthDisclosure.js` |

### 2.5 RESTORE
| Item | Status | File |
|---|---|---|
| Massage/meditation à la carte 6 items | Existing — will modify | `src/pages/Restore.jsx:4`, `src/config/siteContent.js:90` |
| Meditation free for AMANI/UZIMA/FAMILY | New — will create | `server/services/pricingEngine.js` |
| Health disclosure required | New — will create | `server/models/HealthDisclosure.js` |
| Signature experiences +20% surcharge outside Mon-Fri 10:00-15:00 | Existing — will modify | `src/pages/Restore.jsx:8`, `server/services/surchargeService.js` (new) |
| SOMA RESET 6-week tracker (assessment,12yoga,6med,2massage,plan,review) | New — will create | `server/models/SomaResetProgress.js` (new) |
| Gift vouchers 12mo arbitrary amount + code + expiry | New — will create | `server/models/GiftVoucher.js` (new) |
| Retail add-ons simple list | Existing — will modify (catalog) | `server/config/somaCatalog.js` |

### 2.6 LEARN & PARTNER
| Item | Status | File |
|---|---|---|
| Academy 25h/100h/200h 30k/85k/165k early 145k | Existing — will modify | `src/pages/YTTC.jsx:39`, `src/config/siteContent.js:105` |
| Early enrolment time/capacity box | New — will create | `server/models/Course.js` extension + `server/services/academyService.js` |
| Instalment schedule admin-configurable | New — will create | `server/models/InstallmentPlan.js` |
| Corporate quote-driven + Single 18k instant | Existing — will modify | `server/models/CorporateLead.js` (new), `src/pages/YTTC.jsx:171` |

### 2.7 FOUNDING MEMBERS
| Item | Status | File |
|---|---|---|
| 100 or 90 days, 12mo lock, waived reg, pay-ahead still applies | New — will create | `server/models/FoundingSettings.js` + `server/services/foundingService.js` (new) |
| Live counter + window + per-member expiry | New — will create | Above + `server/routes/soma.js` (new), `src/components/soma/FoundingBanner.jsx` |
| Admin dashboard remaining/days/expiry | New — will create | `server/controllers/somaAdminController.js` |

### 2.8 GLOBAL RULES
| Rule | Status | File |
|---|---|---|
| 1 KES VAT-inclusive display | New — will create | `src/lib/currency.js`, `server/utils/currency.js` |
| 2 Advance booking calendar/slot | New — will create | `server/models/Appointment.js` (new) |
| 3 activated_at vs purchased_at expiry from first use | New — will create | `server/models/SomaPass.js`, `server/models/UserService.js` extension |
| 4 Non-transferable except Family/Corporate multi-user | New — will create | `server/models/FamilyAccount.js` or User extension |
| 5 No rollover monthly allowances | New — will create | `server/services/allowanceService.js` |
| 6 Cancellation fee 50% <12h, 100% no-show | New — will create | `server/services/cancellationService.js` |
| 7 Health disclosure required prompt | New — will create | `server/models/HealthDisclosure.js`, middleware |
| 8 All pricing DB/config no hardcode + seed | Existing — will modify | `server/config/somaCatalog.js`, `server/seed-services.js`, `server/server.js:265` |

### 2.9 FRONTEND
| Section | Status | File |
|---|---|---|
| Landing 6-cat nav with From KES live | Existing — will modify | `src/pages/Home.jsx`, `src/components/Hero/Hero.jsx`, `src/components/soma/SomaExperiences.jsx` |
| Category pages pricing tables | Existing — will modify | `src/pages/Classes.jsx`, `Private.jsx`, `LifeStages.jsx`, `Restore.jsx`, `YTTC.jsx` |
| Booking flows (instant/calendar/quote) | New — will create | `src/components/soma/Booking/*` (new) |
| Membership comparison inheritance | Existing — will modify | `src/pages/Classes.jsx` |
| Pay-ahead selector live math | New — will create | `src/components/soma/PayAheadSelector.jsx` |
| Founding banner wired | New — will create | `src/components/soma/FoundingBanner.jsx` |
| Account dashboard allowances/packages/vouchers/bookings | Existing — will modify | `src/components/Profile/StudentDashboard.jsx` |
| Admin manage catalog/founding/leads/calendar/health/vouchers | Existing — will modify | `src/components/Admin/*` |

### 2.10 BACKEND
| Section | Status | File |
|---|---|---|
| Data models (10+ new) | New — will create | `server/models/*.js` |
| Pricing engine precedence | New — will create | `server/services/pricingEngine.js` |
| Cron: allowance reset, founding expiry, voucher expiry, rollover | New — will create | `server/services/cron/somaCron.js` |
| Admin CRUD catalog/pricing | Existing — will modify | `server/routes/admin.js`, `server/controllers/adminController.js` |
| Auth-protected booking/account | Existing — will modify | `server/routes/bookings.js` + new `server/routes/soma.js` |
| Cancellation fee API | New — will create | `server/routes/soma.js`, `server/services/cancellationService.js` |

### 2.11 TESTING
New tests planned in `server/__tests__/`:
- `unit/services/pricingEngine.test.js` — every tier × term, founding×term, member discount, surcharge boundaries
- `unit/services/foundingService.test.js` — 100th signup, day 90/91, simultaneous
- `unit/services/allowanceService.test.js` — no rollover, cycle reset
- `unit/services/cancellationService.test.js` — exactly 12h boundary
- `unit/services/surchargeService.test.js` — Mon-Fri 10:00-15:00, weekend
- `unit/models/GiftVoucher.test.js` — expiry 12mo
- `integration/somaBooking.test.js` — instant/calendar/quote + disclosure checkbox blocking

## 3. Implementation Order
1. Catalog + currency + constants (foundation)
2. Pricing + founding + surcharge + cancellation + allowance engines (pure logic, testable)
3. Mongoose models (GiftVoucher, CorporateLead, Appointment, HealthDisclosure, SomaPass, FoundingSettings, SomaResetProgress, SomaDaily)
4. Extend Membership/UserService/Plan/Settings
5. Routes + controllers (public catalog, booking, admin)
6. Cron jobs
7. Frontend: Navbar new 6 nav, FoundingBanner, PayAheadSelector, MembershipComparison, booking flows, dashboard, admin
8. Seed new services/plans for Nairobi
9. Tests + regression
10. Docs & ambiguities

## 4. Risks & Decisions
- KES vs INR: existing payments use INR/paise. SOMA spec says KES VAT-inclusive. Will set `currency: 'KES'` in catalog and format with `Intl.NumberFormat('en-KE', {style:'currency', currency:'KES'})` but keep Razorpay amount in paise-equivalent (KES *100) with display conversion. Documented as ambiguity.
- Founding counter race: will use MongoDB atomic `findOneAndUpdate` with `$inc` + condition `count < 100`.
- Allowance reset: monthly cron stored as `nextResetAt` per Membership; no rollover enforced via `$set` not `$inc`.

