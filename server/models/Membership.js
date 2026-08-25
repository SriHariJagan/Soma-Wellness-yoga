import mongoose from 'mongoose';
import { MEMBERSHIP_STATUSES, MEMBERSHIP_SESSION_STATUSES, MEMBERSHIP_HISTORY_ACTIONS } from '../shared/constants/index.js';

const PauseEntrySchema = new mongoose.Schema({
  pauseStartedAt: { type: Date, required: true },
  pauseEndedAt:   { type: Date, default: null },
  daysCounted:    { type: Number, default: 0 },
}, { _id: false });

const HistoryEntrySchema = new mongoose.Schema({
  action:    { type: String },
  planMonths: Number,
  note:      String,
  at:        { type: Date, default: Date.now },
}, { _id: false });

const SessionHistoryEntrySchema = new mongoose.Schema({
  invitation:  { type: mongoose.Schema.Types.ObjectId, ref: 'ClassInvite' },
  title:       { type: String },
  date:        { type: Date },
  attendance:  { type: String, enum: ['present', 'zoom', 'absent'] },
  completedAt: { type: Date, default: Date.now },
}, { _id: false });

const MembershipSchema = new mongoose.Schema(
  {
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan:       { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    invoice:    { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    planType:   { type: String, default: 'Monthly Pass' },
    planMonths: { type: Number, default: 1 },
    price:      { type: Number, default: 0 },
    purchaseDate:{type: Date, default: Date.now },

    status:      { type: String, enum: ['active', 'expired', 'paused', 'cancelled'], default: 'active', index: true },
    deactivated: { type: Boolean, default: false, index: true },

    startDate:  { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },

    zoomAccess: { type: Boolean, default: true },
    benefits:   { type: [String], default: ['Unlimited live classes', 'Zoom access', 'Recorded sessions'] },

    // ── Pause fields ───────────────────────────────────────
    pauseDaysAllowed:  { type: Number, default: 0 },
    pauseDaysUsed:     { type: Number, default: 0 },
    pauseStartedAt:    { type: Date, default: null },
    pauseHistory:      { type: [PauseEntrySchema], default: [] },

    // Session tracking
    totalSessions:     { type: Number, default: null },
    completedSessions: { type: Number, default: 0 },
    sessionHistory:    { type: [SessionHistoryEntrySchema], default: [] },

    history: { type: [HistoryEntrySchema], default: [] },
  },
  { timestamps: true }
);

// ── Virtuals ────────────────────────────────────────────────────

MembershipSchema.virtual('remainingSessions').get(function () {
  if (this.totalSessions == null) return null;
  return Math.max(0, this.totalSessions - this.completedSessions);
});

MembershipSchema.virtual('sessionsProgressPct').get(function () {
  if (!this.totalSessions) return 0;
  return Math.min(100, Math.round((this.completedSessions / this.totalSessions) * 100));
});

MembershipSchema.virtual('daysLeft').get(function () {
  const ms = this.expiryDate - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
});

// ── Single source of truth for membership status ──────────────
MembershipSchema.virtual('computedStatus').get(function () {
  if (this.deactivated) return 'expired';
  if (this.status === 'cancelled') return 'cancelled';
  if (this.status === 'paused') return 'paused';
  if (this.status === 'expired') return 'expired';
  if (this.status === 'active' && this.expiryDate > new Date()) return 'active';
  return 'expired';
});

MembershipSchema.virtual('isActive').get(function () {
  return this.computedStatus === 'active';
});

// DB-level guard: at most one active membership per user.
MembershipSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);
MembershipSchema.virtual('remainingPauseDays').get(function () {
  return Math.max(0, this.pauseDaysAllowed - this.pauseDaysUsed);
});

MembershipSchema.virtual('isPaused').get(function () {
  return this.status === 'paused';
});

MembershipSchema.virtual('currentPauseDuration').get(function () {
  if (!this.pauseStartedAt || this.status !== 'paused') return 0;
  return Math.floor((Date.now() - this.pauseStartedAt.getTime()) / 86400000);
});

MembershipSchema.virtual('expectedResumeDate').get(function () {
  if (!this.pauseStartedAt || this.status !== 'paused') return null;
  const remaining = this.remainingPauseDays;
  if (remaining <= 0) return new Date();
  return new Date(this.pauseStartedAt.getTime() + remaining * 86400000);
});

MembershipSchema.set('toJSON', { virtuals: true });
MembershipSchema.set('toObject', { virtuals: true });

const Membership = mongoose.models.Membership || mongoose.model('Membership', MembershipSchema);
export default Membership;
