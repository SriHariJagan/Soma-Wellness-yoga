// ============================================================
// routes/staff.js  —  mounted at /api/staff
// Center manager / reception scope (admin + manager roles).
// Attendance marking, walk-in student creation, class invites,
// event viewing. Revenue, coupons, comms and settings stay
// admin-only under /api/admin.
// ============================================================
import express from 'express';
import { requireAuth, requireStaff } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import * as a from '../controllers/adminController.js';
import * as ev from '../controllers/eventController.js';
import * as inviteCtrl from '../controllers/classInviteController.js';

const router = express.Router();
router.use(requireAuth, requireStaff);

const staffWriteLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Too many staff write requests, slow down.' });
const staffBulkLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'Too many bulk operations, slow down.' });

// Overview (class/attendance focused dashboard data)
router.get('/overview', a.getOverview);

// Students — list + walk-in creation for visiting customers
router.get('/students', a.getStudents);
router.post('/students', a.createStudent);
router.get('/students/:id', a.getStudentById);
router.put('/students/:id', a.updateStudent);

// Attendance — full marking flow
router.get('/attendance/overview', a.getAttendanceOverview);
router.get('/attendance/enrollment-types', a.getAttendanceEnrollmentTypes);
router.get('/attendance/enrollment-items/:entityType', a.getAttendanceEnrollmentItems);
router.get('/attendance/class-invites/:entityType/:entityId', a.getAttendanceClassInvites);
router.get('/attendance/students/:inviteId', a.getAttendanceStudents);
router.get('/attendance/membership-students/:planId/:inviteId', a.getMembershipAttendanceStudents);
router.get('/attendance/membership-invites', a.getAllMembershipInvites);
router.get('/attendance/membership-members/:inviteId', a.getActiveMembersForInvite);
router.get('/attendance/by-date', a.getAttendanceByDate);
router.post('/attendance', staffWriteLimiter, a.markAttendance);
router.post('/attendance/bulk', staffBulkLimiter, a.bulkMarkAttendance);
router.post('/attendance/mark-all', staffBulkLimiter, a.markAllPresent);
router.post('/attendance/reset/:inviteId', staffWriteLimiter, a.resetAttendance);
router.get('/attendance/:id', a.getStudentAttendance);

// Class invites — book a class for visiting customers
router.get('/class-invites', inviteCtrl.getInvites);
router.get('/class-invites/stats', inviteCtrl.getInviteStats);
router.get('/class-invites/recipients', inviteCtrl.getRecipients);
router.get('/class-invites/service-eligible-students/:serviceId', inviteCtrl.getServiceEligibleStudents);
router.post('/class-invites', inviteCtrl.createInvite);
router.get('/class-invites/:id', inviteCtrl.getInviteById);
router.patch('/class-invites/:id/cancel', inviteCtrl.cancelInvite);
router.post('/class-invites/:id/resend', inviteCtrl.resendInvite);
router.post('/class-invites/:id/duplicate', inviteCtrl.duplicateInvite);

// Events — view published events + registrations
router.get('/events', ev.adminGetEvents);
router.get('/events/:id/registrations', ev.adminGetEventRegistrations);

export default router;
