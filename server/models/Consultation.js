import mongoose from 'mongoose';
import { CONSULTATION_PAYMENT_STATUSES, CONSULTATION_STATUSES } from '../shared/constants/index.js';

const ConsultationSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date:    { type: Date, required: true },
    timeSlot: { type: String, default: '' },
    duration: { type: Number, default: 30 },
    doctor:  { type: String, default: 'Soma Wellness Team' },
    topic:   { type: String, default: 'General consultation' },
    price:   { type: Number, default: 0 },
    paymentStatus: { type: String, enum: CONSULTATION_PAYMENT_STATUSES, default: 'pending' },
    paymentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    status:  { type: String, enum: CONSULTATION_STATUSES, default: 'upcoming', index: true },
    meetingLink: { type: String, default: '' },
    assignedGuru: { type: String, default: '' },
    notes:   { type: String, default: '' },
    adminNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

const Consultation = mongoose.models.Consultation || mongoose.model('Consultation', ConsultationSchema);
export default Consultation;
