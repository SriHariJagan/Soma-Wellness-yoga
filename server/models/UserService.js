import mongoose from 'mongoose';
import { USER_SERVICE_STATUSES, SERVICE_PAYMENT_STATUSES } from '../shared/constants/index.js';

const UserServiceSchema = new mongoose.Schema(
  {
    user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    service:      { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
    instructor:   { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', default: null },
    instructors:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Instructor' }],
    payment:      { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },

    serviceName:   { type: String, required: true },
    serviceDesc:   { type: String, default: '' },
    category:      { type: String, default: '' },
    type:          { type: String, default: '' },
    mode:          { type: String, default: '' },
    pricingModel:  { type: String, default: 'flat' },
    instructorName:{ type: String, default: '' },
    scheduleDays:  { type: [String], default: [] },
    scheduleTime:  { type: String, default: '' },
    sessionDuration:{ type: Number, default: 60 },

    price:         { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    usedSessions:  { type: Number, default: 0 },
    frozenProgressPct: { type: Number, default: null },

    status:        { type: String, enum: USER_SERVICE_STATUSES, default: 'active', index: true },
    // SECURITY: Default is 'pending' — only PaymentService.verify() or admin action sets 'paid'.
    // No service enrollment is ever automatically activated without verified payment.
    paymentStatus: { type: String, enum: SERVICE_PAYMENT_STATUSES, default: 'pending', index: true },
    transactionId: { type: String, default: '' },

    purchaseDate:  { type: Date, default: Date.now },
    // SOMA rule: expiry starts from first use (activated_at), NOT purchaseDate
    purchased_at:  { type: Date, default: Date.now },
    activated_at:  { type: Date, default: null }, // set on first redemption; nullable
    activationDate:{ type: Date, default: null },
    expiryDate:    { type: Date, default: null },
    completionDate:{ type: Date, default: null },
    // SOMA package specifics
    validityWeeks: { type: Number, default: null },
    validityMonths:{ type: Number, default: null },
    currency:      { type: String, default: 'KES' },
    // For SOMA RESET progress tracking
    progress: {
      assessmentDone: { type: Boolean, default: false },
      yogaUsed: { type: Number, default: 0 },
      yogaTotal: { type: Number, default: 0 },
      meditationUsed: { type: Number, default: 0 },
      meditationTotal: { type: Number, default: 0 },
      massagesUsed: { type: Number, default: 0 },
      massagesTotal: { type: Number, default: 0 },
      homePlanDelivered: { type: Boolean, default: false },
      reviewDone: { type: Boolean, default: false },
    },

    history: [
      { action: { type: String }, note: { type: String }, at: { type: Date, default: Date.now } },
    ],
  },
  { timestamps: true }
);

UserServiceSchema.virtual('remainingSessions').get(function () {
  return Math.max(0, this.totalSessions - this.usedSessions);
});

UserServiceSchema.virtual('daysLeft').get(function () {
  if (!this.expiryDate) return null;
  const ms = this.expiryDate - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
});

UserServiceSchema.virtual('isActive').get(function () {
  if (this.status !== 'active') return false;
  if (this.expiryDate && this.expiryDate <= new Date()) return false;
  return true;
});

UserServiceSchema.set('toJSON', { virtuals: true });
UserServiceSchema.set('toObject', { virtuals: true });

const UserService = mongoose.models.UserService || mongoose.model('UserService', UserServiceSchema, 'UserService');
export default UserService;
