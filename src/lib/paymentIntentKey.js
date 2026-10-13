// ============================================================
// lib/paymentIntentKey.js — stable idempotency keys per purchase attempt.
//
// Why this exists (DEF-006): minting a fresh key on every click meant a
// rapid double-click, a retry after a network error, or a browser refresh
// each produced a NEW payment intent — and therefore a new Pesapal order
// for one intended purchase.
//
// Contract:
//   - the key is derived from and scoped to ONE canonical purchase
//     (item set + label + amount + existing paymentId);
//   - retries and remounts (including a page refresh) reuse the SAME key;
//   - changing the purchase invalidates the key, because it is a different
//     intended purchase;
//   - the key is dropped once the attempt has been handed to Pesapal, so a
//     later, genuinely new attempt after failure/cancellation gets a new key.
//
// Mirrors the established cart-checkout key handling in CartPage.jsx
// (`checkoutKeyRef` + `sessionStorage`).
// ============================================================

export const INTENT_KEY_STORAGE = 'pesapal_intent_key';

function defaultStorage() {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {
    // Private mode / blocked storage — degrade to in-memory only.
    return null;
  }
}

/**
 * Canonical fingerprint of the intended purchase. Two different carts must
 * never share a key, and the same cart must always produce the same one.
 */
export function buildPurchaseSignature({ items, label, amount, paymentId } = {}) {
  const itemPart = (Array.isArray(items) ? items : [])
    .map((i) => `${i?.itemType || ''}:${i?.itemId ?? ''}:${Number(i?.quantity ?? 1) || 1}`)
    .sort()
    .join('|');
  return [
    paymentId ? `p:${paymentId}` : 'new',
    `l:${label ?? ''}`,
    `a:${amount ?? ''}`,
    `i:${itemPart}`,
  ].join('#');
}

function randomSuffix() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readStored(storage) {
  try {
    const raw = storage?.getItem(INTENT_KEY_STORAGE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.key === 'string' && typeof parsed.signature === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Return the stable key for `signature`, minting and persisting one only when
 * the stored key belongs to a different purchase (or is missing).
 */
export function getOrCreateIntentKey(signature, { storage = defaultStorage() } = {}) {
  const stored = readStored(storage);
  if (stored && stored.signature === signature) return stored.key;

  const key = `pay_${randomSuffix()}`;
  try {
    storage?.setItem(INTENT_KEY_STORAGE, JSON.stringify({ key, signature, at: Date.now() }));
  } catch {
    // Storage unavailable — the key still works for this page session.
  }
  return key;
}

/**
 * Forget the stored key. Called once the attempt has been handed to Pesapal
 * (so the shopper's next genuine purchase attempt gets a fresh key), and when
 * the purchase itself changes.
 */
export function clearIntentKey({ storage = defaultStorage() } = {}) {
  try {
    storage?.removeItem(INTENT_KEY_STORAGE);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}