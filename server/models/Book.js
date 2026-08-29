import mongoose from 'mongoose';
import { BOOK_STATUSES } from '../shared/constants/index.js';

// ─────────────────────────────────────────────────────────────
// Book — Soma Wellness physical book catalogue.
// Prices are stored in rupees (not paise) — the payment layer
// converts to paise when creating Razorpay orders.
// ─────────────────────────────────────────────────────────────
const BookSchema = new mongoose.Schema(
  {
    title:             { type: String, required: true, trim: true, maxlength: 200 },
    slug:              { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    subtitle:          { type: String, default: '', trim: true, maxlength: 300 },
    authors:           { type: [String], default: [] },
    shortDescription:  { type: String, default: '', maxlength: 600 },
    description:       { type: String, default: '' },
    features:          { type: [String], default: [] },
    aboutAuthor:       { type: String, default: '' },
    category:          { type: String, default: 'Books', trim: true, maxlength: 100 },
    tags:              { type: [String], default: [] },
    sku:               { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
    price:             { type: Number, required: true, min: 0 },
    compareAtPrice:    { type: Number, default: 0, min: 0 },
    language:          { type: String, default: 'English', trim: true, maxlength: 50 },
    edition:           { type: String, default: '', trim: true, maxlength: 100 },
    pages:             { type: Number, default: 0, min: 0 },
    coverImage:        { type: String, default: '' },
    galleryImages:     { type: [String], default: [] },
    isPaperback:       { type: Boolean, default: true },

    // ── Inventory ──────────────────────────────────────────
    stock:             { type: Number, default: 0, min: 0 },
    reservedStock:     { type: Number, default: 0, min: 0 },
    soldCount:         { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    trackInventory:    { type: Boolean, default: true },
    allowBackorder:    { type: Boolean, default: false },

    // ── Publication control ────────────────────────────────
    status:            { type: String, enum: BOOK_STATUSES, default: 'draft', index: true },
    featured:          { type: Boolean, default: false },
    displayOrder:      { type: Number, default: 0 },

    // ── SEO ────────────────────────────────────────────────
    seoTitle:          { type: String, default: '', maxlength: 200 },
    seoDescription:    { type: String, default: '', maxlength: 500 },
    seoKeywords:       { type: String, default: '', maxlength: 300 },

    // ── Admin bookkeeping ──────────────────────────────────
    lowStockAlertSentAt: { type: Date, default: null },
    createdBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

BookSchema.index({ status: 1, category: 1, displayOrder: 1 });
BookSchema.index({ tags: 1 });
BookSchema.index({ createdAt: -1 });

// Effective selling price after compare-at discount (for display).
BookSchema.virtual('discount').get(function () {
  if (!this.compareAtPrice || this.compareAtPrice <= this.price) return 0;
  return Math.max(0, this.compareAtPrice - this.price);
});

BookSchema.virtual('discountPercent').get(function () {
  if (!this.compareAtPrice || this.compareAtPrice <= this.price) return 0;
  return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
});

// Available stock: reservations move copies from `stock` to `reservedStock`,
// so `stock` already represents what is free to sell right now.
BookSchema.virtual('availableStock').get(function () {
  if (!this.trackInventory) return Infinity;
  return Math.max(0, this.stock || 0);
});

BookSchema.set('toJSON', { virtuals: true });
BookSchema.set('toObject', { virtuals: true });

const Book = mongoose.models.Book || mongoose.model('Book', BookSchema);
export default Book;
