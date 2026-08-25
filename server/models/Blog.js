import mongoose from 'mongoose';
import {
  BLOG_STATUSES,
  BLOG_VISIBILITY,
  BLOG_ATTACHMENT_TYPES,
  BLOG_MEDIA_TYPES,
  EMBED_PLATFORMS,
} from '../shared/constants/index.js';

const BlogSchema = new mongoose.Schema({
  author:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:        { type: String, required: true, trim: true, maxlength: 200 },
  slug:         { type: String, unique: true, lowercase: true, index: true },
  content:      { type: String, default: '' },
  excerpt:      { type: String, default: '', maxlength: 500 },
  coverImage:   { type: String, default: '' },
  attachments:  [{
    url:         { type: String },
    type:        { type: String, enum: BLOG_ATTACHMENT_TYPES },
    name:        { type: String },
    size:        { type: Number },
    mimeType:    { type: String },
  }],
  mediaGallery: [{
    url:         { type: String },
    type:        { type: String, enum: BLOG_MEDIA_TYPES },
    caption:     { type: String, default: '' },
  }],
  embeds: [{
    url:         { type: String },
    platform:    { type: String, enum: EMBED_PLATFORMS },
    caption:     { type: String, default: '' },
  }],
  tags:         [{ type: String, lowercase: true, trim: true }],
  categories:   [{ type: String, lowercase: true, trim: true }],
  status:       { type: String, enum: BLOG_STATUSES, default: 'draft', index: true },
  visibility:   { type: String, enum: BLOG_VISIBILITY, default: 'public' },
  publishedAt:  { type: Date, default: null },
  editedAt:     { type: Date, default: null },
  isEdited:     { type: Boolean, default: false },
  featured:     { type: Boolean, default: false, index: true },
  pinned:       { type: Boolean, default: false },
  readingTime:  { type: Number, default: 0 },
  viewCount:    { type: Number, default: 0 },
  likeCount:    { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  shareCount:   { type: Number, default: 0 },
  bookmarkCount:{ type: Number, default: 0 },
  reportCount:  { type: Number, default: 0 },
  deletedAt:    { type: Date, default: null },
}, { timestamps: true });

BlogSchema.index({ status: 1, publishedAt: -1 });
BlogSchema.index({ status: 1, viewCount: -1 });
BlogSchema.index({ status: 1, likeCount: -1 });
BlogSchema.index({ tags: 1 });
BlogSchema.index({ categories: 1 });
BlogSchema.index({ author: 1, status: 1 });
BlogSchema.index({ title: 'text', content: 'text', excerpt: 'text' });

BlogSchema.pre('save', function () {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() + '-' + Date.now().toString(36);
  }
  if (this.isModified('content') || this.isModified('title')) {
    const words = (this.title + ' ' + (this.content || '')).split(/\s+/).length;
    this.readingTime = Math.max(1, Math.ceil(words / 200));
  }
});

BlogSchema.pre('save', function () {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

const Blog = mongoose.models.Blog || mongoose.model('Blog', BlogSchema, 'Blog');
export default Blog;
