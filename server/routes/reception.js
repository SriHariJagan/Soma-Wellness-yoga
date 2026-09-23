// ============================================================
// routes/reception.js  —  mounted at /api/reception
// Permission-gated routes for reception staff. Each route
// verifies the user has the required permission(s). Admin and
// manager roles bypass permission checks.
// ============================================================
import express from 'express';
import { requireAuth, requireRole, requirePermission } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as a from '../controllers/adminController.js';
import * as ev from '../controllers/eventController.js';
import * as inviteCtrl from '../controllers/classInviteController.js';
import * as sales from '../controllers/receptionSalesController.js';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import ApiError from '../utils/ApiError.js';

const router = express.Router();
// Only staff roles may use the reception API. Students must use /api/student.
// Admin/manager bypass granular permission checks inside requirePermission.
router.use(requireAuth, requireRole('admin', 'manager', 'reception'));

const staffWriteLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Too many write requests, slow down.' });
const staffBulkLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'Too many bulk operations, slow down.' });

// ── Profile ───────────────────────────────────────────────────
router.get('/profile', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password -refreshTokens -resetTokenHash -resetTokenExpires');
  res.json(user);
}));

// ── Overview ──────────────────────────────────────────────────
router.get('/overview', requirePermission('customers.view', 'bookings.view', 'attendance.view'), asyncHandler(async (req, res) => {
  // Return a lightweight overview for reception
  const overview = await a.getOverview(req, res);
  return overview;
}));

// ── Students / Customers ──────────────────────────────────────
router.get('/students', requirePermission('customers.view', 'users.view'), a.getStudents);
router.post('/students', requirePermission('customers.create', 'users.create'), staffWriteLimiter, a.createStudent);
router.get('/students/:id', requirePermission('customers.view', 'users.view'), a.getStudentById);
router.put('/students/:id', requirePermission('customers.edit', 'users.edit'), staffWriteLimiter, a.updateStudent);

// ── Counter sales (front-desk purchases for a student) ──────
router.get('/catalog', requirePermission('courses.view'), sales.getCatalog);
router.get('/students/:id/purchases', requirePermission('customers.view', 'users.view'), sales.getStudentPurchases);
router.post('/students/:id/purchases', requirePermission('courses.booking', 'bookings.create'), staffWriteLimiter, sales.recordPurchase);

// ── Attendance ────────────────────────────────────────────────
router.get('/attendance/overview', requirePermission('attendance.view', 'classes.attendance'), a.getAttendanceOverview);
router.get('/attendance/enrollment-types', requirePermission('attendance.view', 'classes.attendance'), a.getAttendanceEnrollmentTypes);
router.get('/attendance/enrollment-items/:entityType', requirePermission('attendance.view', 'classes.attendance'), a.getAttendanceEnrollmentItems);
router.get('/attendance/class-invites/:entityType/:entityId', requirePermission('attendance.view', 'classes.attendance'), a.getAttendanceClassInvites);
router.get('/attendance/students/:inviteId', requirePermission('attendance.view', 'classes.attendance'), a.getAttendanceStudents);
router.get('/attendance/membership-students/:planId/:inviteId', requirePermission('attendance.view', 'classes.attendance'), a.getMembershipAttendanceStudents);
router.get('/attendance/membership-invites', requirePermission('attendance.view', 'classes.attendance'), a.getAllMembershipInvites);
router.get('/attendance/membership-members/:inviteId', requirePermission('attendance.view', 'classes.attendance'), a.getActiveMembersForInvite);
router.get('/attendance/by-date', requirePermission('attendance.view', 'classes.attendance'), a.getAttendanceByDate);
// Lightweight class list for the attendance workflow: invites on a given
// date (or recent ones), gated by attendance permissions so front-desk
// staff without bookings access can still mark attendance.
router.get('/attendance/invites', requirePermission('attendance.view', 'classes.attendance'), asyncHandler(async (req, res) => {
  const { date } = req.query;
  const ClassInvite = (await import('../models/ClassInvite.js')).default;
  const q = { status: { $ne: 'cancelled' } };
  if (date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      q.date = { $gte: start, $lte: end };
    }
  }
  const invites = await ClassInvite.find(q)
    .select('title date startTime endTime instructor status totalRecipients recipients')
    .sort({ date: -1, startTime: 1 })
    .limit(100);
  res.json(invites.map((inv) => ({
    _id: inv._id,
    title: inv.title,
    date: inv.date,
    startTime: inv.startTime,
    endTime: inv.endTime,
    instructor: inv.instructor,
    status: inv.status,
    totalRecipients: inv.totalRecipients ?? inv.recipients?.length ?? 0,
  })));
}));
router.post('/attendance', requirePermission('attendance.create', 'classes.attendance.create'), staffWriteLimiter, a.markAttendance);
router.post('/attendance/bulk', requirePermission('attendance.create', 'classes.attendance.create'), staffBulkLimiter, a.bulkMarkAttendance);
router.post('/attendance/mark-all', requirePermission('attendance.create', 'classes.attendance.create'), staffBulkLimiter, a.markAllPresent);
// Clear unlocked records for a class so front-desk can fix marking mistakes.
// Locking stays admin-only.
router.post('/attendance/reset/:inviteId', requirePermission('attendance.edit', 'classes.attendance.edit'), staffWriteLimiter, a.resetAttendance);
router.get('/attendance/:id', requirePermission('attendance.view', 'classes.attendance'), a.getStudentAttendance);

// ── Class Invites (walk-in booking) ──────────────────────────
router.get('/class-invites', requirePermission('bookings.view', 'sections.view'), inviteCtrl.getInvites);
router.get('/class-invites/stats', requirePermission('bookings.view', 'sections.view'), inviteCtrl.getInviteStats);
router.get('/class-invites/recipients', requirePermission('bookings.view', 'sections.view'), inviteCtrl.getRecipients);
router.get('/class-invites/service-eligible-students/:serviceId', requirePermission('bookings.view', 'sections.view'), inviteCtrl.getServiceEligibleStudents);
router.post('/class-invites', requirePermission('bookings.create', 'sections.booking'), staffWriteLimiter, inviteCtrl.createInvite);
router.post('/class-invites/:id/duplicate', requirePermission('bookings.create', 'sections.booking'), staffWriteLimiter, inviteCtrl.duplicateInvite);
router.get('/class-invites/:id', requirePermission('bookings.view', 'sections.view'), inviteCtrl.getInviteById);
router.patch('/class-invites/:id/cancel', requirePermission('bookings.cancel'), staffWriteLimiter, inviteCtrl.cancelInvite);
router.post('/class-invites/:id/resend', requirePermission('bookings.create'), staffWriteLimiter, inviteCtrl.resendInvite);

// ── Events (view only) ───────────────────────────────────────
router.get('/events', requirePermission('courses.view'), ev.adminGetEvents);
router.get('/events/:id/registrations', requirePermission('courses.view'), ev.adminGetEventRegistrations);

// ── Courses (view) ───────────────────────────────────────────
router.get('/courses', requirePermission('courses.view'), asyncHandler(async (req, res) => {
  const Course = (await import('../models/Course.js')).default;
  // NOTE: Course has `active`, not `status` — filter on active.
  const courses = await Course.find({ active: { $ne: false } }).sort({ createdAt: -1 });
  res.json(courses);
}));

// ── Classes (view) ───────────────────────────────────────────
router.get('/classes', requirePermission('classes.view'), asyncHandler(async (req, res) => {
  const result = await a.classes.list(req, res);
  return result;
}));

// ── Audit log (reception activity) ───────────────────────────
router.get('/activity-log', asyncHandler(async (req, res) => {
  const logs = await ActivityLog.find({ performedBy: req.user._id })
    .populate('performedBy', 'name email role')
    .populate('targetUser', 'name email')
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(logs);
}));

export default router;
