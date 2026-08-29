import mongoose from 'mongoose';

const OtpSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true, trim: true, lowercase: true, index: true },
    // normalized identifier: lower-cased email or E.164 phone
    channel: { type: String, enum: ['email', 'sms'], required: true },
    otpHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    resendCount: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    lastSentAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

// TTL index — auto-delete expired OTP docs (expire after 0 seconds past expiresAt)
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// compound unique per identifier+channel so only one active OTP per channel
OtpSchema.index({ identifier: 1, channel: 1 }, { unique: true });

const Otp = mongoose.models.Otp || mongoose.model('Otp', OtpSchema, 'Otp');
export default Otp;
