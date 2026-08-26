import mongoose from 'mongoose';

const SomaDailySubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: String, enum: ['monthly', 'annual'], required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: 'KES' },
    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active', index: true },
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    isIncludedWithMembership: { type: Boolean, default: false }, // true if via AMANI/UZIMA/FAMILY
    membershipTier: { type: String, default: '' },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    autoRenew: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SomaDailySubscriptionSchema.index({ user: 1, status: 1 });

SomaDailySubscriptionSchema.virtual('isActive').get(function () {
  if (this.status !== 'active') return false;
  return new Date() < this.expiryDate;
});

SomaDailySubscriptionSchema.set('toJSON', { virtuals: true });
SomaDailySubscriptionSchema.set('toObject', { virtuals: true });

const SomaDailySubscription = mongoose.models.SomaDailySubscription || mongoose.model('SomaDailySubscription', SomaDailySubscriptionSchema);
export default SomaDailySubscription;
