import { describe, it, expect } from 'vitest';
import { COUNTRIES, DEFAULT_COUNTRY_CODE, countryNameFor } from '../../../src/data/countries.js';

describe('country list (residency selector)', () => {
  it('defaults to Kenya first', () => {
    expect(DEFAULT_COUNTRY_CODE).toBe('KE');
    expect(COUNTRIES[0]).toMatchObject({ code: 'KE', name: 'Kenya' });
  });

  it('offers Kenya first and excludes Tanzania (KE market)', () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(codes[0]).toBe('KE');
    expect(codes).not.toContain('TZ');
    expect(codes).toContain('UG');
    expect(codes).toContain('US');
  });

  it('resolves names case-insensitively', () => {
    expect(countryNameFor('ke')).toBe('Kenya');
    expect(countryNameFor(' KE ')).toBe('Kenya');
    expect(countryNameFor('XX')).toBe('');
  });

  it('has unique codes', () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
