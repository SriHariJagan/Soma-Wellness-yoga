import mongoose from 'mongoose';
import { SHIPPING_TYPES } from '../shared/constants/index.js';

// ─────────────────────────────────────────────────────────────
// ShippingRule — server-side delivery rule engine.
//
// A rule matches a destination from most specific to most
// general (blocked PINs → allowed PINs → PIN ranges → states →
// country → default). Rules with higher specificity override
// general rules regardless of creation order.
// ─────────────────────────────────────────────────────────────
const PincodeRangeSchema = new mongoose.Schema(
  {
    from: { type: String, required: true, match: /^\d{6}$/ },
    to:   { type: String, required: true, match: /^\d{6}$/ },
  },
  { _id: false }
);

const ShippingRuleSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true, maxlength: 150 },
    priority:    { type: Number, default: 0 },
    status:      { type: String, enum: ['active', 'inactive'], default: 'active', index: true },

    // Matching scope. '*' means "any".
    country:     { type: String, default: 'India', trim: true, maxlength: 100 },
    states:      { type: [String], default: [] },
    allowedPincodes: { type: [String], default: [] },
    blockedPincodes: { type: [String], default: [] },
    pincodeRanges:   { type: [PincodeRangeSchema], default: [] },

    // Delivery terms.
    shippingType:     { type: String, enum: SHIPPING_TYPES, default: 'flat' },
    shippingAmount:   { type: Number, default: 0, min: 0 },
    freeShippingThreshold: { type: Number, default: 0, min: 0 },
    deliveryMinDays:  { type: Number, default: 3, min: 0 },
    deliveryMaxDays:  { type: Number, default: 5, min: 0 },
    notes:            { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

ShippingRuleSchema.index({ priority: -1, status: 1 });
ShippingRuleSchema.index({ country: 1, status: 1 });

const ShippingRule = mongoose.models.ShippingRule || mongoose.model('ShippingRule', ShippingRuleSchema);
export default ShippingRule;