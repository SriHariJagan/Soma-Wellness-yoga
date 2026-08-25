import mongoose from 'mongoose';
import { ORDER_STATUSES } from '../shared/constants/index.js';

const OrderSchema = new mongoose.Schema(
  {
    orderNumber:   { type: String, unique: true, index: true },
    student:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subtotal:      { type: Number, required: true, min: 0 },
    discount:      { type: Number, default: 0, min: 0 },
    tax:           { type: Number, default: 0, min: 0 },
    total:         { type: Number, required: true, min: 0 },
    coupon:        { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    couponCode:    { type: String, default: '' },
    couponDiscount:{ type: Number, default: 0, min: 0 },
    // SECURITY: Default is 'pending' — only PaymentService.verify() sets 'completed'.
    // No order is ever automatically completed without verified payment.
    status:        { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    paymentMethod: { type: String, default: 'Manual' },
    transactionId: { type: String, default: '' },
    payment:       { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    itemCount:     { type: Number, default: 0 },

    // ── Book store (kind: 'book') fields — all optional so the
    //    legacy membership/service flow is untouched ──────────
    kind: { type: String, enum: ['general', 'book'], default: 'general', index: true },

    // Customer snapshot (never resolved from a user ID — historical
    // orders stay accurate even if the customer later changes details).
    customer: {
      fullName:  { type: String, default: '' },
      mobile:    { type: String, default: '' },
      email:     { type: String, default: '' },
      whatsapp:  { type: String, default: '' },
    },

    // Delivery address snapshot.
    shippingAddress: {
      house:       { type: String, default: '' },
      addressLine1:{ type: String, default: '' },
      addressLine2:{ type: String, default: '' },
      area:        { type: String, default: '' },
      landmark:    { type: String, default: '' },
      city:        { type: String, default: '' },
      state:       { type: String, default: '', index: true },
      pincode:     { type: String, default: '' },
      country:     { type: String, default: 'India' },
    },

    shippingCharge: { type: Number, default: 0, min: 0 },
    shippingType:   { type: String, default: 'flat' }, // flat | free
    estimatedDelivery: {
      minDays: { type: Number, default: 0 },
      maxDays: { type: Number, default: 0 },
    },

    // Courier / fulfilment.
    courier:       { type: String, default: '' },
    trackingNumber:{ type: String, default: '' },
    dispatchDate:  { type: Date, default: null },
    expectedDelivery: { type: Date, default: null },
    deliveredAt:   { type: Date, default: null },
    cancelledAt:   { type: Date, default: null },
    cancellationReason: { type: String, default: '' },
    returnedAt:    { type: Date, default: null },

    // Inventory reservation bookkeeping (idempotent release guard).
    inventoryReservedAt: { type: Date, default: null },
    inventoryReleasedAt: { type: Date, default: null },

    internalNotes: [{ body: { type: String, required: true }, by: { type: String, default: '' }, at: { type: Date, default: Date.now } }],
    timeline: [{ status: { type: String }, note: { type: String, default: '' }, by: { type: String, default: '' }, at: { type: Date, default: Date.now } }],
    emails: [{ type: { type: String }, to: { type: String, default: '' }, status: { type: String, enum: ['sent', 'failed', 'skipped'], default: 'sent' }, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

OrderSchema.pre('save', function () {
  if (!this.orderNumber) {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    this.orderNumber = `ORD-${year}-${rand}`;
  }
});

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export default Order;
