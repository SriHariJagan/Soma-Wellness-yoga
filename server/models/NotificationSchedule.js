import mongoose from 'mongoose';
import { NOTIFICATION_SCHEDULE_TYPES, NOTIFICATION_SCHEDULE_STATUSES } from '../shared/constants/index.js';

const NotificationScheduleSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    description: { type: String, default: '' },
    type:        { type: String, enum: NOTIFICATION_SCHEDULE_TYPES, default: 'recurring' },

    template:    { type: String, required: true },
    templateData:{ type: Object, default: {} },

    trigger: {
      event:   { type: String, default: '' },
      cron:    { type: String, default: '' },
      delayMs: { type: Number, default: 0 },
    },

    audience: {
      allUsers:           { type: Boolean, default: false },
      roles:              { type: [String], default: [] },
      planTypes:          { type: [String], default: [] },
      userQuery:          { type: Object, default: null },
      excludeRecentHours: { type: Number, default: 0 },
    },

    channels: { type: [String], default: ['inApp'] },

    rateLimit: {
      perMinute:   { type: Number, default: 0 },
      concurrency: { type: Number, default: 5 },
    },

    status:   { type: String, enum: NOTIFICATION_SCHEDULE_STATUSES, default: 'active', index: true },
    lastRunAt:{ type: Date, default: null },
    nextRunAt:{ type: Date, default: null },
    totalSent:{ type: Number, default: 0 },
  },
  { timestamps: true }
);

NotificationScheduleSchema.index({ status: 1, nextRunAt: 1 });

const NotificationSchedule =
  mongoose.models.NotificationSchedule ||
  mongoose.model('NotificationSchedule', NotificationScheduleSchema, 'NotificationSchedule');

export default NotificationSchedule;
