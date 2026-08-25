import mongoose from 'mongoose';

const TimeSlotSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    time: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TimeSlotSchema.index({ date: 1, time: 1 }, { unique: true });

const TimeSlot = mongoose.models.TimeSlot || mongoose.model('TimeSlot', TimeSlotSchema);
export default TimeSlot;
