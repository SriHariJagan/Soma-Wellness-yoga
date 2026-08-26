import mongoose from 'mongoose';
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '../shared/constants/soma.types.js';

const AppointmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: APPOINTMENT_TYPES, required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
    serviceName: { type: String, default: '' },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', default: null },
    instructorName: { type: String, default: '' },

    slotStart: { type: Date, required: true, index: true },
    slotEnd: { type: Date, required: true },
    durationMin: { type: Number, default: 60 },

    // Pricing snapshot
    basePrice: { type: Number, default: 0 },
    surchargePct: { type: Number, default: 0 },
    surchargeAmount: { type: Number, default: 0 },
    discountPct: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    finalPrice: { type: Number, default: 0 },
    currency: { type: String, default: 'KES' },

    // Quote-based (home/hotel, corporate)
    isQuoteBased: { type: Boolean, default: false },
    quoteStatus: { type: String, enum: ['pending', 'quoted', 'accepted', 'rejected'], default: null },
    quoteAmount: { type: Number, default: null },

    status: { type: String, enum: APPOINTMENT_STATUSES, default: 'scheduled', index: true },
    cancellation: {
      cancelledAt: { type: Date, default: null },
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      feeDue: { type: Number, default: 0 },
      feePct: { type: Number, default: 0 },
      category: { type: String, default: null }, // free / late / no_show
      hoursBefore: { type: Number, default: null },
    },
    noShow: { type: Boolean, default: false },

    // Health & therapy
    healthDisclosure: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthDisclosure', default: null },
    therapyDisclaimerAccepted: { type: Boolean, default: false },
    medicalClearanceRequired: { type: Boolean, default: false },
    medicalClearanceProvided: { type: Boolean, default: false },

    // Youth age grouping
    childDob: { type: Date, default: null },
    childAgeGroup: { type: String, default: '' }, // "5-12" or "13-17"

    notes: { type: String, default: '' },
    internalNotes: { type: String, default: '' },

    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    invoiceNo: { type: String, default: '' },
  },
  { timestamps: true }
);

// Prevent double-booking same user+slot
AppointmentSchema.index({ user: 1, slotStart: 1 }, { unique: false });
AppointmentSchema.index({ instructor: 1, slotStart: 1 });
AppointmentSchema.index({ status: 1, slotStart: 1 });

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', AppointmentSchema);
export default Appointment;
