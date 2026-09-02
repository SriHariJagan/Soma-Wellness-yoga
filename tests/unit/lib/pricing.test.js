import { describe, it, expect } from 'vitest';
import {
  TIER_MONTHLY,
  FOUNDING_MONTHLY,
  PAY_AHEAD_PRICING,
  resolveMembershipPrice,
  formatPrice,
  isWithinFreeWindow,
  surchargeForSlot,
  HEALTH_REQUIRED_TYPES,
} from '../../../src/lib/pricing.js';

describe('pricing constants', () => {
  it('TIER_MONTHLY has 4 tiers', () => {
    expect(Object.keys(TIER_MONTHLY)).toEqual(expect.arrayContaining(['JUA','AMANI','UZIMA','FAMILY']));
  });
  it('PAY_AHEAD_PRICING has savings (annual < monthly*12)', () => {
    for (const tier of Object.keys(TIER_MONTHLY)) {
      expect(PAY_AHEAD_PRICING[tier][12]).toBeLessThan(TIER_MONTHLY[tier]*12);
      expect(PAY_AHEAD_PRICING[tier][3]).toBeLessThan(TIER_MONTHLY[tier]*3);
    }
  });
  it('FOUNDING_MONTHLY cheaper than normal', () => {
    for (const tier of Object.keys(TIER_MONTHLY)) {
      expect(FOUNDING_MONTHLY[tier]).toBeLessThan(TIER_MONTHLY[tier]);
    }
  });
});

describe('resolveMembershipPrice', () => {
  it('resolves JUA monthly non-founding', () => {
    const r = resolveMembershipPrice('JUA', 1);
    expect(r).toMatchObject({ baseMonthly: 12000, termTotal: 12000, foundingApplied: false });
  });

  it('case-insensitive tier key', () => {
    expect(resolveMembershipPrice('jua', 1).baseMonthly).toBe(12000);
    expect(resolveMembershipPrice('Uzima', 1).baseMonthly).toBe(28500);
  });

  it('resolves all terms for AMANI', () => {
    expect(resolveMembershipPrice('AMANI', 3).termTotal).toBe(49500);
    expect(resolveMembershipPrice('AMANI', 6).termTotal).toBe(94000);
    expect(resolveMembershipPrice('AMANI', 12).termTotal).toBe(166500);
  });

  it('founding price is discounted and uses formula for non-standard terms', () => {
    const f1 = resolveMembershipPrice('JUA', 1, { foundingEligible: true });
    expect(f1.foundingApplied).toBe(true);
    expect(f1.baseMonthly).toBe(10000);
    expect(f1.termTotal).toBe(10000);

    const f3 = resolveMembershipPrice('JUA', 3, { foundingEligible: true });
    expect(f3.termTotal).toBe(Math.round(10000*3*0.9));

    const f12 = resolveMembershipPrice('UZIMA', 12, { foundingEligible: true });
    expect(f12.termTotal).toBe(Math.round(24000*12*0.75));
  });

  it('throws for unknown tier', () => {
    expect(() => resolveMembershipPrice('UNKNOWN', 1)).toThrow(/Unknown tier/);
    expect(() => resolveMembershipPrice('', 1)).toThrow();
    expect(() => resolveMembershipPrice(null, 1)).toThrow();
  });

  it('returns undefined termTotal for invalid term (graceful)', () => {
    const r = resolveMembershipPrice('JUA', 99);
    expect(r.termTotal).toBeUndefined();
  });

  it('formatPrice delegates to KES', () => {
    expect(formatPrice(12000)).toBe('KES 12,000');
  });
});

describe('isWithinFreeWindow / surchargeForSlot', () => {
  // Window: Mon-Fri (UTC day 1-5), 10:00-15:00 EAT (= 07:00-12:00 UTC since EAT=UTC+3)
  // Implementation adds 3h to input then checks UTC 10:00-15:00, so input 07:00 UTC => EAT 10:00
  const makeDate = (utcIso) => new Date(utcIso);

  it('returns true for weekday inside window', () => {
    // Monday 2026-08-10 is Monday (day 1). 08:00 UTC = 11:00 EAT inside window
    expect(isWithinFreeWindow(makeDate('2026-08-10T08:00:00Z'))).toBe(true);
    expect(isWithinFreeWindow(makeDate('2026-08-11T09:00:00Z'))).toBe(true); // Tue 12:00 EAT
  });

  it('returns false on weekend', () => {
    expect(isWithinFreeWindow(makeDate('2026-08-15T08:00:00Z'))).toBe(false); // Sat
    expect(isWithinFreeWindow(makeDate('2026-08-16T08:00:00Z'))).toBe(false); // Sun
  });

  it('returns false outside time window on weekday', () => {
    // 04:00 UTC = 07:00 EAT before window
    expect(isWithinFreeWindow(makeDate('2026-08-10T04:00:00Z'))).toBe(false);
    // 13:00 UTC = 16:00 EAT after window
    expect(isWithinFreeWindow(makeDate('2026-08-10T13:00:00Z'))).toBe(false);
  });

  it('boundary: 10:00 inclusive true, 15:00 exclusive false', () => {
    // For EAT 10:00 => UTC 07:00, EAT 15:00 => UTC 12:00
    expect(isWithinFreeWindow(makeDate('2026-08-10T07:00:00Z'))).toBe(true);
    expect(isWithinFreeWindow(makeDate('2026-08-10T12:00:00Z'))).toBe(false);
  });

  it('surchargeForSlot returns 0 inside window, 0.20 outside', () => {
    expect(surchargeForSlot(makeDate('2026-08-10T08:00:00Z'))).toBe(0);
    expect(surchargeForSlot(makeDate('2026-08-10T04:00:00Z'))).toBe(0.2);
    expect(surchargeForSlot(makeDate('2026-08-15T08:00:00Z'))).toBe(0.2);
  });

  it('handles string date input', () => {
    expect(isWithinFreeWindow('2026-08-10T08:00:00Z')).toBe(true);
    expect(surchargeForSlot('2026-08-10T04:00:00Z')).toBe(0.2);
  });
});

describe('HEALTH_REQUIRED_TYPES', () => {
  it('contains therapy/massage/signature/mama/agewell, not others', () => {
    expect(HEALTH_REQUIRED_TYPES.has('therapy_assessment')).toBe(true);
    expect(HEALTH_REQUIRED_TYPES.has('massage')).toBe(true);
    expect(HEALTH_REQUIRED_TYPES.has('signature_STILLNESS')).toBe(true);
    expect(HEALTH_REQUIRED_TYPES.has('life_stage_mama')).toBe(true);
    expect(HEALTH_REQUIRED_TYPES.has('group_yoga')).toBe(false);
  });
});
