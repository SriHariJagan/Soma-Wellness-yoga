import mongoose from 'mongoose';
import { GALLERY_CATEGORIES } from '../shared/constants/gallery.types.js';

const GalleryImageSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: '', maxlength: 1000 },
    imageUrl:    { type: String, required: true },
    thumbnailUrl:{ type: String, default: '' },
    category:    { type: String, enum: GALLERY_CATEGORIES, default: 'Other', index: true },
    order:       { type: Number, default: 0, index: true },
    active:      { type: Boolean, default: true, index: true },
    altText:     { type: String, default: '', maxlength: 200 },
    width:       { type: Number, default: 0 },
    height:      { type: Number, default: 0 },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

GalleryImageSchema.index({ active: 1, category: 1, order: 1 });

const GalleryImage =
  mongoose.models.GalleryImage ||
  mongoose.model('GalleryImage', GalleryImageSchema, 'GalleryImage');

export default GalleryImage;
