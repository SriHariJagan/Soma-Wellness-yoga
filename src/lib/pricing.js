// ── Frontend pricing helpers — mirrors backend pricingEngine ──
import { formatKES } from './currency.js';

export const TIER_MONTHLY = { JUA: 12000, AMANI: 18500, UZIMA: 28500, FAMILY: 35000 };
export const FOUNDING_MONTHLY = { JUA: 10000, AMANI: 15000, UZIMA: 24000, FAMILY: 28500 };
export const PAY_AHEAD_PRICING = {
  JUA:    { 1: 12000, 3: 32000, 6: 61000, 12: 108000 },
  AMANI:  { 1: 18500, 3: 49500, 6: 94000, 12: 166500 },
  UZIMA:  { 1: 28500, 3: 76500, 6: 145000, 12: 256500 },
  FAMILY: { 1: 35000, 3: 94500, 6: 178500, 12: 315000 },
};

export function resolveMembershipPrice(tierKey, termMonths = 1, { foundingEligible = false } = {}) {
  const tier = tierKey?.toUpperCase();
  if (!TIER_MONTHLY[tier]) throw new Error(`Unknown tier: ${tierKey}`);
  if (foundingEligible) {
    const fm = FOUNDING_MONTHLY[tier];
    const totals = { 1: fm, 3: Math.round(fm*3*0.9), 6: Math.round(fm*6*0.85), 12: Math.round(fm*12*0.75) };
    return { baseMonthly: fm, termTotal: totals[termMonths], foundingApplied: true };
  }
  return { baseMonthly: TIER_MONTHLY[tier], termTotal: PAY_AHEAD_PRICING[tier][termMonths], foundingApplied: false };
}

export function formatPrice(v) { return formatKES(v); }

// Surcharge helper
export function isWithinFreeWindow(date) {
  const eatMs = new Date(date).getTime() + 3 * 3600000;
  const eat = new Date(eatMs);
  const day = eat.getUTCDay();
  const isWeekday = day >=1 && day <=5;
  if (!isWeekday) return false;
  const mins = eat.getUTCHours()*60 + eat.getUTCMinutes();
  return mins >= 10*60 && mins < 15*60;
}
export function surchargeForSlot(date) { return isWithinFreeWindow(date) ? 0 : 0.20; }

// Health disclosure required prompt types
export const HEALTH_REQUIRED_TYPES = new Set(['therapy_assessment','therapy_session','massage','signature_STILLNESS','signature_ACACIA','signature_FOR_TWO','life_stage_mama','life_stage_agewell']);
