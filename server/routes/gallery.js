// ============================================================
// routes/gallery.js — mounted at /api (see server.js)
//   Public:  GET /api/public/gallery  (active only, cached)
//   Admin:   /api/admin/gallery/* (requireAuth + communications.gallery;
//            admin/manager bypass, reception needs the grant)
// ============================================================
import express from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import * as ctrl from '../controllers/galleryController.js';

const router = express.Router();

router.get('/public/gallery', ctrl.publicListGallery);

router.get('/admin/gallery', requireAuth, requirePermission('communications.gallery'), ctrl.adminListGallery);
router.post('/admin/gallery', requireAuth, requirePermission('communications.gallery'), rateLimit({ windowMs: 60 * 1000, max: 20, message: 'Too many uploads, slow down.' }), ctrl.galleryUpload.single('image'), ctrl.adminCreateGallery);
router.put('/admin/gallery/:id', requireAuth, requirePermission('communications.gallery'), ctrl.galleryUpload.single('image'), ctrl.adminUpdateGallery);
router.delete('/admin/gallery/:id', requireAuth, requirePermission('communications.gallery'), ctrl.adminDeleteGallery);
router.patch('/admin/gallery/reorder', requireAuth, requirePermission('communications.gallery'), ctrl.adminReorderGallery);

export default router;
