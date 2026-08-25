import mongoose from 'mongoose';
import { WORKSHOP_STATUSES } from '../shared/constants/index.js';

const WorkshopSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true },
    date:     { type: Date, required: true, index: true },
    startTime:   { type: String, default: '' },  // e.g. "10:00 AM"
    endTime:     { type: String, default: '' },  // e.g. "12:00 PM"
    duration: { type: String, default: '' },     // e.g. "2 hours"
    price:    { type: Number, default: 0 },
    capacity: { type: Number, default: 50 },
    instructor: { type: String, default: '' },
    description: { type: String, default: '' },
    zoomLink: { type: String, default: '' },
    image:    { type: String, default: '' },
    registrationDeadline: { type: Date, default: null },
    isPaid:   { type: Boolean, default: false },
    allowedPlans: { type: [String], default: [] },  // plan names that can access this workshop
    isPublished:  { type: Boolean, default: false, index: true },
    publishedAt:  { type: Date, default: null },
    archived:     { type: Boolean, default: false, index: true },

    status: { type: String, enum: WORKSHOP_STATUSES, default: 'available', index: true },

    registrations: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        paid: { type: Boolean, default: false },
        attended: { type: Boolean, default: false },
        at:   { type: Date, default: Date.now },
        planType:   { type: String, default: '' },
        planMonths: { type: Number, default: 0 },
        lastJoinTime: { type: Date, default: null },
      },
    ],
  },
  { timestamps: true }
);

const Workshop = mongoose.models.Workshop || mongoose.model('Workshop', WorkshopSchema);
export default Workshop;
