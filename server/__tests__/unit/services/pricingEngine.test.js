import { describe, it, expect } from '@jest/globals';
import { resolveMembershipPrice, resolveServicePrice, resolveBasketTotal, membershipDiscountPct } from '../../../services/pricingEngine.js';
import { PAY_AHEAD_PRICING, FOUNDING_MONTHLY, MEMBERSHIP_TIERS } from '../../../config/somaCatalog.js';

describe('PricingEngine — membership tier × pay-ahead term', () => {
  const tiers = ['JUA', 'AMANI', 'UZIMA', 'FAMILY'];
  const terms = [1, 3, 6, 12];
  it.each(tiers)('tier %s has exact spec pricing for each term', (tier) => {
    for (const term of terms) {
      const r = resolveMembershipPrice(tier, term, { foundingEligible: false });
      expect(r.termTotal).toBe(PAY_AHEAD_PRICING[tier][term]);
      expect(r.foundingApplied).toBe(false);
      if (term === 3) expect(r.discountPct).toBe(0.10);
      if (term === 6) expect(r.discountPct).toBe(0.15);
      if (term === 12) expect(r.discountPct).toBe(0.25);
      if (term === 1) expect(r.discountPct).toBe(0);
    }
  });

  it('founding × pay-ahead combines founding monthly as base with same discount pct', () => {
    const tier = 'JUA';
    // Founding monthly 10,000 — 3mo should be 10k*3*0.9 = 27,000
    const r3 = resolveMembershipPrice(tier, 3, { foundingEligible: true });
    expect(r3.foundingApplied).toBe(true);
    expect(r3.baseMonthly).toBe(FOUNDING_MONTHLY[tier]);
    expect(r3.termTotal).toBe(Math.round(FOUNDING_MONTHLY[tier] * 3 * 0.9));
    const r6 = resolveMembershipPrice(tier, 6, { foundingEligible: true });
    expect(r6.termTotal).toBe(Math.round(FOUNDING_MONTHLY[tier] * 6 * 0.85));
    const r12 = resolveMembershipPrice(tier, 12, { foundingEligible: true });
    expect(r12.termTotal).toBe(Math.round(FOUNDING_MONTHLY[tier] * 12 * 0.75));
  });

  it('founding × pay-ahead for each tier', () => {
    for (const tier of tiers) {
      const r = resolveMembershipPrice(tier, 6, { foundingEligible: true });
      expect(r.baseMonthly).toBe(FOUNDING_MONTHLY[tier]);
      expect(r.foundingApplied).toBe(true);
    }
  });

  it('member discount on Other Services: UZIMA 15%, FAMILY 10%, others 0', () => {
    expect(membershipDiscountPct('UZIMA')).toBe(0.15);
    expect(membershipDiscountPct('FAMILY')).toBe(0.10);
    expect(membershipDiscountPct('JUA')).toBe(0);
    expect(membershipDiscountPct('AMANI')).toBe(0);
    expect(membershipDiscountPct(null)).toBe(0);
  });

  it('service price applies best-single membership discount (no stacking)', () => {
    // Single private session 5,500 for UZIMA → 15% off
    const rUzima = resolveServicePrice(5500, { tierKey: 'UZIMA' });
    expect(rUzima.discountApplied).toBe(0.15);
    expect(rUzima.finalPrice).toBe(Math.round(5500 * 0.85));
    // Family 10% off
    const rFam = resolveServicePrice(5500, { tierKey: 'FAMILY' });
    expect(rFam.finalPrice).toBe(Math.round(5500 * 0.9));
    // JUA no discount
    const rJua = resolveServicePrice(5500, { tierKey: 'JUA' });
    expect(rJua.finalPrice).toBe(5500);
    // Not double-apply: even if private 15% considered, we only apply tier discount once
    // So UZIMA already 15% — no additional 15% stacking
    expect(rUzima.finalPrice).not.toBe(Math.round(5500 * 0.85 * 0.85));
  });

  it('service price: restore treatments discount stacks correctly', () => {
    // Aromatherapy 6000 with UZIMA → 5100
    const r = resolveServicePrice(6000, { tierKey: 'UZIMA' });
    expect(r.finalPrice).toBe(5100);
  });

  it('service price with surcharge additive after discount', () => {
    // Signature STILLNESS 11,000 with UZIMA (15% off) + 20% weekend surcharge
    // afterDiscount = 9350, then *1.2 = 11220
    const r = resolveServicePrice(11000, { tierKey: 'UZIMA', surchargePct: 0.20 });
    expect(r.finalPrice).toBe(Math.round(11000 * 0.85 * 1.2));
    expect(r.breakdown.afterDiscount).toBe(Math.round(11000 * 0.85));
  });

  it('basket: registration fee waived on >=3 months, applied on monthly', () => {
    const monthly = resolveBasketTotal({ tierKey: 'JUA', termMonths: 1, foundingEligible: false });
    expect(monthly.waivedRegistration).toBe(false);
    expect(monthly.lines.find(l => l.label === 'Registration fee').amount).toBe(3000);
    const three = resolveBasketTotal({ tierKey: 'JUA', termMonths: 3, foundingEligible: false });
    expect(three.waivedRegistration).toBe(true);
    expect(three.lines.find(l => l.label === 'Registration fee').waived).toBe(true);
    expect(three.lines.find(l => l.label === 'Registration fee').amount).toBe(0);
  });

  it('basket total matches term + registration + addOns', () => {
    const r = resolveBasketTotal({ tierKey: 'JUA', termMonths: 1, addOns: [{ label: 'Mat hire', price: 200, qty: 1 }, { label: 'Guest pass', price: 1500, qty: 2 }] });
    // JUA monthly 12k + registration 3k + mat 200 + guest 3000 = 18200
    expect(r.total).toBe(12000 + 3000 + 200 + 3000);
  });
});
