import { describe, it, expect } from '@jest/globals';
import { getSignatureSurcharge, applySurcharge } from '../../../services/surchargeService.js';

describe('Signature 20% surcharge — Mon-Fri 10:00-15:00 free, else surcharge', () => {
  it('weekday 11:00 free', () => {
    const d = new Date('2026-09-14T11:00:00+03:00'); // Mon 11:00
    const r = getSignatureSurcharge(d);
    expect(r.isFreeWindow).toBe(true);
    expect(r.surchargePct).toBe(0);
  });

  it('weekday exactly at 10:00 free (inclusive start)', () => {
    const d = new Date('2026-09-14T10:00:00+03:00');
    expect(getSignatureSurcharge(d).isFreeWindow).toBe(true);
    expect(getSignatureSurcharge(d).surchargePct).toBe(0);
  });

  it('weekday exactly at 15:00 surcharge applies (boundary exclusive end)', () => {
    const d = new Date('2026-09-14T15:00:00+03:00');
    const r = getSignatureSurcharge(d);
    expect(r.isFreeWindow).toBe(false);
    expect(r.surchargePct).toBe(0.20);
  });

  it('weekday 16:00 surcharge', () => {
    const d = new Date('2026-09-14T16:00:00+03:00');
    expect(getSignatureSurcharge(d).surchargePct).toBe(0.20);
  });

  it('Saturday 11:00 surcharge (weekend)', () => {
    const d = new Date('2026-09-12T11:00:00+03:00'); // Sat
    expect(getSignatureSurcharge(d).isFreeWindow).toBe(false);
    expect(getSignatureSurcharge(d).surchargePct).toBe(0.20);
  });

  it('Sunday 12:00 surcharge', () => {
    const d = new Date('2026-09-13T12:00:00+03:00');
    expect(getSignatureSurcharge(d).surchargePct).toBe(0.20);
  });

  it('weekday 09:59 surcharge (before window)', () => {
    const d = new Date('2026-09-14T09:59:00+03:00');
    expect(getSignatureSurcharge(d).surchargePct).toBe(0.20);
  });

  it('applySurcharge computes final price', () => {
    const free = applySurcharge(11000, new Date('2026-09-14T12:00:00+03:00'));
    expect(free.finalPrice).toBe(11000);
    const paid = applySurcharge(11000, new Date('2026-09-12T12:00:00+03:00'));
    expect(paid.finalPrice).toBe(Math.round(11000 * 1.2));
  });
});
