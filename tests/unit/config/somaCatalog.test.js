import { describe, it, expect } from 'vitest';
import {
  PUBLIC_CATALOG,
  PUBLIC_SERVICE_NAMES,
  RETIRED_SERVICE_NAMES,
  RETIRED_OFFERING_NAMES,
} from '../../../server/config/publicCatalog.js';
import { SOMA_RESET, PAY_AHEAD_PRICING, SOMA_SERVICES } from '../../../server/config/somaCatalog.js';

/**
 * DEF-007 — locks the catalog rule that SOMA 360 is a RETIRED name and
 * SOMA RESET (KES 32,000) is the live KES 32,000 product, so a future change
 * cannot silently reintroduce or rename a retired offering.
 */
describe('DEF-007 — SOMA 360 (retired) vs SOMA RESET (live)', () => {
  it('lists SOMA 360 as a RETIRED service name', () => {
    expect(RETIRED_SERVICE_NAMES).toContain('SOMA 360');
  });

  it('does NOT list SOMA 360 in the live public catalog', () => {
    expect(PUBLIC_SERVICE_NAMES).not.toContain('SOMA 360');
    expect(PUBLIC_CATALOG.some((s) => /SOMA\s*360/i.test(s.name))).toBe(false);
    expect(SOMA_SERVICES.some((s) => /SOMA\s*360/i.test(s.name))).toBe(false);
  });

  it('does NOT list SOMA 360 as a live offering either', () => {
    expect(RETIRED_OFFERING_NAMES).not.toContain('SOMA 360');
    expect(PUBLIC_CATALOG.some((s) => /SOMA\s*360/i.test(s.name))).toBe(false);
  });

  it('SOMA RESET is the live KES 32,000 offering', () => {
    expect(SOMA_RESET.label).toBe('SOMA RESET');
    expect(SOMA_RESET.price).toBe(32000);
    expect(SOMA_RESET.includes).toMatchObject({
      assessment: 1,
      yogaSessions: 12,
      meditation: 6,
      massages60: 2,
      homePlan: 1,
      closingReview: 1,
    });
  });

  it('has no SOMA 360 entry anywhere in the live catalog or program config', () => {
    expect(PUBLIC_SERVICE_NAMES.some((n) => /360/.test(n))).toBe(false);
    expect(JSON.stringify(SOMA_SERVICES)).not.toMatch(/SOMA\s*360/i);
  });

  it('SOMA RESET is delivered as a program constant, not a PUBLIC_CATALOG service', () => {
    // SOMA RESET is served through somaController/somaCatalog (the RESET
    // program), not through the bookable-service PUBLIC_CATALOG. Asserting the
    // real shape here prevents a future "fix" from inventing a SOMA 360 entry.
    expect(PUBLIC_SERVICE_NAMES.some((n) => /SOMA RESET/i.test(n))).toBe(false);
    expect(SOMA_RESET.label).toBe('SOMA RESET');
  });

  it('keeps the legacy long-form RESET offering name retired (synonym, not the live product)', () => {
    expect(RETIRED_OFFERING_NAMES).toContain('SOMA RESET \u2014 The Mindful Body Reset');
    expect(SOMA_RESET.label).not.toBe('SOMA RESET \u2014 The Mindful Body Reset');
  });

  it('does not confuse the JUA 3-month pay-ahead total with SOMA RESET', () => {
    // Both happen to be KES 32,000. They are different products.
    expect(PAY_AHEAD_PRICING.JUA[3]).toBe(32000);
    expect(SOMA_RESET.price).toBe(32000);
    expect(SOMA_RESET.label).not.toContain('JUA');
  });

  it('keeps SOMA 360 out of the retired-name list only once (no duplicate entries)', () => {
    const count = RETIRED_SERVICE_NAMES.filter((n) => n === 'SOMA 360').length;
    expect(count).toBe(1);
  });
});

/**
 * DEF-001 — the frontend pricing table must keep matching the approved
 * server catalog, which is the single source of truth for KES pricing.
 */
describe('DEF-001 — frontend pricing mirrors the approved catalog', () => {
  it('mirrors PAY_AHEAD_PRICING exactly', async () => {
    const frontend = await import('../../../src/lib/pricing.js');
    expect(frontend.PAY_AHEAD_PRICING).toEqual(PAY_AHEAD_PRICING);
  });

  it('mirrors FOUNDING_MONTHLY exactly', async () => {
    const frontend = await import('../../../src/lib/pricing.js');
    expect(frontend.FOUNDING_MONTHLY).toEqual({
      JUA: 10000, AMANI: 13500, UZIMA: 19000, FAMILY: 28500,
    });
  });

  it('mirrors TIER_MONTHLY exactly', async () => {
    const frontend = await import('../../../src/lib/pricing.js');
    expect(frontend.TIER_MONTHLY).toEqual({
      JUA: 12000, AMANI: 16500, UZIMA: 22500, FAMILY: 35000,
    });
  });
});