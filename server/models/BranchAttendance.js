import mongoose from 'mongoose';

const BranchAttendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attendanceDate: {
      type: Date,
      required: true,
      index: true,
    },
    attendanceDay: {
      type: String,
      required: true,
      index: true,
    },
    scannedAt: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      enum: ['QR'],
      default: 'QR',
    },
    status: {
      type: String,
      enum: ['PRESENT', 'CANCELLED'],
      default: 'PRESENT',
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// Unique compound index: one attendance per user per branch per day
BranchAttendanceSchema.index(
  { user: 1, branch: 1, attendanceDay: 1 },
  { unique: true }
);

const BranchAttendance = mongoose.models.BranchAttendance || mongoose.model('BranchAttendance', BranchAttendanceSchema);
export default BranchAttendance;
