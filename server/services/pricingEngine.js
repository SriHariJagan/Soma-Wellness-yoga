// ============================================================
// server/services/pricingEngine.js — SOMA pricing / discount engine
// Single shared service: resolves final price given base + membership +
// pay-ahead + founding + surcharge with documented precedence.
// ============================================================
import {
  MEMBERSHIP_TIERS,
  PAY_AHEAD_PRICING,
  PRIVATE_MEMBER_DISCOUNT,
  FOUNDING_MONTHLY,
} from '../config/somaCatalog.js';

/**
 * Precedence rules (documented):
 * 1) Founding monthly rate is the *base* for pay-ahead calculation when eligible.
 *    Founding + pay-ahead are explicitly stackable (spec: "Pay-ahead savings still
 *    apply on top" of founding rate).
 * 2) Membership tier discounts (15% UZIMA / 10% FAMILY) on "everything else"
 *    (One-to-One, Restore, Life Stages) are the *best-single-discount* — they
 *    do NOT stack with other member discounts. If member already gets 15% via
 *    UZIMA, the private 15% is not double-applied. Use the highest applicable
 *    membership discount, not cumulative.
 * 3) Signature 20% surcharge is additive AFTER discounts (weekend/evening premium).
 * 4) Early-enrolment Academy discount is an alternative price, not additive.
 *
 * VAT: all prices already VAT-inclusive — no separate tax line is added.
 */

// Return discount pct for a tier on "everything else"
export function membershipDiscountPct(tierKey) {
  if (!tierKey) return 0;
  const k = tierKey.toUpperCase();
  return MEMBERSHIP_TIERS[k]?.discountOnOtherServices ?? 0;
}

// Best-single-discount among membership tiers — currently just tier's own discount
// (future may stack referral etc — this is the choke-point)
export function bestMemberDiscount(tierKey) {
  return membershipDiscountPct(tierKey);
}

/**
 * Resolve membership monthly price.
 * @param {string} tierKey - JUA/AMANI/UZIMA/FAMILY
 * @param {number} termMonths - 1/3/6/12
 * @param {object} opts - { foundingEligible: boolean }
 * @returns {{ baseMonthly: number, termTotal: number, discountPct: number, foundingApplied: boolean }}
 */
export function resolveMembershipPrice(tierKey, termMonths = 1, opts = {}) {
  const tier = tierKey?.toUpperCase();
  if (!MEMBERSHIP_TIERS[tier]) throw new Error(`Unknown tier: ${tierKey}`);
  const foundingEligible = !!opts.foundingEligible;

  if (foundingEligible) {
    const foundingMonthly = FOUNDING_MONTHLY[tier];
    // Pay-ahead totals with founding as base: use explicit table derived from founding monthly?
    // Spec says pay-ahead discounts still combine — compute as foundingMonthly * months * (1 - discount)
    // BUT spec provides explicit table for normal rates only. For founding+payahead,
    // we calculate using same discount pct as PAY_AHEAD_TERMS.
    const term = termMonths;
    const foundingTotals = {
      1: foundingMonthly,
      3: Math.round(foundingMonthly * 3 * 0.9),   // 10% off
      6: Math.round(foundingMonthly * 6 * 0.85),  // 15% off
      12: Math.round(foundingMonthly * 12 * 0.75),// 25% off
    };
    // If PAY_AHEAD_PRICING has founding alternative? Use calculated; but if spec implies founding totals
    // derived same way, return calculated — tests will verify relative to spec examples.
    // However explicit FOUNDING pay-ahead examples aren't in spec except monthly; tests use 3/6/12 derived.
    const expected = PAY_AHEAD_PRICING[tier]?.[term];
    // Validate that normal table matches discounted monthly logic where applicable
    return {
      baseMonthly: foundingMonthly,
      termTotal: foundingTotals[term] ?? foundingMonthly * term,
      discountPct: term === 3 ? 0.10 : term === 6 ? 0.15 : term === 12 ? 0.25 : 0,
      foundingApplied: true,
    };
  }

  const termTotal = PAY_AHEAD_PRICING[tier]?.[termMonths];
  if (termTotal == null) throw new Error(`No pay-ahead pricing for ${tier} x ${termMonths}mo`);
  const discountPct = termMonths === 3 ? 0.10 : termMonths === 6 ? 0.15 : termMonths === 12 ? 0.25 : 0;
  return {
    baseMonthly: MEMBERSHIP_TIERS[tier].monthly,
    termTotal,
    discountPct,
    foundingApplied: false,
  };
}

/**
 * Resolve price for a bookable service (massage, private, life-stage etc)
 * applying membership discount (best-single).
 * @param {number} basePrice
 * @param {object} opts - { tierKey, surchargePct }
 * @returns {{ finalPrice: number, discountApplied: number, surchargeApplied: number, breakdown: object }}
 */
export function resolveServicePrice(basePrice, opts = {}) {
  const base = Number(basePrice) || 0;
  const discountPct = bestMemberDiscount(opts.tierKey);
  const surchargePct = Number(opts.surchargePct) || 0;

  // Apply discount then surcharge (precedence)
  const afterDiscount = Math.round(base * (1 - discountPct));
  const finalPrice = Math.round(afterDiscount * (1 + surchargePct));

  return {
    finalPrice,
    discountApplied: discountPct,
    surchargeApplied: surchargePct,
    breakdown: {
      base,
      afterDiscount,
      beforeSurcharge: afterDiscount,
      surchargePct,
    },
  };
}

/**
 * Totalling helper for checkout basket containing rentals/fees
 * Handles: registration fee waiver, guest pass, mat, towel
 * @param {object} items - { membershipTier, termMonths, addOns: [{sku, price, qty}], foundingEligible, tierKey }
 * @returns {{ total: number, lines: Array, waivedRegistration: boolean }}
 */
export function resolveBasketTotal({ tierKey, termMonths = 1, foundingEligible = false, addOns = [] } = {}) {
  let membershipLine = null;
  let total = 0;
  const lines = [];

  if (tierKey) {
    const m = resolveMembershipPrice(tierKey, termMonths, { foundingEligible });
    lines.push({ label: `${tierKey} × ${termMonths}mo`, amount: m.termTotal, meta: m });
    total += m.termTotal;
    membershipLine = m;
  }

  // Registration fee — waived if term >= 3
  const REG_FEE = 3000;
  const waivedRegistration = Number(termMonths) >= 3;
  if (!waivedRegistration) {
    lines.push({ label: 'Registration fee', amount: REG_FEE });
    total += REG_FEE;
  } else {
    lines.push({ label: 'Registration fee', amount: 0, waived: true, note: 'Waived on 3+ month commitment' });
  }

  for (const a of addOns) {
    const lineTotal = Number(a.price) * Number(a.qty || 1);
    lines.push({ label: a.label || a.sku, amount: lineTotal, qty: a.qty });
    total += lineTotal;
  }

  return { total, lines, waivedRegistration, membershipLine };
}

// Export all for testing convenience
export const _helpers = { membershipDiscountPct, bestMemberDiscount };
