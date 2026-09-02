import { describe, it, expect } from 'vitest';
import { formatKES, formatKESCompact } from '../../../src/lib/currency.js';

describe('formatKES', () => {
  it('formats integer with symbol and Kenyan grouping', () => {
    expect(formatKES(12000)).toBe('KES 12,000');
    expect(formatKES(18500)).toBe('KES 18,500');
    expect(formatKES(1000000)).toBe('KES 1,000,000');
  });

  it('handles zero', () => {
    expect(formatKES(0)).toBe('KES 0');
  });

  it('coerces NaN / null / undefined to 0', () => {
    expect(formatKES(NaN)).toBe('KES 0');
    expect(formatKES(null)).toBe('KES 0');
    expect(formatKES(undefined)).toBe('KES 0');
    expect(formatKES('')).toBe('KES 0');
  });

  it('handles negative values', () => {
    expect(formatKES(-500)).toMatch(/KES.*-?500/);
  });

  it('respects decimals option', () => {
    expect(formatKES(1234.5, { decimals: 2 })).toBe('KES 1,234.50');
    expect(formatKES(1234, { decimals: 2 })).toBe('KES 1,234.00');
  });

  it('without symbol returns only number', () => {
    expect(formatKES(12000, { withSymbol: false })).toBe('12,000');
  });

  it('accepts string numeric input', () => {
    expect(formatKES('12000')).toBe('KES 12,000');
  });

  it('formats large amount (yearly total)', () => {
    expect(formatKES(315000)).toBe('KES 315,000');
  });

  it('handles decimal with 0 decimals (rounds)', () => {
    // Intl.NumberFormat rounds at 0 decimals
    expect(formatKES(1234.6, { decimals: 0 })).toBe('KES 1,235');
  });
});

describe('formatKESCompact', () => {
  it('is alias of formatKES (same output)', () => {
    expect(formatKESCompact(12000)).toBe(formatKES(12000));
    expect(formatKESCompact(0)).toBe(formatKES(0));
  });
});
