// ============================================================
// routes/student.js  —  mounted at /api/student
// Every route requires an authenticated student/admin session.
// ============================================================
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import * as s from '../controllers/studentController.js';
import * as ev from '../controllers/eventController.js';
import * as assetCtrl from '../controllers/assetController.js';
import * as trialCtrl from '../controllers/freeTrialController.js';
import * as inviteCtrl from '../controllers/classInviteController.js';

const router = express.Router();
router.use(requireAuth);

const studentWriteLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: 'Too many requests, slow down.' });
const studentSensitiveLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: 'Too many sensitive operations, slow down.' });

router.get('/dashboard', s.getDashboard);

// Membership
router.get('/membership', s.getMembership);
router.get('/membership/status', s.getMembershipStatus);
router.get('/membership/active', s.getActiveMembership);
router.get('/membership-plans', s.getMembershipPlans);
router.post('/membership/purchase', studentSensitiveLimiter, s.purchaseMembership);
router.post('/membership/cancel', studentSensitiveLimiter, s.cancelMembership);

router.post('/membership/pause', studentSensitiveLimiter, s.pauseMembership);
router.post('/membership/resume', studentSensitiveLimiter, s.resumeMembership);

// Attendance & payments
router.get('/attendance', s.getAttendance);
router.get('/payments', s.getPayments);

// Classes
router.get('/classes', s.getClasses);
router.post('/classes/:id/enroll', studentWriteLimiter, s.enrollClass);

// Workshops
router.get('/workshops', s.getWorkshops);
router.get('/workshops/:id', s.getWorkshopDetail);
router.post('/workshops/:id/register', studentWriteLimiter, s.registerWorkshop);

// Events
router.get('/events', ev.studentGetEvents);
router.post('/events/:id/register', studentWriteLimiter, ev.studentRegisterEvent);

// Downloads / Assets
router.get('/downloads', assetCtrl.getStudentAssets);
router.post('/downloads/:id/track', s.trackDownload);
router.get('/downloads/:id/download', assetCtrl.downloadAsset);

// Consultations
router.get('/consultations/slots', s.getConsultationSlots);
router.get('/consultations', s.getConsultations);
router.post('/consultations', s.bookConsultation);
router.patch('/consultations/:id/reschedule', s.rescheduleConsultation);
router.patch('/consultations/:id/cancel', s.cancelConsultation);

// Cart
import * as cartCtrl from '../controllers/cartController.js';
import * as bookOrderCtrl from '../controllers/bookOrderController.js';
router.get('/cart', cartCtrl.getCart);
router.get('/cart/count', cartCtrl.getCartCount);
router.post('/cart/add', studentWriteLimiter, cartCtrl.addToCart);
router.post('/cart/update', studentWriteLimiter, cartCtrl.updateCartItem);
router.delete('/cart/item/:id', studentWriteLimiter, cartCtrl.removeFromCart);
router.post('/cart/apply-coupon', studentWriteLimiter, cartCtrl.applyCoupon);
router.post('/cart/remove-coupon', studentWriteLimiter, cartCtrl.removeCoupon);
router.post('/cart/checkout', studentSensitiveLimiter, cartCtrl.checkout);

// Book store
router.post('/books/validate-cart', bookOrderCtrl.validateBookCart);
router.post('/books/checkout', studentSensitiveLimiter, bookOrderCtrl.checkoutBooks);
router.get('/books/orders', bookOrderCtrl.myBookOrders);

// Orders (student)
import * as orderCtrl from '../controllers/orderController.js';
router.get('/orders', orderCtrl.getStudentOrders);
router.get('/orders/:id', orderCtrl.getStudentOrderDetail);

// Notifications
import * as notif from '../controllers/notificationController.js';
router.get('/notifications', notif.getStudentNotifications);
router.get('/notifications/unread-count', notif.getUnreadCount);
router.patch('/notifications/read-all', notif.markAllStudentNotificationsRead);
router.patch('/notifications/:id/read', notif.markStudentNotificationRead);
router.patch('/notifications/:id/archive', notif.archiveStudentNotification);
router.delete('/notifications/:id', notif.deleteStudentNotification);

// Referral
router.get('/referral', s.getReferral);
router.post('/referral/invite', s.inviteReferral);

// Active Services
router.get('/services', s.getActiveServices);
router.get('/services/catalog', s.getServiceCatalog);
router.post('/services/enroll', studentSensitiveLimiter, s.enrollService);
router.post('/services/:id/renew', studentSensitiveLimiter, s.renewService);
router.patch('/services/:id/cancel', studentSensitiveLimiter, s.cancelService);

// All Enrollments (all types, active + archived)
router.get('/all-enrollments', s.getAllEnrollments);

// Free Trial
router.get('/trial/check-eligibility', trialCtrl.checkTrialEligibility);
router.post('/trial/start', studentSensitiveLimiter, trialCtrl.startTrial);
router.get('/trial', trialCtrl.getMyTrial);
router.get('/trial/sessions', trialCtrl.getMyTrialSessions);
router.get('/trial/sessions/:id', trialCtrl.getMyTrialSessionById);
router.get('/trial/notifications', trialCtrl.getMyTrialNotifications);
router.patch('/trial/notifications/:id/read', trialCtrl.markNotificationRead);
router.patch('/trial/notifications/read-all', trialCtrl.markAllNotificationsRead);

// YTTC
router.get('/yttc/status', s.getYTTCStatus);
router.post('/yttc/enroll', studentSensitiveLimiter, s.enrollYTTC);
// Enrollment Progress
router.get('/enrollment-progress', s.getMyEnrollmentProgress);

// Attendance Management (student)
router.get('/enrollments', s.getMyEnrollments);
router.get('/attendance/enrollment', s.getEnrollmentAttendance);

// Class Invites
router.get('/invites', inviteCtrl.getMyInvites);
router.get('/invites/:id', inviteCtrl.getMyInviteById);
router.patch('/invites/:id/read', inviteCtrl.markInviteRead);
router.post('/invites/:id/join', inviteCtrl.trackJoin);

export default router;
