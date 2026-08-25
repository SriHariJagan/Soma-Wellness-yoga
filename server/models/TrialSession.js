import mongoose from 'mongoose';

const TrialSessionSchema = new mongoose.Schema({
  trial: { type: mongoose.Schema.Types.ObjectId, ref: 'FreeTrial', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  instructor: { type: String, default: '' },
  date: { type: Date, required: true, index: true },
  startTime: { type: String, default: '' },
  endTime: { type: String, default: '' },
  duration: { type: Number, default: 60 },
  meetingPlatform: { type: String, default: 'Zoom' },
  meetingLink: { type: String, default: '' },
  location: { type: String, default: '' },
  notes: { type: String, default: '' },
  adminNotes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'missed', 'cancelled', 'rescheduled'],
    default: 'scheduled',
  },
  attended: { type: Boolean },
  cancelled: { type: Boolean, default: false },
  cancelReason: { type: String, default: '' },
  rescheduledFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'TrialSession', default: null },
  rescheduledTo: { type: mongoose.Schema.Types.ObjectId, ref: 'TrialSession', default: null },
  fileUrl: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

TrialSessionSchema.index({ trial: 1, date: 1 });

const TrialSession = mongoose.models.TrialSession || mongoose.model('TrialSession', TrialSessionSchema);
export default TrialSession;
