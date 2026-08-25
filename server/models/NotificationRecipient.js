import mongoose from 'mongoose';

const NotificationRecipientSchema = new mongoose.Schema(
  {
    notification:{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification', required: true, index: true },
    student:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isRead:      { type: Boolean, default: false, index: true },
    readAt:      { type: Date, default: null },
    deliveredAt: { type: Date, default: Date.now },
    archived:    { type: Boolean, default: false },
    deleted:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Primary list query: student notifications sorted by date, filtered by status
NotificationRecipientSchema.index({ student: 1, deleted: 1, archived: 1, isRead: 1, createdAt: -1 });
// Lookup by notification + student (unique constraint)
NotificationRecipientSchema.index({ notification: 1, student: 1 }, { unique: true });
// Notification-level read count queries (e.g. markAllRead → count per notif)
NotificationRecipientSchema.index({ notification: 1, isRead: 1 });

const NotificationRecipient = mongoose.models.NotificationRecipient
  || mongoose.model('NotificationRecipient', NotificationRecipientSchema);

export default NotificationRecipient;
