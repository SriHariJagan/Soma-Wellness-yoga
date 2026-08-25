import { Router } from 'express';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import upload from '../middleware/upload.js';
import {
  createBlog, updateBlog, deleteBlog, hardDeleteBlog,
  getBlog, listBlogs, trendingBlogs, userBlogs, duplicateBlog,
  toggleLike, toggleBookmark, getBookmarks, shareBlog,
  reportContent, createComment, updateComment, deleteComment,
  getComments, getReplies,
  moderateBlog, moderateComment, getReports, resolveReport,
  getAdminBlogs, getBlogAnalyticsData, getMyBlogStats,
} from '../controllers/blogController.js';

const router = Router();

// ── Public routes (no auth required) ──
router.get('/', listBlogs);
router.get('/trending', trendingBlogs);

// ── Specific auth routes (MUST come before /:id) ──
router.get('/my/stats', requireAuth, getMyBlogStats);
router.get('/bookmarks/mine', requireAuth, getBookmarks);
router.get('/user/:userId', requireAuth, userBlogs);

router.get('/admin/all', requireAuth, requireAdmin, getAdminBlogs);
router.get('/admin/analytics', requireAuth, requireAdmin, getBlogAnalyticsData);
router.get('/admin/reports', requireAuth, requireAdmin, getReports);
router.patch('/admin/:id/moderate', requireAuth, requireAdmin, moderateBlog);
router.patch('/admin/reports/:id/resolve', requireAuth, requireAdmin, resolveReport);
router.delete('/admin/:id/hard', requireAuth, requireAdmin, hardDeleteBlog);
router.patch('/admin/comments/:id/moderate', requireAuth, requireAdmin, moderateComment);

// ── Comments (before blog /:id to avoid conflict) ──
router.get('/comments/:commentId/replies', requireAuth, getReplies);
router.put('/comments/:id', requireAuth, updateComment);
router.delete('/comments/:id', requireAuth, deleteComment);

// ── Blog by ID (must come after all specific routes) ──
router.get('/:id', optionalAuth, getBlog);

// ── Authenticated blog CRUD ──
router.post('/', requireAuth, createBlog);
router.put('/:id', requireAuth, updateBlog);
router.delete('/:id', requireAuth, deleteBlog);
router.post('/:id/duplicate', requireAuth, duplicateBlog);

// ── Social interactions ──
router.post('/like', requireAuth, toggleLike);
router.post('/bookmark', requireAuth, toggleBookmark);
router.post('/:id/share', requireAuth, shareBlog);
router.post('/report', requireAuth, reportContent);

// ── Blog comments ──
router.get('/:blogId/comments', requireAuth, getComments);
router.post('/:blogId/comments', requireAuth, createComment);

// ── Media upload ──
router.post('/upload/media', requireAuth, upload.array('files', 10), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded' });
  }
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const files = req.files.map(f => {
    const category = f.destination.split(/[/\\]/).pop();
    return {
      url: `${baseUrl}/uploads/${category}/${f.filename}`,
      originalName: f.originalname,
      type: f.mimetype.startsWith('image/') ? 'image' :
            f.mimetype.startsWith('video/') ? 'video' :
            f.mimetype.startsWith('audio/') ? 'audio' :
            f.mimetype === 'application/pdf' ? 'pdf' : 'document',
      size: f.size,
      mimeType: f.mimetype,
      filename: f.filename,
    };
  });
  res.json({ success: true, files });
}));

export default router;
