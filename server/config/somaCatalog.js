// ============================================================
// server/config/somaCatalog.js — SOMA Wellness Center
// Single source of truth for all KES VAT-inclusive pricing.
// All prices are configurable data — not hardcoded in UI.
// "Proposed launch prices, subject to management approval"
// ============================================================

export const CURRENCY = 'KES';
export const VAT_INCLUDED = true;
export const LOCATION = 'Spring Valley, Nairobi';

// ── Membership tiers (each includes previous tier + more) ──
export const MEMBERSHIP_TIERS = {
  JUA: {
    key: 'JUA',
    label: 'SOMA JUA',
    tagline: 'Move · Energise · Shine',
    monthly: 12000,
    allowances: { groupYogaClasses: 8 },
    discountOnOtherServices: 0,
    includes: ['8 group yoga classes/month', 'member rates on everything else'],
  },
  AMANI: {
    key: 'AMANI',
    label: 'SOMA AMANI',
    tagline: 'Move into balance',
    monthly: 18500,
    allowances: { groupYogaClasses: Infinity, meditationClasses: Infinity },
    includesDaily: true,
    discountOnOtherServices: 0,
    includes: ['Unlimited group yoga', 'Meditation & breathwork', 'SOMA DAILY included', 'member rates on everything else'],
  },
  UZIMA: {
    key: 'UZIMA',
    label: 'SOMA UZIMA',
    tagline: 'Yoga and recovery, complete',
    monthly: 28500,
    allowances: { groupYogaClasses: Infinity, meditationClasses: Infinity, massages60: 2, privateSessions: 1, guestPasses: 2 },
    includesDaily: true,
    priorityBooking: true,
    discountOnOtherServices: 0.15,
    includes: ['Unlimited yoga & meditation', 'SOMA DAILY included', '2×60-min massages/mo', '1 private yoga/therapy session/mo', 'priority booking', '2 guest passes', '15% off everything else'],
  },
  FAMILY: {
    key: 'FAMILY',
    label: 'SOMA FAMILY',
    tagline: 'One household, one plan',
    monthly: 35000,
    allowances: { groupYogaClasses: Infinity, meditationClasses: Infinity, familyAdults: 2, childrenPrograms: 1 },
    includesDaily: true,
    discountOnOtherServices: 0.10,
    includes: ['2 adults unlimited yoga', "1 children's/teen programme", 'Meditation & breathwork', 'SOMA DAILY included', '10% off everything else'],
  },
};

// Pay-ahead terms: discount applies to base monthly × months
export const PAY_AHEAD_TERMS = [
  { months: 1, discountPct: 0, label: 'Monthly' },
  { months: 3, discountPct: 0.10, label: '3 months' },
  { months: 6, discountPct: 0.15, label: '6 months' },
  { months: 12, discountPct: 0.25, label: '12 months' },
];

// Explicit pay-ahead totals from spec (VAT-inclusive, already discounted)
export const PAY_AHEAD_PRICING = {
  JUA:    { 1: 12000, 3: 32000, 6: 61000, 12: 108000 },
  AMANI:  { 1: 18500, 3: 49500, 6: 94000, 12: 166500 },
  UZIMA:  { 1: 28500, 3: 76500, 6: 145000, 12: 256500 },
  FAMILY: { 1: 35000, 3: 94500, 6: 178500, 12: 315000 },
};

// Founding rates (held 12mo)
export const FOUNDING_MONTHLY = {
  JUA: 10000,
  AMANI: 15000,
  UZIMA: 24000,
  FAMILY: 28500,
};
export const FOUNDING_SAVINGS_PCT = {
  JUA: 17,
  AMANI: 19,
  UZIMA: 16,
  FAMILY: 19,
};
export const FOUNDING_CAP = 100;
export const FOUNDING_WINDOW_DAYS = 90;
export const FOUNDING_LOCK_MONTHS = 12;

// Trial / drop-in
export const TRIAL = {
  DISCOVERY: { label: 'SOMA DISCOVERY', days: 7, unlimitedYoga: true, price: 3000, newClientsOnly: true },
  SINGLE_CLASS: { label: 'Single class', price: 2500 },
};

// Passes (no membership) — expiry from first use (activated_at)
export const CLASS_PASSES = {
  FIVE:  { label: '5 classes', classes: 5, perClass: 2200, price: 11000, expiryWeeks: 6 },
  TEN:   { label: '10 classes', classes: 10, perClass: 2100, price: 21000, expiryMonths: 3 },
};

// Fees & add-ons
export const FEES = {
  REGISTRATION: 3000,
  REGISTRATION_WAIVED_IF_MONTHS_GTE: 3,
  GUEST_PASS: 1500,
  MAT_HIRE: 200,
  TOWEL: 300,
};

// SOMA DAILY digital subscription
export const SOMA_DAILY = {
  MONTHLY: 1500,
  ANNUAL: 15000,
  includedWith: ['AMANI', 'UZIMA', 'FAMILY'],
  content: {
    weeklyPodcast: true,
    dailyReflection: true,
    monthlyGuidedAudio: true,
    seasonalNotes: true,
  },
};

// One-to-One
export const PRIVATE_RATES = {
  THERAPY_ASSESSMENT: { label: 'Therapy assessment', durationMin: 75, price: 6500, requiredBeforeTherapy: true },
  SINGLE:             { label: 'Single private session', durationMin: 60, price: 5500 },
  FIVE_PACK:          { label: '5-session package', sessions: 5, durationMin: 60, price: 25000 },
  TEN_PACK:           { label: '10-session package', sessions: 10, durationMin: 60, price: 46000 },
  TWO_PEOPLE:         { label: 'Two people together', durationMin: 60, price: 8000, pax: 2 },
  SMALL_GROUP:        { label: 'Small group (3–5)', durationMin: 60, price: 9500, paxMin: 3, paxMax: 5 },
  HOME_HOTEL:         { label: 'At home/hotel', durationMin: 60, priceFrom: 9500, quoteBased: true },
};
export const PRIVATE_MEMBER_DISCOUNT = 0.15;

// Life Stages blocks
export const LIFE_STAGES = {
  MAMA:     { label: 'SOMA MAMA', for: 'Pregnancy', four: 12000, eight: 22000 },
  MAMAPLUS: { label: 'SOMA MAMA+', for: 'After birth', four: 11500, eight: 21000 },
  YOUNG:    { label: 'SOMA YOUNG', for: 'Children & teens 5–17', four: 7000, eight: 12000, ageGrouping: true },
  AGEWELL:  { label: 'SOMA AGE WELL', for: 'Seniors', four: 7000, eight: 12000 },
};
export const LIFE_STAGES_EXTRAS = {
  SINGLE_PREGNANCY: { label: 'Single pregnancy class', price: 3500 },
  PRIVATE_PREGNANCY: { label: 'Private pregnancy session 60min', price: 5500 },
  CAMP_3D: { label: 'School holiday camp 3 days (5–12)', price: 9000 },
  CAMP_5D: { label: 'School holiday camp 5 days (5–12)', price: 14000 },
};

// Restore
export const MASSAGE_TREATMENTS = {
  RELAXATION:   { label: 'Relaxation massage', durationMin: 60, price: 5500 },
  AROMATHERAPY: { label: 'Aromatherapy massage', durationMin: 60, price: 6000 },
  DEEP_TISSUE:  { label: 'Deep tissue / sports massage', durationMin: 60, price: 6500 },
  SHORT:        { label: 'Short treatment (head & shoulders, or feet)', durationMin: 30, price: 3000 },
  SCRUB:        { label: 'Body scrub', durationMin: 45, price: 4000 },
  MEDITATION:   { label: 'Meditation / breathwork / Yoga Nidra class', durationMin: 45, price: 1800, freeFor: ['AMANI','UZIMA','FAMILY'] },
};
export const SIGNATURE_EXPERIENCES = {
  STILLNESS:  { label: 'STILLNESS', includes: 'Restorative yoga, guided meditation, 60-min massage, herbal tea', durationMin: 120, price: 11000 },
  ACACIA:     { label: 'THE ACACIA', includes: 'Private yoga, meditation, 60-min massage, body treatment, refreshments, rest', durationMin: 150, price: 18500 },
  FOR_TWO:    { label: 'FOR TWO', includes: 'Couple yoga/stretching, massage for two, herbal tea, quiet time', durationMin: 120, price: 22500, per: 'couple' },
};
export const SIGNATURE_SURCHARGE = {
  pct: 0.20,
  freeWindow: { days: [1,2,3,4,5], start: '10:00', end: '15:00' }, // Mon-Fri 10-15 free, else surcharge
};
export const SOMA_RESET = {
  label: 'SOMA RESET',
  price: 32000,
  includes: { assessment: 1, yogaSessions: 12, meditation: 6, massages60: 2, homePlan: 1, closingReview: 1 },
};

// Learn & Partner
export const ACADEMY = {
  FOUNDATIONS: { label: 'Yoga Foundations', hours: 25, price: 30000 },
  SOMA100:     { label: 'SOMA 100 — Foundation Teacher Course', hours: 100, price: 85000 },
  SOMA200:     { label: 'SOMA 200 — Yoga Teacher Training', hours: 200, price: 165000, earlyPrice: 145000 },
};
export const CORPORATE = {
  SINGLE:          { label: 'Single session', durationMin: 60, paxMax: 20, price: 18000, bookable: true },
  MONTHLY_4:       { label: 'Monthly programme (4 sessions)', price: 65000, quote: true },
  MONTHLY_8:       { label: 'Monthly programme (8 sessions)', price: 120000, quote: true },
  WELLNESS_DAY:    { label: 'Wellness day', priceFrom: 150000, quote: true },
  ANNUAL_CONTRACT: { label: 'Annual contract', priceFrom: 600000, quote: true },
};

// Retail
export const RETAIL = [
  { label: 'Yoga mat', sku: 'MAT', approxPrice: 3500 },
  { label: 'Strap', sku: 'STRAP', approxPrice: 1200 },
  { label: 'Block', sku: 'BLOCK', approxPrice: 1500 },
  { label: 'Massage oil', sku: 'OIL', approxPrice: 1800 },
  { label: 'Herbal tea', sku: 'TEA', approxPrice: 800 },
  { label: 'Water', sku: 'WATER', approxPrice: 200 },
];

// ── Service-catalog records (Service collection) ───────────────
// Approved SOMA Wellness Center offerings only. Used by
// syncOfficialServices + seed-services.js so the DB catalog can
// never drift back to legacy items.
const S = (name, description, mode, category, type, price, pricingModel, extra = {}) => ({
  name, description, mode, category, type, price, pricingModel,
  totalSessions: 0, sessionDuration: 60, scheduleDays: [], scheduleTime: 'Flexible',
  active: true, isPopular: false, displayOrder: 99, ...extra,
});

export const SOMA_SERVICES = [
  S('SOMA Discovery', '7 days of unlimited yoga + wellness orientation. New clients only.', 'center', 'Membership', 'Trial', 3000, 'flat', { sessionDuration: 60, isPopular: true, displayOrder: 1 }),
  S('Single Class', 'One group yoga class.', 'center', 'Membership', 'Drop-in', 2500, 'per_session', { sessionDuration: 60, displayOrder: 2 }),
  S('SOMA JUA', 'Move · Energise · Shine. 8 group yoga classes/month + member rates on everything else.', 'center', 'Membership', 'Monthly', 12000, 'monthly', { isPopular: true, displayOrder: 3 }),
  S('SOMA AMANI', 'Move into balance. Unlimited group yoga, meditation & breathwork, SOMA DAILY included.', 'center', 'Membership', 'Monthly', 18500, 'monthly', { isPopular: true, displayOrder: 4 }),
  S('SOMA UZIMA', 'BEST VALUE. Yoga and recovery, complete. Unlimited yoga & meditation, SOMA DAILY, 2×60-min massages, 1 private yoga/therapy session, priority booking, 2 guest passes, 15% off.', 'center', 'Membership', 'Monthly', 28500, 'monthly', { isPopular: true, displayOrder: 5 }),
  S('SOMA FAMILY', 'One household, one plan. 2 adults unlimited yoga, 1 children/teen programme, meditation & breathwork, SOMA DAILY, 10% off.', 'center', 'Membership', 'Monthly', 35000, 'monthly', { displayOrder: 6 }),
  S('5-Class Pass', 'KES 2,200/class. Use within 6 weeks from first use.', 'center', 'Membership', 'Pass', 11000, 'flat', { totalSessions: 5, validityDuration: 6, validityUnit: 'weeks', displayOrder: 7 }),
  S('10-Class Pass', 'KES 2,100/class. Use within 3 months from first use.', 'center', 'Membership', 'Pass', 21000, 'flat', { totalSessions: 10, validityDuration: 3, validityUnit: 'months', displayOrder: 8 }),
  S('Therapy Assessment', 'Understand how you move, what hurts, your goals. Required before therapy starts.', 'center', 'Private', 'Assessment', 6500, 'per_session', { sessionDuration: 75, displayOrder: 9 }),
  S('Single Private Session', 'Private yoga or yoga therapy.', 'center', 'Private', 'One-to-One', 5500, 'per_session', { sessionDuration: 60, displayOrder: 10 }),
  S('5-Session Package', '5 × 60-minute private sessions.', 'center', 'Private', 'Package', 25000, 'flat', { totalSessions: 5, sessionDuration: 60, displayOrder: 11 }),
  S('10-Session Package', '10 × 60-minute private sessions.', 'center', 'Private', 'Package', 46000, 'flat', { totalSessions: 10, sessionDuration: 60, displayOrder: 12 }),
  S('Two People Together', '60-minute private session for two.', 'center', 'Private', 'Duet', 8000, 'per_session', { sessionDuration: 60, displayOrder: 13 }),
  S('Small Group (3–5)', '60-minute private session for 3–5 people.', 'center', 'Private', 'Small Group', 9500, 'per_session', { sessionDuration: 60, displayOrder: 14 }),
  S('Home / Hotel Session', 'From KES 9,500. Final quote on distance, group size, duration. Members 15% off.', 'home', 'Private', 'Off-site', 9500, 'contact', { sessionDuration: 60, contactEmail: 'hello@somawellness.co.ke', displayOrder: 15 }),
  S('SOMA MAMA — 4 Sessions', 'Pregnancy programme block of 4.', 'center', 'Life Stages', 'Pregnancy', 12000, 'flat', { totalSessions: 4, sessionDuration: 60, displayOrder: 16 }),
  S('SOMA MAMA — 8 Sessions', 'Pregnancy programme block of 8.', 'center', 'Life Stages', 'Pregnancy', 22000, 'flat', { totalSessions: 8, sessionDuration: 60, displayOrder: 17 }),
  S('SOMA MAMA+ — 4 Sessions', 'After-birth programme block of 4.', 'center', 'Life Stages', 'Postnatal', 11500, 'flat', { totalSessions: 4, sessionDuration: 60, displayOrder: 18 }),
  S('SOMA MAMA+ — 8 Sessions', 'After-birth programme block of 8.', 'center', 'Life Stages', 'Postnatal', 21000, 'flat', { totalSessions: 8, sessionDuration: 60, displayOrder: 19 }),
  S('SOMA YOUNG — 4 Sessions', 'Ages 5–17 block of 4.', 'center', 'Life Stages', 'Children', 7000, 'flat', { totalSessions: 4, sessionDuration: 60, displayOrder: 20 }),
  S('SOMA YOUNG — 8 Sessions', 'Ages 5–17 block of 8.', 'center', 'Life Stages', 'Children', 12000, 'flat', { totalSessions: 8, sessionDuration: 60, displayOrder: 21 }),
  S('SOMA AGE WELL — 4 Sessions', 'Seniors block of 4.', 'center', 'Life Stages', 'Seniors', 7000, 'flat', { totalSessions: 4, sessionDuration: 60, displayOrder: 22 }),
  S('SOMA AGE WELL — 8 Sessions', 'Seniors block of 8.', 'center', 'Life Stages', 'Seniors', 12000, 'flat', { totalSessions: 8, sessionDuration: 60, displayOrder: 23 }),
  S('Single Pregnancy Class', 'One pregnancy class.', 'center', 'Life Stages', 'Pregnancy', 3500, 'per_session', { sessionDuration: 60, displayOrder: 24 }),
  S('Private Pregnancy Session', '60-minute private pregnancy session.', 'center', 'Life Stages', 'Pregnancy', 5500, 'per_session', { sessionDuration: 60, displayOrder: 25 }),
  S('School Holiday Camp — 3 Days', 'Ages 5–12.', 'center', 'Life Stages', 'Camp', 9000, 'flat', { displayOrder: 26 }),
  S('School Holiday Camp — 5 Days', 'Ages 5–12.', 'center', 'Life Stages', 'Camp', 14000, 'flat', { displayOrder: 27 }),
  S('Relaxation Massage', '60-minute relaxation massage.', 'center', 'Restore', 'Massage', 5500, 'per_session', { sessionDuration: 60, displayOrder: 28 }),
  S('Aromatherapy Massage', '60-minute aromatherapy massage.', 'center', 'Restore', 'Massage', 6000, 'per_session', { sessionDuration: 60, displayOrder: 29 }),
  S('Deep Tissue / Sports Massage', '60-minute deep tissue or sports massage.', 'center', 'Restore', 'Massage', 6500, 'per_session', { sessionDuration: 60, displayOrder: 30 }),
  S('Head & Shoulders / Feet Treatment', '30-minute head & shoulders or feet treatment.', 'center', 'Restore', 'Treatment', 3000, 'per_session', { sessionDuration: 30, displayOrder: 31 }),
  S('Body Scrub', '45-minute body scrub.', 'center', 'Restore', 'Treatment', 4000, 'per_session', { sessionDuration: 45, displayOrder: 32 }),
  S('Meditation / Breathwork / Yoga Nidra', '45-minute class. Included for AMANI, UZIMA, FAMILY.', 'center', 'Restore', 'Mindfulness', 1800, 'per_session', { sessionDuration: 45, displayOrder: 33 }),
  S('STILLNESS', 'The deep calm ritual. Restorative yoga, guided meditation, 60-min massage, herbal tea. 2 hours. Mon–Fri 10:00–15:00; 20% surcharge weekends/evenings.', 'center', 'Signature', 'Journey', 11000, 'per_session', { sessionDuration: 120, displayOrder: 34 }),
  S('THE ACACIA', 'Our premium journey. Private yoga, meditation, 60-min massage, body treatment, refreshments, rest. 2.5 hours. Mon–Fri 10:00–15:00; 20% surcharge weekends/evenings.', 'center', 'Signature', 'Journey', 18500, 'per_session', { sessionDuration: 150, displayOrder: 35 }),
  S('FOR TWO', 'A journey for two. Couple yoga/stretching, massage for two, herbal tea, quiet time. 2 hours per couple. Mon–Fri 10:00–15:00; 20% surcharge weekends/evenings.', 'center', 'Signature', 'Journey', 22500, 'per_session', { sessionDuration: 120, displayOrder: 36 }),
  S('SOMA RESET', 'Six weeks to rebuild. Assessment, 12 yoga sessions, 6 meditation/Yoga Nidra, 2×60-min massages, home plan, closing review.', 'center', 'Signature', 'Programme', 32000, 'flat', { displayOrder: 37 }),
  S('Yoga Foundations', '25-hour foundation course.', 'hybrid', 'Academy', 'Course', 30000, 'flat', { displayOrder: 38 }),
  S('SOMA 100 — Foundation Teacher Course', '100-hour foundation teacher course.', 'hybrid', 'Academy', 'Course', 85000, 'flat', { displayOrder: 39 }),
  S('SOMA 200 — Yoga Teacher Training', '200-hour yoga teacher training. Early enrolment KES 145,000. Instalments available.', 'hybrid', 'Academy', 'Course', 165000, 'flat', { displayOrder: 40 }),
  S('Corporate Single Session', '60 min yoga & mobility, up to 20 people.', 'hybrid', 'Corporate', 'Corporate', 18000, 'flat', { sessionDuration: 60, contactEmail: 'hello@somawellness.co.ke', displayOrder: 41 }),
  S('Corporate Monthly — 4 Sessions', '4 sessions/month at your offices.', 'hybrid', 'Corporate', 'Corporate', 65000, 'contact', { contactEmail: 'hello@somawellness.co.ke', displayOrder: 42 }),
  S('Corporate Monthly — 8 Sessions', '8 sessions/month at your offices.', 'hybrid', 'Corporate', 'Corporate', 120000, 'contact', { contactEmail: 'hello@somawellness.co.ke', displayOrder: 43 }),
  S('Corporate Wellness Day', 'Half/full day. From KES 150,000.', 'hybrid', 'Corporate', 'Corporate', 150000, 'contact', { contactEmail: 'hello@somawellness.co.ke', displayOrder: 44 }),
  S('Corporate Annual Contract', 'Weekly sessions + quarterly workshop. From KES 600,000.', 'hybrid', 'Corporate', 'Corporate', 600000, 'contact', { contactEmail: 'hello@somawellness.co.ke', displayOrder: 45 }),
  S('SOMA DAILY — Monthly', 'Practice beyond the mat. Complete library access.', 'online', 'Daily', 'Subscription', 1500, 'monthly', { displayOrder: 46 }),
  S('SOMA DAILY — Annual', 'Two months free. Complete library access.', 'online', 'Daily', 'Subscription', 15000, 'flat', { validityDuration: 12, validityUnit: 'months', displayOrder: 47 }),
];

// Legacy service names retired from the catalog (removed by sync).
export const LEGACY_SERVICE_NAMES = [
  'Offline Group Yoga', 'Online Group Yoga', 'Personal Yoga (Center)', 'Personal Yoga (Home)',
  'Kids Yoga', 'Pregnancy Yoga (Center)', 'Pregnancy Yoga (Home)', 'Yoga for Stress',
  'Corporate Yoga', 'Advanced Yoga (Center)', 'Therapy Yoga (Center)', 'Therapy Yoga (Home)',
  'Abhyanga (Ayurvedic Massage)', 'Shirodhara (Forehead Oil-Pulling Therapy)',
  'Pranayama & Meditation', 'Yoga at Home',
];

// Helpers
export function getTierMonthly(tierKey) {
  return MEMBERSHIP_TIERS[tierKey]?.monthly ?? null;
}
export function getPayAheadPrice(tierKey, months) {
  return PAY_AHEAD_PRICING[tierKey]?.[months] ?? null;
}
export function getFoundingMonthly(tierKey) {
  return FOUNDING_MONTHLY[tierKey] ?? null;
}
export function tierInheritance() {
  // Ordered low→high
  return ['JUA', 'AMANI', 'UZIMA', 'FAMILY'];
}
export function includesDaily(tierKey) {
  return SOMA_DAILY.includedWith.includes(tierKey);
}
export function isWithinFreeWindow(date) {
  // EAT (UTC+3) — Nairobi time, no DST. Convert UTC instant to EAT calendar.
  const eatMs = new Date(date).getTime() + 3 * 3600000;
  const eat = new Date(eatMs);
  const day = eat.getUTCDay(); // 0 Sun ... 6 Sat, now in EAT
  const isWeekday = day >= 1 && day <= 5;
  if (!isWeekday) return false;
  const minutes = eat.getUTCHours() * 60 + eat.getUTCMinutes();
  const startMin = 10 * 60;
  const endMin = 15 * 60;
  // 10:00 inclusive start, 15:00 exclusive end → exactly at 15:00 is outside (surcharge)
  return minutes >= startMin && minutes < endMin;
}
// Alias used by surchargeService
export const isWithinSurchargeFreeWindow = isWithinFreeWindow;
