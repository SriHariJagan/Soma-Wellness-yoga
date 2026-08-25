import mongoose from 'mongoose';

// One referral record per student, holding their unique code + tracking.
const ReferralSchema = new mongoose.Schema(
  {
    user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    code:   { type: String, required: true, unique: true, index: true },
    earned: { type: Number, default: 0 },              // credit balance in ₹

    invited: [
      { name: String, email: String, at: { type: Date, default: Date.now } },
    ],
    joined: [
      {
        user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name:  String,
        reward: { type: Number, default: 500 },
        at:    { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Referral = mongoose.models.Referral || mongoose.model('Referral', ReferralSchema);
export default Referral;
