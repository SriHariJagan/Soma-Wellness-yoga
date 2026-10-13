import { jest, describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import mongoose from 'mongoose';

// ── In-memory Redis for IdempotencyPlugin ─────────────────────
const redisStore = new Map();
const mockIORedis = {
  set: jest.fn(async (key, val, ...args) => {
    if (args.includes('NX') && redisStore.has(key)) return null;
    redisStore.set(key, val);
    return 'OK';
  }),
  get: jest.fn(async (key) => redisStore.get(key)),
  del: jest.fn(async (key) => redisStore.delete(key)),
  quit: jest.fn(async () => {}),
  on: jest.fn(),
  status: 'ready',
};
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
jest.unstable_mockModule('../../../notification/logger.js', () => ({ default: mockLogger }));

jest.unstable_mockModule('../../../notification/queue/connection.js', () => ({
  getRedisConnection: () => mockIORedis,
  getSubscriberConnection: () => mockIORedis,
  closeRedisConnections: async () => {},
  isRedisReady: () => true,
  pingRedis: async () => true,
}));

jest.unstable_mockModule('../../../notification/core/NotificationService.js', () => ({
  default: { send: jest.fn(async () => ({ ok: true })) },
}));

jest.unstable_mockModule('../../../services/email/email.service.js', () => ({
  default: {
    sendInvoice: jest.fn(async () => ({})),
    sendPaymentSuccess: jest.fn(async () => ({})),
    sendPaymentReceivedAdmin: jest.fn(async () => ({})),
    sendPaymentFailed: jest.fn(async () => ({})),
  },
}));

jest.unstable_mockModule('../../../services/bookEmailService.js', () => ({
  notifyBookOrderPaid: jest.fn(async () => {}),
  notifyBookOrderPaymentFailed: jest.fn(async () => {}),
  sendOrderPacked: jest.fn(async () => ({})),
  sendOrderDispatched: jest.fn(async () => ({})),
  sendOrderDelivered: jest.fn(async () => ({})),
  sendOrderCancelled: jest.fn(async () => ({})),
}));

jest.unstable_mockModule('../../../payment/services/finalizePurchase.js', () => ({
  finalizePurchase: jest.fn(async () => {}),
}));

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};
mongoose.startSession = jest.fn(async () => mockSession);

function mockMinModel() {
  const Model = function (d) { Object.assign(this, d); };
  Model.create = async (d) => ({ _id: new mongoose.Types.ObjectId(), ...(Array.isArray(d) ? d[0] : d) });
  Model.findOne = async () => null;
  Model.findById = async () => null;
  Model.findOneAndUpdate = async () => null;
  Model.findByIdAndUpdate = async () => null;
  Model.updateMany = async () => ({ modifiedCount: 0 });
  Model.countDocuments = async () => 0;
  Model.find = async () => [];
  return Model;
}

jest.unstable_mockModule('../../../models/ActivityLog.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/Membership.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/UserService.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/Plan.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/Service.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/Workshop.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/Consultation.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/Booking.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/Order.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/Settings.js', () => ({ default: mockMinModel() }));

jest.unstable_mockModule('../../../models/User.js', () => ({
  default: {
    findById: jest.fn(() => ({
      select: () => ({ lean: async () => ({ name: 'Test User', email: 'test@example.com', phone: '254700000000' }) }),
    })),
  },
}));

jest.unstable_mockModule('../../../payment/models/WebhookEvent.js', () => ({
  default: {
    findOne: () => ({ lean: async () => null, then: (res) => Promise.resolve(null).then(res) }),
    create: jest.fn(async () => ({})),
    updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
  },
}));

// ── In-memory Payment store with UNIQUE idempotencyKey ────────
// Mirrors the real unique index on Payment.idempotencyKey so the tests
// exercise the actual database-level guarantee.
const paymentStore = [];
let uniqueViolation = false;

function matchesPayment(doc, filter) {
  for (const [k, v] of Object.entries(filter)) {
    if (k === '$or') {
      if (!Array.isArray(v) || !v.some((cond) => matchesPayment(doc, cond))) return false;
      continue;
    }
    if (v && typeof v === 'object' && '$in' in v) {
      if (!v.$in.map(String).includes(String(doc[k]))) return false;
      continue;
    }
    if (v && typeof v === 'object' && '$lt' in v) {
      if (!(doc[k] != null && doc[k] < v.$lt)) return false;
      continue;
    }
    if (v === null && doc[k] != null) return false;
    if (String(doc[k]) !== String(v)) return false;
  }
  return true;
}

function mockPaymentModel() {
  const Model = function (data) { Object.assign(this, data); };
  Model.create = async function (data) {
    if (uniqueViolation && data.idempotencyKey) {
      const dup = paymentStore.find((p) => p.idempotencyKey === data.idempotencyKey);
      if (dup) {
        const err = new Error('E11000 duplicate key error collection: payments index: idempotencyKey_1');
        err.code = 11000;
        throw err;
      }
    }
    if (data.idempotencyKey) {
      const dup = paymentStore.find((p) => p.idempotencyKey === data.idempotencyKey);
      if (dup) {
        const err = new Error('E11000 duplicate key error collection: payments index: idempotencyKey_1');
        err.code = 11000;
        throw err;
      }
    }
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      ...data,
      paymentStatus: data.paymentStatus ?? null,
      providerSubmissionClaimedAt: data.providerSubmissionClaimedAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lockVersion: 0,
      auditTrail: data.auditTrail || [],
      items: data.items || [],
      refunds: [],
      attempts: data.attempts || [],
      webhookEvents: [],
    };
    paymentStore.push(doc);
    return doc;
  };
  // Queries hand back a COPY, as a real Mongo driver does. This is what lets
  // the DEF-005 read-fallback test prove that normalizing a null status in
  // memory does not persist anything.
  const clone = (doc) => (doc ? { ...doc } : doc);
  Model.findById = async function (id) {
    const s = String(id);
    return clone(paymentStore.find((p) => String(p._id) === s) || null);
  };
  Model.findOneAndUpdate = async function (filter, update, opts = {}) {
    const idx = paymentStore.findIndex((p) => {
      if (filter._id && String(p._id) !== String(filter._id)) return false;
      if (filter.paymentStatus != null) {
        if (typeof filter.paymentStatus === 'object' && filter.paymentStatus.$in) {
          if (!filter.paymentStatus.$in.includes(p.paymentStatus)) return false;
        } else if (p.paymentStatus !== filter.paymentStatus) return false;
      }
      if (filter.$or && !filter.$or.some((c) => matchesPayment(p, c))) return false;
      return true;
    });
    if (idx === -1) return null;
    const doc = paymentStore[idx];
    if (update.$set) Object.assign(doc, update.$set);
    if (update.$push) {
      for (const [k, v] of Object.entries(update.$push)) {
        if (!doc[k]) doc[k] = [];
        doc[k].push(v);
      }
    }
    if (update.$inc) { for (const [k, v] of Object.entries(update.$inc)) doc[k] = (doc[k] || 0) + v; }
    doc.updatedAt = new Date();
    return opts.new ? doc : doc;
  };
  Model.findByIdAndUpdate = async function (id, update, opts = {}) {
    return Model.findOneAndUpdate({ _id: id }, update, opts);
  };
  Model.findOne = function (filter) {
    const result = clone(paymentStore.find((p) => matchesPayment(p, filter)) || null);
    return { lean: () => Promise.resolve(result), then: (r, j) => Promise.resolve(result).then(r, j) };
  };
  Model.updateMany = async function () { return { modifiedCount: 0 }; };
  Model.countDocuments = async () => paymentStore.length;
  Model.find = async () => paymentStore;
  Model.findByRazorpayOrderId = async () => null;
  Model.findByIdempotencyKey = async function (key) {
    return clone(paymentStore.find((p) => p.idempotencyKey === key) || null);
  };
  return Model;
}

jest.unstable_mockModule('../../../payment/models/Payment.js', () => ({ default: mockPaymentModel() }));

function mockProvider(overrides = {}) {
  return {
    name: 'pesapal',
    isConfigured: true,
    createOrder: jest.fn(async ({ payment }) => ({
      providerOrderId: `track-${String(payment._id).slice(-6)}`,
      checkoutId: `track-${String(payment._id).slice(-6)}`,
      redirectUrl: 'https://cybqa.pesapal.com/iframe?OrderTrackingId=track-x',
      merchantReference: payment.merchant_reference,
      raw: { status: '200', redirect_url: 'https://cybqa.pesapal.com/iframe?OrderTrackingId=track-x' },
    })),
    getTransactionStatus: jest.fn(async () => ({ status: 'pending', statusDescription: 'Pending' })),
    mapStatus: jest.fn((s) => {
      const v = String(s || '').toUpperCase();
      if (v === 'COMPLETED' || v === '1') return 'captured';
      if (v === 'FAILED' || v === '2' || v === 'REVERSED' || v === 'INVALID') return 'failed';
      return 'pending';
    }),
    parseCallback: jest.fn(() => ({})),
    ...overrides,
  };
}

let PaymentService;
let normalizePaymentStatus;
let purchaseFingerprint;

beforeAll(async () => {
  const PS = await import('../../../payment/PaymentService.js');
  PaymentService = PS.PaymentService;
  normalizePaymentStatus = PS.normalizePaymentStatus;
  purchaseFingerprint = PS.purchaseFingerprint;
});

beforeEach(() => {
  paymentStore.length = 0;
  redisStore.clear();
  uniqueViolation = false;
  jest.clearAllMocks();
});

afterAll(() => { jest.restoreAllMocks(); });

const CUSTOMER = { email: 'test@example.com', phone: '254700000000' };
const uid = () => new mongoose.Types.ObjectId();

function makeSvc(overrides = {}) {
  const svc = new PaymentService({ provider: mockProvider(overrides) });
  svc.orderService.resolveItems = jest.fn(async (items) => items);
  return svc;
}

const PASS_ITEMS = [
  { itemType: 'membership', itemId: 'plan-1', name: 'Pass', quantity: 1, unitPrice: 50000, totalPrice: 50000 },
];
const OTHER_ITEMS = [
  { itemType: 'membership', itemId: 'plan-2', name: 'Upgrade', quantity: 1, unitPrice: 90000, totalPrice: 90000 },
];

// ══════════════════════════════════════════════════════════════
describe('DEF-006 — duplicate Pesapal payment intents', () => {
  describe('stable idempotency key reuse (retry / refresh / double-click)', () => {
    it('reuses ONE intent when the same key is replayed for the same purchase', async () => {
      const svc = makeSvc();
      const user = uid();
      const key = 'pay_stable_1';

      const first = await svc.initiate({ user, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key, customer: CUSTOMER });
      const second = await svc.initiate({ user, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key, customer: CUSTOMER });

      expect(String(second.payment._id)).toBe(String(first.payment._id));
      expect(String(second.payment.merchant_reference)).toBe(String(first.payment.merchant_reference));
      // ONE logical intent in the store
      expect(paymentStore).toHaveLength(1);
      // ONE provider order submitted — no duplicate Pesapal order
      expect(svc.provider.createOrder).toHaveBeenCalledTimes(1);
    });

    it('replays an already-pending intent instead of re-submitting to the provider', async () => {
      const svc = makeSvc();
      const user = uid();
      const key = 'pay_pending_1';

      const first = await svc.initiate({ user, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key, customer: CUSTOMER });
      const second = await svc.initiate({ user, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key, customer: CUSTOMER });

      expect(first.idempotent).toBe(false);
      expect(second.idempotent).toBe(true);
      expect(second.orderTrackingId).toBe(first.orderTrackingId);
      expect(svc.provider.createOrder).toHaveBeenCalledTimes(1);
      expect(paymentStore).toHaveLength(1);
    });
  });

  describe('concurrent duplicate initiation', () => {
    it('produces ONE intent when 5 identical requests race (Redis lock contention)', async () => {
      const svc = makeSvc();
      const user = uid();
      const key = 'pay_race_1';

      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () =>
          svc.initiate({ user, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key, customer: CUSTOMER })),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);

      // Exactly ONE logical payment intent exists.
      expect(paymentStore).toHaveLength(1);
      const stored = paymentStore[0];
      expect(stored.idempotencyKey).toBe(key);
      expect(stored.merchant_reference).toMatch(/^PAY-/);

      // Exactly ONE provider order was created for that intent.
      expect(svc.provider.createOrder).toHaveBeenCalledTimes(1);
    });

    it('survives the unique-index race when Redis is unavailable (no lock)', async () => {
      const svc = makeSvc();
      // Simulate Redis being down: the plugin degrades to "lock acquired".
      svc.idempotency.redis = {
        set: jest.fn(async () => { throw new Error('ECONNREFUSED'); }),
        del: jest.fn(async () => {}),
      };
      const user = uid();
      const key = 'pay_no_redis_1';

      const results = await Promise.allSettled(
        Array.from({ length: 3 }, () =>
          svc.initiate({ user, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key, customer: CUSTOMER })),
      );

      expect(paymentStore).toHaveLength(1);
      // The losers must replay the winner, not surface a 500.
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(rejected).toHaveLength(0);
      expect(svc.provider.createOrder).toHaveBeenCalledTimes(1);
    });

    it('replays rather than throwing when the unique index rejects the insert', async () => {
      const svc = makeSvc();
      svc.idempotency.redis = {
        set: jest.fn(async () => { throw new Error('ECONNREFUSED'); }),
        del: jest.fn(async () => {}),
      };
      const user = uid();
      const key = 'pay_e11000_1';

      // Pre-create the intent the winner would have created.
      await svc._doInitiateIntent(user, PASS_ITEMS, 'Pass', '', key);

      // A concurrent loser now reaches create() and loses the unique race.
      const replay = await svc.initiateIntent({ user, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key });

      expect(paymentStore).toHaveLength(1);
      expect(String(replay._id)).toBe(String(paymentStore[0]._id));
      expect(replay.idempotencyKey).toBe(key);
    });
  });

  describe('owner isolation', () => {
    it('rejects a key replayed by a different authenticated owner', async () => {
      const svc = makeSvc();
      const owner = uid();
      const attacker = uid();
      const key = 'pay_owner_1';

      await svc.initiate({ user: owner, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key, customer: CUSTOMER });

      await expect(
        svc.initiate({ user: attacker, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key, customer: CUSTOMER }),
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(paymentStore).toHaveLength(1);
      expect(paymentStore[0].user).toBe(owner);
    });

    it('rejects a key replayed with a different amount (mismatched payload)', async () => {
      const svc = makeSvc();
      const user = uid();
      const key = 'pay_payload_1';

      await svc.initiate({ user, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key, customer: CUSTOMER });

      await expect(
        svc.initiate({ user, items: OTHER_ITEMS, label: 'Upgrade', idempotencyKey: key, customer: CUSTOMER }),
      ).rejects.toMatchObject({ statusCode: 409 });

      expect(paymentStore).toHaveLength(1);
      expect(paymentStore[0].amount).toBe(50000);
    });

    it('binds createIntent (cart/book) to the owner and amount too', async () => {
      const svc = makeSvc();
      const owner = uid();
      const attacker = uid();
      const key = 'chk_owner_1';

      const first = await svc.createIntent({ user: owner, items: PASS_ITEMS, amount: 50000, idempotencyKey: key });
      const replay = await svc.createIntent({ user: owner, items: PASS_ITEMS, amount: 50000, idempotencyKey: key });
      expect(String(replay._id)).toBe(String(first._id));

      await expect(
        svc.createIntent({ user: attacker, items: PASS_ITEMS, amount: 50000, idempotencyKey: key }),
      ).rejects.toMatchObject({ statusCode: 403 });

      await expect(
        svc.createIntent({ user: owner, items: OTHER_ITEMS, amount: 99999, idempotencyKey: key }),
      ).rejects.toMatchObject({ statusCode: 409 });

      expect(paymentStore).toHaveLength(1);
    });
  });

  describe('pending-intent reuse vs. eligible new attempts', () => {
    it('reuses a compatible pending intent', async () => {
      const svc = makeSvc();
      const user = uid();
      const key = 'pay_reuse_1';
      const first = await svc.initiate({ user, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key, customer: CUSTOMER });
      expect(paymentStore[0].paymentStatus).toBe('pending');

      const again = await svc.initiate({ user, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key, customer: CUSTOMER });
      expect(again.payment.paymentStatus).toBe('pending');
      expect(again.orderTrackingId).toBe(first.orderTrackingId);
      expect(svc.provider.createOrder).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['failed', { failure_reason: 'declined' }],
      ['expired', {}],
      ['captured', { capturedAt: new Date(), invoiceNo: 'INV-1' }],
    ])('requires a NEW key once the previous attempt is "%s"', async (terminalStatus, extra) => {
      const svc = makeSvc();
      const user = uid();
      const key = `pay_terminal_${terminalStatus}`;

      await svc.initiate({ user, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key, customer: CUSTOMER });
      Object.assign(paymentStore[0], { paymentStatus: terminalStatus }, extra);

      // The retired key is refused with a clear, actionable error...
      await expect(
        svc.initiate({ user, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key, customer: CUSTOMER }),
      ).rejects.toMatchObject({ statusCode: 409, code: 'IDEMPOTENCY_KEY_RETIRED' });

      // ...and a genuinely new attempt with a fresh key succeeds.
      const retry = await svc.initiate({
        user, items: PASS_ITEMS, label: 'Pass', idempotencyKey: `${key}_retry`, customer: CUSTOMER,
      });
      expect(retry.payment.paymentStatus).toBe('pending');
      expect(paymentStore).toHaveLength(2);
    });
  });

  describe('concurrent createProviderOrder (double submit to Pesapal)', () => {
    it('lets only ONE request submit an order for one intent', async () => {
      const svc = makeSvc();
      const user = uid();

      const intent = await svc.initiateIntent({ user, items: PASS_ITEMS, label: 'Pass' });
      expect(intent.paymentStatus).toBe('initiated');

      const results = await Promise.allSettled([
        svc.createProviderOrder({ paymentId: intent._id, user, customer: CUSTOMER }),
        svc.createProviderOrder({ paymentId: intent._id, user, customer: CUSTOMER }),
      ]);

      expect(svc.provider.createOrder).toHaveBeenCalledTimes(1);
      const ok = results.filter((r) => r.status === 'fulfilled');
      expect(ok.length).toBeGreaterThanOrEqual(1);
      // Everyone gets the SAME order — the winner created it, the loser
      // replayed it — but only one of them actually created it.
      for (const r of ok) {
        expect(r.value.orderTrackingId).toBe(`track-${String(intent._id).slice(-6)}`);
      }
      const created = ok.filter((r) => r.value.idempotent === false);
      const replayed = ok.filter((r) => r.value.idempotent === true);
      expect(created).toHaveLength(1);
      expect(replayed).toHaveLength(ok.length - 1);
    });

    it('releases the claim after a provider failure so a retry is allowed', async () => {
      let failNext = true;
      const svc = makeSvc({
        createOrder: jest.fn(async ({ payment }) => {
          if (failNext) {
            failNext = false;
            throw new Error('Pesapal API error (500): upstream unavailable');
          }
          return {
            providerOrderId: `track-${String(payment._id).slice(-6)}`,
            checkoutId: `track-${String(payment._id).slice(-6)}`,
            redirectUrl: 'https://cybqa.pesapal.com/iframe?OrderTrackingId=track-y',
            merchantReference: payment.merchant_reference,
            raw: {},
          };
        }),
      });
      const user = uid();
      const intent = await svc.initiateIntent({ user, items: PASS_ITEMS, label: 'Pass' });

      // First attempt fails at the provider.
      await expect(
        svc.createProviderOrder({ paymentId: intent._id, user, customer: CUSTOMER }),
      ).rejects.toThrow(/Pesapal order submission failed/);
      expect(paymentStore[0].providerSubmissionClaimedAt).toBeNull();

      // The retry is allowed and succeeds — still ONE intent.
      const retry = await svc.createProviderOrder({ paymentId: intent._id, user, customer: CUSTOMER });
      expect(retry.payment.paymentStatus).toBe('pending');
      expect(paymentStore).toHaveLength(1);
      expect(svc.provider.createOrder).toHaveBeenCalledTimes(2);
    });
  });

  describe('no duplicate downstream effects', () => {
    it('a duplicated initiation leads to exactly one capture, invoice and fulfillment', async () => {
      const svc = makeSvc();
      const user = uid();
      const key = 'pay_once_1';

      const first = await svc.initiate({ user, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key, customer: CUSTOMER });
      // Rapid double-click + refresh retry with the SAME key.
      await svc.initiate({ user, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key, customer: CUSTOMER });
      await svc.initiate({ user, items: PASS_ITEMS, label: 'Pass', idempotencyKey: key, customer: CUSTOMER });

      expect(paymentStore).toHaveLength(1);
      expect(svc.provider.createOrder).toHaveBeenCalledTimes(1);

      const ref = first.payment.merchant_reference;
      svc.provider.getTransactionStatus = jest.fn(async () => ({
        status: 'completed',
        statusDescription: 'Completed',
        amountMinor: 50000,
        currency: 'KES',
        merchantReference: ref,
        confirmationCode: 'CONF-ONCE',
        paymentMethod: 'M-PESA',
        raw: {},
      }));
      const generateInvoiceNumber = jest.fn(async () => 'INV-ONCE-1');
      svc.invoiceService.generateInvoiceNumber = generateInvoiceNumber;
      const activateItem = jest.fn(async () => {});
      svc.fulfillmentService.activateItem = activateItem;

      // Webhook + return-URL + manual retry all verifying the same payment.
      await svc.verifyAndCapture({ merchantReference: ref, user });
      await svc.verifyAndCapture({ merchantReference: ref, user });
      await svc.verifyAndCapture({ merchantReference: ref, user });

      // One capture, one invoice, one fulfillment pass.
      expect(activateItem).toHaveBeenCalledTimes(1);
      expect(generateInvoiceNumber).toHaveBeenCalledTimes(1);
      expect(paymentStore[0].paymentStatus).toBe('captured');
      expect(paymentStore[0].invoiceNo).toBe('INV-ONCE-1');
      expect(paymentStore[0].provider_transaction_id).toBe('CONF-ONCE');
    });
  });

  describe('purchaseFingerprint', () => {
    it('is order-independent and value-sensitive', () => {
      const a = purchaseFingerprint([
        { itemType: 'membership', itemId: 'x', quantity: 1 },
        { itemType: 'service', itemId: 'y', quantity: 2 },
      ]);
      const b = purchaseFingerprint([
        { itemType: 'service', itemId: 'y', quantity: 2 },
        { itemType: 'membership', itemId: 'x', quantity: 1 },
      ]);
      const c = purchaseFingerprint([{ itemType: 'membership', itemId: 'x', quantity: 3 }]);
      expect(a).toBe(b);
      expect(a).not.toBe(c);
    });
  });
});

// ══════════════════════════════════════════════════════════════
describe('DEF-005 — legacy payments with a null paymentStatus', () => {
  it.each([
    ['captured', { capturedAt: new Date() }],
    ['captured', { invoiceNo: 'INV-9' }],
    ['refunded', { refundedAt: new Date() }],
    ['failed', { failedAt: new Date() }],
    ['failed', { failure_reason: 'declined' }],
    ['expired', { expiredAt: new Date() }],
    ['pending', { provider_checkout_id: 'track-abc' }],
    ['initiated', {}],
  ])('derives "%s" from historical fields only', (expected, fields) => {
    expect(normalizePaymentStatus({ paymentStatus: null, ...fields })).toBe(expected);
  });

  it('never overrides an already-populated status', () => {
    expect(normalizePaymentStatus({ paymentStatus: 'captured', capturedAt: new Date() })).toBe('captured');
    expect(normalizePaymentStatus({ paymentStatus: 'pending', provider_checkout_id: 't' })).toBe('pending');
  });

  it('prefers refunded over captured over failed (most-specific first)', () => {
    expect(normalizePaymentStatus({
      paymentStatus: null, refundedAt: new Date(), capturedAt: new Date(), failedAt: new Date(),
    })).toBe('refunded');
    expect(normalizePaymentStatus({
      paymentStatus: null, capturedAt: new Date(), failedAt: new Date(),
    })).toBe('captured');
  });

  it('normalizes on read without writing to the database', async () => {
    const svc = makeSvc();
    const user = uid();
    const intent = await svc.initiateIntent({ user, items: PASS_ITEMS, label: 'Pass' });
    await svc.createProviderOrder({ paymentId: intent._id, user, customer: CUSTOMER });

    // Simulate a legacy row: status nulled out but all evidence intact.
    paymentStore[0].paymentStatus = null;

    const result = await svc.getStatus({ paymentId: intent._id, user });
    expect(result.payment.paymentStatus).toBe('pending');
    // Still null in the store — the read fallback never persists.
    expect(paymentStore[0].paymentStatus).toBeNull();
  });
});