import mongoose from 'mongoose';
import { ATTENDANCE_MODES, CLASS_SESSION_STATUSES } from '../shared/constants/index.js';

// A scheduled class. Upcoming sessions show in "Classes → Upcoming";
// completed sessions with a recordingUrl show under "Recordings".
const ClassSessionSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true },
    time:    { type: String, default: '' },      // display string e.g. "6:00 AM"
    date:    { type: Date, required: true, index: true },
    mode:    { type: String, enum: ATTENDANCE_MODES, default: 'online' },
    trainer: { type: String, default: '' },
    zoomUrl: { type: String, default: '' },
    batch:   { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },

    capacity:     { type: Number, default: 30 },
    enrolledUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    status:       { type: String, enum: CLASS_SESSION_STATUSES, default: 'upcoming', index: true },
    recordingUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

const ClassSession = mongoose.models.ClassSession || mongoose.model('ClassSession', ClassSessionSchema);
export default ClassSession;
