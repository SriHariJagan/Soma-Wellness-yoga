import mongoose from 'mongoose';
import { BATCH_STATUSES } from '../shared/constants/index.js';

const BatchSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true },
    timing:   { type: String, required: true },
    trainer:  { type: String, required: true },
    zoomLink: { type: String, default: '' },
    status:   { type: String, enum: BATCH_STATUSES, default: 'Active' },
  },
  { timestamps: true }
);

const Batch = mongoose.models.Batch || mongoose.model('Batch', BatchSchema);
export default Batch;