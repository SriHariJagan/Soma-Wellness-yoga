import Payment from '../models/Payment.js';
import logger from '../../notification/logger.js';

const MODULE = 'PaymentRepository';

export class PaymentRepository {
  async create(data) {
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

  async findByRazorpayPaymentId(razorpayPaymentId) {
    return Payment.findByRazorpayPaymentId(razorpayPaymentId);
  }

  /** Find a payment by its MPESA CheckoutRequestID stored in auditTrail */
  async findByMpesaCheckoutRequestId(checkoutRequestId) {
    return Payment.findOne({ "auditTrail.checkoutRequestId": checkoutRequestId });
  }

  async findByIdempotencyKey(key) {
    return Payment.findByIdempotencyKey(key);
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

  async findBySignature(razorpaySignature) {
    // NoSQL injection guard: ensure we only query with strings
    if (typeof razorpaySignature !== 'string' || !razorpaySignature) return null;
    return Payment.findOne({ razorpaySignature: String(razorpaySignature), paymentStatus: 'captured' }).lean();
  }

  async findByPaymentIdCaptured(razorpayPaymentId) {
    // NoSQL injection guard: ensure we only query with strings
    if (typeof razorpayPaymentId !== 'string' || !razorpayPaymentId) return null;
    return Payment.findOne({ razorpayPaymentId: String(razorpayPaymentId), paymentStatus: 'captured' }).lean();
  }

  async updateAfterCapture(id, razorpayPaymentId, razorpaySignature, gatewayResponse, session) {
    return Payment.findOneAndUpdate(
      { _id: id, paymentStatus: 'pending' },
      {
        $set: {
          paymentStatus: 'captured',
          capturedAt: new Date(),
          razorpayPaymentId,
          razorpaySignature,
        },
        $push: {
          attempts: {
            action: 'capture',
            gatewayResponse,
            timestamp: new Date(),
          },
        },
        $inc: { lockVersion: 1 },
      },
      { new: true, session },
    );
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

  async markRefundProcessed(id, razorpayRefundId) {
    return Payment.findOneAndUpdate(
      { _id: id, 'refunds.razorpayRefundId': razorpayRefundId },
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
    const payment = await Payment.create({
      user,
      label,
      description: description || '',
      items: items || [],
      amount: Math.round(amount),
      currency: gateway === 'mpesa' ? 'KES' : 'KES',
      gateway,
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
    const payment = await Payment.create({
      user,
      label,
      description: description || 'Free item – no payment required',
      items: items || [],
      amount: 0,
      currency: 'KES',
      gateway: 'offline',
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

  /** Mark an MPESA payment as successful with receipt details */
  async markMpesaPaymentSuccess(id, { mpesaReceiptNumber, transactionDate, phoneNumber, amount }) {
    return Payment.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          paymentStatus: 'captured',
          capturedAt: new Date(),
          mpesaReceiptNumber,
          mpesaTransactionDate: transactionDate,
          mpesaPhoneNumber: phoneNumber,
        },
        $push: {
          auditTrail: {
            action: 'mpesa_stk_success',
            mpesaReceiptNumber,
            timestamp: new Date(),
          },
        },
        $inc: { lockVersion: 1 },
      },
      { new: true },
    );
  }

  /** Expire payments stuck in 'initiated' status beyond the cutoff time */
  async expireStalePayments(cutoffDate) {
    return Payment.updateMany(
      { paymentStatus: 'initiated', createdAt: { $lt: cutoffDate } },
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
}

export default PaymentRepository;
