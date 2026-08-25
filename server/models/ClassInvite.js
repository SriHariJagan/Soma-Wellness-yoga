import mongoose from 'mongoose';
import {
  RECIPIENT_STATUSES,
  INVITE_CATEGORIES,
  PLATFORM_TYPES,
  RECIPIENT_TYPES,
  ENTITY_TYPES,
  CLASS_INVITE_STATUSES,
} from '../shared/constants/index.js';

const RecipientSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  status: { type: String, enum: RECIPIENT_STATUSES, default: 'pending' },
  readAt: { type: Date, default: null },
  notified: { type: Boolean, default: false },
  notifiedAt: { type: Date, default: null },
  reminderSent: { type: Map, of: Boolean, default: {} },
  joinedAt: { type: Date, default: null },
}, { _id: false });

const ClassInviteSchema = new mongoose.Schema({
  title: { type: String, required: true },

  inviteCategory: {
    type: String,
    enum: INVITE_CATEGORIES,
    default: 'class',
    index: true,
  },

  description: { type: String, default: '' },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, default: '' },
  duration: { type: Number, default: 60 },
  instructor: { type: String, default: '' },
  platform: { type: String, enum: PLATFORM_TYPES, default: 'Zoom' },
  meetingLink: { type: String, default: '' },
  meetingPassword: { type: String, default: '' },
  notes: { type: String, default: '' },
  attachments: { type: String, default: '' },

  recipientType: {
    type: String,
    enum: RECIPIENT_TYPES,
    default: 'custom',
  },
  recipientFilter: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Permanent entity linkage — tells which membership / service / course / etc.
  // this invitation was created for.  Every invitation created via a specific
  // enrollment filter stores the exact entity reference so the student dashboard
  // can display the correct badge and the progress system can attribute the session.
  entityType: {
    type: String,
    enum: ENTITY_TYPES,
    default: 'none',
    index: true,
  },
  entityId:   { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  entityName: { type: String, default: '' },  // cached display name, e.g. "Online Yoga Service"
  entityLabel:{ type: String, default: '' },  // short badge label, e.g. "12-Month Membership"

  reminderConfig: {
    enabled: { type: Boolean, default: false },
    reminders: { type: [Number], default: [1440, 60, 15] },
  },

  recipients: [RecipientSchema],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: CLASS_INVITE_STATUSES, default: 'active', index: true },
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, default: '' },

  history: [{
    action: { type: String },
    note: { type: String },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  }],

  totalRecipients: { type: Number, default: 0 },
  deliveredCount: { type: Number, default: 0 },
  readCount: { type: Number, default: 0 },
  pendingCount: { type: Number, default: 0 },
}, { timestamps: true });

ClassInviteSchema.index({ date: -1 });
ClassInviteSchema.index({ status: 1, date: -1 });
ClassInviteSchema.index({ inviteCategory: 1, status: 1, date: -1 });

const ClassInvite = mongoose.models.ClassInvite || mongoose.model('ClassInvite', ClassInviteSchema);
export default ClassInvite;
