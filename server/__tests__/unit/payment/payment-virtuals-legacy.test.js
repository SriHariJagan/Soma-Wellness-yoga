// Regression: legacy/raw Payment records that predate the `items` /
// `refunds` arrays must serialize without throwing. These virtuals run
// during res.json() (e.g. GET /api/student/membership/active populates
// `invoice`), and an unguarded `.length` produced:
//   500 "Cannot read properties of undefined (reading 'length')"
import { describe, it, expect } from '@jest/globals';
import Payment from '../../../payment/models/Payment.js';

describe('Payment virtuals on legacy docs (missing arrays)', () => {
  it('itemCount coerces missing items to 0 instead of throwing', () => {
    const p = Payment.hydrate({ label: 'Legacy payment', amount: 3650000 });
    delete p.items;
    expect(() => p.toJSON()).not.toThrow();
    expect(p.toJSON().itemCount).toBe(0);
  });

  it('totalRefunded / netCaptured coerce missing refunds instead of throwing', () => {
    const p = Payment.hydrate({ label: 'Legacy payment', amount: 3650000 });
    delete p.refunds;
    expect(() => p.toJSON()).not.toThrow();
    const json = p.toJSON();
    expect(json.totalRefunded).toBe(0);
    expect(json.netCaptured).toBe(3650000);
  });

  it('still computes correctly for normal docs', () => {
    const p = Payment.hydrate({
      label: 'Normal',
      amount: 3650000,
      items: [{ itemType: 'membership', unitPrice: 3650000, totalPrice: 3650000 }],
      refunds: [{ amount: 50000, status: 'processed' }],
    });
    const json = p.toJSON();
    expect(json.itemCount).toBe(1);
    expect(json.totalRefunded).toBe(50000);
    expect(json.netCaptured).toBe(3600000);
  });
});
