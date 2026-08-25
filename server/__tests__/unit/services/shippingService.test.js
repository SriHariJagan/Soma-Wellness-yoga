import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── Mocks ──────────────────────────────────────────────
const rules = []; // active rules, sorted by priority desc (as ShippingRule.find would)

jest.unstable_mockModule('../../../models/ShippingRule.js', () => ({
  default: {
    find: jest.fn(() => ({
      sort: jest.fn(() => ({
        lean: jest.fn(async () => [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0))),
      })),
    })),
  },
}));

const settingsState = { bookStoreShipping: {} };
jest.unstable_mockModule('../../../models/Settings.js', () => ({
  default: {
    getSingleton: jest.fn(async () => settingsState),
  },
}));

const { checkAvailability, calculateShipping, getShippingSettings } = await import('../../../services/shippingService.js');

const rule = (overrides = {}) => ({
  _id: 'r1',
  name: 'Rule',
  priority: 0,
  country: 'India',
  states: [],
  allowedPincodes: [],
  blockedPincodes: [],
  pincodeRanges: [],
  shippingType: 'flat',
  shippingAmount: 60,
  freeShippingThreshold: 0,
  deliveryMinDays: 3,
  deliveryMaxDays: 5,
  ...overrides,
});

describe('shippingService — checkAvailability', () => {
  beforeEach(() => {
    rules.length = 0;
    settingsState.bookStoreShipping = {};
  });

  it('rejects an invalid PIN code', async () => {
    const result = await checkAvailability({ pincode: '12345', state: 'Karnataka' });
    expect(result.available).toBe(false);
    expect(result.reason).toContain('valid 6-digit');
  });

  it('falls back to default settings when no rules exist', async () => {
    const result = await checkAvailability({ pincode: '560001', state: 'Karnataka' });
    expect(result.available).toBe(true);
    expect(result.shippingAmount).toBe(60);
    expect(result.deliveryMinDays).toBe(3);
  });

  it('allows delivery with default terms when rules exist but none matches', async () => {
    rules.push(rule({ name: 'Only Karnataka', states: ['Karnataka'], shippingAmount: 40 }));
    const result = await checkAvailability({ pincode: '400001', state: 'Maharashtra' });
    expect(result.available).toBe(true);
    expect(result.shippingAmount).toBe(60);
  });

  it('matches a default rule when nothing else matches', async () => {
    rules.push(rule({ country: '*', shippingAmount: 60 }));
    const result = await checkAvailability({ pincode: '560001', state: 'Karnataka' });
    expect(result.available).toBe(true);
    expect(result.shippingAmount).toBe(60);
  });

  it('a blocked PIN always wins over an allowed PIN at the same specificity', async () => {
    rules.push(rule({ name: 'Block PIN', blockedPincodes: ['560001'], shippingType: 'unavailable', priority: 10 }));
    rules.push(rule({ name: 'Allow PIN', allowedPincodes: ['560001'], shippingAmount: 30, priority: 20 }));
    const result = await checkAvailability({ pincode: '560001', state: 'Karnataka' });
    expect(result.available).toBe(false);
  });

  it('a specific PIN overrides a more general state rule (priority ignored across specificity)', async () => {
    rules.push(rule({ name: 'State rule', states: ['Karnataka'], shippingAmount: 200, priority: 99 }));
    rules.push(rule({ name: 'PIN rule', allowedPincodes: ['560001'], shippingAmount: 0, shippingType: 'free', priority: 1 }));
    const result = await checkAvailability({ pincode: '560001', state: 'Karnataka' });
    expect(result.available).toBe(true);
    expect(result.shippingAmount).toBe(0);
    expect(result.ruleName).toBe('PIN rule');
  });

  it('a PIN range beats a state rule', async () => {
    rules.push(rule({ name: 'State rule', states: ['Karnataka'], shippingAmount: 200 }));
    rules.push(rule({ name: 'Range rule', pincodeRanges: [{ from: '560000', to: '560099' }], shippingAmount: 40 }));
    const result = await checkAvailability({ pincode: '560045', state: 'Karnataka' });
    expect(result.available).toBe(true);
    expect(result.shippingAmount).toBe(40);
  });

  it('an allowlist only overrides terms — other PINs fall back to the store defaults', async () => {
    rules.push(rule({ name: 'PIN rule', allowedPincodes: ['560001'], shippingAmount: 40 }));
    const inside = await checkAvailability({ pincode: '560001', state: 'Karnataka' });
    expect(inside.available).toBe(true);
    expect(inside.shippingAmount).toBe(40);
    const outside = await checkAvailability({ pincode: '560045', state: 'Karnataka' });
    expect(outside.available).toBe(true);
    expect(outside.shippingAmount).toBe(60);
  });

  it('admin priority only breaks ties between rules of the same specificity', async () => {
    rules.push(rule({ name: 'Low priority state', states: ['Karnataka'], shippingAmount: 90, priority: 1 }));
    rules.push(rule({ name: 'High priority state', states: ['Karnataka'], shippingAmount: 25, priority: 99 }));
    const result = await checkAvailability({ pincode: '560001', state: 'Karnataka' });
    expect(result.shippingAmount).toBe(25);
  });

  it('inactive rules are ignored', async () => {
    // The mock's find() ignores status — emulate filtering by only pushing active rules,
    // and verify the service filters via the query (status: 'active' is part of the query).
    const { find } = (await import('../../../models/ShippingRule.js')).default;
    rules.push(rule({ country: '*', shippingAmount: 60 }));
    const filter = find.mock.calls[find.mock.calls.length - 1][0];
    expect(filter.status).toBe('active');
    const result = await checkAvailability({ pincode: '560001', state: 'Karnataka' });
    expect(result.available).toBe(true);
  });

  it('an "unavailable" rule blocks delivery', async () => {
    rules.push(rule({ name: 'No delivery', states: ['Jammu and Kashmir'], shippingType: 'unavailable' }));
    const result = await checkAvailability({ pincode: '194101', state: 'Jammu and Kashmir' });
    expect(result.available).toBe(false);
    expect(result.reason).toContain('unavailable');
  });

  it('a "free" rule ships at zero cost', async () => {
    rules.push(rule({ name: 'Free zone', states: ['Delhi'], shippingType: 'free' }));
    const result = await checkAvailability({ pincode: '110001', state: 'Delhi' });
    expect(result.available).toBe(true);
    expect(result.shippingAmount).toBe(0);
  });

  it('country-only rules match the right country and miss others', async () => {
    rules.push(rule({ name: 'Nepal', country: 'Nepal', shippingAmount: 500 }));
    const ok = await checkAvailability({ pincode: '446001', state: 'Bagmati', country: 'Nepal' });
    expect(ok.available).toBe(true);
    expect(ok.shippingAmount).toBe(500);
    const miss = await checkAvailability({ pincode: '560001', state: 'Karnataka', country: 'India' });
    expect(miss.available).toBe(true);
    expect(miss.shippingAmount).toBe(60);
  });
});

describe('shippingService — calculateShipping & settings', () => {
  beforeEach(() => {
    rules.length = 0;
    settingsState.bookStoreShipping = {};
  });

  it('applies the default settings when no rule provides values', async () => {
    rules.push(rule({ country: '*', shippingAmount: 60, freeShippingThreshold: 0, deliveryMinDays: 0, deliveryMaxDays: 0 }));
    const result = await calculateShipping(500, { pincode: '560001', state: 'Karnataka' });
    expect(result.deliveryMinDays).toBe(3);
    expect(result.deliveryMaxDays).toBe(5);
    expect(result.shippingCharge).toBe(60);
  });

  it('applies the free-shipping threshold against the post-discount subtotal', async () => {
    rules.push(rule({ country: '*', shippingAmount: 60, freeShippingThreshold: 499 }));
    const under = await calculateShipping(400, { pincode: '560001', state: 'Karnataka' });
    expect(under.shippingCharge).toBe(60);
    const at = await calculateShipping(499, { pincode: '560001', state: 'Karnataka' });
    expect(at.shippingCharge).toBe(0);
    const over = await calculateShipping(900, { pincode: '560001', state: 'Karnataka' });
    expect(over.shippingCharge).toBe(0);
  });

  it('a rule-level threshold wins over the global setting', async () => {
    settingsState.bookStoreShipping = { freeShippingThreshold: 1000 };
    rules.push(rule({ country: '*', shippingAmount: 60, freeShippingThreshold: 300 }));
    const result = await calculateShipping(500, { pincode: '560001', state: 'Karnataka' });
    expect(result.shippingCharge).toBe(0);
  });

  it('getShippingSettings merges defaults with persisted values', async () => {
    settingsState.bookStoreShipping = { defaultShippingCharge: 99, deliveryMinDays: 2 };
    const settings = await getShippingSettings();
    expect(settings).toEqual({ freeShippingThreshold: 0, defaultShippingCharge: 99, deliveryMinDays: 2, deliveryMaxDays: 5 });
  });
});
