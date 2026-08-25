import mongoose from 'mongoose';

const BookmarkSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  blog:      { type: mongoose.Schema.Types.ObjectId, ref: 'Blog', required: true },
  createdAt: { type: Date, default: Date.now },
});

BookmarkSchema.index({ user: 1, blog: 1 }, { unique: true });
BookmarkSchema.index({ user: 1, createdAt: -1 });

const Bookmark = mongoose.models.Bookmark || mongoose.model('Bookmark', BookmarkSchema, 'Bookmark');
export default Bookmark;
