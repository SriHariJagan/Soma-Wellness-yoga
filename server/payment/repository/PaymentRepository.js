import Payment from '../models/Payment.js';
import logger from '../../notification/logger.js';

const MODULE = 'PaymentRepository';

export class PaymentRepository {
  async create(data) {
    if (data.idempotencyKey) {
      const existing = await Payment.findOne({ idempotencyKey: data.idempotencyKey }).lean();
      if (existing) {
        logger.info(MODULE, 'Idempotent payment hit', { paymentId: String(existing._id), idempotencyKey: data.idempotencyKey });
        return existing;
      }
    }
    const payment = await Payment.create(data);
    logger.info(MODULE, 'Payment created', { paymentId: String(payment._id), label: payment.label });
    return payment;
  }

  async findById(id) {
    return Payment.findById(id);
  }

  async findByRazorpayOrderId(razorpayOrderId) {
    return Payment.findByRazorpayOrderId(razorpayOrderId);
  }

  async findByIdempotencyKey(key) {
    return Payment.findByIdempotencyKey(key);
  }

  async findByMerchantReference(ref) {
    if (typeof ref !== 'string' || !ref) return null;
    return Payment.findOne({ merchant_reference: ref });
  }

  async findByProviderOrderId(providerOrderId) {
    if (typeof providerOrderId !== 'string' || !providerOrderId) return null;
    return Payment.findOne({ provider_order_id: providerOrderId });
  }

  async findByProviderTransactionId(providerTransactionId) {
    if (typeof providerTransactionId !== 'string' || !providerTransactionId) return null;
    return Payment.findOne({ provider_transaction_id: providerTransactionId });
  }

  async findByCheckoutId(checkoutId) {
    if (typeof checkoutId !== 'string' || !checkoutId) return null;
    return Payment.findOne({
      $or: [
        { provider_checkout_id: checkoutId },
        { provider_order_id: checkoutId },
      ],
    });
  }

  async updatePaymentStatus(id, newStatus, currentStatus) {
    const filter = { _id: id, paymentStatus: currentStatus };
    const update = {
      $set: {
        paymentStatus: newStatus,
        [`${newStatus}At`]: new Date(),
      },
      $inc: { lockVersion: 1 },
    };
    return Payment.findOneAndUpdate(filter, update, { new: true });
  }

  async atomicStatusTransition(id, from, to, extra = {}, session) {
    const timestampField = `${to}At`;
    const setFields = {
      paymentStatus: to,
      [timestampField]: new Date(),
      ...extra,
    };
    const options = { new: true };
    if (session) options.session = session;
    return Payment.findOneAndUpdate(
      { _id: id, paymentStatus: from },
      { $set: setFields, $inc: { lockVersion: 1 } },
      options,
    );
  }

  async setFulfillmentStatus(id, status, session) {
    const options = { new: true };
    if (session) options.session = session;
    return Payment.findByIdAndUpdate(
      id,
      { $set: { fulfillmentStatus: status } },
      options,
    );
  }

  async setInvoiceNo(id, invoiceNo, session) {
    return Payment.findByIdAndUpdate(
      id,
      { $set: { invoiceNo } },
      { new: true, session },
    );
  }

  async addAuditEntry(id, entry, session) {
    return Payment.findByIdAndUpdate(
      id,
      { $push: { auditTrail: { ...entry, timestamp: new Date() } } },
      { session },
    );
  }

  async recordAttempt(id, data) {
    return Payment.findByIdAndUpdate(
      id,
      { $push: { attempts: { ...data, timestamp: new Date() } } },
    );
  }

  async recordWebhookEvent(id, data) {
    return Payment.findByIdAndUpdate(
      id,
      { $push: { webhookEvents: { ...data, processedAt: new Date() } } },
    );
  }

  async findByUser(userId, options = {}) {
    const { page = 1, limit = 20, paymentStatus } = options;
    const filter = { user: userId, isDeleted: false };
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    return Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
  }

  async countByUser(userId, paymentStatus) {
    const filter = { user: userId, isDeleted: false };
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    return Payment.countDocuments(filter);
  }

  /**
   * Canonical atomic capture for Pesapal (and any provider).
   * Guard: only pending → captured. Enforces provider_transaction_id
   * uniqueness at the application layer (unique index is the backstop).
   */
  async capturePending(id, { providerTransactionId, providerStatus, callbackData, providerRaw, auditAction = 'capture', auditMetadata = {} }, session) {
    if (providerTransactionId) {
      const dup = await Payment.findOne({
        provider_transaction_id: String(providerTransactionId),
        paymentStatus: 'captured',
      }).lean();
      if (dup && String(dup._id) !== String(id)) {
        const err = new Error('Provider transaction already captured on another payment');
        err.code = 'DUPLICATE_PROVIDER_TRANSACTION';
        throw err;
      }
    }
    const set = {
      paymentStatus: 'captured',
      capturedAt: new Date(),
    };
    if (providerTransactionId) set.provider_transaction_id = String(providerTransactionId);
    if (providerStatus) set.provider_status = String(providerStatus);
    if (callbackData) set.callback_data = callbackData;
    if (providerRaw) set.provider_raw = providerRaw;
    const options = { new: true };
    if (session) options.session = session;
    const updated = await Payment.findOneAndUpdate(
      { _id: id, paymentStatus: 'pending' },
      {
        $set: set,
        $push: {
          attempts: { action: 'capture', gatewayResponse: providerRaw || callbackData || {}, timestamp: new Date() },
          auditTrail: { action: auditAction, from: 'pending', to: 'captured', timestamp: new Date(), metadata: auditMetadata },
        },
        $inc: { lockVersion: 1 },
      },
      options,
    );
    return updated;
  }

  async markFailed(id, fromStatuses, { failureReason, providerStatus, callbackData, auditAction = 'mark_failed' }, session) {
    const filter = { _id: id };
    if (fromStatuses) filter.paymentStatus = Array.isArray(fromStatuses) ? { $in: fromStatuses } : fromStatuses;
    const set = { paymentStatus: 'failed', failedAt: new Date() };
    if (failureReason) set.failure_reason = String(failureReason).slice(0, 500);
    if (providerStatus) set.provider_status = String(providerStatus);
    if (callbackData) set.callback_data = callbackData;
    const options = { new: true };
    if (session) options.session = session;
    return Payment.findOneAndUpdate(
      filter,
      {
        $set: set,
        $push: { auditTrail: { action: auditAction, to: 'failed', timestamp: new Date(), reason: failureReason } },
        $inc: { lockVersion: 1 },
      },
      options,
    );
  }

  async saveProviderOrderDetails(id, { providerOrderId, checkoutId, merchantReference, redirectUrl, providerRaw }, session) {
    const set = {};
    if (providerOrderId) {
      set.provider_order_id = String(providerOrderId);
      set.provider_checkout_id = String(checkoutId || providerOrderId);
    }
    if (merchantReference) set.merchant_reference = String(merchantReference);
    if (providerRaw) set.provider_raw = providerRaw;
    const options = { new: true };
    if (session) options.session = session;
    return Payment.findByIdAndUpdate(id, { $set: set }, options);
  }

  async addRefundEntry(id, refundData, session) {
    const options = { new: true };
    if (session) options.session = session;
    return Payment.findByIdAndUpdate(
      id,
      {
        $push: {
          refunds: {
            ...refundData,
            status: 'pending',
            initiatedAt: new Date(),
          },
        },
      },
      options,
    );
  }

  async markRefundProcessed(id, refundId) {
    return Payment.findOneAndUpdate(
      {
        $and: [
          { _id: id },
          {
            $or: [
              { 'refunds.razorpayRefundId': refundId },
              { 'refunds.provider_refund_id': refundId },
            ],
          },
        ],
      },
      {
        $set: {
          'refunds.$.status': 'processed',
          'refunds.$.completedAt': new Date(),
        },
      },
      { new: true },
    );
  }

  async addOrderLink(id, orderId, orderItem) {
    return Payment.findByIdAndUpdate(
      id,
      {
        $set: { orderId },
        $push: { items: orderItem },
      },
      { new: true },
    );
  }

  async softDelete(id) {
    return Payment.findByIdAndUpdate(id, { $set: { isDeleted: true } });
  }

  async createManualPayment({ user, label, amount, description, items, adminId, receiptUrl, gateway = 'manual' }) {
    const now = new Date();
    const { generateMerchantReference } = await import('../../utils/merchantReference.js');
    const payment = await Payment.create({
      user,
      label,
      description: description || '',
      items: items || [],
      amount: Math.round(amount),
      currency: 'KES',
      gateway,
      payment_provider: gateway === 'manual' || gateway === 'offline' ? gateway : 'manual',
      payment_method: gateway === 'manual' || gateway === 'offline' ? gateway : 'manual',
      merchant_reference: generateMerchantReference('PAY'),
      source: adminId ? 'admin' : 'student',
      paymentStatus: adminId ? 'captured' : 'initiated',
      capturedAt: adminId ? now : undefined,
      initiatedAt: now,
      receiptUrl: receiptUrl || '',
      auditTrail: [{
        action: 'manual_payment',
        from: 'initiated',
        to: 'captured',
        by: adminId,
        reason: 'Created by admin',
        metadata: { source: 'admin' },
        timestamp: now,
      }],
    });
    logger.info(MODULE, 'Manual payment created by admin', {
      paymentId: String(payment._id),
      user: String(user),
      amount,
      label,
    });
    return payment;
  }

  async createFreePayment({ user, label, description, items, idempotencyKey }) {
    const now = new Date();
    const { generateMerchantReference } = await import('../../utils/merchantReference.js');
    const payment = await Payment.create({
      user,
      label,
      description: description || 'Free item – no payment required',
      items: items || [],
      amount: 0,
      currency: 'KES',
      gateway: 'offline',
      payment_provider: 'offline',
      payment_method: 'free',
      merchant_reference: generateMerchantReference('PAY'),
      source: 'student',
      paymentStatus: 'captured',
      capturedAt: now,
      initiatedAt: now,
      idempotencyKey: idempotencyKey || undefined,
      auditTrail: [{
        action: 'free_checkout',
        from: 'initiated',
        to: 'captured',
        by: user,
        reason: 'Free item – no payment required',
        metadata: { source: 'student' },
        timestamp: now,
      }],
    });
    logger.info(MODULE, 'Free payment created', {
      paymentId: String(payment._id),
      user: String(user),
      label,
    });
    return payment;
  }

  /** Expire stale payments beyond the cutoff time (status-guarded by caller) */
  async expireStalePayments(cutoffDate, statuses = ['initiated']) {
    return Payment.updateMany(
      { paymentStatus: { $in: statuses }, createdAt: { $lt: cutoffDate } },
      {
        $set: {
          paymentStatus: 'expired',
          expiredAt: new Date(),
        },
        $push: {
          auditTrail: {
            action: 'auto_expired',
            reason: 'Payment not completed within expiry window',
            timestamp: new Date(),
          },
        },
      },
    );
  }

  /**
   * Expire initiated intents that were never submitted to the provider.
   * Guarded: only `initiated` WITHOUT a provider checkout id.
   */
  async expireUnsubmittedIntents(cutoffDate) {
    return Payment.updateMany(
      {
        paymentStatus: 'initiated',
        createdAt: { $lt: cutoffDate },
        $or: [
          { provider_checkout_id: { $in: [null, ''] } },
          { provider_checkout_id: { $exists: false } },
        ],
      },
      {
        $set: {
          paymentStatus: 'expired',
          expiredAt: new Date(),
          failure_reason: 'Payment intent expired before provider submission',
        },
        $push: {
          auditTrail: {
            action: 'auto_expired',
            reason: 'Intent never submitted to provider',
            timestamp: new Date(),
          },
        },
      },
    );
  }
}

export default PaymentRepository;
