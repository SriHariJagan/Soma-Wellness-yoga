import mongoose from 'mongoose';
import { PLAN_VISIBILITY } from '../shared/constants/index.js';

const PlanSchema = new mongoose.Schema(
  {
    name:              { type: String, required: true },
    description:       { type: String, default: '' },
    price:             { type: Number, default: 0 },
    currency:          { type: String, default: 'KES' },
    durationMonths:    { type: Number, required: true },
    durationUnit:      { type: String, default: 'months' },
    pauseDays:         { type: Number, default: 0 },
    benefits:          { type: [String], default: [] },
    features:          { type: [String], default: [] },
    badge:             { type: String, default: '' },
    membershipAccess:  { type: String, default: 'Full studio access' },
    displayOrder:      { type: Number, default: 0 },
    isPopular:         { type: Boolean, default: false },
    isRecommended:     { type: Boolean, default: false },
    active:            { type: Boolean, default: true },
    visibility:        { type: String, enum: PLAN_VISIBILITY, default: 'public' },
    createdBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // ── SOMA extensions ────────────────────────────────
    tier:              { type: String, enum: ['JUA', 'AMANI', 'UZIMA', 'FAMILY', null], default: null },
    tierLabel:         { type: String, default: '' },
    isSoma:            { type: Boolean, default: false },
    somaCategory:      { type: String, enum: ['membership', 'pass', 'daily', 'other'], default: 'membership' },
    allowances:        { type: mongoose.Schema.Types.Mixed, default: {} },
    foundingMonthly:   { type: Number, default: null },
    termPricing:       { type: mongoose.Schema.Types.Mixed, default: {} }, // {1:12000,3:32000...}
    originalPrice:     { type: Number, default: null },
  },
  { timestamps: true }
);

// Retired single-use tier names — they were fully removed from the catalog
// (see scripts/migrate-wellness-circle.js) and must never be recreated via
// admin CRUD or any other path. The single membership is SOMA Wellness Circle.
const RETIRED_PLAN_NAMES = new Set(['bronze', 'silver', 'gold']);

function rejectRetiredName(name) {
  if (name && RETIRED_PLAN_NAMES.has(String(name).trim().toLowerCase())) {
    throw new Error(
      `Plan name "${name}" is retired and cannot be created. Only the SOMA Wellness Circle is available.`,
    );
  }
}

PlanSchema.pre('save', function () {
  if (this.isNew || this.isModified('name')) rejectRetiredName(this.name);
});

PlanSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate() || {};
  const name = update.name ?? update.$set?.name;
  if (name !== undefined) rejectRetiredName(name);
});

PlanSchema.virtual('badgeLabel').get(function () {
  if (this.badge) return this.badge;
  if (this.isPopular) return 'Most Popular';
  if (this.isRecommended) return 'Recommended';
  return '';
});

PlanSchema.set('toJSON', { virtuals: true });
PlanSchema.set('toObject', { virtuals: true });

const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema);
export default Plan;
