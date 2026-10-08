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

// ── In-test Redis: prevent real connections (no Redis in CI/unit env) ─
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

jest.unstable_mockModule('../../../services/bookEmailService.js', () => ({
  notifyBookOrderPaid: jest.fn(async () => {}),
  notifyBookOrderPaymentFailed: jest.fn(async () => {}),
  sendOrderPacked: jest.fn(async () => {}),
  sendOrderDispatched: jest.fn(async () => ({})),
  sendOrderDelivered: jest.fn(async () => ({})),
  sendOrderCancelled: jest.fn(async () => ({})),
}));

jest.unstable_mockModule('../../../payment/services/finalizePurchase.js', () => ({
  finalizePurchase: jest.fn(async () => {}),
}));

// ── Mock mongoose.startSession ────────────────────────────────
const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};
mongoose.startSession = jest.fn(async () => mockSession);

// ── Model mocks ───────────────────────────────────────────────
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

function queryChain(result) {
  return {
    lean: () => Promise.resolve(result),
    session: () => ({ lean: () => Promise.resolve(result) }),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
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

// User mock returns a chainable for .select().lean()
jest.unstable_mockModule('../../../models/User.js', () => ({
  default: {
    findById: jest.fn(() => ({
      select: () => ({ lean: async () => ({ name: 'Test User', email: 'test@example.com' }) }),
    })),
  },
}));

// ── In-memory Payment store ───────────────────────────────────
const paymentStore = [];
const webhookStore = [];

function matchesPayment(doc, filter) {
  for (const [k, v] of Object.entries(filter)) {
    if (k === '$or') {
      if (!Array.isArray(v) || !v.some((cond) => matchesPayment(doc, cond))) return false;
      continue;
    }
    if (v && typeof v === 'object' && ('$in' in v)) {
      if (!v.$in.map(String).includes(String(doc[k]))) return false;
      continue;
    }
    if (String(doc[k]) !== String(v)) return false;
  }
  return true;
}

function mockPaymentModel() {
  const Model = function (data) { Object.assign(this, data); };
  Model.create = async function (data) {
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      ...data,
      paymentStatus: data.paymentStatus || 'initiated',
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
  Model.findById = async function (id) {
    const s = String(id);
    return paymentStore.find((p) => String(p._id) === s) || null;
  };
  Model.findOneAndUpdate = async function (filter, update, opts = {}) {
    const idx = paymentStore.findIndex((p) => {
      if (filter._id && String(p._id) !== String(filter._id)) return false;
      if (filter.paymentStatus) {
        if (typeof filter.paymentStatus === 'object' && filter.paymentStatus.$in) {
          if (!filter.paymentStatus.$in.includes(p.paymentStatus)) return false;
        } else if (p.paymentStatus !== filter.paymentStatus) return false;
      }
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
    const result = paymentStore.find((p) => matchesPayment(p, filter)) || null;
    return queryChain(result);
  };
  Model.updateMany = async function (filter, update) {
    let modifiedCount = 0;
    for (const p of paymentStore) {
      if (matchesPayment(p, filter)) {
        if (update.$set) Object.assign(p, update.$set);
        modifiedCount += 1;
      }
    }
    return { modifiedCount };
  };
  Model.countDocuments = async function () { return paymentStore.length; };
  Model.find = async function () { return paymentStore; };

  Model.findByRazorpayOrderId = async function (id) {
    return paymentStore.find((p) => p.razorpayOrderId === id) || null;
  };
  Model.findByIdempotencyKey = async function (key) {
    return paymentStore.find((p) => p.idempotencyKey === key) || null;
  };
  return Model;
}

jest.unstable_mockModule('../../../payment/models/Payment.js', () => ({ default: mockPaymentModel() }));

jest.unstable_mockModule('../../../payment/models/WebhookEvent.js', () => ({
  default: {
    findOne: (filter) => {
      let found = null;
      if (filter.eventId) {
        found = webhookStore.find((w) => w.eventId === filter.eventId) || null;
        if (found && filter.status && filter.status.$in && !filter.status.$in.includes(found.status)) {
          found = null;
        }
      }
      return {
        lean: async () => found,
        then: (resolve, reject) => Promise.resolve(found).then(resolve, reject),
      };
    },
    create: jest.fn(async (data) => {
      const doc = { _id: new mongoose.Types.ObjectId(), ...data };
      webhookStore.push(doc);
      return doc;
    }),
    updateOne: jest.fn(async (filter, update) => {
      const doc = webhookStore.find((w) => w.eventId === filter.eventId);
      if (doc && update.$set) Object.assign(doc, update.$set);
      return { modifiedCount: doc ? 1 : 0 };
    }),
  },
}));

// ── Mock Pesapal provider ─────────────────────────────────────
function mockProvider(overrides = {}) {
  return {
    name: 'pesapal',
    isConfigured: true,
    createOrder: jest.fn(async ({ payment }) => ({
      providerOrderId: `track-${String(payment._id).slice(-6)}`,
      checkoutId: `track-${String(payment._id).slice(-6)}`,
      redirectUrl: 'https://cybqa.pesapal.com/iframe?OrderTrackingId=track-x',
      merchantReference: payment.merchant_reference,
      raw: { status: '200' },
    })),
    getTransactionStatus: jest.fn(async (trackingId) => ({
      status: 'completed',
      statusCode: 1,
      statusDescription: 'Completed',
      amountMinor: 1000,
      amount: 10,
      currency: 'KES',
      merchantReference: trackingId ? undefined : undefined,
      confirmationCode: 'CONF-123',
      paymentMethod: 'M-PESA',
      raw: { status: '200' },
    })),
    mapStatus: jest.fn((s) => {
      const v = String(s || '').toUpperCase();
      if (v === 'COMPLETED' || v === '1') return 'captured';
      if (v === 'FAILED' || v === '2' || v === 'REVERSED' || v === 'INVALID') return 'failed';
      return 'pending';
    }),
    parseCallback: jest.fn((req) => ({
      trackingId: req.query?.OrderTrackingId || null,
      merchantReference: req.query?.OrderMerchantReference || null,
      notificationType: req.query?.OrderNotificationType || null,
    })),
    ...overrides,
  };
}

let PaymentService;
let PaymentStateMachine;
let IdempotencyPlugin;

beforeAll(async () => {
  const PSM = await import('../../../payment/state/PaymentStateMachine.js');
  PaymentStateMachine = PSM.PaymentStateMachine;

  const PS = await import('../../../payment/PaymentService.js');
  PaymentService = PS.PaymentService;

  const IP = await import('../../../payment/plugins/IdempotencyPlugin.js');
  IdempotencyPlugin = IP.default || IP.IdempotencyPlugin;
});

beforeEach(() => {
  paymentStore.length = 0;
  webhookStore.length = 0;
  redisStore.clear();
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

function makeUserId() {
  return new mongoose.Types.ObjectId();
}

const CUSTOMER = { email: 'test@example.com', phone: '254700000000' };

// ── Tests ────────────────────────────────────────────────────

describe('Pesapal Payment Activation Chain', () => {
  describe('PaymentService.initiateFree()', () => {
    it('should create a captured payment for free items', async () => {
      const svc = new PaymentService({ provider: mockProvider() });
      const user = makeUserId();
      const items = [{ itemType: 'membership', itemId: new mongoose.Types.ObjectId(), name: 'Free Pass', quantity: 1, unitPrice: 0, totalPrice: 0 }];

      svc.orderService.resolveItems = jest.fn().mockResolvedValue(items);
      const mockActivate = jest.fn(async () => {});
      svc.fulfillmentService.activateItem = mockActivate;

      const result = await svc.initiateFree({ user, items, label: 'Free Trial' });

      expect(result).toBeDefined();
      expect(result.paymentStatus).toBe('captured');
      expect(result.amount).toBe(0);
      expect(result.payment_provider).toBe('offline');
      expect(mockActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('PaymentService.initiate() (server-priced Pesapal)', () => {
    it('should create a pending payment with merchant reference + redirect URL', async () => {
      const svc = new PaymentService({ provider: mockProvider() });
      const user = makeUserId();
      const items = [{ itemType: 'membership', itemId: new mongoose.Types.ObjectId(), name: 'Wellness Circle', quantity: 1, unitPrice: 50000, totalPrice: 50000 }];
      svc.orderService.resolveItems = jest.fn().mockResolvedValue(items);

      const result = await svc.initiate({ user, items, label: 'Wellness Circle', customer: CUSTOMER });

      expect(result.payment).toBeDefined();
      expect(result.payment.paymentStatus).toBe('pending');
      expect(result.payment.amount).toBe(50000);
      expect(result.payment.payment_provider).toBe('pesapal');
      expect(result.payment.merchant_reference).toMatch(/^PAY-/);
      expect(result.orderTrackingId).toBeTruthy();
      expect(result.redirectUrl).toContain('cybqa.pesapal.com');
      // Provider received server-side amount (major) + merchant reference
      const submitted = svc.provider.createOrder.mock.calls[0][0];
      expect(submitted.customer.email).toBe(CUSTOMER.email);
    });

    it('should never trust a frontend amount (uses resolved total)', async () => {
      const svc = new PaymentService({ provider: mockProvider() });
      const user = makeUserId();
      const items = [{ itemType: 'membership', itemId: new mongoose.Types.ObjectId(), name: 'Circle', quantity: 1, unitPrice: 3650000, totalPrice: 3650000 }];
      svc.orderService.resolveItems = jest.fn().mockResolvedValue(items);

      // There is no `amount` parameter on initiate at all — resolution wins.
      const result = await svc.initiate({ user, items, amount: 100, customer: CUSTOMER });
      expect(result.payment.amount).toBe(3650000);
    });
  });

  describe('PaymentService.verifyAndCapture()', () => {
    async function initiatePaid(svc, amountMinor = 1000) {
      const user = makeUserId();
      const items = [{ itemType: 'membership', itemId: new mongoose.Types.ObjectId(), name: 'Pass', quantity: 1, unitPrice: amountMinor, totalPrice: amountMinor }];
      svc.orderService.resolveItems = jest.fn().mockResolvedValue(items);
      svc.provider.getTransactionStatus = jest.fn(async () => ({
        status: 'completed',
        statusCode: 1,
        statusDescription: 'Completed',
        amountMinor,
        amount: amountMinor / 100,
        currency: 'KES',
        merchantReference: 'REF-PLACEHOLDER',
        confirmationCode: 'CONF-ABC',
        paymentMethod: 'M-PESA',
        raw: {},
      }));
      const initiated = await svc.initiate({ user, items, label: 'Pass', customer: CUSTOMER });
      // Align provider merchant reference with the created payment
      svc.provider.getTransactionStatus = jest.fn(async () => ({
        status: 'completed',
        statusCode: 1,
        statusDescription: 'Completed',
        amountMinor,
        amount: amountMinor / 100,
        currency: 'KES',
        merchantReference: initiated.payment.merchant_reference,
        confirmationCode: 'CONF-ABC',
        paymentMethod: 'M-PESA',
        raw: {},
      }));
      return { svc, user, initiated };
    }

    it('should capture after server-to-server verification + fulfill once', async () => {
      const svc = new PaymentService({ provider: mockProvider() });
      const { user, initiated } = await initiatePaid(svc, 1000);

      svc.invoiceService.generateInvoiceNumber = jest.fn(async () => 'INV-2026-000001');
      const mockActivate = jest.fn(async () => {});
      svc.fulfillmentService.activateItem = mockActivate;

      const result = await svc.verifyAndCapture({
        merchantReference: initiated.payment.merchant_reference,
        user,
      });

      expect(result.payment.paymentStatus).toBe('captured');
      expect(result.invoiceNo).toBe('INV-2026-000001');
      expect(result.payment.provider_transaction_id).toBe('CONF-ABC');
      expect(mockActivate).toHaveBeenCalledTimes(1);
    });

    it('should be idempotent when already captured', async () => {
      const svc = new PaymentService({ provider: mockProvider() });
      const { user, initiated } = await initiatePaid(svc, 1000);
      svc.invoiceService.generateInvoiceNumber = jest.fn(async () => 'INV-2026-000001');
      svc.fulfillmentService.activateItem = jest.fn(async () => {});

      const first = await svc.verifyAndCapture({ merchantReference: initiated.payment.merchant_reference, user });
      expect(first.idempotent).toBe(false);
      const second = await svc.verifyAndCapture({ merchantReference: initiated.payment.merchant_reference, user });
      expect(second.idempotent).toBe(true);
      expect(svc.fulfillmentService.activateItem).toHaveBeenCalledTimes(1);
    });

    it('should refuse capture on amount mismatch', async () => {
      const svc = new PaymentService({ provider: mockProvider() });
      const { user, initiated } = await initiatePaid(svc, 1000);
      // Provider reports a different amount
      svc.provider.getTransactionStatus = jest.fn(async () => ({
        status: 'completed',
        statusDescription: 'Completed',
        amountMinor: 999,
        currency: 'KES',
        merchantReference: initiated.payment.merchant_reference,
        confirmationCode: 'CONF-X',
        raw: {},
      }));
      await expect(
        svc.verifyAndCapture({ merchantReference: initiated.payment.merchant_reference, user }),
      ).rejects.toThrow(/Amount mismatch/);
      const fresh = paymentStore.find((p) => String(p._id) === String(initiated.payment._id));
      expect(fresh.paymentStatus).toBe('pending');
    });

    it('should throw PROVIDER_PENDING when provider is still pending', async () => {
      const svc = new PaymentService({ provider: mockProvider() });
      const { user, initiated } = await initiatePaid(svc, 1000);
      svc.provider.getTransactionStatus = jest.fn(async () => ({
        status: 'pending',
        statusDescription: 'Pending',
        amountMinor: 1000,
        currency: 'KES',
        merchantReference: initiated.payment.merchant_reference,
        raw: {},
      }));
      await expect(
        svc.verifyAndCapture({ merchantReference: initiated.payment.merchant_reference, user }),
      ).rejects.toMatchObject({ code: 'PROVIDER_PENDING' });
    });
  });

  describe('PaymentService.handleIpn() (dedupe + verify)', () => {
    it('should capture on valid IPN and dedupe the second delivery', async () => {
      const svc = new PaymentService({ provider: mockProvider() });
      const user = makeUserId();
      const items = [{ itemType: 'membership', itemId: new mongoose.Types.ObjectId(), name: 'Pass', quantity: 1, unitPrice: 2000, totalPrice: 2000 }];
      svc.orderService.resolveItems = jest.fn().mockResolvedValue(items);
      const initiated = await svc.initiate({ user, items, label: 'Pass', customer: CUSTOMER });
      const track = initiated.orderTrackingId;
      const ref = initiated.payment.merchant_reference;
      svc.provider.getTransactionStatus = jest.fn(async () => ({
        status: 'completed',
        statusDescription: 'Completed',
        amountMinor: 2000,
        currency: 'KES',
        merchantReference: ref,
        confirmationCode: 'CONF-IPN-1',
        paymentMethod: 'M-PESA',
        raw: {},
      }));
      svc.invoiceService.generateInvoiceNumber = jest.fn(async () => 'INV-2026-000002');
      svc.fulfillmentService.activateItem = jest.fn(async () => {});

      const first = await svc.handleIpn({ trackingId: track, merchantReference: ref });
      expect(first.payment.paymentStatus).toBe('captured');

      const second = await svc.handleIpn({ trackingId: track, merchantReference: ref });
      expect(second.duplicate).toBe(true);
      // Fulfillment ran exactly once
      expect(svc.fulfillmentService.activateItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('State Machine', () => {
    it('should allow valid payment transitions', () => {
      expect(PaymentStateMachine.canCapture('pending')).toBe(true);
      expect(PaymentStateMachine.canCapture('captured')).toBe(false);
      expect(PaymentStateMachine.canCapture('failed')).toBe(false);
    });

    it('should reject invalid payment transitions', () => {
      expect(PaymentStateMachine.isValidPaymentTransition('initiated', 'captured')).toBe(false);
      expect(PaymentStateMachine.isValidPaymentTransition('pending', 'captured')).toBe(true);
    });

    it('should allow refund only from captured', () => {
      expect(PaymentStateMachine.canRefund('captured')).toBe(true);
      expect(PaymentStateMachine.canRefund('pending')).toBe(false);
    });
  });

  describe('PaymentRepository', () => {
    it('should create a manual payment with audit trail + merchant reference', async () => {
      const { PaymentRepository } = await import('../../../payment/repository/PaymentRepository.js');
      const repo = new PaymentRepository();
      const adminId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      const payment = await repo.createManualPayment({
        user: userId,
        label: 'Admin Credit',
        amount: 200000,
        description: '6-month plan',
        items: [{ itemType: 'membership', name: '6-Month', quantity: 1, unitPrice: 200000, totalPrice: 200000 }],
        adminId,
      });

      expect(payment).toBeDefined();
      expect(payment.paymentStatus).toBe('captured');
      expect(payment.payment_provider).toBe('manual');
      expect(payment.source).toBe('admin');
      expect(payment.amount).toBe(200000);
      expect(payment.merchant_reference).toMatch(/^PAY-/);
      expect(payment.auditTrail).toHaveLength(1);
      expect(payment.auditTrail[0].action).toBe('manual_payment');
    });

    it('should perform atomic status transitions', async () => {
      const { PaymentRepository } = await import('../../../payment/repository/PaymentRepository.js');
      const repo = new PaymentRepository();

      const payment = await repo.create({
        user: new mongoose.Types.ObjectId(),
        label: 'Test',
        amount: 1000,
        paymentStatus: 'initiated',
      });

      const updated = await repo.atomicStatusTransition(payment._id, 'initiated', 'pending');
      expect(updated).toBeDefined();
      expect(updated.paymentStatus).toBe('pending');

      const captured = await repo.atomicStatusTransition(payment._id, 'pending', 'captured');
      expect(captured).toBeDefined();
      expect(captured.paymentStatus).toBe('captured');
    });

    it('capturePending should enforce single capture (atomic guard)', async () => {
      const { PaymentRepository } = await import('../../../payment/repository/PaymentRepository.js');
      const repo = new PaymentRepository();
      const payment = await repo.create({
        user: new mongoose.Types.ObjectId(),
        label: 'Race',
        amount: 500,
        paymentStatus: 'pending',
      });
      const first = await repo.capturePending(payment._id, { providerTransactionId: 'CONF-R1', providerStatus: 'Completed' });
      expect(first.paymentStatus).toBe('captured');
      const second = await repo.capturePending(payment._id, { providerTransactionId: 'CONF-R2', providerStatus: 'Completed' });
      expect(second).toBeNull();
    });
  });

  describe('IdempotencyPlugin', () => {
    it('should prevent duplicate submissions with the same key', async () => {
      const ip = new IdempotencyPlugin({ redis: mockIORedis });
      const key = 'idem-key-123';

      const result1 = await ip.executeWithIdempotency(key, 60, async () => 'success');
      expect(result1).toBe('success');

      await expect(
        ip.executeWithIdempotency(key, 60, async () => 'duplicate'),
      ).rejects.toThrow(/already being processed/i);
    });
  });
});
