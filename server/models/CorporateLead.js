import mongoose from 'mongoose';
import { CORPORATE_LEAD_STATUSES } from '../shared/constants/soma.types.js';

const CorporateLeadSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    headcount: { type: Number, default: 0 },
    venue: { type: String, default: '' }, // "at SOMA" or "client offices" + address
    programme: { type: String, default: '' }, // Single session / Monthly 4 / Monthly 8 / Wellness day / Annual / custom
    preferredDates: { type: String, default: '' },
    needs: {
      facilitators: { type: Number, default: 1 },
      equipment: { type: Boolean, default: false },
      refreshments: { type: Boolean, default: false },
      reporting: { type: Boolean, default: false },
    },
    notes: { type: String, default: '' },
    status: { type: String, enum: CORPORATE_LEAD_STATUSES, default: 'new', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    quoteAmount: { type: Number, default: null }, // KES if quoted
    quoteNotes: { type: String, default: '' },
    convertedToBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    source: { type: String, default: 'website' },
  },
  { timestamps: true }
);

CorporateLeadSchema.index({ status: 1, createdAt: -1 });

const CorporateLead = mongoose.models.CorporateLead || mongoose.model('CorporateLead', CorporateLeadSchema);
export default CorporateLead;
