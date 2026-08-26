import mongoose from 'mongoose';
import { SOMA_PASS_TYPES } from '../shared/constants/soma.types.js';

const SomaPassSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: SOMA_PASS_TYPES, required: true },
    label: { type: String, default: '' },
    totalClasses: { type: Number, required: true },
    remainingClasses: { type: Number, required: true },
    perClassRate: { type: Number, default: null },
    price: { type: Number, required: true },
    currency: { type: String, default: 'KES' },

    purchasedAt: { type: Date, default: Date.now },
    activatedAt: { type: Date, default: null }, // set on first redemption (first use)
    expiresAt: { type: Date, default: null },

    // Expiry rules: 6 weeks / 3 months from activated_at
    validityWeeks: { type: Number, default: null },
    validityMonths: { type: Number, default: null },

    status: { type: String, enum: ['active', 'expired', 'completed', 'cancelled'], default: 'active', index: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },

    history: [
      { action: String, note: String, at: { type: Date, default: Date.now } },
    ],
  },
  { timestamps: true }
);

SomaPassSchema.index({ user: 1, status: 1 });
SomaPassSchema.index({ expiresAt: 1 });

SomaPassSchema.virtual('isActive').get(function () {
  if (this.status !== 'active') return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  return true;
});
SomaPassSchema.virtual('daysLeft').get(function () {
  if (!this.expiresAt) return null;
  const ms = this.expiresAt - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
});

SomaPassSchema.methods.activateIfNeeded = function (now = new Date()) {
  if (this.activatedAt) return this.activatedAt;
  this.activatedAt = new Date(now);
  // Compute expiresAt from activatedAt
  const exp = new Date(this.activatedAt);
  if (this.validityWeeks) exp.setDate(exp.getDate() + this.validityWeeks * 7);
  else if (this.validityMonths) exp.setMonth(exp.getMonth() + this.validityMonths);
  else exp.setDate(exp.getDate() + 42); // default 6 weeks
  this.expiresAt = exp;
  this.history.push({ action: 'activated', note: 'First use — expiry started', at: now });
  return this.activatedAt;
};

SomaPassSchema.methods.consume = function (now = new Date()) {
  if (this.status !== 'active') throw new Error('Pass not active');
  if (this.remainingClasses <= 0) throw new Error('No classes remaining');
  this.activateIfNeeded(now);
  this.remainingClasses -= 1;
  if (this.remainingClasses === 0) {
    this.status = 'completed';
    this.history.push({ action: 'completed', note: 'All classes used', at: now });
  }
  return this;
};

SomaPassSchema.set('toJSON', { virtuals: true });
SomaPassSchema.set('toObject', { virtuals: true });

const SomaPass = mongoose.models.SomaPass || mongoose.model('SomaPass', SomaPassSchema);
export default SomaPass;
