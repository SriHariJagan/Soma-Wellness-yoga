import mongoose from 'mongoose';

const QuoteRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    city: { type: String, default: '' },
    type: { type: String, enum: ['home_hotel', 'corporate', 'gift_voucher', 'other'], default: 'home_hotel' },

    // Home/hotel quote inputs
    distanceKm: { type: Number, default: null },
    groupSize: { type: Number, default: 1 },
    durationMin: { type: Number, default: 60 },
    venueAddress: { type: String, default: '' },
    preferredDate: { type: Date, default: null },
    preferredTime: { type: String, default: '' },

    // Corporate fields (reuse)
    companyName: { type: String, default: '' },
    headcount: { type: Number, default: null },
    venue: { type: String, default: '' },
    programme: { type: String, default: '' },

    notes: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'quoted', 'accepted', 'rejected', 'expired'], default: 'pending', index: true },
    quotedAmount: { type: Number, default: null },
    quotedCurrency: { type: String, default: 'KES' },
    quotedAt: { type: Date, default: null },
    quotedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    validUntil: { type: Date, default: null },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  },
  { timestamps: true }
);

QuoteRequestSchema.index({ status: 1, createdAt: -1 });

const QuoteRequest = mongoose.models.QuoteRequest || mongoose.model('QuoteRequest', QuoteRequestSchema);
export default QuoteRequest;
