import mongoose from 'mongoose';
import { NOTIFICATION_LOG_STATUSES } from '../shared/constants/index.js';

const NotificationLogSchema = new mongoose.Schema(
  {
    notification: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification', required: true, index: true },
    user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    channel:      { type: String, required: true, index: true },

    provider:         { type: String, default: '' },
    providerMessageId:{ type: String, default: '' },
    providerResponse: { type: Object, default: null },

    status: {
      type: String,
      enum: NOTIFICATION_LOG_STATUSES,
      default: 'queued',
      index: true,
    },

    error: {
      code:      { type: String, default: '' },
      message:   { type: String, default: '' },
      retryable: { type: Boolean, default: true },
    },

    attempt:     { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    nextRetryAt: { type: Date, default: null, index: true },
    lastError:   { type: String, default: '' },

    queuedAt:    { type: Date, default: null },
    sentAt:      { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    failedAt:    { type: Date, default: null },
    openedAt:    { type: Date, default: null },
    clickedAt:   { type: Date, default: null },

    deviceInfo:  { type: String, default: '' },
    ipAddress:   { type: String, default: '' },
    userAgent:   { type: String, default: '' },
  },
  { timestamps: true }
);

// Compound indexes for the worker poll query:
//   status=queued AND (nextRetryAt IS NULL OR nextRetryAt <= now)
// The worker sorts by priority (-1) then createdAt (1).
NotificationLogSchema.index({ status: 1, nextRetryAt: 1, createdAt: 1 });
NotificationLogSchema.index({ status: 1, createdAt: 1 });

// Other useful indexes.
NotificationLogSchema.index({ notification: 1, channel: 1 });
NotificationLogSchema.index({ createdAt: -1 });
NotificationLogSchema.index({ user: 1, createdAt: -1 });

const NotificationLog =
  mongoose.models.NotificationLog ||
  mongoose.model('NotificationLog', NotificationLogSchema, 'NotificationLog');

export default NotificationLog;
