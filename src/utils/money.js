// ============================================================
// utils/money.js — Centralized frontend money formatting (KES).
// Backend owns amounts; frontend only displays them.
// ============================================================

export const CURRENCY = 'KES';

/** Format a KES major number, e.g. 1500 -> "KES 1,500". */
export function formatKES(amount, { decimals = 0 } = {}) {
  const n = Number(amount) || 0;
  return `KES ${n.toLocaleString('en-KE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Format minor units (cents) received from the API. */
export function formatKESMinor(minor, { decimals = 2 } = {}) {
  return formatKES((Number(minor) || 0) / 100, { decimals });
}

export default { formatKES, formatKESMinor, CURRENCY };
