// ============================================================
// routes/admin.js  —  mounted at /api/admin
// All routes require an authenticated admin.
// ============================================================
import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as a from '../controllers/adminController.js';
import * as ev from '../controllers/eventController.js';
import * as assetCtrl from '../controllers/assetController.js';
import * as trialCtrl from '../controllers/freeTrialController.js';
import * as inviteCtrl from '../controllers/classInviteController.js';
import upload, { coverUpload } from '../middleware/upload.js';

const router = express.Router();
router.use(requireAuth, requireAdmin);

// Per-route rate limits to protect bulk operations
const adminWriteLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Too many admin write requests, slow down.' });
const adminBulkLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'Too many bulk operations, slow down.' });

// Overview & analytics
router.get('/overview', a.getOverview);
router.get('/analytics/revenue', a.getRevenueAnalytics);
router.get('/logs', a.getLogs);

// Students
router.get('/students', a.getStudents);
router.post('/students', a.createStudent);
router.get('/students/:id', a.getStudentById);
router.put('/students/:id', a.updateStudent);
router.delete('/students/:id', a.deleteStudent);
router.patch('/students/:id/status', a.setStudentStatus);
router.get('/students/:id/logs', a.getStudentLogs);

// Plans assignment
router.post('/plans/assign', a.assignPlan);
router.put('/plans/revoke/:id', a.revokePlan);

// Memberships renew & upgrade
router.post('/memberships/renew', a.renewMembership);
router.post('/memberships/upgrade', a.upgradeMembership);

// Payments
router.get('/payments', a.getPayments);
router.post('/payments', a.createPayment);
router.patch('/payments/:id/status', a.updatePaymentStatus);

// ── Attendance Management System ─────────────────────────────
// (Specific routes MUST come before the generic /attendance/:id catch-all)
router.get('/attendance/overview', a.getAttendanceOverview);
router.get('/attendance/enrollment-types', a.getAttendanceEnrollmentTypes);
router.get('/attendance/enrollment-items/:entityType', a.getAttendanceEnrollmentItems);
router.get('/attendance/class-invites/:entityType/:entityId', a.getAttendanceClassInvites);
router.get('/attendance/students/:inviteId', a.getAttendanceStudents);
router.get('/attendance/membership-students/:planId/:inviteId', a.getMembershipAttendanceStudents);
router.get('/attendance/membership-invites', a.getAllMembershipInvites);
router.get('/attendance/membership-members/:inviteId', a.getActiveMembersForInvite);
router.get('/attendance/by-date', a.getAttendanceByDate);
router.post('/attendance', adminWriteLimiter, a.markAttendance);
router.post('/attendance/bulk', adminBulkLimiter, a.bulkMarkAttendance);
router.post('/attendance/mark-all', adminBulkLimiter, a.markAllPresent);
router.post('/attendance/reset/:inviteId', adminWriteLimiter, a.resetAttendance);
router.post('/attendance/lock/:inviteId', adminWriteLimiter, a.lockAttendance);

// Generic attendance lookup by user ID (catch-all — keep last)
router.get('/attendance/:id', a.getStudentAttendance);

// Classes
router.get('/classes', a.classes.list);
router.post('/classes', a.classes.create);
router.put('/classes/:id', a.classes.update);
router.delete('/classes/:id', a.classes.remove);

// Workshops (custom admin handlers)
router.get('/workshops', a.adminGetWorkshops);
router.post('/workshops', a.adminCreateWorkshop);
router.put('/workshops/:id', a.adminUpdateWorkshop);
router.delete('/workshops/:id', a.adminDeleteWorkshop);
router.patch('/workshops/:id/publish', a.adminTogglePublish);
router.patch('/workshops/:id/archive', a.adminToggleArchive);
router.get('/workshops/:id/stats', a.adminGetWorkshopStats);
router.get('/workshops/:id/registrations', a.adminGetWorkshopRegistrations);
router.patch('/workshops/:id/attendance', a.adminMarkAttendance);

// Events (community events — create, publish, view registrations)
router.get('/events', ev.adminGetEvents);
router.post('/events', ev.adminCreateEvent);
router.put('/events/:id', ev.adminUpdateEvent);
router.delete('/events/:id', ev.adminDeleteEvent);
router.get('/events/:id/registrations', ev.adminGetEventRegistrations);

// ── Assets / Content Management ──────────────────────────────
router.get('/downloads', assetCtrl.listAssets);
router.post('/downloads/upload', upload.single('file'), assetCtrl.uploadAsset);
router.get('/downloads/stats', assetCtrl.getAssetStats);
router.get('/downloads/:id', assetCtrl.getAsset);
router.put('/downloads/:id', assetCtrl.updateAsset);
router.post('/downloads/:id/replace', upload.single('file'), assetCtrl.replaceAssetFile);
router.patch('/downloads/:id/archive', assetCtrl.archiveAsset);
router.delete('/downloads/:id', assetCtrl.deleteAsset);
router.get('/downloads/:id/download', assetCtrl.downloadAsset);

// Courses
router.get('/courses', a.courses.list);
router.post('/courses', a.courses.create);
router.put('/courses/:id', a.courses.update);
router.delete('/courses/:id', a.courses.remove);

// Membership plans catalogue
router.get('/membership-plans', a.plans.list);
router.post('/membership-plans', a.plans.create);
router.put('/membership-plans/:id', a.plans.update);
router.delete('/membership-plans/:id', a.plans.remove);
router.post('/membership-plans/sync-official', a.syncOfficialPlans);

// Coupons — full management
import * as couponCtrl from '../controllers/couponController.js';
import * as orderCtrl from '../controllers/orderController.js';
router.get('/coupons', couponCtrl.listCoupons);
router.post('/coupons', couponCtrl.createCoupon);
router.get('/coupons/stats', couponCtrl.getCouponStats);
router.get('/coupons/products/search', couponCtrl.searchProducts);
router.get('/coupons/:id', couponCtrl.getCouponDetail);
router.put('/coupons/:id', couponCtrl.updateCoupon);
router.delete('/coupons/:id', couponCtrl.deleteCoupon);
router.post('/coupons/:id/duplicate', couponCtrl.duplicateCoupon);
router.post('/coupons/:id/toggle', couponCtrl.toggleCoupon);

// ── Book store ───────────────────────────────────────────────
import * as bookCtrl from '../controllers/bookController.js';
import * as shippingCtrl from '../controllers/shippingController.js';
import * as bookOrderCtrl from '../controllers/bookOrderController.js';
import * as bulkCtrl from '../controllers/bulkEnquiryController.js';

// Books
router.get('/books/stats', bookCtrl.adminBookStats);
router.get('/books', bookCtrl.adminListBooks);
router.post('/books', adminWriteLimiter, bookCtrl.adminCreateBook);
router.post('/books/upload-cover', coverUpload.single('cover'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({ success: true, url: `${baseUrl}/uploads/cover/${req.file.filename}`, filename: req.file.filename });
}));
router.put('/books/:id', adminWriteLimiter, bookCtrl.adminUpdateBook);
router.patch('/books/:id/status', adminWriteLimiter, bookCtrl.adminSetBookStatus);
router.patch('/books/:id/stock', adminWriteLimiter, bookCtrl.adminAdjustStock);
router.delete('/books/:id', adminWriteLimiter, bookCtrl.adminDeleteBook);

// Book orders (MUST precede generic /orders/:id below)
router.get('/orders/books', bookOrderCtrl.adminListBookOrders);
router.get('/orders/books/:id', bookOrderCtrl.adminGetBookOrder);
router.patch('/orders/books/:id/status', adminWriteLimiter, bookOrderCtrl.adminSetBookOrderStatus);
router.patch('/orders/books/:id/dispatch', adminWriteLimiter, bookOrderCtrl.adminDispatchBookOrder);
router.post('/orders/books/:id/notes', adminWriteLimiter, bookOrderCtrl.adminAddBookOrderNote);

// Shipping rules & settings
router.get('/shipping/rules', shippingCtrl.listRules);
router.post('/shipping/rules', adminWriteLimiter, shippingCtrl.createRule);
router.put('/shipping/rules/:id', adminWriteLimiter, shippingCtrl.updateRule);
router.patch('/shipping/rules/:id/status', adminWriteLimiter, shippingCtrl.toggleRule);
router.delete('/shipping/rules/:id', adminWriteLimiter, shippingCtrl.deleteRule);
router.put('/shipping/settings', adminWriteLimiter, shippingCtrl.updateSettings);

// Bulk enquiries
router.get('/bulk-enquiries', bulkCtrl.listBulkEnquiries);
router.get('/bulk-enquiries/:id', bulkCtrl.getBulkEnquiryDetail);
router.patch('/bulk-enquiries/:id/status', adminWriteLimiter, bulkCtrl.updateBulkEnquiryStatus);

// Orders (generic — keep AFTER /orders/books)
router.get('/orders', orderCtrl.listAllOrders);
router.get('/orders/:id', orderCtrl.getOrderDetail);
router.post('/orders/:id/resend-notification', orderCtrl.resendOrderNotification);

// Consultations
router.get('/consultations', a.getConsultations);
router.get('/consultations/analytics', a.getConsultationAnalytics);
router.put('/consultations/:id', a.updateConsultation);

// Time Slot Management
router.get('/time-slots', a.getTimeSlots);
router.post('/time-slots', a.createTimeSlot);
router.post('/time-slots/batch', a.createTimeSlots);
router.put('/time-slots/:id', a.updateTimeSlot);
router.delete('/time-slots/:id', a.deleteTimeSlot);

// Notifications
import * as notif from '../controllers/notificationController.js';
router.get('/notifications', notif.listNotifications);
router.get('/notifications/stats', notif.getNotificationStats);
router.get('/notifications/recipients', notif.getRecipientsByCategory);
router.post('/notifications/send', adminBulkLimiter, notif.sendNotification);
router.get('/notifications/:id', notif.getNotificationDetail);

// Settings
router.get('/settings', a.getSettings);
router.put('/settings', a.updateSettings);

// Services catalog
router.get('/services', a.getAllServices);
router.post('/services', a.createService);
router.put('/services/:id', a.updateService);
router.delete('/services/:id', a.removeService);
router.post('/services/sync-official', a.syncOfficialServices);

// Instructors
router.get('/instructors', a.instructors.list);
router.post('/instructors', a.instructors.create);
router.put('/instructors/:id', a.instructors.update);
router.delete('/instructors/:id', a.instructors.remove);

// Service assignments & analytics
router.get('/services/analytics', a.getServiceAnalytics);
router.get('/service-assignments', a.getServiceAssignments);
router.post('/services/assign', a.assignService);
router.put('/service-assignments/:id', a.updateUserService);
router.post('/service-assignments/:id/renew', a.renewUserServiceAdmin);
router.delete('/service-assignments/:id', a.deleteUserService);

// Free Trial Management
router.get('/free-trials', trialCtrl.getTrials);
router.get('/free-trials/stats', trialCtrl.getTrialStats);
router.get('/free-trials/:id', trialCtrl.getTrialDetail);
router.post('/free-trials/sessions', trialCtrl.createTrialSession);
router.post('/free-trials/bulk-sessions', trialCtrl.createBulkSessions);
router.put('/free-trials/sessions/:id', trialCtrl.updateTrialSession);
router.patch('/free-trials/sessions/:id/cancel', trialCtrl.cancelTrialSession);
router.patch('/free-trials/sessions/:id/attendance', trialCtrl.markSessionAttendance);
router.post('/free-trials/notify', trialCtrl.sendTrialNotification);
router.post('/free-trials/broadcast', adminBulkLimiter, trialCtrl.broadcastToActiveTrials);
router.patch('/free-trials/:id/cancel', trialCtrl.cancelTrial);
router.post('/free-trials/expire', adminBulkLimiter, trialCtrl.expireTrialsJob);

// Enrollment progress (per-enrollment session / usage data)
router.get('/enrollment-progress/:studentId', a.getEnrollmentProgress);

// Enrollment expiry (manual trigger for all expired memberships, services, trials)
router.post('/enrollments/expire', a.expireEnrollments);

// Class Invites
router.get('/class-invites', inviteCtrl.getInvites);
router.get('/class-invites/stats', inviteCtrl.getInviteStats);
router.get('/class-invites/debug-membership', inviteCtrl.debugMembershipRecipients);
router.get('/class-invites/recipients', inviteCtrl.getRecipients);
router.get('/class-invites/service-eligible-students/:serviceId', inviteCtrl.getServiceEligibleStudents);
router.post('/class-invites', inviteCtrl.createInvite);
router.get('/class-invites/:id', inviteCtrl.getInviteById);
router.patch('/class-invites/:id/cancel', inviteCtrl.cancelInvite);
router.post('/class-invites/:id/resend', inviteCtrl.resendInvite);
router.post('/class-invites/:id/duplicate', inviteCtrl.duplicateInvite);

export default router;
