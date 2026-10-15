// ============================================================
// server/services/circleService.js — SOMA Wellness Circle helpers
// Centralized membership-status + discount validation. Every
// discount decision goes through here so the backend stays
// authoritative and the 5% never stacks with promotions.
// ============================================================
import Membership from '../models/Membership.js';
import Plan from '../models/Plan.js';
import { WELLNESS_CIRCLE, isCirclePlanName } from '../config/wellnessCircle.js';

export async function getCirclePlan() {
  const plan =
    (await Plan.findOne({ name: WELLNESS_CIRCLE.NAME, active: true }).lean()) ||
    (await Plan.findOne({ name: { $in: WELLNESS_CIRCLE.ALIASES }, active: true }).lean());
  return plan;
}

/**
 * Live member-discount fraction (e.g. 0.05 = 5%) from the Circle plan doc —
 * this is what the admin edits. Falls back to the config default when the
 * plan is missing or carries an invalid value, so pricing never breaks.
 */
export async function getCircleDiscountPct() {
  try {
    const plan = await getCirclePlan();
    const pct = Number(plan?.memberDiscountPct);
    if (Number.isFinite(pct) && pct >= 0 && pct <= 0.9) return pct;
  } catch {
    /* fall through to default */
  }
  return WELLNESS_CIRCLE.DISCOUNT_PCT;
}

/** Find the user's active Circle membership (date-validated, not cron-dependent). */
export async function getActiveCircleMembership(userId, session = null) {
  if (!userId) return null;
  const now = new Date();
  let q = Membership.findOne({
    user: userId,
    status: 'active',
    planType: { $in: WELLNESS_CIRCLE.ALIASES },
    expiryDate: { $gt: now },
  }).sort({ createdAt: -1 });
  if (session) q = q.session(session);
  const m = await q.lean();
  if (m) return m;
  // Fallback: membership linked via plan ref even if planType drifted.
  const circlePlan = await getCirclePlan();
  if (circlePlan) {
    let q2 = Membership.findOne({
      user: userId,
      plan: circlePlan._id,
      status: 'active',
      expiryDate: { $gt: now },
    }).sort({ createdAt: -1 });
    if (session) q2 = q2.session(session);
    return (await q2.lean()) || null;
  }
  return null;
}

export async function hasActiveCircle(userId) {
  return (await getActiveCircleMembership(userId)) != null;
}

export function circleStatusPayload(membership, discountPct = WELLNESS_CIRCLE.DISCOUNT_PCT) {
  const pct = Number(discountPct);
  const pctText = Number.isFinite(pct) && pct > 0 ? `${Math.round(pct * 100)}%` : '5%';
  if (!membership) {
    return {
      active: false,
      planName: WELLNESS_CIRCLE.NAME,
      price: WELLNESS_CIRCLE.PRICE,
      currency: WELLNESS_CIRCLE.CURRENCY,
      durationMonths: WELLNESS_CIRCLE.DURATION_MONTHS,
      memberSince: null,
      validUntil: null,
      benefit: `${pctText} off eligible regular-priced SOMA services`,
    };
  }
  return {
    active: true,
    planName: membership.planType || WELLNESS_CIRCLE.NAME,
    price: membership.price ?? WELLNESS_CIRCLE.PRICE,
    currency: membership.currency || WELLNESS_CIRCLE.CURRENCY,
    durationMonths: membership.planMonths || WELLNESS_CIRCLE.DURATION_MONTHS,
    memberSince: membership.startDate || membership.purchaseDate || null,
    validUntil: membership.expiryDate || null,
    membershipId: membership._id,
    benefit: `${pctText} off eligible regular-priced SOMA services`,
  };
}

/**
 * Central eligibility gate for the 5% Circle benefit.
 * Returns { eligible, reason, discountPct }.
 * NEVER stacks: any coupon/promotional/excluded price wins.
 */
export function circleDiscountEligibility({
  circleActive,
  basePrice,
  hasCouponDiscount = false,
  hasCartDiscount = false,
  isPromotional = false,
  originalPrice = null,
  currentPrice = null,
  excludeCircleDiscount = false,
  circleDiscountEligible = true,
  category = '',
  itemType = '',
  // Live admin-set fraction (getCircleDiscountPct). Defaults to config.
  discountPct = WELLNESS_CIRCLE.DISCOUNT_PCT,
} = {}) {
  if (!circleActive) return { eligible: false, reason: 'no_active_circle', discountPct: 0 };
  if (excludeCircleDiscount) return { eligible: false, reason: 'excluded_service', discountPct: 0 };
  if (circleDiscountEligible === false) return { eligible: false, reason: 'excluded_service', discountPct: 0 };
  if (hasCouponDiscount || hasCartDiscount)
    return { eligible: false, reason: 'coupon_applied', discountPct: 0 };
  if (isPromotional) return { eligible: false, reason: 'promotional_price', discountPct: 0 };
  // Offering-style promo detection: originalPrice > price means already discounted.
  if (originalPrice != null && currentPrice != null && Number(originalPrice) > Number(currentPrice))
    return { eligible: false, reason: 'promotional_price', discountPct: 0 };
  // Other memberships / packages never stack.
  const cat = String(category || '').toLowerCase();
  const type = String(itemType || '').toLowerCase();
  if (cat === 'membership' || type === 'membership' || type === 'plan')
    return { eligible: false, reason: 'is_membership', discountPct: 0 };
  if (!Number(basePrice) || Number(basePrice) <= 0)
    return { eligible: false, reason: 'invalid_price', discountPct: 0 };
  const pct = Number(discountPct);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 0.9)
    return { eligible: false, reason: 'no_discount', discountPct: 0 };
  return { eligible: true, reason: 'eligible', discountPct: pct };
}

/** Apply the member fraction to a regular price (rounded to whole KES). */
export function applyCircleDiscount(basePrice, discountPct = WELLNESS_CIRCLE.DISCOUNT_PCT) {
  const base = Math.round(Number(basePrice) || 0);
  const pct = Number(discountPct);
  const safePct = Number.isFinite(pct) && pct > 0 && pct <= 0.9 ? pct : 0;
  const discountAmount = Math.round(base * safePct);
  return {
    base,
    discountPct: safePct,
    discountAmount,
    finalPrice: base - discountAmount,
  };
}

/** Resolve a service/offering price with Circle rules (no-stack). */
export function resolveCircleServicePrice(basePrice, opts = {}) {
  const { discountPct = WELLNESS_CIRCLE.DISCOUNT_PCT, ...rest } = opts;
  const check = circleDiscountEligibility({ basePrice, discountPct, ...rest });
  if (!check.eligible) {
    const base = Math.round(Number(basePrice) || 0);
    return {
      finalPrice: base,
      discountApplied: 0,
      discountAmount: 0,
      discountPct: 0,
      circleApplied: false,
      reason: check.reason,
      breakdown: { base, afterDiscount: base },
    };
  }
  const applied = applyCircleDiscount(basePrice, check.discountPct);
  return {
    finalPrice: applied.finalPrice,
    discountApplied: applied.discountPct,
    discountAmount: applied.discountAmount,
    discountPct: applied.discountPct,
    circleApplied: true,
    reason: 'circle_5pct',
    breakdown: { base: applied.base, afterDiscount: applied.finalPrice },
  };
}

export { isCirclePlanName, WELLNESS_CIRCLE };
