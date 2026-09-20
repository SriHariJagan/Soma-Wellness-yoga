// ============================================================
// routes/offerings.js — Unified Offering Catalog
// Mounted at /api/offerings
// ============================================================
import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import * as offering from '../controllers/offeringController.js';

const router = express.Router();

const adminLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Too many requests' });

// ── Admin Routes (MUST be before /:slug catch-all) ──────────
router.get('/admin/stats', requireAuth, requireAdmin, offering.adminOfferingStats);
router.get('/admin', requireAuth, requireAdmin, offering.adminListOfferings);
router.get('/admin/:id', requireAuth, requireAdmin, offering.adminGetOffering);
router.post('/admin', requireAuth, requireAdmin, adminLimiter, validate(schemas.offeringCreate), offering.adminCreateOffering);
router.put('/admin/:id', requireAuth, requireAdmin, adminLimiter, validate(schemas.offeringUpdate), offering.adminUpdateOffering);
router.delete('/admin/:id', requireAuth, requireAdmin, adminLimiter, offering.adminDeleteOffering);
router.patch('/admin/:id/toggle', requireAuth, requireAdmin, adminLimiter, validate(schemas.offeringToggle), offering.adminToggleOffering);
router.patch('/admin/:id/status', requireAuth, requireAdmin, adminLimiter, validate(schemas.offeringStatus), offering.adminSetOfferingStatus);
router.patch('/admin/reorder', requireAuth, requireAdmin, adminLimiter, validate(schemas.offeringReorder), offering.adminReorderOfferings);

// ── Public Routes ───────────────────────────────────────────
router.get('/categories', offering.listCategories);
router.get('/', offering.listPublicOfferings);
router.get('/:slug', offering.getPublicOffering);

export default router;
