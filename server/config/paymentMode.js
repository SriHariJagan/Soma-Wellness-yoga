// ============================================================
// config/paymentMode.js — Backend source of truth for payment mode
//
// PAYMENT_MODE=test → simulated test payments (testing-code branch only)
// PAYMENT_MODE=live → real M-Pesa/Daraja payments (production behavior)
//
// NEVER trust frontend values (e.g. VITE_* or request params) to decide
// the mode. The server environment is the sole authority.
// ============================================================

export const PAYMENT_MODES = ['test', 'live'];

/** Raw configured mode, normalised to lowercase. Defaults to "live" (safe). */
export function getPaymentMode() {
  const raw = String(process.env.PAYMENT_MODE || 'live').trim().toLowerCase();
  return raw === 'test' ? 'test' : 'live';
}

/** True only when PAYMENT_MODE=test. All test behaviour gates on this. */
export function isTestPaymentMode() {
  return getPaymentMode() === 'test';
}

export default { PAYMENT_MODES, getPaymentMode, isTestPaymentMode };
