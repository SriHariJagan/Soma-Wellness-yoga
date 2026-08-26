import mongoose from 'mongoose';
import crypto from 'crypto';
import { VOUCHER_STATUSES } from '../shared/constants/soma.types.js';

const GiftVoucherSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true }, // unique gift code
    amount: { type: Number, required: true, min: 100 }, // KES arbitrary amount
    balance: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'KES' },
    purchasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    purchaserEmail: { type: String, default: '' },
    recipientEmail: { type: String, default: '' },
    recipientName: { type: String, default: '' },
    message: { type: String, default: '' },
    status: { type: String, enum: VOUCHER_STATUSES, default: 'active', index: true },
    purchasedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }, // 12 months from purchase
    redeemedAt: { type: Date, default: null },
    redemptions: [
      {
        amount: Number,
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
        at: { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

GiftVoucherSchema.index({ expiresAt: 1 });

GiftVoucherSchema.virtual('isExpired').get(function () {
  return this.expiresAt && new Date() > this.expiresAt;
});
GiftVoucherSchema.virtual('isRedeemable').get(function () {
  return this.status === 'active' && !this.isExpired && this.balance > 0;
});

GiftVoucherSchema.statics.generateCode = function () {
  // SOMA-XXXX-XXXX format
  const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
  const raw2 = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `SOMA-${raw}-${raw2}`;
};

GiftVoucherSchema.pre('validate', function () {
  if (!this.code) this.code = this.constructor.generateCode();
  if (this.balance == null) this.balance = this.amount;
  if (!this.expiresAt && this.purchasedAt) {
    const d = new Date(this.purchasedAt);
    d.setFullYear(d.getFullYear() + 1); // 12 months validity
    this.expiresAt = d;
  }
});

GiftVoucherSchema.methods.redeem = function (amount) {
  if (this.status !== 'active') throw new Error('Voucher not active');
  if (this.isExpired) { this.status = 'expired'; throw new Error('Voucher expired'); }
  if (this.balance < amount) throw new Error('Insufficient voucher balance');
  this.balance -= amount;
  this.redemptions.push({ amount, at: new Date() });
  if (this.balance === 0) {
    this.status = 'redeemed';
    this.redeemedAt = new Date();
  }
  return this;
};

GiftVoucherSchema.set('toJSON', { virtuals: true });
GiftVoucherSchema.set('toObject', { virtuals: true });

const GiftVoucher = mongoose.models.GiftVoucher || mongoose.model('GiftVoucher', GiftVoucherSchema);
export default GiftVoucher;
