import mongoose from 'mongoose';
import { LEAD_STAGES } from '../shared/constants/index.js';

const LeadSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true },
    phone:        { type: String, default: '' },
    email:        { type: String, default: '' },
    interestType: { type: String, default: 'General Yoga' },
    stage:        { type: String, enum: LEAD_STAGES, default: 'New' },
    notes:        { type: String, default: '' },
  },
  { timestamps: true }
);

const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
export default Lead;
