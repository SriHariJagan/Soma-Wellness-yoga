import { jest, describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import mongoose from 'mongoose';

// ── Module-level mocks ──────────────────────────────────────

const mockRazorpayPayments = { fetch: jest.fn() };
const mockRazorpayOrders = { create: jest.fn() };

jest.unstable_mockModule('razorpay', () => ({
  default: class {
    constructor() { this.orders = mockRazorpayOrders; this.payments = mockRazorpayPayments; }
  },
}));

// In-memory Redis for IdempotencyPlugin
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
jest.unstable_mockModule('ioredis', () => ({ default: jest.fn(() => mockIORedis) }));

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

jest.unstable_mockModule('../../../notification/logger.js', () => ({ default: mockLogger }));

// ── Mock mongoose.startSession ────────────────────────
const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};
mongoose.startSession = jest.fn(async () => mockSession);

// Bare-minimum model mocks for modules we must import (ActivityLog)
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

// Query-chain helper: returns a chainable query object where both .lean() and .session(s).lean() resolve to result.
function queryChain(result) {
  return {
    lean: () => Promise.resolve(result),
    session: () => ({ lean: () => Promise.resolve(result) }),
  };
}

jest.unstable_mockModule('../../../models/ActivityLog.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/Membership.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/UserService.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/User.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/Plan.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/Service.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/Workshop.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/Consultation.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/Booking.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/Order.js', () => ({ default: mockMinModel() }));
jest.unstable_mockModule('../../../models/Settings.js', () => ({ default: mockMinModel() }));

// ── In-memory Payment store (used by the Payment model mock) ──
const paymentStore = [];

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
      attempts: [],
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
    const id = filter._id ? String(filter._id) : null;
    if (!id) return null;
    const idx = paymentStore.findIndex((p) =>
      String(p._id) === id && (!filter.paymentStatus || p.paymentStatus === filter.paymentStatus)
    );
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
    const result = paymentStore.find((p) => {
      for (const k of Object.keys(filter)) {
        if (String(p[k]) !== String(filter[k])) return false;
      }
      return true;
    }) || null;
    // Return query chain so callers can chain .lean(), .session(), etc.
    return queryChain(result);
  };
  Model.countDocuments = async function () { return paymentStore.length; };
  Model.find = async function () { return paymentStore; };

  // Static query methods used by PaymentRepository
  Model.findByRazorpayOrderId = async function (razorpayOrderId) {
    return paymentStore.find((p) => p.razorpayOrderId === razorpayOrderId) || null;
  };
  Model.findByRazorpayPaymentId = async function (razorpayPaymentId) {
    return paymentStore.find((p) => p.razorpayPaymentId === razorpayPaymentId) || null;
  };
  Model.findByIdempotencyKey = async function (key) {
    return paymentStore.find((p) => p.idempotencyKey === key) || null;
  };

  return Model;
}

jest.unstable_mockModule('../../../payment/models/Payment.js', () => ({ default: mockPaymentModel() }));

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
  redisStore.clear();
  jest.clearAllMocks();
  mockRazorpayOrders.create.mockResolvedValue({ id: 'order_abc123', amount: 1000, currency: 'INR', status: 'created' });
  mockRazorpayPayments.fetch.mockResolvedValue({
    id: 'pay_test123',
    order_id: 'order_abc123',
    status: 'captured',
    amount: 1000,
    currency: 'INR',
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});

function makeUser(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    name: 'Test User',
    email: 'test@example.com',
    role: 'student',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe('Payment Activation Chain', () => {
  describe('PaymentService.initiateFree()', () => {
    it('should create a captured payment for free items', async () => {
      const svc = new PaymentService();
      const user = makeUser();
      const items = [{ itemType: 'membership', itemId: new mongoose.Types.ObjectId(), name: 'Free Pass', quantity: 1, unitPrice: 0, totalPrice: 0 }];

      // Mock OrderService.resolveItems to return resolved items (avoid DB lookup)
      svc.orderService.resolveItems = jest.fn().mockResolvedValue(items);
      // Mock FulfillmentService.activateItem to avoid real DB writes
      const mockActivate = jest.fn(async () => {});
      svc.fulfillmentService.activateItem = mockActivate;

      const result = await svc.initiateFree({ user, items, label: 'Free Trial' });

      expect(result).toBeDefined();
      expect(result.paymentStatus).toBe('captured');
      expect(result.amount).toBe(0);
      expect(result.gateway).toBe('offline');
      expect(result.source).toBe('student');
      expect(mockActivate).toHaveBeenCalledTimes(1);
      // Verify activation was called with the correct item type and the full user object
      const callArgs = mockActivate.mock.calls[0];
      expect(callArgs[0]).toMatchObject({ itemType: 'membership' });
      expect(callArgs[2]).toEqual(user);
      expect(callArgs[3]).toBeDefined();
    });
  });

  describe('PaymentService.initiate()', () => {
    it('should create a pending payment and return Razorpay order', async () => {
      const svc = new PaymentService();
      const user = makeUser();

      mockRazorpayOrders.create.mockResolvedValue({ id: 'order_razor123', amount: 50000, currency: 'INR', status: 'created' });

      const items = [{ itemType: 'membership', itemId: new mongoose.Types.ObjectId(), name: 'Gold Pass', quantity: 1, unitPrice: 50000, totalPrice: 50000 }];
      svc.orderService.resolveItems = jest.fn().mockResolvedValue(items);

      const result = await svc.initiate({ user, items, label: 'Gold Pass' });

      // initiate() returns the payment doc directly (not {order, payment})
      expect(result).toBeDefined();
      expect(result.paymentStatus).toBe('pending');
      expect(result.amount).toBe(50000);
      expect(result.razorpayOrderId).toBe('order_razor123');
      // Verify that the Razorpay order was created
      expect(mockRazorpayOrders.create).toHaveBeenCalled();
    });
  });

  describe('PaymentService.verify()', () => {
    it('should activate items after successful payment verification', async () => {
      const svc = new PaymentService();
      const user = makeUser();
      const planId = new mongoose.Types.ObjectId();
      const items = [{ itemType: 'membership', itemId: planId, name: 'Monthly Pass', quantity: 1, unitPrice: 1000, totalPrice: 1000 }];

      svc.orderService.resolveItems = jest.fn().mockResolvedValue(items);
      mockRazorpayOrders.create.mockResolvedValue({ id: 'order_verify1', amount: 1000, currency: 'INR', status: 'created' });

      // Initiate with user._id to match production flow (controllers pass req.user._id)
      const payment = await svc.initiate({ user: user._id, items, label: 'Monthly Pass' });

      // Mock verification helpers
      svc.verificationService.fetchPaymentFromGateway = jest.fn(async () => ({
        id: 'pay_test123', order_id: 'order_verify1', status: 'captured', amount: 1000, currency: 'INR',
      }));

      svc.invoiceService.generateInvoiceNumber = jest.fn(async () => 'INV-2026-000001');

      const mockActivate = jest.fn(async () => {});
      svc.fulfillmentService.activateItem = mockActivate;

      // Compute valid HMAC signature
      const crypto = await import('crypto');
      process.env.RAZORPAY_KEY_SECRET = 'test_secret';
      const expectedSig = crypto
        .createHmac('sha256', 'test_secret')
        .update('order_verify1|pay_test123')
        .digest('hex');

      const result = await svc.verify({
        user: user._id,
        razorpayOrderId: 'order_verify1',
        razorpayPaymentId: 'pay_test123',
        razorpaySignature: expectedSig,
      });

      expect(result).toBeDefined();
      expect(result.payment).toBeDefined();
      expect(result.payment.paymentStatus).toBe('captured');
      expect(mockActivate).toHaveBeenCalledWith(
        expect.objectContaining({ itemType: 'membership', itemId: planId }),
        payment._id,
        user._id,
        expect.any(Object),
      );
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
    it('should create a manual payment with audit trail', async () => {
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
      expect(payment.gateway).toBe('manual');
      expect(payment.source).toBe('admin');
      expect(payment.amount).toBe(200000);
      expect(payment.auditTrail).toHaveLength(1);
      expect(payment.auditTrail[0].action).toBe('manual_payment');
      expect(payment.auditTrail[0].by).toEqual(adminId);
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
  });

  describe('Duplicate Membership Guard (FulfillmentService)', () => {
    it('should reject creating a second active membership for the same user and plan', async () => {
      const FSMod = await import('../../../payment/services/FulfillmentService.js');
      const FulfillmentService = FSMod.default || FSMod.FulfillmentService;
      const fulfillmentService = new FulfillmentService();
      const userId = new mongoose.Types.ObjectId();
      const planId = new mongoose.Types.ObjectId();

      // Override Plan.findById to return a plan document
      const { default: Plan } = await import('../../../models/Plan.js');
      const planDoc = { _id: planId, name: 'Monthly', durationMonths: 1, price: 1000 };
      Plan.findById = jest.fn(() => queryChain(planDoc));

      // Override Membership.findOne to track active memberships
      const { default: Membership } = await import('../../../models/Membership.js');
      const activeMemberships = [];
      Membership.findOne = jest.fn((filter) => {
        const existing = activeMemberships.find((m) =>
          String(m.user) === String(filter.user) && m.status === filter.status
        );
        return queryChain(existing || null);
      });
      Membership.create = jest.fn(async (data) => {
        // _activateMembership calls Membership.create([{...}], {session})
        const input = Array.isArray(data) ? data[0] : data;
        const doc = { _id: new mongoose.Types.ObjectId(), ...input };
        activeMemberships.push(doc);
        return [doc]; // return array to match Mongoose behavior
      });

      // First activation should succeed
      await fulfillmentService.activateItem(
        { itemType: 'membership', itemId: planId, name: 'First', quantity: 1, unitPrice: 1000, totalPrice: 1000 },
        new mongoose.Types.ObjectId(),
        userId,
        {},
      );

      // Second activation for same user should throw
      await expect(
        fulfillmentService.activateItem(
          { itemType: 'membership', itemId: planId, name: 'Second', quantity: 1, unitPrice: 1000, totalPrice: 1000 },
          new mongoose.Types.ObjectId(),
          userId,
          {},
        ),
      ).rejects.toThrow(/active membership/i);
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
