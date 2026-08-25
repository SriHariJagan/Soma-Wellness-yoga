import mongoose from 'mongoose';
import { NOTIFICATION_TEMPLATE_CATEGORIES } from '../shared/constants/index.js';

const ChannelContentSchema = new mongoose.Schema(
  {
    subject:   { type: String, default: '' },
    preheader: { type: String, default: '' },
    title:     { type: String, default: '' },
    message:   { type: String, default: '' },
    bodyText:  { type: String, default: '' },
    bodyHtml:  { type: String, default: '' },
    fromName:  { type: String, default: '' },
    replyTo:   { type: String, default: '' },
    icon:      { type: String, default: '' },
  },
  { _id: false }
);

const NotificationTemplateSchema = new mongoose.Schema(
  {
    key:         { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name:        { type: String, required: true },
    description: { type: String, default: '' },
    category:    { type: String, enum: NOTIFICATION_TEMPLATE_CATEGORIES, default: 'transactional' },

    channels: { type: mongoose.Schema.Types.Mixed, default: {} },

    variables: { type: [String], default: [] },
    active:    { type: Boolean, default: true },
    version:   { type: Number, default: 1 },
  },
  { timestamps: true }
);

NotificationTemplateSchema.index({ category: 1, active: 1 });

const NotificationTemplate =
  mongoose.models.NotificationTemplate ||
  mongoose.model('NotificationTemplate', NotificationTemplateSchema, 'NotificationTemplate');

export default NotificationTemplate;
