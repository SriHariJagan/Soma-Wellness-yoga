import { describe, it, expect } from '@jest/globals';
import {
  toMinor,
  toMajor,
  toPesapalAmount,
  amountsEqual,
  formatKES,
  assertCurrency,
} from '../../../utils/money.js';

describe('money utils', () => {
  it('converts major to minor units', () => {
    expect(toMinor(1500)).toBe(150000);
    expect(toMinor(1500.5)).toBe(150050);
    expect(toMinor('100.25')).toBe(10025);
  });

  it('rejects invalid or negative amounts', () => {
    expect(() => toMinor(NaN)).toThrow();
    expect(() => toMinor(-5)).toThrow();
    expect(() => toMinor('abc')).toThrow();
  });

  it('converts minor to major units', () => {
    expect(toMajor(150050)).toBe(1500.5);
    expect(toMajor(0)).toBe(0);
  });

  it('builds Pesapal major amounts with 2dp', () => {
    expect(toPesapalAmount(150050)).toBe(1500.5);
    expect(toPesapalAmount(100)).toBe(1);
  });

  it('compares minor amounts strictly', () => {
    expect(amountsEqual(150050, 150050)).toBe(true);
    expect(amountsEqual(150050, 150051)).toBe(false);
  });

  it('formats KES for display', () => {
    expect(formatKES(150000)).toBe('KES 1,500.00');
  });

  it('validates currency', () => {
    expect(assertCurrency('KES')).toBe('KES');
    expect(assertCurrency('kes')).toBe('KES');
    expect(() => assertCurrency('USD')).toThrow(/Currency mismatch/);
  });
});
