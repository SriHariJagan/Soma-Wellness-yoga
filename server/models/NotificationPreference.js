import mongoose from 'mongoose';

const ChannelToggleSchema = { type: mongoose.Schema.Types.Mixed, default: {} };

const NotificationPreferenceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    channels: ChannelToggleSchema,

    typeOverrides: [
      {
        type:     { type: String },
        channels: ChannelToggleSchema,
      },
    ],

    digest: {
      enabled:   { type: Boolean, default: false },
      frequency: { type: String, enum: ['daily', 'weekly'], default: 'weekly' },
      dayOfWeek: { type: Number, default: 1 },
      timeOfDay: { type: String, default: '09:00' },
    },

    contact: {
      email:    { type: String, default: '' },
      phone:    { type: String, default: '' },
      whatsapp: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

const NotificationPreference =
  mongoose.models.NotificationPreference ||
  mongoose.model('NotificationPreference', NotificationPreferenceSchema, 'NotificationPreference');

export default NotificationPreference;
