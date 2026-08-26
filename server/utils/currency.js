// ============================================================
// server/utils/currency.js — KES formatting (VAT-inclusive)
// ============================================================
export function formatKES(amount, opts = {}) {
  const { withSymbol = true, decimals = 0 } = opts;
  const n = Number(amount) || 0;
  const formatted = new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
  return withSymbol ? `KES ${formatted}` : formatted;
}

export function formatKESWithDecimals(amount) {
  return formatKES(amount, { decimals: 2 });
}

// Also export paise conversion helpers (Razorpay expects smallest unit)
export function toMinorUnits(kes) {
  return Math.round(Number(kes) * 100);
}
export function fromMinorUnits(minor) {
  return Number(minor) / 100;
}
