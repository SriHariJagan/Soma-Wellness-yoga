import mongoose from 'mongoose';

const BranchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, lowercase: true, unique: true, index: true },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    isVerified: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const Branch = mongoose.models.Branch || mongoose.model('Branch', BranchSchema);
export default Branch;
