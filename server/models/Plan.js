import mongoose from 'mongoose';
import { PLAN_VISIBILITY } from '../shared/constants/index.js';

const PlanSchema = new mongoose.Schema(
  {
    name:              { type: String, required: true },
    description:       { type: String, default: '' },
    price:             { type: Number, default: 0 },
    currency:          { type: String, default: 'INR' },
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
  },
  { timestamps: true }
);

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
