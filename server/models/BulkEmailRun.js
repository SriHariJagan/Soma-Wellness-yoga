import mongoose from 'mongoose';

// Ledger for weekly bulk-email executions. One document per
// (schedule + runDate). Unique index guarantees a weekly email is
// never executed twice (worker restart / retry / redeploy safe).
const BulkEmailRunSchema = new mongoose.Schema(
  {
    schedule: { type: mongoose.Schema.Types.ObjectId, ref: 'NotificationSchedule', required: true, index: true },
    runDate:  { type: String, required: true }, // YYYY-MM-DD in schedule timezone
    status:   { type: String, enum: ['running', 'completed', 'failed'], default: 'running', index: true },
    subject:  { type: String, default: '' },
    audienceSnapshot: { type: Object, default: {} },
    sent:     { type: Number, default: 0 },
    failed:   { type: Number, default: 0 },
    skipped:  { type: Number, default: 0 },
    total:    { type: Number, default: 0 },
    error:    { type: String, default: '' },
    startedAt:{ type: Date, default: Date.now },
    finishedAt:{ type: Date, default: null },
  },
  { timestamps: true }
);

BulkEmailRunSchema.index({ schedule: 1, runDate: 1 }, { unique: true });

const BulkEmailRun =
  mongoose.models.BulkEmailRun ||
  mongoose.model('BulkEmailRun', BulkEmailRunSchema, 'BulkEmailRun');

export default BulkEmailRun;
