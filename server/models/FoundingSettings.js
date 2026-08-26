import mongoose from 'mongoose';

const FoundingSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    openingDate: { type: Date, required: true }, // Spring Valley launch date
    cap: { type: Number, default: 100 },
    windowDays: { type: Number, default: 90 },
    lockMonths: { type: Number, default: 12 },
    count: { type: Number, default: 0 }, // founding members signed up
    active: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

FoundingSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: 'global' });
  if (!doc) {
    // Default opening date to Aug 2026 if not set (from spec: August 2026)
    doc = await this.create({ key: 'global', openingDate: new Date('2026-08-01T00:00:00+03:00') });
  }
  return doc;
};

// Atomic claim helper — returns doc if claimed, null if cap reached
FoundingSettingsSchema.statics.tryClaimSlot = async function () {
  const doc = await this.findOneAndUpdate(
    { key: 'global', count: { $lt: 100 } },
    { $inc: { count: 1 } },
    { returnDocument: 'after' }
  );
  return doc; // null means cap reached
};

const FoundingSettings = mongoose.models.FoundingSettings || mongoose.model('FoundingSettings', FoundingSettingsSchema);
export default FoundingSettings;
