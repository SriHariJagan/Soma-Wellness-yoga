import mongoose from 'mongoose';
import { DOWNLOAD_TYPES, DOWNLOAD_VISIBILITY } from '../shared/constants/index.js';

const DownloadSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true },
    type:          { type: String, enum: DOWNLOAD_TYPES, default: 'pdf' },
    category:      { type: String, default: 'General' },
    description:   { type: String, default: '' },
    size:          { type: String, default: '' },
    fileSize:      { type: Number, default: 0 },
    mimeType:      { type: String, default: '' },
    originalName:  { type: String, default: '' },
    storagePath:   { type: String, default: '' },
    url:           { type: String, default: '' },
    thumbnail:     { type: String, default: '' },
    uploadedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    visibility:    { type: String, enum: DOWNLOAD_VISIBILITY, default: 'all', index: true },
    allowedPlans:  { type: [String], default: [] },
    downloadCount: { type: Number, default: 0 },
    active:        { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

DownloadSchema.index({ active: 1, visibility: 1 });
DownloadSchema.index({ type: 1 });

const Download = mongoose.models.Download || mongoose.model('Download', DownloadSchema);
export default Download;
