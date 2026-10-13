import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildPurchaseSignature,
  getOrCreateIntentKey,
  clearIntentKey,
  INTENT_KEY_STORAGE,
} from '../../../src/lib/paymentIntentKey.js';

/** Minimal in-memory Storage stand-in. */
function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

const PASS = {
  label: 'Wellness Circle',
  amount: 50000,
  items: [{ itemType: 'membership', itemId: 'plan-1', quantity: 1 }],
};

beforeEach(() => {
  sessionStorage.clear();
});

describe('buildPurchaseSignature', () => {
  it('is stable for the same purchase regardless of item order', () => {
    const a = buildPurchaseSignature({
      items: [
        { itemType: 'membership', itemId: 'a', quantity: 1 },
        { itemType: 'service', itemId: 'b', quantity: 2 },
      ],
    });
    const b = buildPurchaseSignature({
      items: [
        { itemType: 'service', itemId: 'b', quantity: 2 },
        { itemType: 'membership', itemId: 'a', quantity: 1 },
      ],
    });
    expect(a).toBe(b);
  });

  it('changes when the item set, quantity, label or amount changes', () => {
    const base = buildPurchaseSignature(PASS);
    expect(buildPurchaseSignature({ ...PASS, amount: 90000 })).not.toBe(base);
    expect(buildPurchaseSignature({ ...PASS, label: 'Other' })).not.toBe(base);
    expect(buildPurchaseSignature({
      ...PASS,
      items: [{ itemType: 'membership', itemId: 'plan-1', quantity: 2 }],
    })).not.toBe(base);
    expect(buildPurchaseSignature({
      ...PASS,
      items: [{ itemType: 'membership', itemId: 'plan-2', quantity: 1 }],
    })).not.toBe(base);
  });

  it('treats a continued existing paymentId as its own purchase', () => {
    expect(buildPurchaseSignature({ ...PASS, paymentId: 'p1' })).not.toBe(buildPurchaseSignature(PASS));
    expect(buildPurchaseSignature({ ...PASS, paymentId: 'p1' })).toBe(buildPurchaseSignature({ ...PASS, paymentId: 'p1' }));
  });
});

describe('getOrCreateIntentKey (DEF-006: stable key per intended purchase)', () => {
  it('returns the SAME key for repeated calls on the same purchase', () => {
    const storage = makeStorage();
    const sig = buildPurchaseSignature(PASS);
    const first = getOrCreateIntentKey(sig, { storage });
    const second = getOrCreateIntentKey(sig, { storage });
    const third = getOrCreateIntentKey(sig, { storage });
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it('survives a browser refresh (a fresh module re-reads sessionStorage)', () => {
    const storage = makeStorage();
    const sig = buildPurchaseSignature(PASS);
    const beforeRefresh = getOrCreateIntentKey(sig, { storage });
    // Simulate a remount/reload: nothing in memory, only sessionStorage.
    expect(getOrCreateIntentKey(sig, { storage })).toBe(beforeRefresh);
    expect(storage.getItem(INTENT_KEY_STORAGE)).toContain(beforeRefresh);
  });

  it('mints a NEW key when the intended purchase changes', () => {
    const storage = makeStorage();
    const k1 = getOrCreateIntentKey(buildPurchaseSignature(PASS), { storage });
    const k2 = getOrCreateIntentKey(
      buildPurchaseSignature({ ...PASS, items: [{ itemType: 'membership', itemId: 'plan-2', quantity: 1 }] }),
      { storage },
    );
    expect(k2).not.toBe(k1);
  });

  it('mints a fresh key after clearIntentKey (new attempt after cancellation)', () => {
    const storage = makeStorage();
    const sig = buildPurchaseSignature(PASS);
    const k1 = getOrCreateIntentKey(sig, { storage });
    clearIntentKey({ storage });
    expect(storage.getItem(INTENT_KEY_STORAGE)).toBeNull();
    const k2 = getOrCreateIntentKey(sig, { storage });
    expect(k2).not.toBe(k1);
  });

  it('works with real sessionStorage and clears between tests', () => {
    const sig = buildPurchaseSignature(PASS);
    const k1 = getOrCreateIntentKey(sig);
    expect(getOrCreateIntentKey(sig)).toBe(k1);
    clearIntentKey();
    expect(sessionStorage.getItem(INTENT_KEY_STORAGE)).toBeNull();
    expect(getOrCreateIntentKey(sig)).not.toBe(k1);
  });

  it('degrades gracefully when storage throws (private mode)', () => {
    const hostile = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    const sig = buildPurchaseSignature(PASS);
    expect(() => getOrCreateIntentKey(sig, { storage: hostile })).not.toThrow();
    expect(() => clearIntentKey({ storage: hostile })).not.toThrow();
  });

  it('ignores corrupt storage contents', () => {
    const storage = makeStorage();
    storage.setItem(INTENT_KEY_STORAGE, '{not json');
    const k = getOrCreateIntentKey(buildPurchaseSignature(PASS), { storage });
    expect(k).toMatch(/^pay_/);
  });
});