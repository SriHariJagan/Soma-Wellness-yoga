// ============================================================
// routes/public.js  —  mounted at /api/public
// Unauthenticated read-only catalogue data for the marketing
// site (courses, plans, batches, settings banner).
// ============================================================
import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import Course from '../models/Course.js';
import Plan from '../models/Plan.js';
import Batch from '../models/Batch.js';
import Workshop from '../models/Workshop.js';
import Settings from '../models/Settings.js';
import Service from '../models/Service.js';
import { publicGetEvents } from '../controllers/eventController.js';
import * as bookCtrl from '../controllers/bookController.js';
import * as shippingCtrl from '../controllers/shippingController.js';
import * as bulkCtrl from '../controllers/bulkEnquiryController.js';
import * as bookOrderCtrl from '../controllers/bookOrderController.js';

const router = express.Router();

// Public catalogue data is effectively static; let browsers/CDNs reuse it
// for 5 minutes and revalidate in the background afterwards.
function publicCache(req, res, next) {
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
  next();
}

const SERVICE_FIELDS = [
  'name', 'slug', 'description', 'category', 'type', 'mode',
  'instructor', 'instructors', 'timeSlots', 'price', 'pricingModel',
  'contactEmail', 'contactPhone', 'sessionDuration', 'totalSessions',
  'validityDuration', 'validityUnit', 'durationWeeks', 'scheduleDays',
  'scheduleTime', 'image', 'icon', 'tags', 'isPopular', 'featured',
  'displayOrder',
].join(' ');

router.get('/services', publicCache, asyncHandler(async (req, res) => {
  const services = await Service.find({ active: true, visibility: { $ne: 'hidden' } })
    .select(SERVICE_FIELDS)
    .populate('instructor', 'name')
    .populate('instructors', 'name')
    .sort({ displayOrder: 1, name: 1 })
    .lean();
  res.json(services);
}));
router.get('/courses', publicCache, asyncHandler(async (req, res) => {
  res.json(await Course.find({ active: true }).select('-enrolledUsers -earlyEnrolled').lean());
}));
router.get('/plans', publicCache, asyncHandler(async (req, res) => res.json(await Plan.find({ active: true }).sort({ displayOrder: 1 }).lean())));
router.get('/batches', publicCache, asyncHandler(async (req, res) => res.json(await Batch.find({ status: { $ne: 'Closed' } }).sort({ createdAt: -1 }).lean())));
router.get('/workshops', publicCache, asyncHandler(async (req, res) => res.json(await Workshop.find({ status: 'available', date: { $gte: new Date() } }).sort({ date: 1 }).lean())));
router.get('/events', publicCache, publicGetEvents);

// Book store
router.get('/books', publicCache, bookCtrl.listBooks);
router.get('/books/:slug', publicCache, bookCtrl.getBookBySlug);
router.post('/shipping/check-availability', shippingCtrl.checkAvailability);
router.post('/bulk-orders', bulkCtrl.submitBulkEnquiry);
router.get('/order-tracking/:orderNumber', bookOrderCtrl.trackOrder);
router.get('/settings', publicCache, asyncHandler(async (req, res) => {
  const s = await Settings.getSingleton();
  res.json({ announcementBanner: s.announcementBanner, studioName: s.studioName, supportEmail: s.supportEmail, supportPhone: s.supportPhone });
}));

export default router;
