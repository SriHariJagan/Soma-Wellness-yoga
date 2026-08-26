import { describe, it, expect } from '@jest/globals';
import { calculateCancellationFee } from '../../../services/cancellationService.js';

const appt = new Date('2026-09-15T14:00:00+03:00'); // 2pm EAT

describe('Cancellation fee — boundary at exactly 12 hours', () => {
  it('cancel >=12h ahead = free', () => {
    const cancel = new Date('2026-09-15T02:00:00+03:00'); // exactly 12h before
    const r = calculateCancellationFee({ appointmentTime: appt, cancellationTime: cancel, fee: 5500 });
    expect(r.pct).toBe(0);
    expect(r.feeDue).toBe(0);
    expect(r.category).toBe('free');
    expect(r.hoursBefore).toBeCloseTo(12, 5);
  });

  it('cancel 12h + 1 second ahead = free (just over boundary)', () => {
    const cancel = new Date(appt.getTime() - 12 * 3600000 - 1000);
    const r = calculateCancellationFee({ appointmentTime: appt, cancellationTime: cancel, fee: 5500 });
    expect(r.category).toBe('free');
  });

  it('cancel <12h (11h59m) = 50% late fee', () => {
    const cancel = new Date(appt.getTime() - 11.99 * 3600000);
    const r = calculateCancellationFee({ appointmentTime: appt, cancellationTime: cancel, fee: 5500 });
    expect(r.pct).toBe(0.5);
    expect(r.feeDue).toBe(Math.round(5500 * 0.5));
    expect(r.category).toBe('late');
  });

  it('cancel 1h before = 50%', () => {
    const cancel = new Date(appt.getTime() - 1 * 3600000);
    const r = calculateCancellationFee({ appointmentTime: appt, cancellationTime: cancel, fee: 6000 });
    expect(r.category).toBe('late');
    expect(r.feeDue).toBe(3000);
  });

  it('no-show = 100%', () => {
    const r = calculateCancellationFee({ appointmentTime: appt, cancellationTime: null, fee: 5500, isNoShow: true });
    expect(r.pct).toBe(1.0);
    expect(r.feeDue).toBe(5500);
    expect(r.category).toBe('no_show');
  });

  it('cancel after appointment start = no_show 100%', () => {
    const cancel = new Date(appt.getTime() + 1 * 3600000);
    const r = calculateCancellationFee({ appointmentTime: appt, cancellationTime: cancel, fee: 4000 });
    expect(r.category).toBe('no_show');
    expect(r.feeDue).toBe(4000);
  });

  it('hoursBefore computed correctly', () => {
    const cancel = new Date(appt.getTime() - 6 * 3600000);
    const r = calculateCancellationFee({ appointmentTime: appt, cancellationTime: cancel, fee: 1000 });
    expect(r.hoursBefore).toBeCloseTo(6, 5);
  });
});
