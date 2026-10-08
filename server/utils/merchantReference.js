// ============================================================
// utils/merchantReference.js — Unique, immutable payment references.
// Format: PAY-YYYYMMDD-XXXXXXXX (uppercase alnum + dashes only,
// Pesapal-safe: [A-Za-z0-9\-_.:] max 50 chars).
// ============================================================
import crypto from 'crypto';

export function generateMerchantReference(prefix = 'PAY') {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 8);
  return `${prefix}-${ymd}-${rand}`;
}

export function isValidMerchantReference(ref) {
  return typeof ref === 'string' && /^[A-Za-z0-9\-_.:]{1,50}$/.test(ref);
}

export default { generateMerchantReference, isValidMerchantReference };
