import mongoose from 'mongoose';
import { TRIAL_STATUSES } from '../shared/constants/index.js';

const FreeTrialSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: TRIAL_STATUSES, default: 'active', index: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  maxSessions: { type: Number, default: 7 },
  completedSessions: { type: Number, default: 0 },
  completedAt: { type: Date, default: null },
  convertedAt: { type: Date, default: null },
  convertedToPlan: { type: String, default: '' },
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, default: '' },
  reminderSent: { type: Boolean, default: false },
  history: [{
    action: { type: String },
    note: { type: String },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

FreeTrialSchema.virtual('daysLeft').get(function () {
  return Math.max(0, Math.ceil((this.endDate - new Date()) / 86400000));
});

FreeTrialSchema.virtual('daysTotal').get(function () {
  return 7;
});

FreeTrialSchema.virtual('sessionsLeft').get(function () {
  return Math.max(0, this.maxSessions - this.completedSessions);
});

FreeTrialSchema.virtual('sessionsProgressPct').get(function () {
  return Math.min(100, Math.round((this.completedSessions / this.maxSessions) * 100));
});

FreeTrialSchema.virtual('progressPct').get(function () {
  const sessPct = this.sessionsProgressPct;
  return sessPct;
});

FreeTrialSchema.set('toJSON', { virtuals: true });
FreeTrialSchema.set('toObject', { virtuals: true });

const FreeTrial = mongoose.models.FreeTrial || mongoose.model('FreeTrial', FreeTrialSchema);
export default FreeTrial;
