import mongoose from 'mongoose';

const HealthDisclosureSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    bookingType: { type: String, default: '' }, // e.g. 'therapy', 'massage', 'pregnancy', 'senior', 'signature'
    // Required prompt fields (any relevant condition)
    pregnancy: { type: Boolean, default: false },
    recentSurgery: { type: Boolean, default: false },
    injury: { type: Boolean, default: false },
    significantPain: { type: Boolean, default: false },
    heartConcerns: { type: Boolean, default: false },
    otherCondition: { type: String, default: '' },
    hasOther: { type: Boolean, default: false },
    details: { type: String, default: '' }, // free text

    // Therapy disclaimer (required for yoga therapy)
    therapyDisclaimerAccepted: { type: Boolean, default: false },
    therapyDisclaimerText: { type: String, default: 'Yoga therapy supports wellbeing and function and does not replace medical diagnosis or emergency care. Medical clearance may be required.' },

    medicalClearanceRequired: { type: Boolean, default: false },
    medicalClearanceProvided: { type: Boolean, default: false },
    medicalClearanceNotes: { type: String, default: '' },

    consentGiven: { type: Boolean, required: true },
    consentedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

HealthDisclosureSchema.index({ user: 1, createdAt: -1 });

const HealthDisclosure = mongoose.models.HealthDisclosure || mongoose.model('HealthDisclosure', HealthDisclosureSchema);
export default HealthDisclosure;
