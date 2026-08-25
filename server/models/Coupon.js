import mongoose from 'mongoose';
import { COUPON_DISCOUNT_TYPES, COUPON_APPLICABLE_TO } from '../shared/constants/index.js';

const CouponSchema = new mongoose.Schema(
  {
    code:          { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description:   { type: String, default: '' },
    discountType:  { type: String, enum: COUPON_DISCOUNT_TYPES, default: 'Percentage' },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscount:   { type: Number, default: 0, min: 0 },
    minPurchase:   { type: Number, default: 0, min: 0 },
    usageLimit:    { type: Number, default: 0, min: 0 },
    usagePerUser:  { type: Number, default: 0, min: 0 },
    usageCount:    { type: Number, default: 0, min: 0 },
    startDate:     { type: Date, default: null },
    expiryDate:    { type: Date, default: null },
    active:        { type: Boolean, default: true },
    autoApply:     { type: Boolean, default: false },
    priority:      { type: Number, default: 0, min: 0 },
    isReferral:    { type: Boolean, default: false },
    applicableTo:  { type: String, enum: COUPON_APPLICABLE_TO, default: 'all' },
    createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

CouponSchema.virtual('isExpired').get(function () {
  return this.expiryDate && new Date() > this.expiryDate;
});

CouponSchema.virtual('isValid').get(function () {
  if (!this.active) return false;
  if (this.expiryDate && new Date() > this.expiryDate) return false;
  if (this.startDate && new Date() < this.startDate) return false;
  if (this.usageLimit > 0 && this.usageCount >= this.usageLimit) return false;
  return true;
});

CouponSchema.set('toJSON', { virtuals: true });
CouponSchema.set('toObject', { virtuals: true });

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);
export default Coupon;
