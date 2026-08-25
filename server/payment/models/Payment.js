import mongoose from 'mongoose';
import {
  PAYMENT_ITEM_TYPES,
  PAYMENT_STATUSES,
  PAYMENT_GATEWAYS,
  PAYMENT_SOURCES,
  PAYMENT_FULFILLMENT_STATUSES,
  REFUND_STATUSES,
} from '../../shared/constants/index.js';

const PaymentItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    required: true,
    enum: PAYMENT_ITEM_TYPES,
  },
  itemId: { type: String },
  name: { type: String, default: '' },
  quantity: { type: Number, default: 1, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const RefundSchema = new mongoose.Schema({
  razorpayRefundId: { type: String, sparse: true },
  amount: { type: Number, required: true },
  reason: { type: String, default: '' },
  status: { type: String, enum: REFUND_STATUSES, default: 'pending' },
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  initiatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
}, { _id: false });

const AttemptSchema = new mongoose.Schema({
  attempt: { type: Number, required: true },
  action: { type: String, required: true },
  gatewayResponse: { type: mongoose.Schema.Types.Mixed },
  error: { type: String },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const WebhookEventSchema = new mongoose.Schema({
  event: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  rawBody: { type: String },
  processedAt: { type: Date, default: Date.now },
  error: { type: String },
}, { _id: false });

const AuditEntrySchema = new mongoose.Schema({
  action: { type: String, required: true },
  from: { type: String },
  to: { type: String },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const PaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  label: { type: String, required: true },
  description: { type: String, default: '' },

  items: { type: [PaymentItemSchema], default: [] },

  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR', uppercase: true },
  tax: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },

  gateway: { type: String, enum: PAYMENT_GATEWAYS, default: 'razorpay' },
  source: { type: String, enum: PAYMENT_SOURCES, default: 'student' },
  razorpayOrderId: { type: String, sparse: true, unique: true },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },

  paymentStatus: {
    type: String,
    enum: PAYMENT_STATUSES,
    default: 'initiated',
    index: true,
  },
  fulfillmentStatus: {
    type: String,
    enum: PAYMENT_FULFILLMENT_STATUSES,
    default: 'pending',
  },

  invoiceNo: { type: String, unique: true, sparse: true },
  receiptUrl: { type: String, default: '' },

  refunds: { type: [RefundSchema], default: [] },

  attempts: { type: [AttemptSchema], default: [] },

  webhookEvents: { type: [WebhookEventSchema], default: [] },

  idempotencyKey: { type: String, sparse: true, unique: true },

  auditTrail: { type: [AuditEntrySchema], default: [] },

  initiatedAt: { type: Date },
  pendingAt: { type: Date },
  capturedAt: { type: Date },
  failedAt: { type: Date },
  expiredAt: { type: Date },
  refundedAt: { type: Date },

  lockVersion: { type: Number, default: 0 },
  schemaVersion: { type: Number, default: 2 },

  isDeleted: { type: Boolean, default: false, index: true },
}, {
  timestamps: true,
});

PaymentSchema.index({ user: 1, paymentStatus: 1 });
PaymentSchema.index({ razorpayPaymentId: 1 }, { sparse: true });
PaymentSchema.index({ 'items.itemType': 1, 'items.itemId': 1 });
PaymentSchema.index({ paymentStatus: 1, createdAt: 1 });
PaymentSchema.index({ isDeleted: 1, paymentStatus: 1 });

PaymentSchema.virtual('isCaptured').get(function () {
  return this.paymentStatus === 'captured';
});

PaymentSchema.virtual('isRefunded').get(function () {
  return this.paymentStatus === 'refunded';
});

PaymentSchema.virtual('isFailed').get(function () {
  return this.paymentStatus === 'failed';
});

PaymentSchema.virtual('amountInRupees').get(function () {
  return (this.amount / 100).toFixed(2);
});

PaymentSchema.virtual('itemCount').get(function () {
  return this.items.length;
});

PaymentSchema.virtual('totalRefunded').get(function () {
  return this.refunds
    .filter((r) => r.status === 'processed')
    .reduce((sum, r) => sum + r.amount, 0);
});

PaymentSchema.virtual('netCaptured').get(function () {
  return this.amount - this.totalRefunded;
});

PaymentSchema.set('toJSON', { virtuals: true });
PaymentSchema.set('toObject', { virtuals: true });

PaymentSchema.methods = {
  addAuditEntry(action, from, to, by, reason, metadata) {
    this.auditTrail.push({ action, from, to, by, reason, metadata, timestamp: new Date() });
  },

  recordAttempt(attempt, action, gatewayResponse, error) {
    this.attempts.push({ attempt, action, gatewayResponse, error, timestamp: new Date() });
  },

  recordWebhookEvent(event, payload, rawBody, error) {
    this.webhookEvents.push({ event, payload, rawBody, processedAt: new Date(), error });
  },

  addRefund(refundData) {
    this.refunds.push({
      ...refundData,
      status: 'pending',
      initiatedAt: new Date(),
    });
  },
};

PaymentSchema.statics = {
  async findByRazorpayOrderId(razorpayOrderId) {
    return this.findOne({ razorpayOrderId });
  },

  async findByRazorpayPaymentId(razorpayPaymentId) {
    return this.findOne({ razorpayPaymentId });
  },

  async findByIdempotencyKey(key) {
    return this.findOne({ idempotencyKey: key });
  },

  async sumCapturedForUser(userId) {
    const result = await this.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), paymentStatus: 'captured', isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result.length ? result[0].total : 0;
  },
};

const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
export default Payment;
