import mongoose from 'mongoose';
import {
  OFFERING_CATEGORIES,
  OFFERING_STATUSES,
  OFFERING_VISIBILITY,
  OFFERING_PRICING_MODELS,
  OFFERING_VALIDITY_UNITS,
} from '../shared/constants/offering.types.js';

const OfferingSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────
    name:          { type: String, required: true, trim: true },
    slug:          { type: String, default: '', trim: true, index: true },
    subtitle:      { type: String, default: '' },
    description:   { type: String, default: '' },

    // ── Categorization ────────────────────────────────────────
    category:      { type: String, enum: OFFERING_CATEGORIES, required: true, index: true },
    subcategory:   { type: String, default: '' },
    tags:          { type: [String], default: [] },

    // ── Pricing ───────────────────────────────────────────────
    price:         { type: Number, default: 0, min: 0 },
    originalPrice: { type: Number, default: null },
    currency:      { type: String, default: 'KES' },
    pricingModel:  { type: String, enum: OFFERING_PRICING_MODELS, default: 'flat' },

    // ── Package / Session Details ─────────────────────────────
    sessions:          { type: Number, default: 0 },  // 0 = unlimited or not applicable
    sessionDuration:   { type: Number, default: 60 }, // minutes
    validityDuration:  { type: Number, default: 0 },
    validityUnit:      { type: String, enum: OFFERING_VALIDITY_UNITS, default: 'single' },

    // ── Content ───────────────────────────────────────────────
    whatIncluded:  { type: [String], default: [] },
    benefits:      { type: [String], default: [] },

    // ── Media ─────────────────────────────────────────────────
    image:         { type: String, default: '' },
    gallery:       { type: [String], default: [] },
    icon:          { type: String, default: '' },

    // ── Display ───────────────────────────────────────────────
    displayOrder:  { type: Number, default: 0 },
    featured:      { type: Boolean, default: false },
    isPopular:     { type: Boolean, default: false },

    // ── Status & Visibility ───────────────────────────────────
    status:        { type: String, enum: OFFERING_STATUSES, default: 'draft', index: true },
    visibility:    { type: String, enum: OFFERING_VISIBILITY, default: 'public' },
    bookingEnabled:{ type: Boolean, default: true },

    // ── Temporal ──────────────────────────────────────────────
    startDate:     { type: Date, default: null },
    endDate:       { type: Date, default: null },

    // ── Capacity ──────────────────────────────────────────────
    capacity:      { type: Number, default: 0, min: 0 }, // 0 = unlimited

    // ── Metadata ──────────────────────────────────────────────
    createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Pre-save: auto-generate slug from name
OfferingSchema.pre('save', function () {
  if (!this.slug || this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});

// Virtual: is this offering currently bookable?
OfferingSchema.virtual('isBookable').get(function () {
  if (this.status === 'draft' || this.status === 'archived') return false;
  if (!this.bookingEnabled) return false;
  if (this.visibility === 'hidden') return false;
  if (this.startDate && this.startDate > new Date()) return false;
  if (this.endDate && this.endDate < new Date()) return false;
  return true;
});

// Virtual: public status label
OfferingSchema.virtual('statusLabel').get(function () {
  switch (this.status) {
    case 'available':   return 'Available';
    case 'unavailable': return 'Currently Unavailable';
    case 'upcoming':    return 'Coming Soon';
    case 'draft':       return 'Draft';
    case 'archived':    return 'Archived';
    default:            return '';
  }
});

OfferingSchema.set('toJSON', { virtuals: true });
OfferingSchema.set('toObject', { virtuals: true });

const Offering = mongoose.models.Offering || mongoose.model('Offering', OfferingSchema);
export default Offering;
