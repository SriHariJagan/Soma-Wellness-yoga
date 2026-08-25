import mongoose from 'mongoose';

const TrialNotificationSchema = new mongoose.Schema({
  trial: { type: mongoose.Schema.Types.ObjectId, ref: 'FreeTrial', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['session_added', 'session_updated', 'session_cancelled', 'reminder', 'announcement', 'message', 'schedule_change', 'file_shared'], default: 'announcement' },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  read: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

TrialNotificationSchema.index({ trial: 1, createdAt: -1 });

const TrialNotification = mongoose.models.TrialNotification || mongoose.model('TrialNotification', TrialNotificationSchema);
export default TrialNotification;
