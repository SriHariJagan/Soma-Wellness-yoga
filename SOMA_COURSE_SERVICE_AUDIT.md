# SOMA WELLNESS - COURSE / SERVICE / OFFERING SYSTEM - TECHNICAL AUDIT

**Date:** 2026-09-19
**Type:** Read-only audit - no code changes
**Scope:** Complete technical audit of the current course/service/package/wellness offering system

---

## TABLE OF CONTENTS

1. Executive Summary
2. Current Architecture
3. Current Course/Service System
4. Database Audit
5. API Audit
6. Admin Dashboard Audit
7. Frontend Audit
8. Booking + Payment Audit
9. Security Audit
10. Current Problems
11. Missing Features
12. Hardcoded Data
13. Recommended Database Changes
14. Recommended API Changes
15. Recommended Admin Changes
16. Recommended Public Website Changes
17. Visibility/Availability Architecture
18. Premium UX Recommendations
19. Migration Risks
20. Backward Compatibility Concerns
21. Testing Requirements
22. Target SOMA Catalog
23. Proposed Implementation Plan
24. Final Recommended Architecture

---

## 1. EXECUTIVE SUMMARY

### What Exists

The SOMA Wellness application is a React 19 + Vite SPA with an Express.js 5 backend backed by MongoDB (Mongoose 9.6) and Redis/BullMQ for queuing. The offering system is fragmented across 7 overlapping data models and duplicated between frontend and backend.

### Current State

| Aspect | Status |
|--------|--------|
| Database models for offerings | 7 models: Service, Course, Plan, Membership, Booking, Appointment, Workshop |
| Backend catalog source of truth | server/config/somaCatalog.js - a 500+ line hardcoded JavaScript file |
| Frontend catalog source of truth | src/config/siteContent.js - a separate hardcoded file with DIFFERENT values |
| Public API | /api/soma/catalog returns hardcoded data from somaCatalog.js (not DB) |
| Admin CRUD | Exists for Course, Plan, Service, Workshop, Event - but incomplete |
| Price management | Prices are hardcoded in 3+ places; changing requires code changes and redeployment |
| Visibility system | Partial - Plan has visibility (public/private/hidden), Service has it, Course does NOT |
| Availability system | No formal system - only active boolean on some models |
| Image management | image field exists on models but admin UI lacks image upload for most entities |
| Tag/feature system | tags[] exists on Service, nowhere else |
| Display order | displayOrder exists on Plan and Service, not on Course or Workshop |
| End dates | Not supported - only expiryDate on user memberships, not on offerings |
| Capacity management | Exists on Workshop and ClassSession, not on Service or Plan |

### Critical Findings

1. **Three separate pricing systems** exist: somaCatalog.js (backend), siteContent.js (frontend), pricing.js (frontend mirror) - none share a single source
2. **Prices differ between backend catalog and frontend display** - e.g., single class is KES 2,500 in backend but KES 3,000 on frontend
3. **Admin cannot edit most frontend-facing content** - Classes, Private, LifeStages, Restore, YTTC pages are 100% hardcoded
4. **7 overlapping models** for what should be a unified catalog: Service, Course, Plan, Membership, Booking, Appointment, Workshop
5. **No unified offering entity** - there is no single model that represents "a thing SOMA sells"
6. **Target catalog (33 offerings) will require new model** or significant extension of existing models

### Recommendation Summary

Create a single unified Offering model (or extend Service as the canonical catalog) that replaces the fragmented Course, Plan, Service, and Workshop catalog data. Keep Membership, Booking, Appointment as transactional/enrollment records that reference the catalog.

---

## 2. CURRENT ARCHITECTURE

### 2.1 Project Type

| Component | Technology |
|-----------|------------|
| Frontend | React 19.2 + Vite 8.12 (SPA, ESM) |
| Backend | Express.js 5.2 (ESM) |
| Database | MongoDB 9 via Mongoose 9.6.2 |
| Cache/Queue | Redis (ioredis 5.11) + BullMQ 5.79 |
| Authentication | JWT (access + refresh) + Passport.js (Google, Facebook OAuth) |
| Payments | M-Pesa (Safaricom STK Push) |
| Deployment | Vercel (frontend) + Render (backend) |
| i18n | i18next (English + Swahili) |

### 2.2 Data Flow for Offerings

`
somaCatalog.js (hardcoded config)
    | seed-services.js
    v
MongoDB Service collection (47 seeded records)
    |
    v
/api/soma/catalog (returns hardcoded config, NOT DB)
    |
    v
Frontend (siteContent.js hardcodes its own copy)
`

### 2.3 Key Files

| File | Role |
|------|------|
| server/config/somaCatalog.js | Backend pricing and catalog constants (500+ lines) |
| src/config/siteContent.js | Frontend pricing and content (269 lines) |
| src/lib/pricing.js | Frontend pricing calculations |
| server/services/pricingEngine.js | Backend pricing calculations |
| server/seed-services.js | Seeds 47 services to MongoDB |
| server/seed.js | Seeds plans, courses, batches, workshops |

---

## 3. CURRENT COURSE/SERVICE SYSTEM

### 3.1 Data Model Map

| Model | Collection | Purpose | Fields Related to Catalog |
|-------|-----------|---------|--------------------------|
| Service | services | Wellness services (47 seeded) | name, slug, description, category, type, mode, price, pricingModel, image, tags, featured, visibility, displayOrder |
| Course | courses | Academy courses (3 seeded) | title, duration, mode, price, description, active, category, hours, earlyPrice, installmentsConfig |
| Plan | plans | Membership tiers (4 seeded) | name, description, price, durationMonths, benefits, badge, tier, visibility, active, displayOrder |
| Membership | memberships | User enrollment in plans | user, plan, status, startDate, expiryDate, allowances, tier |
| Booking | bookings | Generic booking (legacy) | name, email, courseName, coursePrice, status |
| Appointment | appointments | SOMA appointments | user, type, service, slotStart, slotEnd, pricing, status |
| Workshop | workshops | One-off workshops | name, date, price, capacity, isPublished, status |
| Event | events | Community events | title, date, location, capacity, isPublished, status |

### 3.2 What Currently Exists as Offerings

**A. Membership Plans (from somaCatalog.js)**

| Tier | Monthly (KES) | Allowances |
|------|--------------|------------|
| JUA | 12,000 | 8 group yoga classes |
| AMANI | 18,500 | Unlimited yoga + meditation + SOMA DAILY |
| UZIMA | 28,500 | Unlimited + 2 massages + 1 private + 2 guest passes + 15% off |
| FAMILY | 35,000 | 2 adults + 1 child programme + meditation + SOMA DAILY |

Pay-ahead discounts: 3mo (10%), 6mo (15%), 12mo (25%)

**B. Class Passes (hardcoded in catalog)**

| Pass | Classes | Price (KES) | Per Class |
|------|---------|-------------|-----------|
| 5-Class | 5 | 11,000 | 2,200 |
| 10-Class | 10 | 21,000 | 2,100 |

**C. Single/Discovery (hardcoded in catalog)**

| Item | Price (KES) |
|------|-------------|
| Discovery (7-day unlimited) | 3,000 |
| Single Class | 2,500 |

**D. Private Sessions (hardcoded in catalog)**

| Session | Price (KES) |
|---------|-------------|
| Therapy Assessment (75 min) | 6,500 |
| Single Private (60 min) | 5,500 |
| 5-Session Pack | 25,000 |
| 10-Session Pack | 46,000 |
| Couple (60 min) | 8,000 |
| Small Group 3-5 (60 min) | 9,500 |
| Home/Hotel | from 9,500 (quote) |

**E. Life Stages (hardcoded in catalog)**

| Program | 4 Sessions (KES) | 8 Sessions (KES) |
|---------|------------------|------------------|
| MAMA (Pregnancy) | 12,000 | 22,000 |
| MAMA+ (Postnatal) | 11,500 | 21,000 |
| YOUNG (Children 5-17) | 7,000 | 12,000 |
| AGE WELL (Seniors) | 7,000 | 12,000 |

**F. Massage/Restore (hardcoded in catalog)**

| Treatment | Duration | Price (KES) |
|-----------|----------|-------------|
| Relaxation | 60 min | 5,500 |
| Aromatherapy | 60 min | 6,000 |
| Deep Tissue/Sports | 60 min | 6,500 |
| Short (Head/Feet) | 30 min | 3,000 |
| Body Scrub | 45 min | 4,000 |
| Meditation/Breathwork | 45 min | 1,800 |

**G. Signature Experiences (hardcoded in catalog)**

| Name | Duration | Price (KES) | Surcharge |
|------|----------|-------------|-----------|
| STILLNESS | 120 min | 11,000 | 20% (weekends/evenings) |
| THE ACACIA | 150 min | 18,500 | 20% |
| FOR TWO | 120 min | 22,500/couple | 20% |

**H. SOMA RESET** - Price: 32,000 KES - assessment + 12 yoga + 6 meditation + 2 massages + home plan + closing review

**I. Academy (seeded to DB as Course)**

| Course | Hours | Price (KES) | Early Price |
|--------|-------|-------------|-------------|
| Yoga Foundations | 25 | 30,000 | - |
| SOMA 100 | 100 | 85,000 | - |
| SOMA 200 | 200 | 165,000 | 145,000 |

**J. Corporate (hardcoded in catalog)**

| Package | Price (KES) |
|---------|-------------|
| Single Session (60 min, up to 20 pax) | 18,000 |
| Monthly 4 Sessions | 65,000 |
| Monthly 8 Sessions | 120,000 |
| Wellness Day | from 150,000 |
| Annual Contract | from 600,000 |

**K. SOMA DAILY** - Monthly: 1,500 / Annual: 15,000

**L. Fees** - Registration: 3,000 (waived if 3+ months prepaid), Guest Pass: 1,500, Mat: 200, Towel: 300

**M. Services** - 47 seeded to DB via somaCatalog.js (bookable/appointment-based services)

**N. Retail** - 6 items: mat (3,500), strap (1,200), block (1,500), oil (1,800), tea (800), water (200)

### 3.3 Target SOMA Catalog Gap Analysis

Comparing the 33 target offerings to what currently exists:

| # | Target Name | Current Equivalent | Gap |
|---|-------------|-------------------|-----|
| 1 | Single Class | SINGLE_CLASS (KES 2,500) | Price mismatch: target 2,000 vs current 2,500 |
| 2 | SOMA JUA 10-Class Pass | CLASS_PASSES.TEN (KES 21,000) | Price mismatch: target 11,500 vs current 21,000 |
| 3 | SOMA AMANI Monthly | MEMBERSHIP_TIERS.AMANI (KES 18,500) | Price mismatch: target 16,500 vs current 18,500 |
| 4 | SOMA AMANI 6-Month | Pay-ahead (~KES 94,275) | Price mismatch: target 75,500 |
| 5 | SOMA AMANI Annual | Pay-ahead (~KES 167,400) | Price mismatch: target 125,500 |
| 6 | SOMA UZIMA | MEMBERSHIP_TIERS.UZIMA (KES 28,500) | Price mismatch: target 22,500 vs current 28,500 |
| 7 | SOMA 360 | Does not exist | NEW offering |
| 8 | One-to-One Yoga | PRIVATE_RATES.single (KES 5,500) | Price mismatch: target 4,500 |
| 9 | Couple Yoga | PRIVATE_RATES.twoPeople (KES 8,000) | Price mismatch: target 6,500 |
| 10 | 5 Private Sessions | PRIVATE_RATES.pack5 (KES 25,000) | Price mismatch: target 21,000 |
| 11 | 5 Couple Sessions | Does not exist | NEW offering |
| 12 | 10 Private Sessions | PRIVATE_RATES.pack10 (KES 46,000) | Price mismatch: target 40,000 |
| 13 | 10 Couple Sessions | Does not exist | NEW offering |
| 14 | Meditation Drop-In | MASSAGE_TREATMENTS.meditation (KES 1,800) | Price mismatch: target 1,500 |
| 15 | Pranayama & Meditation | Does not exist | NEW offering |
| 16 | Yoga Nidra | Does not exist | NEW offering |
| 17 | 4-Session Meditation | Does not exist | NEW offering |
| 18 | Private Meditation | Does not exist | NEW offering |
| 19 | SOMA Work Well Single | CORPORATE.single (KES 18,000) | Price mismatch: target 13,500 |
| 20 | SOMA Work Well Monthly | CORPORATE.monthly4 (KES 65,000) | Price mismatch: target 45,000 |
| 21 | Individual Yoga Therapy | SOMA_SERVICES therapy items | Partial match |
| 22 | Yoga Therapy 5 Sessions | Does not exist | NEW offering |
| 23 | Yoga Therapy 10 Sessions | Does not exist | NEW offering |
| 24 | Prenatal Yoga | LIFE_STAGES.MAMA (KES 12,000/4) | Price mismatch: target 5,500 single |
| 25 | Prenatal 5 Sessions | Does not exist | NEW offering |
| 26 | Prenatal 10 Sessions | Does not exist | NEW offering |
| 27 | SOMA AMANI Experience | Does not exist | NEW offering |
| 28 | SOMA UZIMA Journey | Does not exist | NEW offering |
| 29 | SOMA NURU | Does not exist | NEW offering |
| 30 | SOMA NGUVU | Does not exist | NEW offering |
| 31 | SOMA UTULIVU | Does not exist | NEW offering |
| 32 | SOMA RESET | SOMA_RESET (KES 32,000) | Price mismatch: target 6,000 |
| 33 | SOMA 200 | ACADEMY.soma200 (KES 165,000) | Price mismatch: target 130,000 |

**Summary:** Of 33 target offerings, 0 have exact price matches. 15 are entirely new offerings that don't exist today.

---

## 4. DATABASE AUDIT

### 4.1 Service Model (server/models/Service.js)

Collection: services

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| name | String | YES | - | trim |
| slug | String | no | '' | auto-generated |
| description | String | no | '' | |
| category | String | no | 'General' | Free text |
| type | String | no | '' | Free text |
| mode | String | no | 'offline' | offline/online/home/center/hybrid |
| instructor | ObjectId | no | null | ref Instructor |
| instructors | [ObjectId] | no | [] | ref Instructor |
| timeSlots | [SubDoc] | no | [] | {day, time, instructor, label} |
| price | Number | no | 0 | min: 0 |
| pricingModel | String | no | 'flat' | flat/monthly/per_session/contact |
| sessionDuration | Number | no | 60 | minutes |
| totalSessions | Number | no | 0 | |
| validityDuration | Number | no | 0 | |
| validityUnit | String | no | 'weeks' | days/weeks/months |
| durationWeeks | Number | no | 0 | |
| image | String | no | '' | URL/path |
| images | [String] | no | [] | |
| icon | String | no | '' | |
| tags | [String] | no | [] | |
| active | Boolean | no | true | |
| isPopular | Boolean | no | false | |
| featured | Boolean | no | false | |
| visibility | String | no | 'public' | public/private/hidden |
| displayOrder | Number | no | 0 | |

### 4.2 Course Model (server/models/Course.js)

Collection: courses

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| title | String | YES | - | |
| duration | String | no | '' | e.g. "3 Weeks" |
| mode | String | no | 'Online' | Online/Hybrid/Studio |
| price | Number | no | 0 | |
| description | String | no | '' | |
| active | Boolean | no | true | |
| hours | Number | no | null | |
| earlyPrice | Number | no | null | |
| category | String | no | 'academy' | academy/group/other |
| currency | String | no | 'KES' | |

MISSING from Course: visibility, displayOrder, tags, featured, image, images, slug, sessionDuration, totalSessions, validityDuration

### 4.3 Plan Model (server/models/Plan.js)

Collection: plans

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| name | String | YES | - | |
| description | String | no | '' | |
| price | Number | no | 0 | |
| durationMonths | Number | YES | - | |
| benefits | [String] | no | [] | |
| badge | String | no | '' | |
| displayOrder | Number | no | 0 | |
| isPopular | Boolean | no | false | |
| active | Boolean | no | true | |
| visibility | String | no | 'public' | public/private/hidden |
| tier | String | no | null | JUA/AMANI/UZIMA/FAMILY |
| isSoma | Boolean | no | false | |
| somaCategory | String | no | 'membership' | membership/pass/daily/other |
| allowances | Mixed | no | {} | |
| foundingMonthly | Number | no | null | |
| termPricing | Mixed | no | {} | {1: price, 3: price, ...} |
| originalPrice | Number | no | null | strikethrough |

MISSING from Plan: image, images, slug, tags, subtitle, what's included, structured benefits

### 4.4 Key Missing Fields Across All Models

| Field | Needed For | Service | Course | Plan |
|-------|-----------|---------|--------|------|
| subtitle | Target catalog | No | No | No |
| whatIncluded | Package inclusions | No | No | No |
| benefits (structured) | Benefits list | No | No | Partial |
| gallery | Multi-image | No | No | No |
| startDate | Upcoming offerings | No | No | No |
| endDate | Temporary offerings | No | No | No |
| capacity | Group limits | No | No | No |
| bookingEnabled | Booking control | No | No | No |
| category (unified) | Categorization | Partial | Partial | No |
| tags | Filtering | Yes | No | No |
| image | Display | Yes | No | No |
| slug | URLs | Yes | No | No |

---

## 5. API AUDIT

### 5.1 Public APIs

| Method | Endpoint | Source | Auth | Returns |
|--------|----------|--------|------|---------|
| GET | /api/soma/catalog | somaCatalog.js (hardcoded) | No | Full catalog from config (NOT DB) |
| GET | /api/public/services | DB Service model | No | Active, non-hidden services |
| GET | /api/public/courses | DB Course model | No | Active courses |
| GET | /api/public/plans | DB Plan model | No | Active plans by displayOrder |
| GET | /api/public/batches | DB Batch model | No | Non-closed batches |
| GET | /api/public/workshops | DB Workshop model | No | Published future workshops |
| GET | /api/public/events | DB Event model | No | Published events |
| GET | /api/public/settings | DB Settings | No | Site settings |

Problem: /api/soma/catalog returns hardcoded data, while /api/public/services returns DB data. These can be inconsistent.

### 5.2 Authenticated User APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/soma/me/dashboard | Student dashboard |
| POST | /api/soma/appointments | Book appointment |
| POST | /api/soma/passes/purchase | Buy class pass |
| POST | /api/soma/reset/purchase | Buy SOMA RESET |
| POST | /api/soma/daily/subscribe | Subscribe to DAILY |
| POST | /api/student/cart/add | Add to cart |
| POST | /api/student/cart/checkout | Checkout cart |

### 5.3 Admin APIs

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET/POST/PUT/DELETE | /api/admin/courses | Admin | Course CRUD |
| GET/POST/PUT/DELETE | /api/admin/plans | Admin | Plan CRUD |
| GET/POST/PUT/DELETE | /api/admin/services | Admin | Service CRUD |
| GET/POST/PUT/DELETE | /api/admin/workshops | Admin | Workshop CRUD |
| GET/POST/PUT/DELETE | /api/admin/events | Admin | Event CRUD |
| POST | /api/admin/services/sync-official | Admin | Sync from catalog |
| POST | /api/admin/plans/sync-official | Admin | Sync official plans |

### 5.4 API Issues

1. /api/soma/catalog bypasses DB - returns hardcoded config
2. Duplicate endpoints - /api/public/services and /api/soma/catalog both serve service data
3. No unified offering endpoint - clients must call multiple endpoints
4. Course model lacks full CRUD in admin - uses generic crud() factory
5. No filtering/search on public APIs
6. No caching on /api/soma/catalog but /api/public/* has 5min cache
7. SOMA DAILY pricing override in Settings creates another source of truth

---

## 6. ADMIN DASHBOARD AUDIT

### 6.1 CRUD Matrix

| Entity | Create | Read | Update | Delete | Enable/Disable | Visibility | Featured | Tags | Display Order | Image | Pricing |
|--------|--------|------|--------|--------|---------------|------------|----------|------|--------------|-------|---------|
| Service | Yes | Yes | **No** | Yes | No | Yes | Yes (create only) | No | No | No | Yes (create only) |
| Course | Yes | Yes | Yes | Yes | Active/Draft | **No** | **No** | **No** | **No** | **No** | Yes |
| Plan | Yes | Yes | Yes | Yes | Toggle | Yes | Yes | **No** | Yes | **No** | Yes |
| Workshop | Yes | Yes | Yes | Yes | Publish/Archive | No | **No** | **No** | **No** | Yes | Yes |
| Event | Yes | Yes | Yes | Yes | Publish | No | **No** | **No** | **No** | Yes | No |
| Batch | Yes | Yes | **No** | Yes | No | No | No | No | No | No | No |
| Instructor | Yes | Yes | **No** | Yes | No | No | No | No | No | Avatar | No |

### 6.2 What Admin CANNOT Do Today

1. Cannot edit a Service - only create and delete; no update endpoint wired in the UI
2. Cannot edit an Instructor - only create and delete
3. Cannot edit a Batch - only create and delete
4. Cannot change a Course's visibility - only active/draft toggle
5. Cannot mark a Course as featured - no featured field
6. Cannot add tags to Courses or Plans - tags only exist on Service
7. Cannot manage images for most entities - only Workshop and Event have image fields
8. Cannot set display order for Courses - no displayOrder field
9. Cannot set start/end dates on any offering - no temporal visibility
10. Cannot set capacity on Plans or Services - only Workshop and ClassSession
11. Cannot control booking enable/disable per offering - only Workshop has isPublished
12. Cannot add "what's included" lists - no structured inclusion field
13. Cannot manage any frontend marketing page content - Classes, Private, LifeStages, Restore, YTTC are 100% hardcoded
14. Cannot change prices on the public website - prices are in siteContent.js (frontend code)
15. Cannot add new offering categories - categories are hardcoded strings
16. Cannot manage the "New Target Catalog" items - no admin UI for 15+ new offerings

### 6.3 Admin UI Quality Issues

- Service edit modal does not exist - creates only
- No inline editing
- No drag-and-drop reordering
- No bulk operations
- No price history/audit trail
- No preview of how changes look on the public site
- No confirmation dialog consistency

---

## 7. FRONTEND AUDIT

### 7.1 Page-by-Page Analysis

| Page | Route | Data Source | Hardcoded Prices | API Calls | Admin-Managed |
|------|-------|------------|-------------------|-----------|---------------|
| Home | / | Child components | Via children | 1 (SomaPricingPreview) | No |
| Classes | /classes | siteContent.js + inline | YES - discovery 3,000, passes 11K/21K | None | No |
| Private | /private | siteContent.js config | YES - 5,500 to 46,000 | None | No |
| LifeStages | /life-stages | siteContent.js + inline | YES - 7,000 to 22,000 + camps | None | No |
| Restore | /restore | siteContent.js + inline | YES - 1,800 to 32,000 | None | No |
| YTTC | /yttc | siteContent.js + inline | YES - 30,000 to 600,000 | None | No |
| Events | /events | /api/public/events | None | Yes (API) | Partially |
| About | /about | Inline | None | None | No |
| FAQ | /faq | siteContent.js | None | None | No |
| Contact | /contact | Inline | None | None | No |

### 7.2 Data Duplication Problem

The same pricing data exists in up to 4 places:

| Data Point | somaCatalog.js | siteContent.js | pricing.js | Component inline |
|------------|---------------|----------------|------------|-----------------|
| JUA monthly | 12,000 | 12,000 | 12,000 | - |
| Discovery | 3,000 | - | - | 3,000 (Classes.jsx:69) |
| Single class | 2,500 | - | - | - |
| 5-class pass | 11,000 | - | - | 11,000 (Classes.jsx:293) |
| 10-class pass | 21,000 | - | - | 21,000 (Classes.jsx:294) |
| Signature STILLNESS | 11,000 | 11,000 | - | 11,000 (Restore.jsx:18) |
| SOMA RESET | 32,000 | - | - | 32,000 (Restore.jsx:83) |

### 7.3 Frontend Component Issues

1. SomaPricingPreview.jsx has its own hardcoded memberships array that differs from siteContent.js
2. SomaExperiences.jsx has its own hardcoded experiences array that differs from siteContent.js
3. SomaMethod.jsx uses i18n while siteContent.js has the same data in English
4. No loading states on static pages (no shimmer/skeleton)
5. No error boundaries on most pages
6. No "Currently Unavailable" state for any offering
7. No "Coming Soon" / "Upcoming" state
8. No category filtering on any page
9. No search on any offering page

---

## 8. BOOKING + PAYMENT AUDIT

### 8.1 Purchase Flow

`
User clicks "Add to Cart" / "Pay Now"
    -> CheckoutGate (auth check)
        -> If unauthenticated: OTP verification -> auto-create account
        -> addToCart() or direct payment
    -> Cart: POST /api/student/cart/add
    -> Checkout: POST /api/student/cart/checkout
        -> Creates M-Pesa pending order
        -> POST /api/mpesa/stkpush (STK Push to phone)
        -> Polls /api/mpesa/query
        -> On success: async fulfillment
            -> Membership created (for Plan purchases)
            -> UserService created (for Service purchases)
            -> Workshop registration (for Workshop purchases)
            -> Course enrollment (for Course purchases)
    -> Notification sent
`

### 8.2 Cart Item Types

Supported itemType values: plan, service, course, workshop, consultation, yttc, book

### 8.3 Impact of Changing Offering Status

| Action | Impact on Bookings | Impact on Payments | Impact on Enrollments |
|--------|-------------------|-------------------|---------------------|
| Disable a Plan | New purchases blocked; existing members unaffected | Pending orders may fail | Active memberships continue until expiry |
| Disable a Service | New purchases blocked; existing enrollments unaffected | Pending orders may fail | Active UserService records continue |
| Change price | New purchases at new price; existing at old price | Already-paid orders unaffected | N/A |
| Delete a Service | 404 for new requests; references break in UserService | N/A | UserService records with deleted service = orphaned data |
| Hide a Service | Not shown on public pages; direct API still works | Pending orders may succeed | Existing enrollments unaffected |

### 8.4 Critical Risk

Deleting an offering breaks historical data. If a Service is deleted, all UserService records referencing it lose their denormalized data (serviceName, price, etc.). The UserService stores snapshots but the service ObjectId reference becomes dangling.

---

## 9. SECURITY AUDIT

### 9.1 Current Security Posture

| Aspect | Status | Details |
|--------|--------|---------|
| Auth on public APIs | OK | Public endpoints have no auth; user endpoints require JWT |
| Admin authorization | OK | Role hierarchy: admin -> manager -> reception -> student |
| Rate limiting | OK | 100 req/15min on /api |
| Input sanitization | OK | DOMPurify + NoSQL injection prevention |
| CORS | OK | Whitelist of allowed origins |

### 9.2 Security Concerns for Offering System

1. **Public API exposes too much** - /api/soma/catalog returns ALL pricing data including cost structures and internal tier logic
2. **No field-level authorization** - Admin can update any field on any entity; no distinction between catalog vs pricing vs visibility permissions
3. **No audit trail** - Price changes, visibility changes, and catalog modifications are not logged
4. **Frontend hidden vs backend enforced** - Currently, hiding an offering only works if the frontend respects the visibility field; direct API calls still expose data. /api/soma/catalog returns ALL data regardless of visibility.
5. **Service deletion risk** - No soft-delete; hard deletion breaks enrollment references

### 9.3 Required Security Improvements

1. Public API must filter by visibility status (public only)
2. Booking API must validate offering is active and available
3. Price changes should be logged with admin attribution
4. Soft-delete instead of hard-delete for all catalog entities
5. Admin APIs should require specific permissions for pricing changes
6. /api/soma/catalog must read from DB, not hardcoded config

---

## 10. CURRENT PROBLEMS

### 10.1 Data Integrity Problems

1. **Three separate pricing sources** - somaCatalog.js, siteContent.js, and pricing.js all define prices independently
2. **Price mismatches** - Single class is KES 2,500 in backend but KES 3,000 on frontend Classes page
3. **Inconsistent data models** - Service, Course, and Plan all represent "things to buy" but have different field sets
4. **Duplicated pricing in components** - SomaPricingPreview.jsx has its own hardcoded memberships array different from siteContent.js
5. **No single source of truth** - /api/soma/catalog returns hardcoded config, not database records

### 10.2 Admin Capability Gaps

1. Cannot edit a Service after creation
2. Cannot edit an Instructor after creation
3. Cannot edit a Batch after creation
4. Cannot manage Course visibility (only active/draft)
5. Cannot set display order for Courses
6. Cannot manage images for Plans, Services, Courses
7. Cannot set start/end dates for temporal offerings
8. Cannot manage "what's included" content
9. Cannot manage any marketing page content (Classes, Private, LifeStages, Restore, YTTC)
10. Cannot change public-facing prices without code changes

### 10.3 Frontend Problems

1. All offering pages except Events are 100% hardcoded
2. No "Currently Unavailable" state
3. No "Coming Soon" state
4. No category filtering
5. No search
6. No loading states on static pages
7. No error boundaries
8. Data inconsistency between SomaPricingPreview and siteContent.js
9. i18n keys for content but hardcoded prices = mixed approach

### 10.4 Architectural Problems

1. No unified "offering" entity across the system
2. Catalog config in JavaScript means price changes require code deploy
3. Frontend and backend have separate catalog files that can drift
4. /api/soma/catalog bypasses the database entirely
5. Service model is closest to a unified catalog but lacks many needed fields
6. No concept of "offering category" as a first-class entity
7. No concept of "package inclusions" as structured data

---

## 11. MISSING FEATURES

### 11.1 Database Level

| Feature | Status | Impact |
|---------|--------|--------|
| Unified offering model | Missing | 7 overlapping models for same concept |
| Offering categories as entities | Missing | Categories are hardcoded strings |
| Package inclusions | Missing | No "what's included" structured data |
| Start/end dates on offerings | Missing | Cannot plan upcoming offerings |
| Capacity on Plans/Services | Missing | Only Workshop/ClassSession have capacity |
| Booking enabled/disabled toggle | Missing | Only Workshop has isPublished |
| Gallery (multi-image) | Missing | Only single image on most models |
| Tags on Courses/Plans | Missing | Tags only on Service |
| Slug on Plans/Courses | Missing | Only Service has auto-slug |
| Display order on Courses | Missing | Only Plan and Service have it |
| Subtitle field | Missing | No subtitle on any model |

### 11.2 Admin Level

| Feature | Status | Impact |
|---------|--------|--------|
| Service edit modal | Missing | Can only create, not edit |
| Instructor edit modal | Missing | Can only create, not edit |
| Batch edit modal | Missing | Can only create, not edit |
| Image upload for Plans | Missing | No image field in admin UI |
| Image upload for Services | Missing | Image field exists but no upload UI |
| Image upload for Courses | Missing | No image field at all |
| Drag-and-drop reordering | Missing | No visual reordering |
| Bulk operations | Missing | No bulk enable/disable/delete |
| Price change history | Missing | No audit trail |
| Public site preview | Missing | No way to preview changes |
| Category management | Missing | Categories are hardcoded |
| Offering template/duplicate | Partial | Only Course and Plan have duplicate |

### 11.3 Frontend Level

| Feature | Status | Impact |
|---------|--------|--------|
| API-driven offering pages | Missing | All pages are hardcoded |
| Category filtering | Missing | No way to filter offerings |
| Search | Missing | No search functionality |
| "Currently Unavailable" state | Missing | No indication when offering is unavailable |
| "Coming Soon" state | Missing | No upcoming offering support |
| Loading states (skeleton) | Missing | No visual loading feedback |
| Error boundaries | Missing | No graceful error handling |
| Mobile-optimized pricing tables | Missing | Tables are desktop-oriented |
| Dynamic pricing display | Missing | Prices come from code, not API |

---

## 12. HARDCODED DATA

### 12.1 Backend Hardcoded Data

| File | Lines | Content |
|------|-------|---------|
| server/config/somaCatalog.js | ~500 | All membership tiers, pricing, passes, private rates, life stages, massage treatments, signatures, academy, corporate, DAILY, fees, retail, 47 SOMA_SERVICES |
| server/seed.js | ~450 | Plan records (duplicated from catalog), Course records, Batch records, Workshop records, demo users, demo data |
| server/seed-services.js | ~30 | Service records from somaCatalog.js |
| server/controllers/cartController.js | ~20 | YTTC pricing hardcoded: online=35K, hybrid=45K |
| server/utils/serviceHelpers.js | ~10 | SINGLE_SESSION_NAMES list |

### 12.2 Frontend Hardcoded Data

| File | Lines | Content |
|------|-------|---------|
| src/config/siteContent.js | 269 | All membership prices, pay-ahead, founding, private, life stages, restore, signatures, academy, corporate, DAILY, FAQs, testimonials, journal |
| src/lib/pricing.js | ~100 | Membership prices, founding rates, pay-ahead matrix, surcharge logic |
| src/components/soma/SomaPricingPreview.jsx | ~30 | Duplicate memberships array with different data |
| src/components/soma/SomaExperiences.jsx | ~20 | Duplicate experiences array |
| src/pages/Classes.jsx | ~40 | Class time slots, discovery price, pass prices, founding display |
| src/pages/Private.jsx | ~10 | Testimonials, fine print |
| src/pages/LifeStages.jsx | ~15 | Holiday camp prices, safety cards |
| src/pages/Restore.jsx | ~25 | Signature prices, reset price, gift voucher amounts |
| src/pages/YTTC.jsx | ~20 | Faculty list, curriculum steps (duplicated), corporate text |

### 12.3 Price Locations Summary

A single price change (e.g., changing JUA from 12,000 to 13,000) would require editing:

1. server/config/somaCatalog.js (MEMBERSHIP_TIERS.JUA.monthly)
2. server/seed.js (OFFICIAL_PLANS and seedSomaPlans)
3. src/config/siteContent.js (MEMBERSHIPS[0].price)
4. src/lib/pricing.js (JUA.monthly)
5. src/components/soma/SomaPricingPreview.jsx (memberships[0].price)
6. src/pages/Classes.jsx (references via siteContent but also inline)
7. i18n translation files (if prices appear in translations)
8. Run seed-services.js to re-sync database

This is completely unmanageable.

---

## 13. RECOMMENDED DATABASE CHANGES

### 13.1 Option A: Unified Offering Model (Recommended)

Create a new Offering model that consolidates Service, Course, and Plan catalog data:

`
Offering (collection: offerings)
  name: String (required)
  slug: String (auto-generated)
  subtitle: String
  description: String
  category: String (enum: group_yoga, membership, personal_training, meditation, corporate, therapy, mama, signature, academy, events)
  subcategory: String (for filtering within category)
  
  // Pricing
  price: Number
  originalPrice: Number (strikethrough)
  currency: String (default: KES)
  pricingModel: String (enum: flat, monthly, per_session, contact, package)
  
  // Package details
  sessions: Number (total sessions included)
  sessionDuration: Number (minutes)
  validityDuration: Number
  validityUnit: String (enum: days, weeks, months)
  
  // What's included
  whatIncluded: [String] (structured inclusions list)
  benefits: [String]
  
  // Display
  image: String
  gallery: [String]
  icon: String
  tags: [String]
  displayOrder: Number
  
  // Status
  active: Boolean (default: true)
  visibility: String (enum: public, private, hidden, draft, upcoming)
  bookingEnabled: Boolean (default: true)
  featured: Boolean (default: false)
  isPopular: Boolean (default: false)
  
  // Temporal
  startDate: Date (for upcoming offerings)
  endDate: Date (for limited-time offerings)
  
  // Capacity
  capacity: Number (0 = unlimited)
  
  // Metadata
  createdBy: ObjectId (ref User)
  updatedBy: ObjectId (ref User)
`

### 13.2 Option B: Extend Existing Service Model

If creating a new model is too risky, extend the Service model with missing fields:

Add to Service:
- subtitle, whatIncluded (structured), gallery, startDate, endDate, capacity, bookingEnabled, category (as enum), slug (already exists)

### 13.3 Recommended Approach

**Option A is strongly recommended** because:
1. Service, Course, and Plan have fundamentally different field sets
2. The target catalog mixes membership tiers, class passes, private sessions, experiences, and academy courses
3. A unified model eliminates the need for cart item type routing
4. It provides a single source of truth for the public API

### 13.4 Fields to Add Regardless

| Field | Type | Purpose |
|-------|------|---------|
| subtitle | String | "10 group yoga classes" subtitle under name |
| whatIncluded | [String] | Structured list of inclusions |
| gallery | [String] | Multiple images |
| startDate | Date | When offering becomes available |
| endDate | Date | When offering stops being available |
| capacity | Number | Max enrollments (0 = unlimited) |
| bookingEnabled | Boolean | Whether booking/purchase is allowed |
| category | String (enum) | Unified category system |
| tags | [String] | Filtering tags |
| slug | String | SEO-friendly URLs |

---

## 14. RECOMMENDED API CHANGES

### 14.1 New Public API

Replace /api/soma/catalog with a database-driven endpoint:

`
GET /api/public/offerings
  Query params: category, tag, featured, search, visibility=public
  Returns: filtered offerings from DB (not hardcoded config)

GET /api/public/offerings/:slug
  Returns: single offering detail
`

### 14.2 Modified Public APIs

| Current | Recommended | Why |
|---------|-------------|-----|
| /api/soma/catalog (hardcoded) | Remove or deprecate | Reads from config, not DB |
| /api/public/services | Replace with /api/public/offerings | Unified catalog endpoint |
| /api/public/courses | Merge into /api/public/offerings | Courses become a category |
| /api/public/plans | Merge into /api/public/offerings | Plans become a category |

### 14.3 New Admin API

`
GET    /api/admin/offerings       - List all offerings (with filters)
POST   /api/admin/offerings       - Create offering
PUT    /api/admin/offerings/:id   - Update offering
DELETE /api/admin/offerings/:id   - Soft-delete offering
PATCH  /api/admin/offerings/:id/toggle  - Toggle active/visibility
PATCH  /api/admin/offerings/:id/feature - Toggle featured
PATCH  /api/admin/offerings/:id/reorder - Update display order
`

### 14.4 API Security Requirements

1. Public API must only return visibility='public' offerings
2. Public API must check active=true and bookingEnabled=true for purchase-allowed flag
3. Admin API must require admin/manager role
4. Price changes must be logged with admin attribution
5. Soft-delete must set active=false and visibility='hidden', not remove record
6. Offering deletion must check for active enrollments before allowing

---

## 15. RECOMMENDED ADMIN CHANGES

### 15.1 New Admin Components Needed

| Component | Purpose |
|-----------|---------|
| OfferingsManagement.jsx | Unified CRUD for all offerings (replaces ServicesManagement + CoursesPlans) |
| OfferingEditor.jsx | Full-featured editor with all fields (name, subtitle, description, category, pricing, sessions, validity, inclusions, benefits, images, tags, visibility, availability, dates, capacity) |
| CategoryManager.jsx | Manage offering categories (add/edit/reorder) |
| OfferingPreview.jsx | Preview how offering looks on public site before publishing |

### 15.2 Admin Capabilities to Add

| Capability | Priority | Complexity |
|------------|----------|------------|
| Edit any offering | HIGH | Medium |
| Upload/manage images per offering | HIGH | Medium |
| Set visibility (public/private/hidden/draft/upcoming) | HIGH | Low |
| Set start/end dates | HIGH | Low |
| Enable/disable booking | HIGH | Low |
| Mark as featured | MEDIUM | Low |
| Set display order (drag-and-drop) | MEDIUM | High |
| Add tags | MEDIUM | Low |
| Manage "what's included" list | MEDIUM | Low |
| Bulk operations (enable/disable/delete) | LOW | Medium |
| Price change audit trail | LOW | Medium |
| Public site preview | LOW | High |

### 15.3 Migration Path

1. Create new Offering model and admin UI
2. Migrate existing Service records to Offering
3. Migrate existing Plan records to Offering (for catalog display only; keep Plan model for membership logic)
4. Migrate existing Course records to Offering
5. Update public API to read from Offering
6. Update frontend pages to consume new API
7. Deprecate somaCatalog.js and siteContent.js pricing data
8. Keep Membership, Booking, Appointment, UserService as transactional models

---

## 16. RECOMMENDED PUBLIC WEBSITE CHANGES

### 16.1 Pages to Convert to API-Driven

| Page | Current State | Target State |
|------|--------------|--------------|
| /classes | 100% hardcoded in siteContent.js + inline | Fetch from /api/public/offerings?category=group_yoga,membership |
| /private | 100% hardcoded in siteContent.js | Fetch from /api/public/offerings?category=personal_training |
| /life-stages | 100% hardcoded in siteContent.js + inline | Fetch from /api/public/offerings?category=mama |
| /restore | 100% hardcoded in siteContent.js + inline | Fetch from /api/public/offerings?category=signature,therapy |
| /yttc | 100% hardcoded in siteContent.js + inline | Fetch from /api/public/offerings?category=academy,corporate |
| Home (pricing) | Partially API-driven | Fetch all featured offerings |

### 16.2 New Components Needed

| Component | Purpose |
|-----------|---------|
| OfferingCard.jsx | Reusable card for displaying an offering |
| OfferingGrid.jsx | Grid layout with category filtering |
| OfferingDetail.jsx | Full detail page for a single offering |
| OfferingFilter.jsx | Category/tag filter controls |
| PriceDisplay.jsx | Consistent price formatting with strikethrough, badges |
| StatusBadge.jsx | "Available", "Currently Unavailable", "Coming Soon", "Limited" |
| InclusionsList.jsx | Structured display of "what's included" |
| PackageComparison.jsx | Side-by-side package comparison |

### 16.3 Design Recommendations

1. Each category page should fetch its offerings from the API
2. Cards should show: image, name, subtitle, price, status badge, CTA
3. Detail pages should show: full description, what's included, benefits, pricing, booking CTA
4. Add category navigation tabs on each page
5. Add "Currently Unavailable" overlay for hidden bookings
6. Add "Coming Soon" badge for upcoming offerings
7. Mobile-first responsive design for pricing tables

---

## 17. VISIBILITY/AVAILABILITY ARCHITECTURE

### 17.1 Current State

| Model | Visibility Field | Active Field | Booking Control |
|-------|-----------------|--------------|-----------------|
| Service | visibility (public/private/hidden) | active (boolean) | None |
| Course | None | active (boolean) | None |
| Plan | visibility (public/private/hidden) | active (boolean) | None |
| Workshop | None | isPublished (boolean) | None |
| Event | None | isPublished (boolean) | None |

### 17.2 Target Visibility States

| State | User Sees | Can Book | Admin Can Set |
|-------|-----------|----------|---------------|
| A. Visible + Available | Offering displayed normally | Yes | visibility=public, active=true, bookingEnabled=true |
| B. Visible + Currently Unavailable | Offering displayed with "Currently Unavailable" badge | No | visibility=public, active=true, bookingEnabled=false |
| C. Hidden / Disabled | Offering not on public website | No | visibility=hidden |
| D. Draft | Only visible to admins | No | visibility=draft |
| E. Upcoming | Offering displayed with "Coming Soon" badge | No (or pre-register) | visibility=public, startDate > now |

### 17.3 Recommended Implementation

Use a single isibility enum field with these values:

`
visibility: String
  enum: ['public', 'private', 'hidden', 'draft', 'upcoming']
  default: 'draft'
`

Plus these boolean flags:

`
active: Boolean (default: true)      - is the offering active in the system
bookingEnabled: Boolean (default: true) - can users purchase/book this
`

### 17.4 Backend Enforcement Rules

| Visibility | Public API | Booking API | Admin API |
|------------|-----------|-------------|-----------|
| public | Returns offering | Allows purchase | Shows in list |
| private | Returns offering | Allows purchase (if authorized) | Shows in list |
| hidden | Does NOT return | Rejects with 403 | Shows in list |
| draft | Does NOT return | Rejects with 403 | Shows in list |
| upcoming | Returns offering (with upcoming flag) | Rejects with "not yet available" | Shows in list |

### 17.5 Frontend Display Rules

| Visibility | Badge | CTA | Styling |
|------------|-------|-----|---------|
| public + active + bookingEnabled | None (normal) | "Book Now" / "Add to Cart" | Normal |
| public + active + !bookingEnabled | "Currently Unavailable" | Disabled button | Muted/grayed |
| public + active + startDate > now | "Coming Soon" | "Notify Me" or disabled | Highlighted |
| private | "Members Only" | "Join to Access" | Special |
| hidden | N/A (not rendered) | N/A | N/A |
| draft | N/A (not rendered) | N/A | N/A |

---

## 18. PREMIUM UX RECOMMENDATIONS

### 18.1 Design Principles

1. **Clear hierarchy** - Category > Offering > Details. One glance should tell the user what SOMA offers.
2. **Elegant typography** - Consistent type scale, premium serif for headings, clean sans-serif for body
3. **High-quality imagery** - Consistent aspect ratios, lazy loading, blur placeholders
4. **Clear pricing** - Large price with currency, strikethrough for original, "from X" for ranges
5. **Clear inclusions** - Checkmark lists for "what's included", not walls of text
6. **Clear package differences** - Side-by-side comparison for tiered offerings (JUA vs AMANI vs UZIMA)
7. **Status badges** - Consistent badge system: "Popular", "Featured", "New", "Limited", "Coming Soon"
8. **Strong CTA** - Primary action button always visible, secondary actions de-emphasized
9. **Mobile-first** - Pricing tables should stack on mobile, not scroll horizontally
10. **Minimal confusion** - One clear path from browsing to booking

### 18.2 Specific Recommendations

**Classes Page (Group Yoga)**
- Show 4 membership tiers as cards with clear feature comparison
- Show class passes below with per-class cost highlighted
- Show single class as "Try Us First" entry point
- Add schedule preview with available time slots

**Private Page**
- Show pricing in a clean table format
- Highlight "Members 15% off" prominently
- Show "What to expect" steps with icons
- Add therapist/instructor profiles

**Life Stages Page**
- Tabbed interface for MAMA / MAMA+ / YOUNG / AGE WELL
- Clear session block pricing (4 vs 8 sessions)
- Trust signals for parents/seniors prominently displayed

**Restore Page**
- Signature experiences as premium cards with imagery
- Treatment menu as clean table
- SOMA RESET as featured card with clear inclusions

**YTTC/Corporate Page**
- Academy courses as progression cards (Foundations -> 100 -> 200)
- Corporate as contact-focused with clear packages
- Faculty profiles with credentials

### 18.3 Component Recommendations

| Component | Purpose |
|-----------|---------|
| OfferingCard | Consistent card across all pages |
| PricingTable | Responsive pricing display |
| FeatureComparison | Side-by-side tier comparison |
| InclusionsList | Checkmark list of what's included |
| StatusBadge | Consistent badge across all states |
| TestimonialCard | Consistent testimonial display |
| CTABand | Consistent call-to-action section |
| FAQAccordion | Consistent FAQ display |

---

## 19. MIGRATION RISKS

### 19.1 High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing purchases | Cart/checkout fails for existing users | Run migration during low-traffic window; keep old models readable |
| Data loss on Service migration | 47 seeded services lose IDs | Copy _id to new Offering model; update all references |
| Price inconsistency during migration | Users see different prices on different pages | Deploy all changes atomically; do not leave partial state |
| Payment flow disruption | M-Pesa callbacks fail | Keep payment routes unchanged; only update catalog routes |
| Existing enrollment references break | UserService, Membership reference old model IDs | Add reference field mapping; support both old and new IDs during transition |

### 19.2 Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Frontend cache stale | Users see old prices after update | Add cache-busting to API responses; version the catalog API |
| i18n keys broken | Translations reference removed keys | Audit all i18n keys before removing any config |
| Admin session interruption | Admin editing when model changes | Do not change admin UI during active sessions |
| SEO impact | URLs change for offering pages | Implement 301 redirects for any URL changes |

### 19.3 Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Test failures | Existing tests reference old models | Update test fixtures before deployment |
| Seed data out of sync | seed.js creates records in old format | Update seed scripts to use new model |
| Documentation stale | API docs reference old endpoints | Update docs as part of migration |

### 19.4 Rollback Plan

1. Keep old models (Service, Course, Plan) in read-only mode during transition
2. Maintain dual-write: new Offering model + old model sync for 30 days
3. Feature flag: USE_UNIFIED_CATALOG=true/false to toggle between old and new
4. Database backup before any migration
5. Revert plan: restore old models from backup, revert frontend to siteContent.js

---

## 20. BACKWARD COMPATIBILITY CONCERNS

### 20.1 APIs That Must Not Break

| API | Used By | Breaking Change Risk |
|-----|---------|---------------------|
| POST /api/student/cart/add | Frontend checkout | itemType values must still work |
| POST /api/student/cart/checkout | Frontend checkout | Must still process plan/service/course/workshop |
| POST /api/mpesa/stkpush | Payment flow | No change needed |
| GET /api/soma/me/dashboard | Student dashboard | Must still return membership/pass data |
| POST /api/soma/appointments | Booking flow | Must still work with service references |
| GET /api/admin/* | Admin dashboard | Must still return data for existing UI |

### 20.2 Models That Must Not Change

| Model | Reason |
|-------|--------|
| Membership | Active subscriptions reference this; changing breaks billing |
| Booking | Legacy records; changing breaks history |
| Appointment | Active bookings reference this |
| UserService | Active enrollments reference this |
| SomaPass | Active passes reference this |
| Payment | Financial records; must not change |
| Order | Financial records; must not change |
| Cart/CartItem | Active carts during transition |

### 20.3 Fields That Must Not Change

| Field | Model | Reason |
|-------|-------|--------|
| user | Membership | References active subscribers |
| plan | Membership | References Plan model |
| service | UserService | References Service model |
| itemType | CartItem | Values: plan/service/course/workshop/consultation/yttc/book |
| itemId | CartItem | References various model IDs |
| price | Order/OrderItem | Financial records |
| total | Order | Financial records |

### 20.4 Transition Strategy

1. New Offering model is ADDITIVE - does not replace existing models
2. Existing Service/Course/Plan models remain for transactional references
3. New public API reads from Offering; old APIs continue to work
4. Admin UI transitions to Offering management; old CRUD remains available
5. Frontend transitions page by page; not all at once
6. Dual-write sync keeps Offering and old models in sync during transition

---

## 21. TESTING REQUIREMENTS

### 21.1 Existing Tests to Update

| Test File | Impact |
|-----------|--------|
| tests/unit/ | Any pricing tests reference hardcoded values |
| tests/integration/api.integration.test.jsx | API endpoint tests |
| tests/regression/ | Regression tests may reference old catalog |
| server/__tests__/ | Backend unit tests |

### 21.2 New Tests Needed

| Test Category | Tests |
|---------------|-------|
| Offering CRUD | Create, read, update, soft-delete, toggle visibility |
| Public API filtering | visibility=public only, category filter, tag filter |
| Booking validation | Cannot book hidden/draft offerings |
| Price consistency | Price in API matches price in cart matches price at checkout |
| Visibility states | public, private, hidden, draft, upcoming all behave correctly |
| Migration tests | Old Service records migrate to Offering correctly |
| Rollback tests | Feature flag toggle between old and new system |
| Admin authorization | Only admin/manager can modify offerings |
| Frontend rendering | OfferingCard renders correctly for all visibility states |

### 21.3 Test Strategy

1. Write tests for new Offering model BEFORE migration
2. Write tests for public API filtering BEFORE deployment
3. Write integration tests for booking flow with new model
4. Write regression tests to verify existing functionality unchanged
5. Run full test suite before each migration step
6. Use feature flags to test new system alongside old

---

## 22. TARGET SOMA CATALOG

### 22.1 GROUP YOGA

| # | Name | Subtitle | Price (KES) | Sessions | Duration | Validity |
|---|------|----------|-------------|----------|----------|----------|
| 1 | Single Class | One group yoga class - Single visit | 2,000 | 1 | 60 min | Single use |
| 2 | SOMA JUA 10-Class Pass | 10 group yoga classes | 11,500 | 10 | 60 min | 1 month |
| 3 | SOMA AMANI Monthly Pass | Unlimited group yoga + meditation + pranayama | 16,500 | Unlimited | - | 1 month |
| 4 | SOMA AMANI 6-Month Pass | Unlimited group yoga + meditation + pranayama | 75,500 | Unlimited | - | 6 months |
| 5 | SOMA AMANI Annual Pass | Unlimited group yoga + meditation + pranayama | 125,500 | Unlimited | - | 12 months |

### 22.2 WELLNESS MEMBERSHIPS

| # | Name | Subtitle | Price (KES) | Includes |
|---|------|----------|-------------|----------|
| 6 | SOMA UZIMA | | 22,500 | Unlimited yoga + 2 steam + 1 massage |
| 7 | SOMA 360 | | 32,000 | Unlimited yoga + 4 steam + 2 massage + 1 private session |

### 22.3 PERSONAL YOGA TRAINING

| # | Name | Price (KES) | Duration | Sessions |
|---|------|-------------|----------|----------|
| 8 | One-to-One Yoga | 4,500 | 60 min | 1 |
| 9 | Couple Yoga | 6,500 | 60 min | 1 |
| 10 | 5 Private Sessions - One-to-One | 21,000 | 60 min each | 5 |
| 11 | 5 Couple Yoga Sessions | 30,500 | 60 min each | 5 |
| 12 | 10 Private Sessions - One-to-One | 40,000 | 60 min each | 10 |
| 13 | 10 Couple Yoga Sessions | 58,000 | 60 min each | 10 |

### 22.4 MEDITATION & BREATHWORK

| # | Name | Price (KES) |
|---|------|-------------|
| 14 | Meditation Drop-In | 1,500 |
| 15 | Pranayama & Meditation | 1,500 |
| 16 | Yoga Nidra | 1,500 |
| 17 | 4-Session Meditation Program | 5,000 |
| 18 | Private Meditation Session | 4,000 |

### 22.5 CORPORATE WELLNESS

| # | Name | Price (KES) | Details |
|---|------|-------------|---------|
| 19 | SOMA Work Well Single Session | 13,500 | 60-min onsite yoga or mobility, up to 20 participants |
| 20 | SOMA Work Well Monthly | 45,000 | Four onsite sessions per month |

### 22.6 YOGA THERAPY

| # | Name | Price (KES) | Sessions |
|---|------|-------------|----------|
| 21 | Individual Yoga Therapy | 5,500 | 1 |
| 22 | Yoga Therapy 5 Sessions | 25,000 | 5 |
| 23 | Yoga Therapy 10 Sessions | 45,000 | 10 |

### 22.7 SOMA MAMA - WELLNESS FOR WOMEN

| # | Name | Price (KES) | Sessions |
|---|------|-------------|----------|
| 24 | Prenatal Yoga & Wellness | 5,500 | 1 |
| 25 | Prenatal Yoga & Wellness 5 Sessions | 25,000 | 5 |
| 26 | Prenatal Yoga & Wellness 10 Sessions | 45,000 | 10 |

### 22.8 SIGNATURE EXPERIENCES BY SOMA

| # | Name | Price (KES) | Includes |
|---|------|-------------|----------|
| 27 | SOMA AMANI - The Peace Experience | 8,500 | Restorative yoga + meditation + steam bath + 60-min Swedish massage + herbal tea |
| 28 | SOMA UZIMA - The Complete Wellness Journey | 13,500 | Consultation + private yoga + pranayama + steam bath + full-body massage + herbal tea |
| 29 | SOMA NURU - Glow From Within | 9,500 | Body scrub + steam bath + aromatherapy massage + short meditation + herbal tea |
| 30 | SOMA NGUVU - Strength & Recovery | 12,500 | Mobility assessment + therapeutic yoga + steam bath + deep tissue massage |
| 31 | SOMA UTULIVU - The Deep Calm Ritual | 8,000 | Pranayama + Yoga Nidra + Swedish massage + steam bath + herbal tea |
| 32 | SOMA RESET - The Mindful Body Reset | 6,000 | Yoga + breathwork + meditation + recovery + personalized guidance |

### 22.9 SOMA ACADEMY

| # | Name | Price (KES) | Details |
|---|------|-------------|---------|
| 33 | SOMA 200 | 130,000 | Yoga Teacher Training Course |

### 22.10 UPCOMING EVENTS / SESSIONS

Must remain a separate system/section from the permanent service catalog. Supports future workshops, events, and special sessions.

---

## 23. PROPOSED IMPLEMENTATION PLAN

### Phase 1: Foundation (Week 1-2)

| Task | Priority | Effort |
|------|----------|--------|
| Create Offering Mongoose model with all required fields | HIGH | 2h |
| Create Offering API routes (admin CRUD + public listing) | HIGH | 4h |
| Create admin OfferingManagement component | HIGH | 8h |
| Seed 33 target offerings to Offering collection | HIGH | 2h |
| Write tests for Offering model and APIs | HIGH | 4h |

### Phase 2: Public API (Week 3)

| Task | Priority | Effort |
|------|----------|--------|
| Create /api/public/offerings endpoint with filtering | HIGH | 3h |
| Add visibility/enforcement to public API | HIGH | 2h |
| Add caching to public offerings API | MEDIUM | 1h |
| Deprecate /api/soma/catalog (keep for backward compat) | MEDIUM | 1h |
| Write integration tests | HIGH | 3h |

### Phase 3: Frontend Conversion (Week 4-5)

| Task | Priority | Effort |
|------|----------|--------|
| Create OfferingCard, PriceDisplay, StatusBadge components | HIGH | 4h |
| Convert /classes page to API-driven | HIGH | 6h |
| Convert /private page to API-driven | HIGH | 4h |
| Convert /life-stages page to API-driven | HIGH | 4h |
| Convert /restore page to API-driven | HIGH | 4h |
| Convert /yttc page to API-driven | HIGH | 4h |
| Update Home page pricing preview | MEDIUM | 3h |

### Phase 4: Cart/Checkout Updates (Week 6)

| Task | Priority | Effort |
|------|----------|--------|
| Update cart to support unified offering type | HIGH | 4h |
| Update checkout flow for new offering structure | HIGH | 4h |
| Test payment flow end-to-end | HIGH | 4h |
| Maintain backward compatibility with old models | HIGH | 2h |

### Phase 5: Cleanup (Week 7)

| Task | Priority | Effort |
|------|----------|--------|
| Remove hardcoded data from siteContent.js | MEDIUM | 2h |
| Remove hardcoded data from pricing.js | MEDIUM | 2h |
| Deprecate somaCatalog.js pricing constants | MEDIUM | 1h |
| Update seed scripts to use Offering model | MEDIUM | 2h |
| Final testing and regression | HIGH | 4h |

### Total Estimated Effort: ~80-100 hours

### Critical Path

1. Offering model must be created first (Phase 1)
2. Public API must be ready before frontend conversion (Phase 2 before Phase 3)
3. Cart/checkout must support new model before full deployment (Phase 4)
4. Old system must remain functional until Phase 5 is complete

---

## 24. FINAL RECOMMENDED ARCHITECTURE

### 24.1 Target State Diagram

`
                    +-------------------+
                    |  Admin Dashboard  |
                    |  (CRUD UI)        |
                    +--------+----------+
                             |
                             v
                    +-------------------+
                    |   Offering Model  |  <-- Single source of truth
                    |   (MongoDB)       |      for all catalog data
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
              v                             v
+-------------------------+    +-------------------------+
|  Public API             |    |  Admin API              |
|  /api/public/offerings  |    |  /api/admin/offerings   |
|  (filtered by public)   |    |  (full CRUD)            |
+------------+------------+    +-------------------------+
             |
             v
+-------------------------+
|  Frontend Pages         |
|  /classes, /private,    |
|  /restore, /life-stages,|
|  /yttc (API-driven)     |
+------------+------------+
             |
             v
+-------------------------+
|  Cart / Checkout        |
|  (supports "offering"   |
|   item type)            |
+------------+------------+
             |
             v
+-------------------------+
|  Payment (M-Pesa)       |
|  + Fulfillment          |
|  (Membership, UserService,|
|   Workshop enrollment)  |
+-------------------------+
`

### 24.2 What Stays the Same

| Component | Reason |
|-----------|--------|
| Membership model | Active subscriptions reference it; billing logic depends on it |
| UserService model | Active enrollments reference it; session tracking depends on it |
| Booking model | Legacy records; historical data |
| Appointment model | Active bookings; scheduling depends on it |
| SomaPass model | Active passes; class tracking depends on it |
| Payment/Order models | Financial records; must not change |
| Cart/CartItem models | Active carts; must support new item type |
| M-Pesa payment flow | Working correctly; no changes needed |
| Auth system | Working correctly; no changes needed |
| Notification system | Working correctly; no changes needed |

### 24.3 What Changes

| Component | Change | Impact |
|-----------|--------|--------|
| New: Offering model | Single catalog entity | Replaces Service/Course/Plan for catalog display |
| New: /api/public/offerings | Database-driven public API | Replaces /api/soma/catalog hardcoded endpoint |
| New: /api/admin/offerings | Full CRUD admin API | Replaces partial Service/Course/Plan CRUD |
| New: Admin OfferingManagement | Full-featured admin UI | Replaces ServicesManagement + CoursesPlans for catalog |
| Modified: Cart item types | Add "offering" type | Supports unified checkout |
| Modified: /classes page | API-driven | No more hardcoded prices |
| Modified: /private page | API-driven | No more hardcoded prices |
| Modified: /life-stages page | API-driven | No more hardcoded prices |
| Modified: /restore page | API-driven | No more hardcoded prices |
| Modified: /yttc page | API-driven | No more hardcoded prices |
| Deprecated: somaCatalog.js | Keep for reference only | Pricing logic moves to DB |
| Deprecated: siteContent.js | Remove pricing data | Content moves to Offering model |

### 24.4 Key Design Decisions

1. **Unified Offering model** - One model for all purchasable/bookable items, regardless of type
2. **Category-based organization** - Categories are enum values, not separate entities (simpler for 33 items)
3. **Visibility enum** - public/private/hidden/draft/upcoming covers all states
4. **Soft-delete** - Never hard-delete catalog items; use active=false + visibility=hidden
5. **Backward compatibility** - Old models remain for transactional references; new model for catalog
6. **Feature flag** - Toggle between old and new system during transition
7. **Events stay separate** - Events/Workshops remain their own models (temporal, date-based)

### 24.5 Success Criteria

1. Admin can create/edit/delete any of the 33 offerings without code changes
2. Admin can change prices, visibility, images, descriptions from the dashboard
3. Public website shows real-time data from the database
4. "Currently Unavailable" state works correctly
5. "Coming Soon" state works correctly
6. Existing purchases and enrollments are not affected
7. Payment flow continues to work correctly
8. No price mismatches between backend and frontend
9. Page load times do not degrade (caching strategy in place)
10. All existing tests pass

---

## END OF AUDIT

This audit is based on the actual repository code. No code was modified during this audit.
