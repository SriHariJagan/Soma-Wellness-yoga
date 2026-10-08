import { describe, it, expect } from '@jest/globals';
import { generateMerchantReference, isValidMerchantReference } from '../../../utils/merchantReference.js';

describe('merchantReference', () => {
  it('generates unique Pesapal-safe references', () => {
    const a = generateMerchantReference();
    const b = generateMerchantReference();
    expect(a).not.toBe(b);
    expect(isValidMerchantReference(a)).toBe(true);
    expect(a.length).toBeLessThanOrEqual(50);
    expect(a).toMatch(/^PAY-\d{8}-[A-F0-9]{8}$/);
  });

  it('rejects invalid references', () => {
    expect(isValidMerchantReference('')).toBe(false);
    expect(isValidMerchantReference(null)).toBe(false);
    expect(isValidMerchantReference('PAY ref with spaces')).toBe(false);
    expect(isValidMerchantReference('PAY@ref#1')).toBe(false);
    expect(isValidMerchantReference('x'.repeat(51))).toBe(false);
  });
});
