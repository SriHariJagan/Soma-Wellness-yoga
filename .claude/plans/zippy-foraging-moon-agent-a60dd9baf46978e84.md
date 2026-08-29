# Plan: Attractive Admin + Fully Responsive (Mobile/Tab)

## Context
User report after login (`admin@yoga.com / Admin@123`, `priya@yoga.com / Student@123`): admin dashboard looks dated / orange-green clash, and **all basic webpages + admin break on tablet (768-1024) and mobile (<640)**. Exploration confirms:

**Admin** (`src/components/Admin/YogaAdmin.module.css:7-57, 83-400, 1346-1385`):
- Tokens scoped to `.shell` clash with global `src/styles/design-tokens.css:7` (`--soma-primary #2E7D5B`, `--soma-forest #183D2D`, `--soma-gold #F4B400`). Sidebar logo/QuickCreate hardcode `#F97316` orange (30+ occurrences) vs primary green, typography `Outfit/Inter` vs global `Cormorant Garamond/DM Sans`.
- Only 4 breakpoints (1200/900/768/520), missing `1024` tablet-landscape, `480/375` small-mobile. Sidebar `274px` fixed → `290px` drawer at `768` (77% of iPhone SE). `topSearch` hidden at `900` with no fallback, `popover 320px` overflows `<360px`, `statsGrid 4→2 at 1200` too early, inline `gridTemplateColumns: repeat(4,1fr)` in `WorkshopManagement.jsx:268`, `StudentsHistory.jsx:124` bypass media queries, `BookManagement/StoreOrders/BulkEnquiries/WhatsAppPanel` have **0 media queries**, inputs `13px` trigger iOS zoom, cards `22px` padding too tight on `320px`.

**Public pages** (`src/pages/About.jsx:48,153`, `Classes.jsx:44,85,209`, `YTTC.jsx:36`, `LifeStages.jsx:89`, `Restore.jsx:51`, `Contact.jsx:184` etc):
- Most layouts use inline `style={{gridTemplateColumns:...}}` (`0.95fr 1.05fr`, `360px 1fr`, `repeat(4,1fr)`, `1fr 80px 90px`) which **bypass CSS**; only some pages add fragile `div[style*="gridTemplateColumns"]` hack at `900px`, missing for `repeat(3,4)`.
- Fixed heights `520px/480px` images, `340px` orbs, `560px` blobs, `body{overflow-x:hidden}` masks overflow instead of fixing. `Books`, `LandingPage` better (auto-fill), but `Classes` (5 grids), `About` Values/Timeline `repeat(3,1fr)` stay 3-col on mobile.
- `Navbar` `960`/`480`, `Footer` `1024`/`640`, `Hero` `1024/768/480` are decent; but no `768-1024` tablet tuning, so iPad portrait squashes 3-4col grids.

## Goals
1. **Admin attractiveness**: unify to SOMA organic-luxury palette, premium glass/gloss, consistent elevation, subtle motion, cohesive typography.
2. **Full responsiveness**: flawless `320, 375, 480, 640, 768, 900, 1024, 1200, 1440` - no horizontal scroll, no clipped content, touch-friendly.
3. **No functional regressions**: keep `YogaAdmin.jsx:110` 24 tabs, `loadAll`, `AdminQueryProvider`, all lazy tabs.

## Design Decisions

### A. Color Theme Unification (Admin)
- **Primary**: `--c-primary: var(--soma-primary) #2E7D5B` (keep), `--c-primary-2: var(--soma-sage) #81B29A`, **remove `#F97316` orange** → replace with `--soma-gold #F4B400` or `--soma-orange #FF7A00` only as accent.
- **Secondary accent**: `soma-gold` for `QuickCreate`, `popularBadge`, `statOrange` → warm gold, not orange.
- **Neutrals**: `--bg-app: #FAF6EC` (align with body `#FAF6EC`), `--surface: #FFFFFF`, `--text-1: var(--soma-forest) #183D2D`, `--text-2: var(--soma-warm-gray) #6B7D74`, `--line: var(--soma-line)`.
- **Typography**: `font-display: var(--font-display) Cormorant Garamond` for titles, `font-body: var(--font-body) DM Sans` for UI - match public pages.
- **Elevation**: reuse `design-tokens.css:119-141` gloss shadows (`--shadow-glossy-card`, `--shadow-glossy-hover`) instead of flat `sh-sm`. Add `1px` top highlight `linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)` on cards.
- **Attractive touches** (subtle, not gimmicky):
  - Sidebar: `glass-premium` blur 24px, subtle `radial-gradient` at top, `QuickCreate` gold glossy gradient + shimmer on hover.
  - Stat cards: `::after` 3px gold/green line + `icon` in soft circle + hover lift `translateY(-4px)` + `shadow-glossy-card-hover`.
  - Tables: sticky header with `backdrop-filter`, row hover `surface-3`, `badge` with dot.
  - Drawers/modals: `92vw → 100%` at `520px`, `overscroll-behavior:contain`, body scroll lock for sidebar.
- **No dark mode** in scope; keep light premium.

### B. Admin Responsiveness Plan
**Breakpoints**: `1200, 1024, 900, 768, 640, 520, 480, 375` (add `1024` tablet-landscape, `640` tablet-portrait, `480/375` small).
- **Shell/Sidebar** (`YogaAdmin.module.css:60`):
  - `1024`: collapse to `80px` icons (`.shellCollapsed`) or overlay drawer (`transform: translateX(-110%)`) - choose overlay at `≤1024` to save 274px. `sidebar` `min(290px, 86vw)` not fixed 290px.
  - `768`: already drawer, improve `backdrop` `z-index` scale, add `body {overflow:hidden}` when `mobileOpen`.
  - `gridDash 1.6fr 1fr` → `1fr` at `1024` not `1200`, `statsGrid 4→2 at 1024`, `2→1 at 640`.
- **Topbar** (`YogaAdmin.module.css:414`):
  - Keep `topSearch` visible until `768` (not `900`), collapses to icon-button that expands. `popover` `width:min(320px,92vw)` + `right:8px` at `<640`.
  - `topbar` `gap` wraps, `topCreate` label hidden at `640` not `768`, `topProfileMeta` hidden at `520` kept.
- **Tables** (`YogaAdmin.module.css:837`, `BookManagement.module.css`, `StoreOrders.module.css`, `BulkEnquiries.module.css`):
  - All `tableWrap` add `-webkit-overflow-scrolling:touch`, `scrollbar-width:thin`, sticky first-col shadow hint. `th` `position:sticky top:0` inside scroll container.
  - Override inline `repeat(4,1fr)` grids: add CSS classes `.kpiGrid {grid-template-columns:repeat(4,1fr)}` with `1024→2`, `640→1`.
- **Forms**: global `input font-size:16px` at `≤768` to prevent iOS zoom, `field` gap `flex-wrap`, `stockEdit 70px→44px min-height`, `coverUpload` stacks at `640`.
- **Modals/Drawers**: unify `modalBox width:min(420px,92vw)`, `BookManagement modal min(720px,92vw)`, `BulkEnquiries 620→92vw`, `Shipping 760→92vw`. `drawer 460→92vw`, `drawerWide 640→92vw`, `WorkshopStatsDrawer 760→92vw`. Add `overscroll-behavior:contain`.
- **Islands with 0 MQ**: add `BookManagement.module.css:head {flex-wrap:wrap}`, `filterBar/toolbar {flex-wrap:wrap}`, `statsRow auto-fit minmax(140px,1fr) at 640→1fr`, `WhatsAppPanel max-width:500px width:100%`.

### C. Public Pages Responsiveness Plan
**Strategy**: replace inline `gridTemplateColumns` with CSS-module classes + proper media queries; keep `design-tokens.css:254` `.container` fluid, add `1024/768/640/480` per page.

- **Global**: `src/styles/design-tokens.css:605` add `@media (max-width:1024){.container{padding:0 clamp(20px,3vw,32px)}}` + `@media (max-width:640){.section{padding: clamp(48px,8vw,72px) 0}}` + `img {max-width:100%}` already OK.
- **Per-page CSS extraction** (avoid `div[style*="gridTemplateColumns"]` hack):
  - `About.jsx:48` `0.95fr 1.05fr` → `.aboutHero {grid:0.95fr 1.05fr}` with `1024→1fr`, `Values repeat(3,1fr)` → `1024→2`, `640→1`, `Timeline repeat(3,1fr)` → `900→1`, image heights `520px→auto at 768`, `min-height: clamp(360px,50vh,520px)`.
  - `Classes.jsx:44` `360px 1fr` → `.tryUs {grid:360px 1fr}` `768→1fr`, `repeat(4,1fr)` memberships `1024→2, 640→1`, `150px repeat(4,1fr)` pay-ahead wrap to `overflow-x:auto` with `table` min-width + scroll, `Founding repeat(4,1fr)` same.
  - `YTTC.jsx:36` `1.4fr 0.9fr` + faculty `repeat(3,1fr)` `1024→2, 640→1`, curriculum `1.15fr 0.85fr` `900→1fr`.
  - `Private.jsx`, `Restore.jsx`, `LifeStages.jsx`, `FoundingMembers.jsx`: all `repeat(4,1fr)` / `repeat(3,1fr)` / `1fr 1fr` → `1024→2, 640→1`, pricing table `1fr 80px 90px` → stack at `640` (name full width, length/price right-aligned on new row or `grid:1fr` with flex row).
  - `Contact.jsx:184` gallery `1fr 1fr 1fr` `640→1fr` (stack), already has `Contact.css:1024,640` for main grids - extend to gallery.
  - `LandingPage.css:126,134,323,438` fixed orbs `340/280/48/380px` → `clamp(180px,28vw,340px)` or `display:none at 640`, hero `88vh` → `auto` with `min-height: clamp(480px,92vh,720px)`.
  - `Books.module.css:77` `220px` cover → `clamp(160px,28vw,220px)`, `SomaTeam 4→2 at 1024, 2→1 at 560` already OK, extend `SomaExperiences 960→1fr` to `1024`.
  - `Navbar.module.css:960` hamburger OK, add `1024` intermediate `gap 8px→4px, padding 8px 10px` to prevent wrap, `Footer.css:1024,640` OK - add `768` tweak for `footer-logo 64→56`.
  - `OrderTracking.module.css:26` `560px` circle → `min(560px,90vw)` with `overflow:hidden` parent.

- **Inline style migration**: for each `style={{gridTemplateColumns:...}}`, create class in co-located `.module.css` or shared `src/styles/responsive-grids.css` and replace JSX. Keep fallback for legacy but override with `!important` only during transition if needed.

## Implementation Phases

### Phase 1 - Admin Theme Attractiveness (1-2 days)
- **Files**: `src/components/Admin/YogaAdmin.module.css:7-57` (tokens), `src/styles/design-tokens.css:7-33` (reference, no churn), `src/components/Admin/Sidebar.jsx`, `Topbar.jsx`
- **Changes**:
  - Replace `--c-primary` scope to use `var(--soma-*)`, replace `#F97316` with `var(--soma-gold)`/`--soma-orange`, update `sbLogoIcon`, `sbQuickCreate`, `sbNavActive`, `av0-av5` gradients.
  - Typography `Outfit→ Cormorant Garamond/DM Sans`.
  - Add `glass-premium`, `shimmer` hover, `shadow-glossy-card`, top highlight.
  - Unify `statCard::after` colors to gold/green/sage, `icon` soft backgrounds.
- **Verify**: `npm run dev`, login `admin@yoga.com`, compare Dashboard/Kanban/cards hover, check no regression in 24 tabs.

### Phase 2 - Admin Full Responsiveness (2-3 days)
- **Files**: `YogaAdmin.module.css:1346-1424` (main MQ), `BookManagement.module.css`, `StoreOrders.module.css`, `BulkEnquiries.module.css`, `ShippingManagement.module.css`, `WhatsAppPanel.css`, `StudentsHistory.jsx`, `WorkshopManagement.jsx`, `DashboardInsights.jsx`, `PipelineCRMLeads.jsx`, etc.
- **Changes**:
  - Add `1024,640,480,375` breakpoints, `sidebar min(290px,86vw)`, `body scroll lock` in `YogaAdmin.jsx:63`.
  - Replace inline `repeat(4,1fr)` with `.kpiGrid` classes + MQs, `tableWrap` enhancements, `topSearch` fallback, `popover min(320px,92vw)`, `modal/drawer 92vw` unify, `input 16px at 768`, `card padding 22→16 at 520`.
- **Verify**: responsive devtools `375,768,820,1024,1280`, test tables horizontal scroll, drawer/modal no clip, iOS input no zoom.

### Phase 3 - Public Pages Full Responsiveness (3-4 days)
- **Files**: `src/pages/About.jsx + About.module.css` (create), `Classes.jsx + Classes.module.css`, `YTTC.jsx`, `Private.jsx`, `Restore.jsx`, `LifeStages.jsx`, `FoundingMembers.jsx`, `Contact.jsx + Contact.css`, `LandingPage.css`, `Books.module.css`, `OrderTracking.module.css`, `Hero.module.css`, `Soma*.module.css`, `Navbar.module.css`, `Footer.css`, new `src/styles/responsive-grids.css` (shared helpers).
- **Changes**:
  - Extract inline grids to classes, add `1024→2, 640→1` for all `repeat(3,4,1fr)`, `768→1fr` for `0.95fr 1.05fr` etc., `clamp` for fixed heights/widths, `overflow-x:auto` wrappers for pay-ahead table and gallery, `560px` circle clamp.
- **Verify**: every public page (`/`, `/about`, `/classes`, `/restore`, `/private`, `/life-stages`, `/yttc`, `/founding`, `/contact`, `/books`, `/order-tracking`, 15 landing slugs) at `375,768,1024` - no hidden overflow, no 4-col squish, images `object-fit:cover` height auto.

### Phase 4 - Polish & Regression (0.5 day)
- Add `prefers-reduced-motion` guards for admin transitions (`pageIn`, `shimmer`, `spin`), `container` queries optional, `aria-label`/`scope` for tables (a11y).
- Run `npm run build` (vite), `npm test` (jest), manual click-through `yogaadmin` 24 tabs, `studentdashboard`, public nav, Razorpay/M-Pesa not touched.

## Risks & Mitigations
- **Risk**: Replacing inline `style` grids breaks existing `@media div[style*="gridTemplateColumns"]` hacks. **Mitig**: keep hacks as fallback, add new classes with higher specificity, test `About`/`YTTC` first.
- **Risk**: `body {overflow-x:hidden}` hides overflow → missed bugs. **Mitig**: temporarily set `overflow-x:auto` during QA to surface clipping.
- **Risk**: Sidebar `1024` collapse changes muscle memory for desktop admins. **Mitig**: keep `collapsed` toggle visible at `1024`, default expanded at `>1024`, overlay only at `≤1024` if user prefers - make it `sticky→fixed` transition smooth `0.32s`.
- **Risk**: Gold vs green color shift too strong. **Mitig**: use `gold` only for CTA/accents, keep `green` primary, preview with screenshots before merge.
- **Risk**: Many files (46 admin + 20 pages) → large diff. **Mitig**: phase PRs, keep `design-tokens.css` as source of truth, no token duplication.

## Verification Plan
1. **Automated**: `npm run build` passes, `npm test` (317 tests per `docs/SOMA_README.md:77`) green.
2. **Manual responsive**: Chrome DevTools `375 (SE), 390 (12), 768 (iPad portrait), 820 (Air), 1024 (iPad landscape), 1280, 1440` - screenshot each phase.
3. **Admin deep dive**: login `admin@yoga.com / Admin@123` → cycle all 24 `NAV_ITEMS` tabs, test `Quick Create`, tables scroll, modals/drawers, `mobileOpen` backdrop, topbar search/popovers.
4. **Public pages**: `npm run dev` → visit all routes in `src/App.jsx:92-232`, check `Navbar` hamburger at `960`, `Footer` 4→2→1, no horizontal scroll on `Classes` pay-ahead, `About` Values timeline stacks.
5. **Perf/a11y**: `prefers-reduced-motion` off, `Lighthouse` mobile score, `WCAG` tap targets `44px`.

## Out of Scope (Requires Separate Plan)
- Dark mode, print styles, container queries, backend `server/` changes, payment gateways, `api/admin/*` logic, image optimization (`sharp`).

## Next Step
Ask user: approve this plan? If yes, start Phase 1 by editing `YogaAdmin.module.css:7` tokens + `Sidebar.jsx`/`Topbar.jsx` (attractive theme), then Phase 2/3 responsiveness. If prefers different accent (keep orange vs gold vs sage), adjust token mapping before coding.
