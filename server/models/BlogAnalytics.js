import mongoose from 'mongoose';

const BlogAnalyticsSchema = new mongoose.Schema({
  blog:       { type: mongoose.Schema.Types.ObjectId, ref: 'Blog', required: true, unique: true, index: true },
  dailyViews: [{
    date:  { type: Date, required: true },
    count: { type: Number, default: 0 },
  }],
  dailyLikes: [{
    date:  { type: Date, required: true },
    count: { type: Number, default: 0 },
  }],
  dailyComments: [{
    date:  { type: Date, required: true },
    count: { type: Number, default: 0 },
  }],
  referrers:  [{
    source: { type: String },
    count:  { type: Number, default: 0 },
  }],
}, { timestamps: true });

const BlogAnalytics = mongoose.models.BlogAnalytics || mongoose.model('BlogAnalytics', BlogAnalyticsSchema, 'BlogAnalytics');
export default BlogAnalytics;
