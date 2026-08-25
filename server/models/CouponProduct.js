import mongoose from 'mongoose';
import { COUPON_PRODUCT_TYPES } from '../shared/constants/index.js';

const CouponProductSchema = new mongoose.Schema(
  {
    coupon:      { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
    productType: { type: String, enum: COUPON_PRODUCT_TYPES, required: true },
    productId:   { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  },
  { timestamps: true }
);

CouponProductSchema.index({ coupon: 1, productType: 1, productId: 1 }, { unique: true });

const CouponProduct = mongoose.models.CouponProduct || mongoose.model('CouponProduct', CouponProductSchema);
export default CouponProduct;
