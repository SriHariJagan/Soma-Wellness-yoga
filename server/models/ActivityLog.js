import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema(
  {
    action:      { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    targetUser:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    meta:        { type: Object, default: {} },
  },
  { timestamps: true }
);

const ActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);
export default ActivityLog;
