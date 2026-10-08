// ============================================================
// utils/money.js — Centralized money handling (KES-first).
// All persisted amounts are integer MINOR units (cents).
// Pesapal API uses MAJOR units (float, 2dp). Daraja used integer
// major. This module is the ONLY place conversions happen.
// ============================================================

export const DEFAULT_CURRENCY = 'KES';

/**
 * Convert major units (e.g. 1500.50 KES) to minor units (150050).
 * Accepts number or numeric string. Rounds half away from float error.
 */
export function toMinor(amount) {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) throw new Error(`Invalid amount: ${amount}`);
  if (n < 0) throw new Error(`Amount must be >= 0: ${amount}`);
  return Math.round(n * 100);
}

/** Convert minor units (150050) to major units (1500.50). */
export function toMajor(minor) {
  const n = typeof minor === 'string' ? Number(minor) : minor;
  if (!Number.isFinite(n)) throw new Error(`Invalid minor amount: ${minor}`);
  return Math.round(n) / 100;
}

/** Normalize any input to integer minor units. */
export function normalizeAmount(amount) {
  return toMinor(amount);
}

/** Amount as required by Pesapal SubmitOrderRequest: float major, 2dp. */
export function toPesapalAmount(minor) {
  return Number(toMajor(minor).toFixed(2));
}

/** Strict equality check in minor units (no tolerance). */
export function amountsEqual(aMinor, bMinor) {
  return Math.round(Number(aMinor)) === Math.round(Number(bMinor));
}

/** Format minor units for display, e.g. "KES 1,500.00". */
export function formatKES(minor, opts = {}) {
  const major = toMajor(minor);
  const locale = opts.locale || 'en-KE';
  return `KES ${major.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Validate ISO currency — currently only KES is supported. */
export function assertCurrency(currency, expected = DEFAULT_CURRENCY) {
  const got = String(currency || '').toUpperCase();
  if (got !== String(expected).toUpperCase()) {
    throw new Error(`Currency mismatch: expected ${expected}, got ${currency}`);
  }
  return got;
}

export default { toMinor, toMajor, normalizeAmount, toPesapalAmount, amountsEqual, formatKES, assertCurrency, DEFAULT_CURRENCY };
