import mongoose from 'mongoose';
import { REPORT_TARGET_TYPES, REPORT_REASONS, REPORT_STATUSES } from '../shared/constants/index.js';

const ReportSchema = new mongoose.Schema({
  reporter:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: REPORT_TARGET_TYPES, required: true },
  target:     { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  reason:     { type: String, enum: REPORT_REASONS, required: true },
  description:{ type: String, default: '', maxlength: 1000 },
  status:     { type: String, enum: REPORT_STATUSES, default: 'pending', index: true },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
  action:     { type: String, default: '' },
}, { timestamps: true });

ReportSchema.index({ targetType: 1, target: 1, status: 1 });
ReportSchema.index({ reporter: 1, targetType: 1, target: 1 }, { unique: true });

const Report = mongoose.models.Report || mongoose.model('Report', ReportSchema, 'Report');
export default Report;
