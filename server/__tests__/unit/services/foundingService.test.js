import { describe, it, expect } from '@jest/globals';
import { checkFoundingEligibility, foundingRateExpiresAt, isFoundingRateActive } from '../../../services/foundingService.js';

const opening = new Date('2026-08-01T00:00:00+03:00');
const day90 = new Date(opening.getTime() + 90 * 86400000);
const day91 = new Date(opening.getTime() + 91 * 86400000);
const day89 = new Date(opening.getTime() + 89 * 86400000);
const day0 = new Date('2026-08-05T12:00:00+03:00');

describe('Founding eligibility engine', () => {
  it('eligible when both cap <100 and within 90 days', () => {
    const r = checkFoundingEligibility({ currentCount: 0, openingDate: opening, now: day0 });
    expect(r.eligible).toBe(true);
    expect(r.remainingSlots).toBe(100);
  });

  it('exactly 100th signup edge — count 99 eligible, 100 not', () => {
    const r99 = checkFoundingEligibility({ currentCount: 99, openingDate: opening, now: day0 });
    expect(r99.eligible).toBe(true);
    expect(r99.remainingSlots).toBe(1);
    const r100 = checkFoundingEligibility({ currentCount: 100, openingDate: opening, now: day0 });
    expect(r100.eligible).toBe(false);
    expect(r100.reason).toBe('cap_reached');
  });

  it('day 89 eligible, day 90 edge (exclusive — exactly 90 days not eligible), day 91 not', () => {
    const r89 = checkFoundingEligibility({ currentCount: 10, openingDate: opening, now: day89 });
    expect(r89.eligible).toBe(true);
    const r90 = checkFoundingEligibility({ currentCount: 10, openingDate: opening, now: day90 });
    expect(r90.eligible).toBe(false);
    expect(r90.reason).toBe('window_expired');
    const r91 = checkFoundingEligibility({ currentCount: 10, openingDate: opening, now: day91 });
    expect(r91.eligible).toBe(false);
  });

  it('both conditions near-simultaneously true/false — 99 count + day 89 eligible, 100 + day 90 both fail', () => {
    const rBothOk = checkFoundingEligibility({ currentCount: 99, openingDate: opening, now: day89 });
    expect(rBothOk.eligible).toBe(true);
    expect(rBothOk.capOk).toBe(true);
    expect(rBothOk.windowOk).toBe(true);
    const rBothFail = checkFoundingEligibility({ currentCount: 100, openingDate: opening, now: day90 });
    expect(rBothFail.eligible).toBe(false);
    expect(rBothFail.reason).toBe('cap_and_window_exceeded');
  });

  it('remainingSlots and daysRemaining computed correctly', () => {
    const r = checkFoundingEligibility({ currentCount: 42, openingDate: opening, now: new Date(opening.getTime() + 10 * 86400000) });
    expect(r.remainingSlots).toBe(58);
    expect(r.daysRemaining).toBe(80);
  });

  it('founding_rate_expires_at is 12 months from join date', () => {
    const join = new Date('2026-08-15T10:00:00+03:00');
    const exp = foundingRateExpiresAt(join);
    expect(exp.getFullYear()).toBe(2027);
    expect(exp.getMonth()).toBe(7); // August (0-index)
    expect(exp.getDate()).toBe(15);
  });

  it('isFoundingRateActive — within 12mo true, after false', () => {
    const join = new Date('2026-08-15T00:00:00+03:00');
    const within = new Date('2027-08-14T00:00:00+03:00');
    const after = new Date('2027-08-16T00:00:00+03:00');
    expect(isFoundingRateActive({ joinDate: join, now: within })).toBe(true);
    expect(isFoundingRateActive({ joinDate: join, now: after })).toBe(false);
    // Exactly at expiry is not active
    const exact = new Date('2027-08-15T00:00:00+03:00');
    expect(isFoundingRateActive({ joinDate: join, now: exact })).toBe(false);
  });
});
