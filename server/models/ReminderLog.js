import mongoose from 'mongoose';

const ReminderLogSchema = new mongoose.Schema(
  {
    type:      { type: String, required: true },
    reference: { type: mongoose.Schema.Types.ObjectId, required: true },
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dateKey:   { type: String, default: '' },
    metadata:  { type: Object, default: {} },
  },
  { timestamps: true }
);

ReminderLogSchema.index({ type: 1, reference: 1, user: 1, dateKey: 1 }, { unique: true });

const ReminderLog =
  mongoose.models.ReminderLog ||
  mongoose.model('ReminderLog', ReminderLogSchema, 'ReminderLog');

export default ReminderLog;
