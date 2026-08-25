import mongoose from 'mongoose';
import { ATTENDANCE_STATUSES, ATTENDANCE_MODES, ENTITY_TYPES } from '../shared/constants/index.js';

// One document per student per attended (or missed) day.
const AttendanceSchema = new mongoose.Schema(
  {
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date:      { type: Date, required: true },
    status:    { type: String, enum: ATTENDANCE_STATUSES, required: true },
    classType: { type: String, default: 'General' },
    mode:      { type: String, enum: ATTENDANCE_MODES, default: 'offline' },
    session:   { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSession', default: null },

    // Link back to the class invitation that generated this attendance session
    invitation: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassInvite', default: null },

    // Entity linkage — which enrollment does this attendance belong to?
    entityType: { type: String, enum: ENTITY_TYPES, default: 'none' },
    entityId:   { type: mongoose.Schema.Types.ObjectId, default: null },

    // Cached from the invitation for display
    instructor: { type: String, default: '' },

    // Whether the attendance record has been locked (no further edits)
    locked:    { type: Boolean, default: false },

    notes:     { type: String, default: '' },
  },
  { timestamps: true }
);

// A student can only have one attendance record per calendar day.
AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
export default Attendance;
