import mongoose from 'mongoose';
import { BULK_ENQUIRY_STATUSES } from '../shared/constants/index.js';

// ─────────────────────────────────────────────────────────────
// BulkEnquiry — institutional / bulk book order enquiries.
// Bulk customers do not go through the retail checkout; the
// Soma Wellness team follows up with a quotation.
// ─────────────────────────────────────────────────────────────
const BulkEnquirySchema = new mongoose.Schema(
  {
    referenceNumber: { type: String, unique: true, index: true },
    organisationName: { type: String, required: true, trim: true, maxlength: 200 },
    contactPerson:    { type: String, required: true, trim: true, maxlength: 150 },
    email:            { type: String, required: true, trim: true, lowercase: true, maxlength: 255 },
    phone:            { type: String, required: true, trim: true, maxlength: 20 },
    book:             { type: mongoose.Schema.Types.ObjectId, ref: 'Book', default: null },
    bookTitle:        { type: String, default: '', trim: true, maxlength: 200 },
    quantity:         { type: Number, required: true, min: 1 },
    state:            { type: String, default: '', trim: true, maxlength: 100 },
    pincode:          { type: String, default: '', trim: true, maxlength: 10 },
    message:          { type: String, default: '', maxlength: 3000 },
    status:           { type: String, enum: BULK_ENQUIRY_STATUSES, default: 'NEW', index: true },
    notes:            { type: String, default: '', maxlength: 3000 },
    handledBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

BulkEnquirySchema.pre('save', async function preSaveReference() {
  if (!this.referenceNumber) {
    this.referenceNumber = `BE-${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
});

BulkEnquirySchema.index({ status: 1, createdAt: -1 });
BulkEnquirySchema.index({ email: 1 });

const BulkEnquiry = mongoose.models.BulkEnquiry || mongoose.model('BulkEnquiry', BulkEnquirySchema);
export default BulkEnquiry;