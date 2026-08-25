import mongoose from 'mongoose';
import Blog from '../models/Blog.js';
import Comment from '../models/Comment.js';
import Like from '../models/Like.js';
import Bookmark from '../models/Bookmark.js';
import Report from '../models/Report.js';
import BlogAnalytics from '../models/BlogAnalytics.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notify } from '../services/notificationService.js';
import { LIKE_TARGET_TYPES, REPORT_REASONS, BLOG_VISIBILITY } from '../shared/constants/index.js';

import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const purifyWindow = new JSDOM('').window;
const purify = DOMPurify(purifyWindow);

function sanitize(str) {
  if (!str) return '';
  return purify.sanitize(str, { ALLOWED_TAGS: [] });
}

function cleanContent(html) {
  if (!html) return '';
  return purify.sanitize(html, {
    ALLOWED_TAGS: [
      'p','br','b','i','u','em','strong','a','ul','ol','li','h1','h2','h3','h4','h5','h6',
      'blockquote','pre','code','span','div','img','figure','figcaption','hr',
      'table','thead','tbody','tr','th','td',
      'iframe','video','audio','source',
    ],
    ALLOWED_ATTR: ['src','href','alt','title','class','id','target','rel','width','height',
      'allowfullscreen','frameborder','allow','controls','autoplay','loop','muted','style'],
    ADD_ATTR: ['target'],
  });
}

function readingTime(title, content) {
  const words = (title + ' ' + (content || '')).split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ── Helpers ──

async function populateBlog(doc, userId) {
  if (!doc) return null;
  const b = doc.toObject ? doc.toObject() : doc;
  const author = await User.findById(b.author).select('name email avatar role status').lean();
  b.author = author || { name: 'Unknown', avatar: '' };
  if (userId) {
    const uid = userId.toString ? userId.toString() : userId;
    const [liked, bookmarked] = await Promise.all([
      Like.findOne({ user: uid, targetType: 'blog', target: b._id }).lean(),
      Bookmark.findOne({ user: uid, blog: b._id }).lean(),
    ]);
    b.isLiked = !!liked;
    b.isBookmarked = !!bookmarked;
  }
  return b;
}

async function populateComments(comments, userId) {
  const result = [];
  for (const c of comments) {
    const obj = c.toObject ? c.toObject() : c;
    const author = await User.findById(obj.author).select('name email avatar role').lean();
    obj.author = author || { name: 'Unknown', avatar: '' };
    if (userId) {
      const liked = await Like.findOne({ user: userId.toString(), targetType: 'comment', target: obj._id }).lean();
      obj.isLiked = !!liked;
    }
    obj.isOwner = userId && obj.author?._id?.toString() === userId.toString();
    result.push(obj);
  }
  return result;
}

// ══════════════════════════════════════════════════════════════
//  BLOG CRUD
// ══════════════════════════════════════════════════════════════

export const createBlog = asyncHandler(async (req, res) => {
  const { title, content, excerpt, coverImage, attachments, mediaGallery, embeds, tags, categories, status, visibility } = req.body;
  if (!title || !title.trim()) throw ApiError.badRequest('Title is required');

  const blog = await Blog.create({
    author: req.userId,
    title: sanitize(title.trim()),
    content: cleanContent(content || ''),
    excerpt: sanitize(excerpt || '').slice(0, 500),
    coverImage: coverImage || '',
    attachments: attachments || [],
    mediaGallery: mediaGallery || [],
    embeds: embeds || [],
    tags: (tags || []).map(t => sanitize(t.toLowerCase().trim())).filter(Boolean),
    categories: (categories || []).map(c => sanitize(c.toLowerCase().trim())).filter(Boolean),
    status: status || 'draft',
    visibility: visibility || 'public',
    readingTime: readingTime(title, content),
  });

  await BlogAnalytics.create({ blog: blog._id, dailyViews: [], dailyLikes: [], dailyComments: [], referrers: [] });
  const populated = await populateBlog(blog, req.userId);
  res.status(201).json({ success: true, blog: populated });
});

export const updateBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const blog = await Blog.findById(id);
  if (!blog) throw ApiError.notFound('Blog not found');
  if (blog.author.toString() !== req.userId.toString() && req.user.role !== 'admin') {
    throw ApiError.forbidden('You can only edit your own blogs');
  }

  const allowed = ['title', 'content', 'excerpt', 'coverImage', 'attachments', 'mediaGallery', 'embeds', 'tags', 'categories', 'status', 'visibility'];
  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      if (field === 'title') blog[field] = sanitize(req.body[field].trim());
      else if (field === 'content') blog[field] = cleanContent(req.body[field]);
      else if (field === 'excerpt') blog[field] = sanitize(req.body[field]).slice(0, 500);
      else if (field === 'tags') blog[field] = (req.body[field] || []).map(t => sanitize(t.toLowerCase().trim())).filter(Boolean);
      else if (field === 'categories') blog[field] = (req.body[field] || []).map(c => sanitize(c.toLowerCase().trim())).filter(Boolean);
      else blog[field] = req.body[field];
    }
  }
  blog.editedAt = new Date();
  blog.isEdited = true;
  blog.readingTime = readingTime(blog.title, blog.content);

  if (blog.isModified('status') && blog.status === 'published' && !blog.publishedAt) {
    blog.publishedAt = new Date();
  }

  await blog.save();
  const populated = await populateBlog(blog, req.userId);
  res.json({ success: true, blog: populated });
});

export const deleteBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const blog = await Blog.findById(id);
  if (!blog) throw ApiError.notFound('Blog not found');
  if (blog.author.toString() !== req.userId.toString() && req.user.role !== 'admin') {
    throw ApiError.forbidden('You can only delete your own blogs');
  }
  blog.deletedAt = new Date();
  blog.status = 'archived';
  await blog.save();
  res.json({ success: true, message: 'Blog deleted' });
});

export const hardDeleteBlog = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw ApiError.forbidden('Admin only');
  const { id } = req.params;
  await Promise.all([
    Blog.findByIdAndDelete(id),
    Comment.deleteMany({ blog: id }),
    Like.deleteMany({ targetType: 'blog', target: id }),
    Bookmark.deleteMany({ blog: id }),
    BlogAnalytics.deleteOne({ blog: id }),
  ]);
  res.json({ success: true, message: 'Blog permanently deleted' });
});

export const getBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const blog = await Blog.findById(id);
  if (!blog || blog.deletedAt) throw ApiError.notFound('Blog not found');

  const isAuthor = req.userId && blog.author.toString() === req.userId.toString();
  const isAdmin = req.user?.role === 'admin';
  if (blog.status !== 'published' && !isAuthor && !isAdmin) {
    throw ApiError.notFound('Blog not found');
  }

  // Enforce visibility
  const isAuth = !!req.userId;
  if (!isAuthor && !isAdmin) {
    if (blog.visibility === 'private') throw ApiError.notFound('Blog not found');
    if (blog.visibility === 'members' && !isAuth) throw ApiError.notFound('Blog not found');
  }

  blog.viewCount = (blog.viewCount || 0) + 1;
  await blog.save();

  await BlogAnalytics.findOneAndUpdate(
    { blog: blog._id },
    { $inc: { 'dailyViews.$[elem].count': 1 } },
    { arrayFilters: [{ 'elem.date': { $gte: new Date(Date.now() - 86400000) } }], upsert: true }
  );

  const populated = await populateBlog(blog, req.userId);
  res.json({ success: true, blog: populated });
});

export const listBlogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, tag, category, author, sort, status: filterStatus } = req.query;
  const query = { deletedAt: null, status: 'published', visibility: 'public' };
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { excerpt: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ];
  }
  if (tag) query.tags = tag.toLowerCase();
  if (category) query.categories = category.toLowerCase();
  if (author) query.author = author;

  let sortObj = { publishedAt: -1 };
  if (sort === 'trending') {
    sortObj = { likeCount: -1, commentCount: -1, viewCount: -1, publishedAt: -1 };
  } else if (sort === 'popular') {
    sortObj = { viewCount: -1, likeCount: -1, publishedAt: -1 };
  } else if (sort === 'oldest') {
    sortObj = { publishedAt: 1 };
  }

  const [blogs, total] = await Promise.all([
    Blog.find(query).sort(sortObj).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
    Blog.countDocuments(query),
  ]);

  const populated = await Promise.all(blogs.map(b => populateBlog(b, req.userId)));

  res.json({
    success: true,
    blogs: populated,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

export const trendingBlogs = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  const blogs = await Blog.aggregate([
    { $match: { deletedAt: null, status: 'published', visibility: 'public', publishedAt: { $gte: sevenDaysAgo } } },
    { $addFields: {
      engagementScore: {
        $add: [
          { $multiply: ['$viewCount', 1] },
          { $multiply: ['$likeCount', 3] },
          { $multiply: ['$commentCount', 5] },
          { $multiply: ['$shareCount', 2] },
        ],
      },
    }},
    { $sort: { engagementScore: -1 } },
    { $limit: limitNum },
  ]);

  const populated = await Promise.all(blogs.map(b => populateBlog(b, req.userId)));
  res.json({ success: true, blogs: populated });
});

export const userBlogs = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10, status } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  const query = { author: userId, deletedAt: null };
  if (status) query.status = status;
  const isOwner = userId === req.userId.toString();
  if (!isOwner && req.user.role !== 'admin') {
    query.status = 'published';
    query.visibility = { $in: BLOG_VISIBILITY.filter(v => v !== 'private') };
  }

  const [blogs, total] = await Promise.all([
    Blog.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
    Blog.countDocuments(query),
  ]);

  const populated = await Promise.all(blogs.map(b => populateBlog(b, req.userId)));

  res.json({
    success: true,
    blogs: populated,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

export const duplicateBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const original = await Blog.findById(id);
  if (!original) throw ApiError.notFound('Blog not found');
  if (original.author.toString() !== req.userId.toString() && req.user.role !== 'admin') {
    throw ApiError.forbidden('Cannot duplicate this blog');
  }

  const newBlog = await Blog.create({
    author: req.userId,
    title: `${original.title} (Copy)`,
    content: original.content,
    excerpt: original.excerpt,
    coverImage: original.coverImage,
    attachments: original.attachments,
    mediaGallery: original.mediaGallery,
    embeds: original.embeds,
    tags: original.tags,
    categories: original.categories,
    status: 'draft',
    visibility: original.visibility,
    readingTime: original.readingTime,
  });

  await BlogAnalytics.create({ blog: newBlog._id });
  const populated = await populateBlog(newBlog, req.userId);
  res.status(201).json({ success: true, blog: populated });
});

// ══════════════════════════════════════════════════════════════
//  SOCIAL INTERACTIONS
// ══════════════════════════════════════════════════════════════

export const toggleLike = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.body;
  if (!LIKE_TARGET_TYPES.includes(targetType)) throw ApiError.badRequest('Invalid target type');
  if (!mongoose.Types.ObjectId.isValid(targetId)) throw ApiError.badRequest('Invalid target ID');

  const existing = await Like.findOne({ user: req.userId, targetType, target: targetId });
  if (existing) {
    await Like.deleteOne({ _id: existing._id });
    if (targetType === 'blog') await Blog.findByIdAndUpdate(targetId, { $inc: { likeCount: -1 } });
    else await Comment.findByIdAndUpdate(targetId, { $inc: { likeCount: -1 } });
    return res.json({ success: true, liked: false });
  }

  await Like.create({ user: req.userId, targetType, target: targetId });
  if (targetType === 'blog') {
    const blog = await Blog.findByIdAndUpdate(targetId, { $inc: { likeCount: 1 } }, { returnDocument: 'after' });
    if (blog && blog.author.toString() !== req.userId.toString()) {
      notify(blog.author, {
        title: 'New Like',
        message: `${req.user.name} liked your blog "${blog.title.slice(0, 50)}"`,
        type: 'info',
        link: `/studentdashboard?tab=blogs&id=${blog._id}`,
      }).catch(() => {});
    }
  } else {
    const comment = await Comment.findByIdAndUpdate(targetId, { $inc: { likeCount: 1 } }, { returnDocument: 'after' });
    if (comment && comment.author.toString() !== req.userId.toString()) {
      notify(comment.author, {
        title: 'New Like',
        message: `${req.user.name} liked your comment`,
        type: 'info',
      }).catch(() => {});
    }
  }
  res.json({ success: true, liked: true });
});

export const toggleBookmark = asyncHandler(async (req, res) => {
  const { blogId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(blogId)) throw ApiError.badRequest('Invalid blog ID');

  const existing = await Bookmark.findOne({ user: req.userId, blog: blogId });
  if (existing) {
    await Bookmark.deleteOne({ _id: existing._id });
    await Blog.findByIdAndUpdate(blogId, { $inc: { bookmarkCount: -1 } });
    return res.json({ success: true, bookmarked: false });
  }

  await Bookmark.create({ user: req.userId, blog: blogId });
  await Blog.findByIdAndUpdate(blogId, { $inc: { bookmarkCount: 1 } });
  res.json({ success: true, bookmarked: true });
});

export const getBookmarks = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  const bookmarks = await Bookmark.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .populate('blog')
    .lean();

  const validBlogs = bookmarks.filter(b => b.blog && !b.blog.deletedAt && b.blog.status === 'published');
  const blogs = await Promise.all(validBlogs.map(b => populateBlog(b.blog, req.userId)));
  const total = await Bookmark.countDocuments({ user: req.userId });

  res.json({
    success: true,
    blogs,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

export const shareBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const blog = await Blog.findByIdAndUpdate(id, { $inc: { shareCount: 1 } }, { returnDocument: 'after' });
  if (!blog) throw ApiError.notFound('Blog not found');
  if (blog.author.toString() !== req.userId.toString()) {
    notify(blog.author, {
      title: 'New Share',
      message: `${req.user.name} shared your blog "${blog.title.slice(0, 50)}"`,
      type: 'info',
    }).catch(() => {});
  }
  res.json({ success: true, shareCount: blog.shareCount });
});

// ══════════════════════════════════════════════════════════════
//  REPORTS
// ══════════════════════════════════════════════════════════════

export const reportContent = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, description } = req.body;
  if (!LIKE_TARGET_TYPES.includes(targetType)) throw ApiError.badRequest('Invalid target type');
  if (!mongoose.Types.ObjectId.isValid(targetId)) throw ApiError.badRequest('Invalid target ID');
  if (!REPORT_REASONS.includes(reason)) {
    throw ApiError.badRequest('Invalid reason');
  }

  const existing = await Report.findOne({ reporter: req.userId, targetType, target: targetId });
  if (existing) throw ApiError.conflict('You have already reported this content');

  const report = await Report.create({
    reporter: req.userId,
    targetType,
    target: targetId,
    reason,
    description: sanitize(description || '').slice(0, 1000),
  });

  if (targetType === 'blog') {
    await Blog.findByIdAndUpdate(targetId, { $inc: { reportCount: 1 } });
  }

  res.status(201).json({ success: true, report });
});

// ══════════════════════════════════════════════════════════════
//  COMMENTS
// ══════════════════════════════════════════════════════════════

export const createComment = asyncHandler(async (req, res) => {
  const { blogId, content, parentId } = req.body;
  if (!blogId || !content || !content.trim()) throw ApiError.badRequest('Content is required');
  if (!mongoose.Types.ObjectId.isValid(blogId)) throw ApiError.badRequest('Invalid blog ID');

  const blog = await Blog.findById(blogId);
  if (!blog || blog.deletedAt || blog.status !== 'published') throw ApiError.notFound('Blog not found');

  let depth = 0;
  let rootParent = null;
  if (parentId) {
    if (!mongoose.Types.ObjectId.isValid(parentId)) throw ApiError.badRequest('Invalid parent ID');
    const parent = await Comment.findById(parentId);
    if (!parent || parent.deletedAt) throw ApiError.notFound('Parent comment not found');
    if (parent.blog.toString() !== blogId) throw ApiError.badRequest('Parent comment does not belong to this blog');
    depth = Math.min((parent.depth || 0) + 1, 10);
    rootParent = parent.rootParent || parent._id;
    await Comment.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
  }

  const mentions = [];
  const mentionRegex = /@(\w+)/g;
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    const user = await User.findOne({ name: { $regex: `^${match[1]}$`, $options: 'i' } }).select('_id').lean();
    if (user) mentions.push(user._id);
  }

  const comment = await Comment.create({
    blog: blogId,
    author: req.userId,
    content: sanitize(content.trim()),
    parent: parentId || null,
    rootParent,
    depth,
    mentions,
  });

  await Blog.findByIdAndUpdate(blogId, { $inc: { commentCount: 1 } });

  if (blog.author.toString() !== req.userId.toString()) {
    notify(blog.author, {
      title: 'New Comment',
      message: `${req.user.name} commented on "${blog.title.slice(0, 50)}"`,
      type: 'info',
      link: `/studentdashboard?tab=blogs&id=${blog._id}`,
    }).catch(() => {});
  }

  if (parentId) {
    const parentComment = await Comment.findById(parentId);
    if (parentComment && parentComment.author.toString() !== req.userId.toString()) {
      notify(parentComment.author, {
        title: 'New Reply',
        message: `${req.user.name} replied to your comment`,
        type: 'info',
      }).catch(() => {});
    }
  }

  const populated = await populateComments([comment], req.userId);
  res.status(201).json({ success: true, comment: populated[0] });
});

export const updateComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content || !content.trim()) throw ApiError.badRequest('Content is required');

  const comment = await Comment.findById(id);
  if (!comment || comment.deletedAt) throw ApiError.notFound('Comment not found');
  if (comment.author.toString() !== req.userId.toString()) throw ApiError.forbidden('Cannot edit this comment');
  if (comment.isLocked) throw ApiError.forbidden('This comment is locked');

  comment.content = sanitize(content.trim());
  comment.isEdited = true;
  comment.editedAt = new Date();
  await comment.save();

  const populated = await populateComments([comment], req.userId);
  res.json({ success: true, comment: populated[0] });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const comment = await Comment.findById(id);
  if (!comment || comment.deletedAt) throw ApiError.notFound('Comment not found');
  if (comment.author.toString() !== req.userId.toString() && req.user.role !== 'admin') {
    throw ApiError.forbidden('Cannot delete this comment');
  }

  comment.deletedAt = new Date();
  comment.content = '[deleted]';
  await comment.save();

  await Blog.findByIdAndUpdate(comment.blog, { $inc: { commentCount: -1 } });
  if (comment.parent) {
    await Comment.findByIdAndUpdate(comment.parent, { $inc: { replyCount: -1 } });
  }

  res.json({ success: true, message: 'Comment deleted' });
});

export const getComments = asyncHandler(async (req, res) => {
  const { blogId } = req.params;
  const { page = 1, limit = 20, sort } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  const sortObj = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

  const topLevel = await Comment.find({
    blog: blogId,
    parent: null,
    deletedAt: null,
    isHidden: false,
  }).sort(sortObj).skip((pageNum - 1) * limitNum).limit(limitNum).lean();

  const populated = await populateComments(topLevel, req.userId);

  const total = await Comment.countDocuments({ blog: blogId, parent: null, deletedAt: null, isHidden: false });

  res.json({
    success: true,
    comments: populated,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

export const getReplies = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const replies = await Comment.find({
    $or: [{ parent: commentId }, { rootParent: commentId }],
    deletedAt: null,
    isHidden: false,
  }).sort({ createdAt: 1 }).lean();

  const populated = await populateComments(replies, req.userId);
  res.json({ success: true, replies: populated });
});

// ══════════════════════════════════════════════════════════════
//  ADMIN MODERATION
// ══════════════════════════════════════════════════════════════

export const moderateBlog = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw ApiError.forbidden('Admin only');
  const { id } = req.params;
  const { action } = req.body;

  const blog = await Blog.findById(id);
  if (!blog) throw ApiError.notFound('Blog not found');

  switch (action) {
    case 'feature':
      blog.featured = !blog.featured;
      break;
    case 'pin':
      blog.pinned = !blog.pinned;
      break;
    case 'hide':
      blog.status = 'archived';
      break;
    case 'restore':
      blog.status = 'published';
      blog.deletedAt = null;
      break;
    default:
      throw ApiError.badRequest('Invalid action');
  }
  await blog.save();
  res.json({ success: true, blog });
});

export const moderateComment = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw ApiError.forbidden('Admin only');
  const { id } = req.params;
  const { action } = req.body;

  const comment = await Comment.findById(id);
  if (!comment) throw ApiError.notFound('Comment not found');

  switch (action) {
    case 'hide':
      comment.isHidden = true;
      break;
    case 'unhide':
      comment.isHidden = false;
      break;
    case 'lock':
      comment.isLocked = true;
      break;
    case 'unlock':
      comment.isLocked = false;
      break;
    case 'delete':
      comment.deletedAt = new Date();
      comment.content = '[removed by moderator]';
      await Blog.findByIdAndUpdate(comment.blog, { $inc: { commentCount: -1 } });
      break;
    default:
      throw ApiError.badRequest('Invalid action');
  }
  await comment.save();
  res.json({ success: true, comment });
});

export const getReports = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw ApiError.forbidden('Admin only');
  const { status = 'pending', page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  const query = {};
  if (status) query.status = status;

  const [reports, total] = await Promise.all([
    Report.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum)
      .populate('reporter', 'name email avatar')
      .populate('resolvedBy', 'name email')
      .lean(),
    Report.countDocuments(query),
  ]);

  const enriched = await Promise.all(reports.map(async (r) => {
    if (r.targetType === 'blog') {
      const blog = await Blog.findById(r.target).select('title author status').populate('author', 'name email').lean();
      r.targetData = blog;
    } else if (r.targetType === 'comment') {
      const comment = await Comment.findById(r.target).populate('author', 'name email').lean();
      r.targetData = comment;
    }
    return r;
  }));

  res.json({
    success: true,
    reports: enriched,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

export const resolveReport = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw ApiError.forbidden('Admin only');
  const { id } = req.params;
  const { status, action } = req.body;

  const report = await Report.findById(id);
  if (!report) throw ApiError.notFound('Report not found');

  report.status = status || 'reviewed';
  report.resolvedBy = req.userId;
  report.resolvedAt = new Date();
  report.action = action || '';
  await report.save();

  res.json({ success: true, report });
});

export const getAdminBlogs = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw ApiError.forbidden('Admin only');
  const { page = 1, limit = 20, status, search } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  const query = { deletedAt: null };
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
    ];
  }

  const [blogs, total] = await Promise.all([
    Blog.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum)
      .populate('author', 'name email avatar role')
      .lean(),
    Blog.countDocuments(query),
  ]);

  res.json({
    success: true,
    blogs,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

export const getBlogAnalyticsData = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw ApiError.forbidden('Admin only');

  const totalBlogs = await Blog.countDocuments({ deletedAt: null });
  const publishedBlogs = await Blog.countDocuments({ status: 'published', deletedAt: null });
  const draftBlogs = await Blog.countDocuments({ status: 'draft', deletedAt: null });
  const totalViews = await Blog.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: null, total: { $sum: '$viewCount' } } },
  ]);
  const totalLikes = await Blog.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: null, total: { $sum: '$likeCount' } } },
  ]);
  const totalComments = await Blog.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: null, total: { $sum: '$commentCount' } } },
  ]);

  const topAuthors = await Blog.aggregate([
    { $match: { deletedAt: null, status: 'published' } },
    { $group: { _id: '$author', blogCount: { $sum: 1 }, totalViews: { $sum: '$viewCount' }, totalLikes: { $sum: '$likeCount' } } },
    { $sort: { blogCount: -1 } },
    { $limit: 10 },
  ]);

  const authorDetails = await User.find({ _id: { $in: topAuthors.map(a => a._id) } }).select('name email avatar role').lean();
  const authorMap = {};
  for (const a of authorDetails) authorMap[a._id.toString()] = a;

  const enrichedAuthors = topAuthors.map(a => ({
    ...a,
    author: authorMap[a._id.toString()] || { name: 'Unknown' },
  }));

  const pendingReports = await Report.countDocuments({ status: 'pending' });
  const reportedBlogs = await Report.countDocuments({ targetType: 'blog', status: 'pending' });
  const reportedComments = await Report.countDocuments({ targetType: 'comment', status: 'pending' });

  res.json({
    success: true,
    analytics: {
      totalBlogs, publishedBlogs, draftBlogs,
      totalViews: totalViews[0]?.total || 0,
      totalLikes: totalLikes[0]?.total || 0,
      totalComments: totalComments[0]?.total || 0,
      topAuthors: enrichedAuthors,
      pendingReports, reportedBlogs, reportedComments,
    },
  });
});

// ══════════════════════════════════════════════════════════════
//  AUTHOR BLOG STATS
// ══════════════════════════════════════════════════════════════

export const getMyBlogStats = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const [published, drafts, archived, totalViews, totalLikes, totalComments] = await Promise.all([
    Blog.countDocuments({ author: userId, status: 'published', deletedAt: null }),
    Blog.countDocuments({ author: userId, status: 'draft', deletedAt: null }),
    Blog.countDocuments({ author: userId, status: 'archived', deletedAt: null }),
    Blog.aggregate([
      { $match: { author: userId, deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$viewCount' } } },
    ]),
    Blog.aggregate([
      { $match: { author: userId, deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$likeCount' } } },
    ]),
    Blog.aggregate([
      { $match: { author: userId, deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$commentCount' } } },
    ]),
  ]);

  res.json({
    success: true,
    stats: {
      published, drafts, archived,
      totalViews: totalViews[0]?.total || 0,
      totalLikes: totalLikes[0]?.total || 0,
      totalComments: totalComments[0]?.total || 0,
    },
  });
});

export const getBlogById = getBlog;
