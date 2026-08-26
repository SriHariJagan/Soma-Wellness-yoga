// KES formatting for frontend — VAT-inclusive, no double-tax line
export function formatKES(amount, opts = {}) {
  const { withSymbol = true, decimals = 0 } = opts;
  const n = Number(amount) || 0;
  const formatted = new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
  return withSymbol ? `KES ${formatted}` : formatted;
}
export function formatKESCompact(amount) {
  return formatKES(amount);
}
