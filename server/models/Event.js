// ============================================================
// models/Event.js
// Community events created by the admin. Published events show
// on the public /events calendar and inside the student
// dashboard, where any logged-in student can register.
// ============================================================
import mongoose from 'mongoose';
import { EVENT_STATUSES } from '../shared/constants/index.js';

const EventSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true },
    description: { type: String, default: '' },
    date:        { type: Date, required: true, index: true },
    startTime:   { type: String, default: '' },   // e.g. "10:00 AM"
    endTime:     { type: String, default: '' },   // e.g. "12:00 PM"
    location:    { type: String, default: '' },   // venue / online link
    instructor:  { type: String, default: '' },
    image:       { type: String, default: '' },
    capacity:    { type: Number, default: 0 },     // 0 = unlimited seats
    registrationDeadline: { type: Date, default: null },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: EVENT_STATUSES,
      default: 'available',
      index: true,
    },
    registrations: [
      {
        user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name:  { type: String, default: '' },
        email: { type: String, default: '' },
        registeredAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Event', EventSchema);
