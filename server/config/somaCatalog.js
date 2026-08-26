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
