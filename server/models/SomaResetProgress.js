import mongoose from 'mongoose';

const SomaResetProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purchaseDate: { type: Date, default: Date.now },
    activatedAt: { type: Date, default: null },
    status: { type: String, enum: ['active', 'completed', 'expired', 'cancelled'], default: 'active', index: true },

    // Checklist (6-week programme)
    assessmentDone: { type: Boolean, default: false },
    assessmentDate: { type: Date, default: null },

    yogaSessionsTotal: { type: Number, default: 12 },
    yogaSessionsUsed: { type: Number, default: 0 },

    meditationTotal: { type: Number, default: 6 },
    meditationUsed: { type: Number, default: 0 },

    massagesTotal: { type: Number, default: 2 },
    massagesUsed: { type: Number, default: 0 },

    homePlanDelivered: { type: Boolean, default: false },
    homePlanDate: { type: Date, default: null },

    closingReviewDone: { type: Boolean, default: false },
    closingReviewDate: { type: Date, default: null },

    expiryDate: { type: Date, default: null }, // 6 weeks from activation
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    price: { type: Number, default: 32000 },
    currency: { type: String, default: 'KES' },

    notes: { type: String, default: '' },
    history: [{ action: String, note: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

SomaResetProgressSchema.virtual('isActive').get(function () {
  if (this.status !== 'active') return false;
  if (this.expiryDate && new Date() > this.expiryDate) return false;
  return true;
});
SomaResetProgressSchema.virtual('progressPct').get(function () {
  // Weighted? Simple: total components 6+ trackers
  const total = 1 + this.yogaSessionsTotal + this.meditationTotal + this.massagesTotal + 1 + 1; // assessment + yoga + med + massage + plan + review
  const done =
    (this.assessmentDone ? 1 : 0) +
    this.yogaSessionsUsed +
    this.meditationUsed +
    this.massagesUsed +
    (this.homePlanDelivered ? 1 : 0) +
    (this.closingReviewDone ? 1 : 0);
  return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
});

SomaResetProgressSchema.methods.activate = function (now = new Date()) {
  if (this.activatedAt) return this.activatedAt;
  this.activatedAt = new Date(now);
  const exp = new Date(this.activatedAt);
  exp.setDate(exp.getDate() + 42); // 6 weeks
  this.expiryDate = exp;
  this.history.push({ action: 'activated', note: 'Program started — 6-week clock began', at: now });
  return this.activatedAt;
};

SomaResetProgressSchema.set('toJSON', { virtuals: true });
SomaResetProgressSchema.set('toObject', { virtuals: true });

const SomaResetProgress = mongoose.models.SomaResetProgress || mongoose.model('SomaResetProgress', SomaResetProgressSchema);
export default SomaResetProgress;
