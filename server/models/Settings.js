import mongoose from 'mongoose';

// Singleton document holding studio-wide configuration. Always read
// via Settings.getSingleton() so exactly one row ever exists.
const SettingsSchema = new mongoose.Schema(
  {
    key:                { type: String, default: 'global', unique: true },
    announcementBanner: { type: String, default: '' },
    studioName:         { type: String, default: 'Pragya Yoga' },
    supportEmail:       { type: String, default: 'pragyayogaofficial@gmail.com' },
    supportPhone:       { type: String, default: '+91 9675547597' },

    // Integration / system-health flags surfaced on the admin dashboard.
    integrations: {
      paymentGateway: { type: Boolean, default: true },
      zoom:           { type: Boolean, default: true },
      whatsapp:       { type: Boolean, default: true },
      emailSmtp:      { type: Boolean, default: true },
    },

    // Consultation booking config
    consultationFee:      { type: Number, default: 300 },
    consultationDuration: { type: Number, default: 30 },
    consultationTimeSlots: { type: [String], default: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'] },

    // Book-store shipping defaults (used when no shipping rule matches).
    bookStoreShipping: {
      freeShippingThreshold: { type: Number, default: 0 },
      defaultShippingCharge:  { type: Number, default: 60 },
      deliveryMinDays:        { type: Number, default: 3 },
      deliveryMaxDays:        { type: Number, default: 5 },
    },
  },
  { timestamps: true }
);

SettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: 'global' });
  if (!doc) doc = await this.create({ key: 'global' });
  return doc;
};

const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
export default Settings;
