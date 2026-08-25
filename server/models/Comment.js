import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  blog:       { type: mongoose.Schema.Types.ObjectId, ref: 'Blog', required: true, index: true },
  author:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content:    { type: String, required: true, maxlength: 5000 },
  parent:     { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
  rootParent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
  depth:      { type: Number, default: 0, max: 10 },
  mentions:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likeCount:  { type: Number, default: 0 },
  replyCount: { type: Number, default: 0 },
  isEdited:   { type: Boolean, default: false },
  editedAt:   { type: Date, default: null },
  isHidden:   { type: Boolean, default: false, index: true },
  isLocked:   { type: Boolean, default: false },
  deletedAt:  { type: Date, default: null },
}, { timestamps: true });

CommentSchema.index({ blog: 1, rootParent: 1, createdAt: -1 });
CommentSchema.index({ blog: 1, parent: 1, createdAt: 1 });
CommentSchema.index({ author: 1, createdAt: -1 });

const Comment = mongoose.models.Comment || mongoose.model('Comment', CommentSchema, 'Comment');
export default Comment;
