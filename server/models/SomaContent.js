import mongoose from 'mongoose';
import { SOMA_CONTENT_TYPES, SOMA_CONTENT_CADENCE } from '../shared/constants/soma.types.js';

const SomaContentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, default: '' },
    type: { type: String, enum: SOMA_CONTENT_TYPES, required: true },
    cadence: { type: String, enum: SOMA_CONTENT_CADENCE, required: true },
    description: { type: String, default: '' },
    body: { type: String, default: '' }, // rich text / markdown
    audioUrl: { type: String, default: '' },
    image: { type: String, default: '' },
    readingNotes: { type: String, default: '' },
    releaseAt: { type: Date, required: true, index: true },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    access: { type: String, enum: ['free', 'daily_subscribers', 'members_only'], default: 'daily_subscribers' },
    season: { type: String, default: '' }, // e.g. "Spring 2026"
    displayOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

SomaContentSchema.index({ releaseAt: 1, published: 1 });
SomaContentSchema.pre('save', function () {
  if (!this.slug || this.isModified('title')) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  if (this.published && !this.publishedAt) this.publishedAt = new Date();
});

SomaContentSchema.set('toJSON', { virtuals: true });
const SomaContent = mongoose.models.SomaContent || mongoose.model('SomaContent', SomaContentSchema);
export default SomaContent;
