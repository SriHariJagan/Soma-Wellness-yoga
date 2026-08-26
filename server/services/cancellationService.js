// ============================================================
// server/services/cancellationService.js — Cancellation fee calc
// >=12h ahead = free; <12h = 50%; no-show = 100%
// ============================================================

export const CANCELLATION_RULES = {
  FREE_HOURS: 12,
  LATE_PCT: 0.5,
  NOSHOW_PCT: 1.0,
};

/**
 * @param {object} params
 * @param {Date} params.appointmentTime - scheduled start
 * @param {Date} params.cancellationTime - when user cancelled (null for no-show)
 * @param {number} params.fee - full fee
 * @param {boolean} params.isNoShow - true if no-show
 * @returns {{ feeDue: number, pct: number, category: string, hoursBefore: number|null }}
 */
export function calculateCancellationFee({ appointmentTime, cancellationTime, fee, isNoShow = false }) {
  const fullFee = Number(fee) || 0;
  if (isNoShow) {
    return { feeDue: Math.round(fullFee * CANCELLATION_RULES.NOSHOW_PCT), pct: CANCELLATION_RULES.NOSHOW_PCT, category: 'no_show', hoursBefore: 0 };
  }
  if (!cancellationTime || !appointmentTime) {
    return { feeDue: 0, pct: 0, category: 'free', hoursBefore: null };
  }
  const appt = new Date(appointmentTime);
  const cancel = new Date(cancellationTime);
  const msBefore = appt - cancel;
  const hoursBefore = msBefore / 3600000;
  if (hoursBefore >= CANCELLATION_RULES.FREE_HOURS) {
    return { feeDue: 0, pct: 0, category: 'free', hoursBefore };
  }
  if (hoursBefore >= 0) {
    return { feeDue: Math.round(fullFee * CANCELLATION_RULES.LATE_PCT), pct: CANCELLATION_RULES.LATE_PCT, category: 'late', hoursBefore };
  }
  // cancelled after appointment start — treat as no-show
  return { feeDue: Math.round(fullFee * CANCELLATION_RULES.NOSHOW_PCT), pct: CANCELLATION_RULES.NOSHOW_PCT, category: 'no_show', hoursBefore };
}
