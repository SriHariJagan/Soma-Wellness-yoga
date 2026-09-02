// ============================================================
// controllers/adminController.js
// Admin-only handlers. Mounted behind requireAuth + requireAdmin.
// ============================================================
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { convertTrial } from './freeTrialController.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Attendance from '../models/Attendance.js';
import Payment from '../payment/models/Payment.js';
import { PaymentRepository } from '../payment/repository/PaymentRepository.js';
import ClassSession from '../models/ClassSession.js';
import Workshop from '../models/Workshop.js';
import Download from '../models/Download.js';
import Consultation from '../models/Consultation.js';
import TimeSlot from '../models/TimeSlot.js';
import Notification from '../models/Notification.js';
import Lead from '../models/lead.js';
import Booking from '../models/Booking.js';
import Batch from '../models/Batch.js';
import Coupon from '../models/Coupon.js';
import Course from '../models/Course.js';
import FreeTrial from '../models/FreeTrial.js';
import Plan from '../models/Plan.js';
import Settings from '../models/Settings.js';
import ActivityLog from '../models/ActivityLog.js';
import Service from '../models/Service.js';
import Instructor from '../models/Instructor.js';
import UserService from '../models/UserService.js';
import ClassInvite from '../models/ClassInvite.js';
import { renewUserService } from '../services/serviceService.js';
import { ensureReferral } from '../services/referralService.js';
import { notify, notifyPlanMembers } from '../services/notificationService.js';
import notificationService from '../notification/core/NotificationService.js';
import logger from '../notification/logger.js';
import { markAttendanceAtomic } from '../services/attendanceService.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Book from '../models/Book.js';
import BulkEnquiry from '../models/BulkEnquiry.js';
import { USER_STATUSES, USER_ROLES, ATTENDANCE_STATUSES, MEMBERSHIP_STATUSES, NOTIFICATION_TYPES, PRIORITY_LEVELS, PAYMENT_STATUSES } from '../shared/constants/index.js';

const MODULE = 'AdminCtrl';
const DAY = 86400000;

const purifyWindow = new JSDOM('').window;
const purify = DOMPurify(purifyWindow);

async function log(action, req, targetUser = null, meta = {}) {
  try { await ActivityLog.create({ action, performedBy: req.user._id, targetUser, meta }); }
  catch (e) { logger.error(MODULE, 'ActivityLog failed', { error: e.message }); }
}

// ── Overview / analytics ─────────────────────────────────────
export const getOverview = asyncHandler(async (req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const [
    totalStudents, activeStudents, bannedStudents, newThisMonth,
    totalLeads, totalBatches, totalBookings, pendingBookings,
    revenueAgg, recentStudents, todaySchedule, settings, activeMemberships,
    bookOrdersToday, bookOrdersPendingDispatch, bookRevenueAgg, bookStockCount, bookLowStock, bulkEnquiriesNew,
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'student', status: 'active' }),
    User.countDocuments({ role: 'student', status: 'banned' }),
    User.countDocuments({ role: 'student', createdAt: { $gte: startOfMonth } }),
    Lead.countDocuments(),
    Batch.countDocuments(),
    Booking.countDocuments(),
    Booking.countDocuments({ status: 'Pending' }),
    Payment.aggregate([{ $match: { paymentStatus: 'captured' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    User.find({ role: 'student' }).sort({ createdAt: -1 }).limit(6).select('name email createdAt status planMonths'),
    ClassSession.find({ date: { $gte: todayStart, $lte: todayEnd } }).sort({ date: 1 }),
    Settings.getSingleton(),
    Membership.countDocuments({ status: 'active', expiryDate: { $gt: new Date() } }),
    Order.countDocuments({ kind: 'book', createdAt: { $gte: todayStart, $lte: todayEnd } }),
    Order.countDocuments({ kind: 'book', status: { $in: ['payment_confirmed', 'packed'] } }),
    Order.aggregate([{ $match: { kind: 'book', status: { $nin: ['payment_pending', 'cancelled', 'returned'] } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Book.countDocuments({ status: { $ne: 'archived' } }),
    Book.countDocuments({ trackInventory: true, status: { $ne: 'archived' }, $expr: { $lte: ['$stock', '$lowStockThreshold'] } }),
    BulkEnquiry.countDocuments({ status: 'NEW' }),
  ]);

  const revenue = revenueAgg[0]?.total || 0;
  const bookRevenue = bookRevenueAgg[0]?.total || 0;
  const i = settings.integrations;
  const systemHealth = [
    { label: 'Payment Gateway API', status: i.paymentGateway ? 'Operational' : 'Down', ok: i.paymentGateway },
    { label: 'Zoom Streaming Bridge', status: i.zoom ? 'Live' : 'Offline', ok: i.zoom },
    { label: 'WhatsApp Business API', status: i.whatsapp ? 'Connected' : 'Disconnected', ok: i.whatsapp },
    { label: 'Email SMTP Node', status: i.emailSmtp ? 'Operational' : 'Degraded', ok: i.emailSmtp },
  ];

  res.json({
    metrics: { activeStudents, totalStudents, bannedStudents, newThisMonth, revenue, activeMemberships, pendingBookings },
    bookStore: {
      ordersToday: bookOrdersToday,
      pendingDispatch: bookOrdersPendingDispatch,
      revenue: bookRevenue,
      products: bookStockCount,
      lowStock: bookLowStock,
      newBulkEnquiries: bulkEnquiriesNew,
    },
    totalLeads, totalBatches, totalBookings,
    recentStudents,
    todaySchedule: todaySchedule.map((c) => ({
      label: `${c.name} — ${c.time || ''}`.trim(),
      badge: c.status === 'completed' ? 'Completed' : `${c.enrolledUsers.length} enrolled`,
    })),
    systemHealth,
    announcementBanner: settings.announcementBanner,
  });
});

export const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 180 * DAY);
  const series = await Payment.aggregate([
    { $match: { paymentStatus: 'captured', createdAt: { $gte: since } } },
    { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
  ]);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  res.json(series.map((s) => ({ month: `${months[s._id.m - 1]} ${s._id.y}`, total: s.total, count: s.count })));
});

// ── Students ─────────────────────────────────────────────────
export const getStudents = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const q = { role: 'student', isDeleted: { $ne: true } };
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    q.$or = [
      { name: new RegExp(safe, 'i') },
      { email: new RegExp(safe, 'i') },
      { city: new RegExp(safe, 'i') },
    ];
  }
  const students = await User.find(q).sort({ createdAt: -1 });
  res.json(students);
});

export const getStudentById = asyncHandler(async (req, res) => {
  const student = await User.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');
  const [membership, payments, attendanceRecords, classSessions, activityLogs, services] = await Promise.all([
    Membership.findOne({ user: student._id }).sort({ createdAt: -1 }),
    Payment.find({ user: student._id }).sort({ createdAt: -1 }),
    Attendance.find({ user: student._id }).sort({ date: -1 }),
    ClassSession.find({ enrolledUsers: student._id }).sort({ date: -1 }),
    ActivityLog.find({ targetUser: student._id }).sort({ createdAt: -1 }).limit(50),
    UserService.find({ user: student._id }).populate('service instructor').sort({ createdAt: -1 }),
  ]);
  const mappedPayments = payments.map((p) => {
    const obj = typeof p.toObject === 'function' ? p.toObject() : p;
    const map = { captured: 'paid', pending: 'pending', failed: 'failed', refunded: 'refunded' };
    return { ...obj, status: map[obj.paymentStatus] || map[p.paymentStatus] || obj.paymentStatus || p.paymentStatus };
  });
  const totalPaid = mappedPayments.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  res.json({ student, membership, payments: mappedPayments, attendanceRecords, classSessions, activityLogs, services, totalPaid });
});

export const createStudent = asyncHandler(async (req, res) => {
  const { name, email, password, phone, city, style, level, planMonths } = req.body;
  if (!name || !email) throw ApiError.badRequest('Name and email are required');
  if (await User.findOne({ email: email.toLowerCase().trim() })) throw ApiError.conflict('Email already registered');

  const raw = password && password.trim() ? password : crypto.randomBytes(12).toString('base64url');
  const hashed = await bcrypt.hash(raw, await bcrypt.genSalt(12));
  const student = await User.create({
    name, email: email.toLowerCase().trim(), password: hashed,
    phone: phone || '', city: city || '', style: style || 'Hatha', level: level || 'Beginner',
    planMonths: planMonths || 0, role: 'student', status: 'active',
  });
  await ensureReferral(student);
  await log(`Added student: ${student.email}`, req, student._id);

  // Send welcome email with credentials.
  const autoGenerated = !(password && password.trim());
  const welcomeMessage = autoGenerated
    ? `Hello ${name},<br><br>An administrator created your Soma Wellness account.<br><strong>Email:</strong> ${student.email}<br><strong>Temporary Password:</strong> ${raw}<br><br>Please log in and change your password.`
    : `Hello ${name},<br><br>Welcome to Soma Wellness! Your account is ready — sign in with the password you chose.`;

  notificationService.send(student._id, {
    template: 'welcome',
    channels: ['inApp', 'email'],
    data: {
      name: student.name,
      email: student.email,
      dashboardUrl: `${process.env.FRONTEND_URL || 'https://somawellness.in'}/dashboard`,
      password: autoGenerated ? raw : undefined,
    },
    subject: autoGenerated ? 'Your Soma Wellness Account Credentials' : `Welcome to Soma Wellness, ${student.name}!`,
    message: welcomeMessage,
    priority: 'normal',
  }).catch((err) => {
    logger.error(MODULE, 'Welcome email failed', { email: student.email, error: err.message, stack: err.stack });
  });

  res.status(201).json(student);
});

export const updateStudent = asyncHandler(async (req, res) => {
  const allowed = ['name', 'email', 'phone', 'city', 'style', 'level', 'planMonths', 'status', 'bio', 'notes', 'gender', 'dateOfBirth', 'emergencyContact'];
  const updates = {};
  for (const f of allowed) if (req.body[f] !== undefined) updates[f] = req.body[f];

  if (updates.email) {
    const owner = await User.findOne({ email: updates.email.toLowerCase().trim() });
    if (owner && owner._id.toString() !== req.params.id) throw ApiError.conflict('Email already in use');
    updates.email = updates.email.toLowerCase().trim();
  }
  const student = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { returnDocument: 'after', runValidators: true });
  if (!student) throw ApiError.notFound('Student not found');
  await log(`Edited student: ${student.email}`, req, student._id);
  res.json(student);
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await User.findByIdAndUpdate(req.params.id, { isDeleted: true, status: 'banned' }, { returnDocument: 'after' });
  if (!student) throw ApiError.notFound('Student not found');
  await log(`Soft-deleted student: ${student.email}`, req, student._id);
  res.json({ success: true, msg: 'Student deactivated and archived' });
});

export const setStudentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!USER_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
  const student = await User.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');
  if (student.role === 'admin') throw ApiError.forbidden('Cannot change another admin status');
  await User.findByIdAndUpdate(student._id, { status }, { returnDocument: 'after' });
  await log(`Set status=${status} for ${student.email}`, req, student._id);
  res.json(student);
});

// ── Plans assignment ─────────────────────────────────────────
export const assignPlan = asyncHandler(async (req, res) => {
  const { studentId, planMonths, planType, price } = req.body;
  if (!studentId || !planMonths) throw ApiError.badRequest('studentId and planMonths are required');

  const plan = await Plan.findOne({ durationMonths: Number(planMonths) });
  if (!plan) throw ApiError.notFound('Plan not found');

  const assignedPrice = price ?? plan.price ?? 0;
  if (!assignedPrice) throw ApiError.badRequest('Price is required for plan assignment');

  // Create the manual payment FIRST, then activate membership
  const paymentRepo = new PaymentRepository();
  const payment = await paymentRepo.createManualPayment({
    user: studentId,
    label: planType || plan.name || `${planMonths}-Month Membership`,
    amount: assignedPrice * 100,
    description: `Admin plan assignment: ${planType || plan.name}`,
    adminId: req.user._id,
  });
  await log(`Recorded manual payment KES ${assignedPrice} for plan assignment`, req, studentId, { planType: planType || plan.name, amount: assignedPrice });

  const expiry = new Date(Date.now() + Number(planMonths) * 30 * DAY);
  const m = await Membership.findOneAndUpdate(
    { user: studentId },
    {
      user: studentId,
      planType: planType || plan.name || `${planMonths}-Month Membership`,
      planMonths: Number(planMonths),
      price: assignedPrice,
      invoice: payment._id,
      status: 'active',
      totalSessions: plan?.totalSessions || null,
      startDate: new Date(),
      expiryDate: expiry,
      $push: { history: { action: 'created', planMonths: Number(planMonths) } },
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  );
  await User.findByIdAndUpdate(studentId, { planMonths: Number(planMonths) });
  await Promise.all([
    notify(studentId, { title: 'Plan activated', message: `Your ${m.planType} is now active.`, type: 'success' }),
    notificationService.send(studentId, {
      template: 'invoice',
      channels: ['inApp', 'email'],
      data: {
        planName: m.planType,
        amount: `KES ${(price || m.price || 0).toLocaleString('en-KE')}`,
        invoiceDate: new Date().toLocaleDateString('en-KE'),
        name: (await User.findById(studentId).select('name').lean())?.name || 'Student',
      },
      priority: 'high',
    }).catch((err) => logger.error(MODULE, 'Plan activation notification failed', { userId: studentId, error: err.message })),
  ]);
  await log(`Assigned ${planMonths}-mo plan to ${studentId}`, req, studentId);
  await convertTrial(studentId, m.planType);
  res.json(m);
});

export const revokePlan = asyncHandler(async (req, res) => {
  const m = await Membership.findOneAndUpdate(
    { user: req.params.id },
    { deactivated: true },
    { returnDocument: 'after' }
  );
  await User.findByIdAndUpdate(req.params.id, { planMonths: 0 });
  await log(`Deactivated plan for ${req.params.id}`, req, req.params.id);
  res.json({ success: true, membership: m });
});

// ── Membership renew (admin) ────────────────────────────────
export const renewMembership = asyncHandler(async (req, res) => {
  const { studentId, planId } = req.body;
  if (!studentId || !planId) throw ApiError.badRequest('studentId and planId are required');

  const plan = await Plan.findById(planId);
  if (!plan) throw ApiError.notFound('Plan not found');

  const student = await User.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  const now = new Date();

  // Create the manual payment FIRST, then activate membership
  const paymentRepo = new PaymentRepository();
  const payment = await paymentRepo.createManualPayment({
    user: studentId,
    label: `${plan.name} (Admin Renewal)`,
    amount: plan.price * 100,
    description: `Admin renewal of ${plan.name}`,
    adminId: req.user._id,
  });

  let m = await Membership.findOne({ user: studentId }).sort({ createdAt: -1 });
  const base = m && m.expiryDate > now ? m.expiryDate.getTime() : now.getTime();
  const expiry = new Date(base + plan.durationMonths * 30 * DAY);

  if (!m) {
    m = await Membership.create({
      user: studentId,
      plan: planId,
      invoice: payment._id,
      planType: plan.name,
      planMonths: plan.durationMonths,
      price: plan.price,
      status: 'active',
      startDate: now,
      expiryDate: expiry,
      pauseDaysAllowed: plan.pauseDays ?? 0,
      benefits: plan.benefits,
      history: [{ action: 'created', planMonths: plan.durationMonths, note: `Renewed with ${plan.name}` }],
    });
  } else {
    m.planType = plan.name;
    m.planMonths = plan.durationMonths;
    m.price = plan.price;
    m.invoice = payment._id;
    m.status = 'active';
    m.expiryDate = expiry;
    m.pauseDaysAllowed = plan.pauseDays ?? m.pauseDaysAllowed;
    m.benefits = plan.benefits;
    m.history.push({ action: 'renewed', planMonths: plan.durationMonths, note: `Renewed with ${plan.name}` });
    await m.save();
  }

  await User.findByIdAndUpdate(studentId, { planMonths: plan.durationMonths });

  await notify(studentId, {
    title: 'Membership renewed',
    message: `Your ${plan.name} is active until ${expiry.toLocaleDateString('en-KE')}.`,
    type: 'success',
  });
  notificationService.send(studentId, {
    template: 'invoice',
    channels: ['inApp', 'email'],
    data: {
      planName: plan.name,
      amount: `KES ${(plan.price || 0).toLocaleString('en-KE')}`,
      invoiceDate: new Date().toLocaleDateString('en-KE'),
      name: student.name,
      invoiceNumber: payment?.invoiceNo || '',
    },
    priority: 'high',
  }).catch((err) => logger.error(MODULE, 'Renewal notification failed', { userId: studentId, error: err.message }));

  await log(`Renewed membership: ${plan.name} for ${student.name}`, req, studentId, { planId, planName: plan.name, amount: plan.price, invoiceNo: payment.invoiceNo });

  res.json({ success: true, membership: m, payment, invoiceNo: payment.invoiceNo });
});

// ── Membership upgrade (admin) ──────────────────────────────
export const upgradeMembership = asyncHandler(async (req, res) => {
  const { studentId, currentPlanId, targetPlanId } = req.body;
  if (!studentId || !targetPlanId) throw ApiError.badRequest('studentId and targetPlanId are required');

  const targetPlan = await Plan.findById(targetPlanId);
  if (!targetPlan) throw ApiError.notFound('Target plan not found');

  const student = await User.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  let m = await Membership.findOne({ user: studentId }).sort({ createdAt: -1 });
  if (!m) throw ApiError.notFound('No existing membership to upgrade');

  const currentPlan = currentPlanId ? await Plan.findById(currentPlanId) : null;

  const now = new Date();
  const newExpiry = new Date(now.getTime() + targetPlan.durationMonths * 30 * DAY);
  const additionalCost = targetPlan.price - (currentPlan?.price || 0);

  m.planType = targetPlan.name;
  m.planMonths = targetPlan.durationMonths;
  m.price = targetPlan.price;
  m.status = 'active';
  m.expiryDate = newExpiry;
  m.pauseDaysAllowed = targetPlan.pauseDays ?? m.pauseDaysAllowed;
  m.benefits = targetPlan.benefits;
  m.history.push({
    action: 'upgraded',
    planMonths: targetPlan.durationMonths,
    note: `Upgraded from ${currentPlan?.name || 'previous'} to ${targetPlan.name}`,
  });
  await m.save();

  await User.findByIdAndUpdate(studentId, { planMonths: targetPlan.durationMonths });

  const amount = additionalCost > 0 ? additionalCost : targetPlan.price;
  const paymentRepo = new PaymentRepository();
  const payment = await paymentRepo.createManualPayment({
    user: studentId,
    label: `${targetPlan.name} (Admin Upgrade from ${currentPlan?.name || 'previous'})`,
    amount: amount * 100,
    description: `Admin upgrade to ${targetPlan.name}`,
    adminId: req.user._id,
  });

    await Promise.all([
      notify(studentId, {
        title: 'Membership upgraded',
        message: `You're now on the ${targetPlan.name} plan.`,
        type: 'success',
      }),
      notificationService.send(studentId, {
        template: 'invoice',
        channels: ['inApp', 'email'],
        data: {
          planName: targetPlan.name,
          amount: `KES ${(amount || 0).toLocaleString('en-KE')}`,
          invoiceDate: new Date().toLocaleDateString('en-KE'),
          name: student.name,
          invoiceNumber: payment?.invoiceNo || '',
        },
        subject: 'Membership upgraded',
        message: `You're now on the <strong>${targetPlan.name}</strong> plan.`,
        priority: 'high',
      }).catch((err) => logger.error(MODULE, 'Upgrade notification failed', { userId: studentId, error: err.message })),
    ]);

  await log(`Upgraded membership to ${targetPlan.name} for ${student.name}`, req, studentId, {
    fromPlan: currentPlan?.name || 'unknown',
    toPlan: targetPlan.name,
    amount,
    invoiceNo: payment.invoiceNo,
  });

  res.json({ success: true, membership: m, payment, invoiceNo: payment.invoiceNo, additionalCost });
});

// ── Payments ─────────────────────────────────────────────────
export const getPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find().populate('user', 'name email').sort({ createdAt: -1 });
  res.json(payments);
});

export const createPayment = asyncHandler(async (req, res) => {
  const { user, label, amount, receiptUrl } = req.body;
  if (!user || !label || amount == null) throw ApiError.badRequest('user, label and amount are required');
  const paymentRepo = new PaymentRepository();
  const p = await paymentRepo.createManualPayment({
    user,
    label,
    amount: Math.round(Number(amount) * 100),
    description: `Admin payment record: ${label}`,
    adminId: req.user._id,
    receiptUrl: receiptUrl || '',
  });
  await log(`Recorded manual payment KES ${amount} for ${user}`, req, user, { paymentId: p._id });

  notificationService.send(user, {
    template: 'invoice',
    channels: ['inApp', 'email'],
    data: {
      planName: label,
      amount: `KES ${Number(amount).toLocaleString('en-KE')}`,
      invoiceDate: new Date().toLocaleDateString('en-KE'),
      invoiceNumber: p.invoiceNo || '',
    },
    priority: 'high',
  }).catch((err) => logger.error(MODULE, 'Invoice email failed for payment', { paymentId: p._id, error: err.message }));

  res.status(201).json(p);
});

export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = PAYMENT_STATUSES.filter(s => s !== 'initiated' && s !== 'expired');
  if (!validStatuses.includes(status)) throw ApiError.badRequest(`Invalid status. Valid: ${validStatuses.join(', ')}`);

  const paymentRepo = new PaymentRepository();
  const current = await Payment.findById(req.params.id).select('paymentStatus lockVersion').lean();
  if (!current) throw ApiError.notFound('Payment not found');

  // Use updatePaymentStatus with the current status as a concurrency guard.
  const p = await paymentRepo.updatePaymentStatus(req.params.id, status, current.paymentStatus);
  if (!p) {
    throw ApiError.conflict(
      `Payment status was "${current.paymentStatus}" but a concurrent change occurred. Reload and retry.`,
    );
  }
  await paymentRepo.addAuditEntry(req.params.id, {
    action: 'status_update_by_admin',
    from: current.paymentStatus,
    to: status,
    by: req.user._id,
    reason: `Admin changed status to ${status}`,
  });
  await log(`Updated payment ${req.params.id} status to ${status}`, req, p.user, { paymentId: req.params.id, newStatus: status });
  res.json(p);
});

// ── Enrollment Progress ─────────────────────────────────────
export const getEnrollmentProgress = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const [membership, userServices, trial] = await Promise.all([
    Membership.findOne({ user: studentId }).sort({ createdAt: -1 }),
    UserService.find({ user: studentId }).sort({ createdAt: -1 }),
    FreeTrial.findOne({ user: studentId }).sort({ createdAt: -1 }),
  ]);

  const result = {};

  if (membership) {
    result.membership = {
      _id: membership._id,
      planType: membership.planType,
      planMonths: membership.planMonths,
      status: membership.status,
      startDate: membership.startDate,
      expiryDate: membership.expiryDate,
      daysLeft: membership.daysLeft,
      totalSessions: membership.totalSessions,
      completedSessions: membership.completedSessions,
      remainingSessions: membership.remainingSessions,
      sessionsProgressPct: membership.sessionsProgressPct,
      sessionHistory: (membership.sessionHistory || []).slice(-20).reverse(),
    };
  }

  if (userServices.length > 0) {
    result.services = userServices.map(us => ({
      _id: us._id,
      serviceName: us.serviceName,
      category: us.category,
      mode: us.mode,
      status: us.status,
      totalSessions: us.totalSessions,
      usedSessions: us.usedSessions,
      remainingSessions: us.remainingSessions,
      sessionsProgressPct: us.totalSessions > 0 ? Math.min(100, Math.round((us.usedSessions / us.totalSessions) * 100)) : 0,
      daysLeft: us.daysLeft,
      expiryDate: us.expiryDate,
      isActive: us.isActive,
    }));
  }

  if (trial) {
    result.trial = {
      _id: trial._id,
      status: trial.status,
      maxSessions: trial.maxSessions,
      completedSessions: trial.completedSessions,
      sessionsLeft: trial.sessionsLeft,
      sessionsProgressPct: trial.sessionsProgressPct,
      daysLeft: trial.daysLeft,
    };
  }

  // Include linked attendance records for context
  const attendances = await Attendance.find({ user: studentId })
    .sort({ date: -1 })
    .limit(50);
  result.attendanceHistory = attendances.map(a => ({
    _id: a._id,
    date: a.date,
    status: a.status,
    classType: a.classType,
    mode: a.mode,
    entityType: a.entityType,
    entityId: a.entityId,
    invitation: a.invitation,
  }));

  res.json(result);
});

export const markAttendance = asyncHandler(async (req, res) => {
  const { user, date, status, mode, classType, session, invitation, entityType, entityId } = req.body;
  if (!user || !date || !status) throw ApiError.badRequest('user, date and status are required');

  const result = await markAttendanceAtomic({
    user, date, status,
    mode: mode || 'offline',
    classType: classType || 'General',
    session: session || null,
    invitation: invitation || null,
    entityType: entityType || 'none',
    entityId: entityId || null,
    adminId: req.user._id,
  });

  await log(`Marked ${status} for ${user} on ${new Date(date).toDateString()} — cascaded: ${result.updates.join(', ') || 'none'}`, req, user);
  res.json(result.attendance);
});

export const getStudentAttendance = asyncHandler(async (req, res) => {
  const records = await Attendance.find({ user: req.params.id }).sort({ date: -1 });
  res.json(records);
});

export const getStudentLogs = asyncHandler(async (req, res) => {
  const logs = await ActivityLog.find({ targetUser: req.params.id }).sort({ createdAt: -1 }).limit(50);
  res.json(logs);
});

// ── Generic CRUD factory for simple collections ──────────────
function crud(Model, label, allowedFields = []) {
  function pick(body) {
    if (!allowedFields.length) return body;
    const picked = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) picked[key] = body[key];
    }
    return picked;
  }
  return {
    list: asyncHandler(async (req, res) => res.json(await Model.find().sort({ createdAt: -1 }))),
    create: asyncHandler(async (req, res) => {
      const doc = await Model.create(pick(req.body));
      await log(`Created ${label}`, req, null, { id: doc._id });
      res.status(201).json(doc);
    }),
    update: asyncHandler(async (req, res) => {
      const doc = await Model.findByIdAndUpdate(req.params.id, { $set: pick(req.body) }, { returnDocument: 'after', runValidators: true });
      if (!doc) throw ApiError.notFound(`${label} not found`);
      res.json(doc);
    }),
    remove: asyncHandler(async (req, res) => {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) throw ApiError.notFound(`${label} not found`);
      await log(`Deleted ${label}`, req, null, { id: req.params.id });
      res.json({ success: true });
    }),
  };
}

export const classes = crud(ClassSession, 'class', [
  'name', 'time', 'date', 'mode', 'trainer', 'zoomUrl', 'batch',
  'capacity', 'status', 'recordingUrl',
]);

// ── Workshops (admin) ───────────────────────────────────────────
export const adminGetWorkshops = asyncHandler(async (req, res) => {
  const workshops = await Workshop.find().sort({ createdAt: -1 });
  res.json(workshops);
});

export const adminCreateWorkshop = asyncHandler(async (req, res) => {
  const {
    name, date, startTime, endTime, duration, price, capacity, instructor,
    description, zoomLink, image, registrationDeadline, isPaid,
    allowedPlans, isPublished, status,
  } = req.body;
  if (!name || !date) throw ApiError.badRequest('Name and date are required');

  const wk = await Workshop.create({
    name, date: new Date(date), startTime, endTime, duration,
    price: price ?? 0, capacity: capacity ?? 50, instructor, description,
    zoomLink, image, registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
    isPaid: isPaid ?? false,
    allowedPlans: allowedPlans || [],
    isPublished: isPublished ?? false,
    publishedAt: isPublished ? new Date() : null,
    status: status || 'available',
  });

  await log(`Created workshop: ${wk.name}`, req);

  // If published immediately, notify eligible plan members
  if (wk.isPublished && wk.allowedPlans.length > 0) {
    await notifyPlanMembers(wk.allowedPlans, {
      title: 'New Workshop Available',
      message: `"${wk.name}" – Enroll Now.`,
      type: 'workshop',
      workshop: wk._id,
    });
  }

  res.status(201).json(wk);
});

export const adminUpdateWorkshop = asyncHandler(async (req, res) => {
  const wk = await Workshop.findById(req.params.id);
  if (!wk) throw ApiError.notFound('Workshop not found');

  const allowed = [
    'name', 'date', 'startTime', 'endTime', 'duration', 'price', 'capacity',
    'instructor', 'description', 'zoomLink', 'image', 'registrationDeadline',
    'isPaid', 'allowedPlans', 'isPublished', 'status', 'archived',
  ];
  const wasPublished = wk.isPublished;
  const prevPlans = [...wk.allowedPlans];

  for (const f of allowed) {
    if (req.body[f] !== undefined) {
      if (f === 'date' || f === 'registrationDeadline') {
        wk[f] = req.body[f] ? new Date(req.body[f]) : null;
      } else {
        wk[f] = req.body[f];
      }
    }
  }

  await wk.save();
  await log(`Updated workshop: ${wk.name}`, req);

  // If newly published (or plans changed while published), notify eligible members
  const justPublished = !wasPublished && wk.isPublished;
  if (justPublished) wk.publishedAt = new Date();
  const plansChanged = wk.isPublished && JSON.stringify(prevPlans) !== JSON.stringify(wk.allowedPlans);
  if ((justPublished || plansChanged) && wk.allowedPlans.length > 0) {
    await notifyPlanMembers(wk.allowedPlans, {
      title: 'New Workshop Available',
      message: `"${wk.name}" – Enroll Now.`,
      type: 'workshop',
      workshop: wk._id,
    });
  }

  res.json(wk);
});

export const adminDeleteWorkshop = asyncHandler(async (req, res) => {
  const wk = await Workshop.findByIdAndDelete(req.params.id);
  if (!wk) throw ApiError.notFound('Workshop not found');
  await log(`Deleted workshop: ${wk.name}`, req);
  res.json({ success: true });
});

export const adminTogglePublish = asyncHandler(async (req, res) => {
  const wk = await Workshop.findById(req.params.id);
  if (!wk) throw ApiError.notFound('Workshop not found');
  if (wk.isPublished) throw ApiError.badRequest('Workshop is already published');

  wk.isPublished = true;
  wk.publishedAt = new Date();
  await wk.save();

  if (wk.allowedPlans.length > 0) {
    await notifyPlanMembers(wk.allowedPlans, {
      title: 'New Workshop Available',
      message: `"${wk.name}" – Enroll Now.`,
      type: 'workshop',
      workshop: wk._id,
    });
  }

  await log(`Published workshop: ${wk.name}`, req);
  res.json(wk);
});

export const adminToggleArchive = asyncHandler(async (req, res) => {
  const wk = await Workshop.findById(req.params.id);
  if (!wk) throw ApiError.notFound('Workshop not found');
  wk.archived = !wk.archived;
  await wk.save();
  await log(`${wk.archived ? 'Archived' : 'Unarchived'} workshop: ${wk.name}`, req);
  res.json(wk);
});

export const adminGetWorkshopStats = asyncHandler(async (req, res) => {
  const wk = await Workshop.findById(req.params.id).populate('registrations.user', 'name email phone');
  if (!wk) throw ApiError.notFound('Workshop not found');

  const totalRegistrations = wk.registrations.length;
  const paidRegistrations = wk.registrations.filter((r) => r.paid).length;
  const remainingSeats = Math.max(0, wk.capacity - totalRegistrations);
  const enrollmentPct = wk.capacity > 0 ? Math.round((totalRegistrations / wk.capacity) * 100) : 0;
  const totalRevenue = wk.isPaid ? (wk.price || 0) * totalRegistrations : 0;

  // For each registered student, find their membership plan info
  const studentIds = wk.registrations.filter((r) => r.user).map((r) => r.user._id);
  const memberships = await Membership.find({ user: { $in: studentIds } }).sort({ createdAt: -1 }).lean();
  const membershipByUser = {};
  for (const m of memberships) {
    if (!membershipByUser[m.user.toString()]) {
      membershipByUser[m.user.toString()] = m;
    }
  }

  // Build enriched registrations with membership info
  const enrichedRegistrations = wk.registrations.map((reg) => {
    const user = reg.user;
    const membership = user ? membershipByUser[user._id?.toString()] : null;
    return {
      _id: reg._id,
      user: user ? { _id: user._id, name: user.name, email: user.email, phone: user.phone } : null,
      paid: reg.paid,
      attended: reg.attended,
      at: reg.at,
      planType: membership?.planType || reg.planType || '—',
      planMonths: membership?.planMonths || reg.planMonths || 0,
      planStatus: membership?.status || '—',
    };
  });

  // Activity timeline: key events for this workshop
  const activityTimeline = [
    { event: 'Workshop Created', date: wk.createdAt },
    ...(wk.isPublished ? [{ event: 'Workshop Published', date: wk.publishedAt || wk.updatedAt }] : []),
    ...(totalRegistrations > 0 ? [{ event: 'First Registration', date: wk.registrations[0]?.at }] : []),
    ...(totalRegistrations > 1
      ? [{ event: `${totalRegistrations} total registrations reached`, date: wk.registrations[totalRegistrations - 1]?.at }]
      : []),
  ];

  const now = new Date();
  const workshopPassed = new Date(wk.date) < now;

  res.json({
    workshop: {
      _id: wk._id,
      name: wk.name,
      description: wk.description,
      date: wk.date,
      startTime: wk.startTime,
      endTime: wk.endTime,
      duration: wk.duration,
      instructor: wk.instructor,
      zoomLink: wk.zoomLink,
      image: wk.image,
      capacity: wk.capacity,
      price: wk.price,
      isPaid: wk.isPaid,
      registrationDeadline: wk.registrationDeadline,
      allowedPlans: wk.allowedPlans,
      isPublished: wk.isPublished,
      publishedAt: wk.publishedAt,
      archived: wk.archived,
      status: wk.status,
      createdAt: wk.createdAt,
      updatedAt: wk.updatedAt,
    },
    stats: {
      totalRegistrations,
      paidRegistrations,
      remainingSeats,
      enrollmentPct,
      totalRevenue,
      eligiblePlans: wk.allowedPlans,
      workshopPassed,
    },
    registrations: enrichedRegistrations,
    activityTimeline,
  });
});

export const adminGetWorkshopRegistrations = asyncHandler(async (req, res) => {
  const wk = await Workshop.findById(req.params.id).populate('registrations.user', 'name email phone city');
  if (!wk) throw ApiError.notFound('Workshop not found');
  res.json(wk.registrations);
});

export const adminMarkAttendance = asyncHandler(async (req, res) => {
  const { registrationId, attended } = req.body;
  const wk = await Workshop.findById(req.params.id);
  if (!wk) throw ApiError.notFound('Workshop not found');

  const reg = wk.registrations.id(registrationId);
  if (!reg) throw ApiError.notFound('Registration not found');
  reg.attended = attended ?? false;
  await wk.save();
  res.json({ success: true });
});

export const downloads = crud(Download, 'download');
export const courses = crud(Course, 'course', [
  'title', 'duration', 'mode', 'price', 'description', 'active',
  'hours', 'earlyPrice', 'earlyCutoffDate', 'earlyCap', 'earlyEnrolled',
  'installmentsAllowed', 'installmentsConfig', 'category', 'currency',
]);
export const plans = crud(Plan, 'plan', [
  'name', 'description', 'price', 'currency', 'durationMonths', 'durationUnit',
  'pauseDays', 'benefits', 'features', 'membershipAccess', 'displayOrder',
  'isPopular', 'isRecommended', 'active', 'visibility', 'badge',
  'tier', 'tierLabel', 'isSoma', 'somaCategory', 'allowances',
  'foundingMonthly', 'termPricing', 'originalPrice',
]);
export const coupons = crud(Coupon, 'coupon', [
  'code', 'discountType', 'value', 'isReferral', 'active', 'usageCount', 'expiresAt',
]);
// ── Services (admin) ────────────────────────────────────────────
export const getAllServices = asyncHandler(async (req, res) => {
  const svcs = await Service.find()
    .populate('instructor', 'name avatar')
    .populate('instructors', 'name avatar')
    .sort({ displayOrder: 1, name: 1 });
  res.json(svcs);
});

export const createService = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'description', 'mode', 'category', 'type', 'price', 'pricingModel', 'totalSessions', 'sessionDuration', 'validityDuration', 'validityUnit', 'scheduleDays', 'scheduleTime', 'timeSlots', 'active', 'isPopular', 'displayOrder', 'contactEmail'];
  const data = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }
  const doc = await Service.create(data);
  await log(`Created service`, req, null, { id: doc._id });
  res.status(201).json(doc);
});

export const updateService = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'description', 'mode', 'category', 'type', 'price', 'pricingModel', 'totalSessions', 'sessionDuration', 'validityDuration', 'validityUnit', 'scheduleDays', 'scheduleTime', 'timeSlots', 'active', 'isPopular', 'displayOrder', 'contactEmail'];
  const updates = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const doc = await Service.findByIdAndUpdate(req.params.id, { $set: updates }, { returnDocument: 'after', runValidators: true });
  if (!doc) throw ApiError.notFound('Service not found');
  res.json(doc);
});

export const removeService = asyncHandler(async (req, res) => {
  const doc = await Service.findByIdAndDelete(req.params.id);
  if (!doc) throw ApiError.notFound('Service not found');
  await log(`Deleted service`, req, null, { id: req.params.id });
  res.json({ success: true });
});

export const syncOfficialServices = asyncHandler(async (req, res) => {
  const PRANAYAMA_MEDITATION = 'Pranayama & Meditation';
  const YOGA_AT_HOME = 'Yoga at Home';
  await Service.deleteMany({ name: { $in: [PRANAYAMA_MEDITATION, YOGA_AT_HOME] } });

  await UserService.updateMany(
    { serviceName: 'Yoga at Home' },
    { $set: { serviceName: 'Personal Yoga (Home)' } }
  );

  const OFFICIAL_SERVICES = [
    { name: 'Offline Group Yoga', description: 'Community sessions in studio to enhance motivation.', mode: 'center', category: 'Group', type: 'Hatha', price: 2500, pricingModel: 'monthly', totalSessions: 0, sessionDuration: 60, scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], scheduleTime: '7:00 AM – 8:00 AM, 8:00 AM – 9:00 AM, 5:00 PM – 6:00 PM', timeSlots: [{ day: 'Monday – Friday', time: '7:00 AM – 8:00 AM', label: 'Neha' }, { day: 'Monday – Friday', time: '8:00 AM – 9:00 AM', label: 'Varsha' }, { day: 'Monday – Friday', time: '5:00 PM – 6:00 PM', label: 'Vinod' }], active: true, isPopular: true, displayOrder: 1 },
    { name: 'Online Group Yoga', description: 'Holistic online practice for fitness & clarity.', mode: 'online', category: 'Group', type: 'Vinyasa', price: 1500, pricingModel: 'monthly', totalSessions: 0, sessionDuration: 60, scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], scheduleTime: '9:00 AM – 10:00 AM, 11:30 AM – 12:30 PM IST', timeSlots: [{ day: 'Monday – Friday', time: '9:00 AM – 10:00 AM', label: 'Dr. Kapil' }, { day: 'Monday – Friday', time: '11:30 AM – 12:30 PM IST', label: 'Shreya' }], active: true, isPopular: true, displayOrder: 2 },
    { name: 'Personal Yoga (Center)', description: 'Tailored one-on-one sessions at our center for your personal goals. Includes 20 sessions within one month.', mode: 'center', category: 'Personal', type: 'Iyengar', price: 10000, pricingModel: 'monthly', totalSessions: 20, sessionDuration: 60, validityDuration: 1, validityUnit: 'months', scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 3 },
    { name: 'Personal Yoga (Home)', description: 'Personalized instruction at your home for maximum convenience. Includes 20 sessions within one month.', mode: 'home', category: 'Personal', type: 'Hatha', price: 12000, pricingModel: 'monthly', totalSessions: 20, sessionDuration: 60, validityDuration: 1, validityUnit: 'months', scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 4 },
    { name: 'Kids Yoga', description: 'Fun & engaging classes for children\'s well-being.', mode: 'center', category: 'Group', type: 'Vinyasa', price: 1500, pricingModel: 'monthly', totalSessions: 15, sessionDuration: 45, scheduleDays: [], scheduleTime: 'As per batch assignment', active: true, isPopular: false, displayOrder: 5 },
    { name: 'Pregnancy Yoga (Center)', description: 'Safe practices for expectant mothers at our center. Includes 20 sessions within one month.', mode: 'center', category: 'Specialty', type: 'Therapy', price: 10000, pricingModel: 'monthly', totalSessions: 20, sessionDuration: 60, validityDuration: 1, validityUnit: 'months', scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 6 },
    { name: 'Pregnancy Yoga (Home)', description: 'Safe prenatal yoga practices in the comfort of your home. Includes 20 sessions within one month.', mode: 'home', category: 'Specialty', type: 'Therapy', price: 12000, pricingModel: 'monthly', totalSessions: 20, sessionDuration: 60, validityDuration: 1, validityUnit: 'months', scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 7 },
    { name: 'Yoga for Stress', description: 'Targeted sessions for stress relief and mental wellness.', mode: 'online', category: 'Specialty', type: 'Therapy', price: 1000, pricingModel: 'monthly', totalSessions: 12, sessionDuration: 30, scheduleDays: ['Monday', 'Wednesday', 'Friday'], scheduleTime: '7:30 AM – 8:00 AM', timeSlots: [{ day: 'Monday', time: '7:30 AM – 8:00 AM', label: 'Dr. Kapil' }, { day: 'Wednesday', time: '7:30 AM – 8:00 AM', label: 'Dr. Kapil' }, { day: 'Friday', time: '7:30 AM – 8:00 AM', label: 'Dr. Kapil' }], active: true, isPopular: false, displayOrder: 8 },
    { name: 'Corporate Yoga', description: 'Customized workplace wellness programs for your organization. Pricing depends on number of employees.', mode: 'hybrid', category: 'Corporate', type: 'Hatha', price: 0, pricingModel: 'contact', contactEmail: 'hello@somawellness.in', totalSessions: 0, sessionDuration: 60, scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 9 },
    { name: 'Advanced Yoga (Center)', description: 'Advanced asanas and intensive practice for experienced yogis.', mode: 'center', category: 'Group', type: 'Advanced', price: 5000, pricingModel: 'monthly', totalSessions: 20, sessionDuration: 60, scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], scheduleTime: '11:30 AM – 12:30 PM IST', timeSlots: [{ day: 'Monday – Friday', time: '11:30 AM – 12:30 PM IST', label: 'Vinod' }], active: true, isPopular: false, displayOrder: 10 },
    { name: 'Therapy Yoga (Center)', description: 'Therapeutic yoga practices for healing and recovery at our center. Includes 20 sessions within one month.', mode: 'center', category: 'Specialty', type: 'Therapy', price: 12000, pricingModel: 'monthly', totalSessions: 20, sessionDuration: 60, validityDuration: 1, validityUnit: 'months', scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 11 },
    { name: 'Therapy Yoga (Home)', description: 'Therapeutic yoga sessions in the comfort of your home. Includes 20 sessions within one month.', mode: 'home', category: 'Specialty', type: 'Therapy', price: 15000, pricingModel: 'monthly', totalSessions: 20, sessionDuration: 60, validityDuration: 1, validityUnit: 'months', scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 12 },
    { name: 'Abhyanga (Ayurvedic Massage)', description: 'Traditional Ayurvedic full-body oil massage for rejuvenation.', mode: 'center', category: 'Therapy', type: 'Ayurveda', price: 1200, pricingModel: 'per_session', totalSessions: 0, sessionDuration: 60, scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 13 },
    { name: 'Shirodhara (Forehead Oil-Pulling Therapy)', description: 'Gentle pouring of warm oil on the forehead for deep relaxation.', mode: 'center', category: 'Therapy', type: 'Ayurveda', price: 1800, pricingModel: 'per_session', totalSessions: 0, sessionDuration: 60, scheduleDays: [], scheduleTime: 'Flexible', active: true, isPopular: false, displayOrder: 14 },
  ];

  const results = [];
  for (const svc of OFFICIAL_SERVICES) {
    const doc = await Service.findOneAndUpdate(
      { name: svc.name },
      { $set: svc },
      { upsert: true, returnDocument: 'after' }
    );
    results.push(doc);
  }
  await log(`Synced official services`, req);
  res.json({ success: true, count: results.length });
});

export const instructors = crud(Instructor, 'instructor', [
  'name', 'email', 'phone', 'avatar', 'bio', 'specialties', 'active',
]);

// ── Membership Plans Migration (force-sync official offerings) ──
const OFFICIAL_PLANS = [
  { name: '1 Month Membership', description: 'Perfect for beginners to start their yoga journey with essential studio access.', price: 1500, durationMonths: 1, pauseDays: 0, displayOrder: 1, benefits: ['Unlimited Yoga Classes', 'Community Support'], badge: '', isPopular: false, isRecommended: false },
  { name: '3 Month Membership', description: 'Build a consistent practice with added flexibility to pause when needed.', price: 4000, durationMonths: 3, pauseDays: 15, displayOrder: 2, benefits: ['Unlimited Yoga Classes', 'Community Support', 'Membership Pause up to 15 Days'], badge: 'Recommended', isPopular: false, isRecommended: true },
  { name: '6 Month Membership', description: 'Our most popular plan with premium content access and a free personal consultation.', price: 7000, durationMonths: 6, pauseDays: 30, displayOrder: 3, benefits: ['Unlimited Yoga Classes', 'Premium Content Access', 'Free 1 Personal Consultation', 'Membership Pause up to 30 Days'], badge: 'Most Popular', isPopular: true, isRecommended: false },
  { name: '12 Month Membership', description: 'The ultimate commitment to your wellness journey with maximum benefits.', price: 12000, durationMonths: 12, pauseDays: 60, displayOrder: 4, benefits: ['Unlimited Yoga Classes', 'Premium Content Access', 'Workshops Included', 'Free Personal Consultation', 'Free Diet Consultation', 'Membership Pause up to 60 Days'], badge: 'Best Value', isPopular: false, isRecommended: false },
];

export const syncOfficialPlans = asyncHandler(async (req, res) => {
  const OLD_DEMO_NAMES = ['Monthly Pass', 'Quarterly Pass', 'Half-Yearly Pass', 'Annual Pass', '2-Year Pass'];
  await Plan.deleteMany({ name: { $in: OLD_DEMO_NAMES } });

  for (const plan of OFFICIAL_PLANS) {
    await Plan.findOneAndUpdate(
      { name: plan.name },
      { $set: plan },
      { upsert: true, new: true }
    );
  }

  const updated = await Plan.find().sort({ displayOrder: 1 });
  await log(`Synced official membership plans (${updated.length} plans)`, req);
  res.json({ success: true, message: `${updated.length} official plans synced`, plans: updated });
});


// ── Service Assignments ─────────────────────────────────────────
export const getServiceAssignments = asyncHandler(async (req, res) => {
  const { search, status, serviceId } = req.query;
  const q = {};
  if (status) q.status = status;
  if (serviceId) q.service = serviceId;
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({ role: 'student', $or: [{ name: new RegExp(safe, 'i') }, { email: new RegExp(safe, 'i') }] }).select('_id');
    q.user = { $in: users.map((u) => u._id) };
  }
  const assignments = await UserService.find(q)
    .populate('user', 'name email phone')
    .populate('service', 'name')
    .populate('instructor', 'name')
    .populate('payment', 'amount status method invoiceNo')
    .sort({ createdAt: -1 });
  res.json(assignments);
});

export const getServiceAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();
  const [totalAssignments, activeAssignments, expiredAssignments, revenueAgg, byService, expiringSoonCount] = await Promise.all([
    UserService.countDocuments(),
    UserService.countDocuments({ status: 'active' }),
    UserService.countDocuments({ status: 'expired' }),
    UserService.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]),
    UserService.aggregate([
      { $group: { _id: '$serviceName', count: { $sum: 1 }, revenue: { $sum: '$price' } } },
      { $sort: { count: -1 } },
    ]),
    UserService.countDocuments({
      status: 'active',
      expiryDate: { $gte: now, $lte: new Date(now.getTime() + 14 * DAY) },
    }),
  ]);
  res.json({
    totalEnrollments: totalAssignments,
    activeEnrollments: activeAssignments,
    expiredEnrollments: expiredAssignments,
    totalRevenue: revenueAgg[0]?.total || 0,
    expiringSoon: expiringSoonCount,
    topServices: byService.slice(0, 10),
  });
});

export const assignService = asyncHandler(async (req, res) => {
  const { studentId, serviceId, price, paymentStatus, transactionId, expiryDate } = req.body;
  if (!studentId || !serviceId) throw ApiError.badRequest('studentId and serviceId are required');

  const service = await Service.findById(serviceId).populate('instructor', 'name');
  if (!service) throw ApiError.notFound('Service not found');
  const student = await User.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  const us = await purchaseService(studentId, serviceId, {
    price: price ?? service.price ?? 0,
    paymentStatus: paymentStatus || 'paid',
    transactionId: transactionId || '',
    expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    performedBy: req.user._id,
    receiptUrl: req.body?.receiptUrl || '',
  });

  await log(`Assigned service "${service.name}" to ${student.name}`, req, studentId, {
    serviceId, serviceName: service.name, amount: price ?? service.price ?? 0, userServiceId: us._id,
  });

  res.status(201).json({ success: true, userService: us });
});

export const updateUserService = asyncHandler(async (req, res) => {
  const allowed = ['status', 'usedSessions', 'paymentStatus', 'expiryDate', 'totalSessions'];
  const updates = {};
  for (const f of allowed) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  const us = await UserService.findByIdAndUpdate(req.params.id, { $set: updates }, { returnDocument: 'after' });
  if (!us) throw ApiError.notFound('Service enrollment not found');

  if (updates.paymentStatus === 'paid' && !us.payment) {
    const paymentRepo = new PaymentRepository();
    const payment = await paymentRepo.createManualPayment({
      user: us.user,
      label: `${us.serviceName} (Admin Status Update)`,
      amount: us.price * 100,
      description: `Auto-created when admin set paymentStatus to 'paid' on enrollment ${us._id}`,
      adminId: req.user._id,
    });
    us.payment = payment._id;
    await us.save();
    await log(`Updated service enrollment ${req.params.id}: set paymentStatus to paid, created manual payment ${payment._id}`, req, us.user);
  } else {
    await log(`Updated service enrollment ${req.params.id}`, req, us.user);
  }

  res.json(us);
});

export const renewUserServiceAdmin = asyncHandler(async (req, res) => {
  const us = await renewUserService(req.params.id, {
    price: req.body?.price,
    performedBy: req.user._id,
    receiptUrl: req.body?.receiptUrl || '',
  });
  await log(`Renewed service enrollment ${req.params.id}`, req);
  res.json({ success: true, userService: us });
});

export const deleteUserService = asyncHandler(async (req, res) => {
  const us = await UserService.findByIdAndDelete(req.params.id);
  if (!us) throw ApiError.notFound('Service enrollment not found');
  if (us.payment) {
    await Payment.findByIdAndDelete(us.payment);
  }
  await log(`Deleted service enrollment ${req.params.id}`, req);
  res.json({ success: true });
});

// ── Consultations (admin) ────────────────────────────────────
export const getConsultations = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const q = {};
  if (status) q.status = status;
  if (search) {
    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({ role: 'student', $or: [{ name: new RegExp(safeSearch, 'i') }, { email: new RegExp(safeSearch, 'i') }] }).select('_id');
    q.user = { $in: users.map((u) => u._id) };
  }
  const consultations = await Consultation.find(q)
    .populate('user', 'name email phone')
    .populate('paymentRef', 'amount status method invoiceNo')
    .sort({ date: -1 });
  res.json(consultations);
});

export const getConsultationAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();
  const [total, upcoming, completed, cancelled, paidAgg] = await Promise.all([
    Consultation.countDocuments(),
    Consultation.countDocuments({ status: 'upcoming', date: { $gte: now } }),
    Consultation.countDocuments({ status: 'completed' }),
    Consultation.countDocuments({ status: 'cancelled' }),
    Consultation.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } },
    ]),
  ]);
  res.json({
    total,
    upcoming,
    completed,
    cancelled,
    revenue: paidAgg[0]?.total || 0,
    paidCount: paidAgg[0]?.count || 0,
  });
});

export const updateConsultation = asyncHandler(async (req, res) => {
  const allowed = ['status', 'meetingLink', 'notes', 'doctor', 'date', 'timeSlot', 'assignedGuru', 'adminNotes', 'topic', 'duration'];
  const updates = {};
  for (const f of allowed) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  if (updates.date) updates.date = new Date(updates.date);
  const c = await Consultation.findByIdAndUpdate(req.params.id, { $set: updates }, { returnDocument: 'after' });
  if (!c) throw ApiError.notFound('Consultation not found');

  if (c.status === 'completed' && c.user && c.paymentRef) {
    await notify(c.user, { title: 'Consultation completed', message: `Your consultation on ${c.date?.toLocaleDateString('en-KE')} has been marked as completed.`, type: 'success' });
  }

  res.json(c);
});

// ── Time Slot Management ────────────────────────────────────
export const getTimeSlots = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const q = {};
  if (date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    q.date = { $gte: dayStart, $lte: dayEnd };
  }
  const slots = await TimeSlot.find(q).sort({ date: 1, time: 1 });
  res.json(slots);
});

export const createTimeSlot = asyncHandler(async (req, res) => {
  const { date, time } = req.body;
  if (!date || !time) throw ApiError.badRequest('Date and time are required');
  const existing = await TimeSlot.findOne({ date: new Date(date), time });
  if (existing) throw ApiError.conflict('This time slot already exists');
  const slot = await TimeSlot.create({ date: new Date(date), time });
  res.status(201).json(slot);
});

export const createTimeSlots = asyncHandler(async (req, res) => {
  const { date, times } = req.body;
  if (!date || !times || !Array.isArray(times) || times.length === 0) {
    throw ApiError.badRequest('Date and times array are required');
  }
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  const existing = await TimeSlot.find({ date: { $gte: dayStart, $lte: dayEnd } }).lean();
  const existingTimes = new Set(existing.map((s) => s.time));
  const toCreate = times.filter((t) => !existingTimes.has(t));
  if (toCreate.length === 0) throw ApiError.conflict('All specified time slots already exist for this date');
  const docs = toCreate.map((time) => ({ date: new Date(date), time }));
  const created = await TimeSlot.insertMany(docs);
  await log(`Created ${created.length} time slots for ${date}`, req);
  res.status(201).json(created);
});

export const updateTimeSlot = asyncHandler(async (req, res) => {
  const { time, isActive } = req.body;
  const updates = {};
  if (time !== undefined) updates.time = time;
  if (isActive !== undefined) updates.isActive = isActive;
  const slot = await TimeSlot.findByIdAndUpdate(req.params.id, { $set: updates }, { returnDocument: 'after', runValidators: true });
  if (!slot) throw ApiError.notFound('Time slot not found');
  res.json(slot);
});

export const deleteTimeSlot = asyncHandler(async (req, res) => {
  const slot = await TimeSlot.findByIdAndDelete(req.params.id);
  if (!slot) throw ApiError.notFound('Time slot not found');
  res.json({ success: true });
});

// ── Notifications (admin broadcast) ──────────────────────────
export const listNotifications = asyncHandler(async (req, res) => {
  res.json(await Notification.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(200));
});

// Strip dangerous HTML tags from admin input to prevent XSS in email clients
function sanitizeHtml(input) {
  if (typeof input !== 'string') return '';
  return purify.sanitize(input, { ALLOWED_TAGS: [] });
}

export const broadcastNotification = asyncHandler(async (req, res) => {
  const { title, message, channels, segment } = req.body;
  if (!message) throw ApiError.badRequest('Message is required');
  const safeMessage = sanitizeHtml(message);
  const safeTitle = sanitizeHtml(title || '');
  const chans = channels?.length ? channels : ['inApp'];

  // Build the audience list.
  let targetUserIds = [];
  if (!segment || segment === 'All') {
    const allStudents = await User.find({ role: 'student', status: 'active' }).select('_id').lean();
    targetUserIds = allStudents.map((u) => u._id);
  } else if (segment === 'Expired') {
    targetUserIds = await Membership.find({ expiryDate: { $lte: new Date() } }).distinct('user');
  }

  if (targetUserIds.length === 0) {
    await log('Broadcast notification — no recipients', req);
    return res.status(200).json({ success: true, sent: 0 });
  }

  // Send via NotificationService for proper channel delivery + logging.
  let sentCount = 0;
  for (const userId of targetUserIds) {
    try {
      await notificationService.send(userId, {
        template: 'newsletter',
        channels: chans,
        data: { title: safeTitle, message: safeMessage },
        subject: safeTitle || 'Announcement',
        title: safeTitle || 'Announcement',
        message: safeMessage,
        richMessage: safeMessage,
        priority: 'normal',
      });
      sentCount++;
    } catch (err) {
      logger.error(MODULE, 'Failed to send broadcast to user', { userId, error: err.message });
    }
  }

  await log(`Broadcast to ${segment || 'All'} (${sentCount} users)`, req);
  res.status(201).json({ success: true, sent: sentCount });
});

// ── Settings ─────────────────────────────────────────────────
export const getSettings = asyncHandler(async (req, res) => res.json(await Settings.getSingleton()));
export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  const { announcementBanner, studioName, supportEmail, supportPhone, integrations } = req.body;
  if (announcementBanner !== undefined) settings.announcementBanner = announcementBanner;
  if (studioName !== undefined) settings.studioName = studioName;
  if (supportEmail !== undefined) settings.supportEmail = supportEmail;
  if (supportPhone !== undefined) settings.supportPhone = supportPhone;
  if (integrations) settings.integrations = { ...settings.integrations.toObject(), ...integrations };
  await settings.save();
  res.json(settings);
});

// ── Activity logs ────────────────────────────────────────────
export const getLogs = asyncHandler(async (req, res) => {
  const logs = await ActivityLog.find()
    .populate('performedBy', 'name email')
    .populate('targetUser', 'name email')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(logs);
});

// ── Attendance Management ────────────────────────────────────
export const getAttendanceOverview = asyncHandler(async (req, res) => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const [totalAttendance, completedAttendance, todayAttendance, totalInvites] = await Promise.all([
    Attendance.countDocuments(),
    Attendance.countDocuments({ status: { $in: ['present', 'zoom', 'late'] } }),
    Attendance.find({ date: { $gte: todayStart, $lte: todayEnd } }),
    ClassInvite.countDocuments({ status: 'active' }),
  ]);

  const presentToday = todayAttendance.filter(r => r.status === 'present' || r.status === 'zoom').length;
  const absentToday = todayAttendance.filter(r => r.status === 'absent').length;
  const pendingAttendance = totalInvites * 3;
  const attendanceRate = totalAttendance > 0 ? Math.round((completedAttendance / totalAttendance) * 100) : 0;

  res.json({
    totalSessions: totalAttendance,
    pendingAttendance,
    completedAttendance,
    presentToday,
    absentToday,
    attendanceRate,
    totalInvites,
  });
});

// Returns available enrollment categories dynamically from the database
export const getAttendanceEnrollmentTypes = asyncHandler(async (req, res) => {
  const [planCount, serviceCount, courseCount, workshopCount, trialCount, batchCount, yttcCount] = await Promise.all([
    Plan.countDocuments({ active: true }),
    Service.countDocuments({ active: true }),
    Course.countDocuments({ active: true }),
    Workshop.countDocuments({ status: { $ne: 'cancelled' } }),
    FreeTrial.countDocuments({ status: 'active' }),
    Batch.countDocuments({ status: 'Active' }),
    0, // YTTC placeholder — no model yet
  ]);

  const types = [];
  if (planCount > 0) types.push({ type: 'plan', label: 'Membership Plans', icon: 'ti-shield-check', count: planCount });
  if (serviceCount > 0) types.push({ type: 'service', label: 'Services', icon: 'ti-package', count: serviceCount });
  if (courseCount > 0) types.push({ type: 'course', label: 'Courses', icon: 'ti-books', count: courseCount });
  if (workshopCount > 0) types.push({ type: 'workshop', label: 'Workshops', icon: 'ti-award', count: workshopCount });
  if (trialCount > 0) types.push({ type: 'trial', label: 'Free Trial', icon: 'ti-gift', count: trialCount });
  if (batchCount > 0) types.push({ type: 'batch', label: 'Batches', icon: 'ti-radio-tower', count: batchCount });

  res.json(types);
});

// Fetch all items for a given enrollment type
export const getAttendanceEnrollmentItems = asyncHandler(async (req, res) => {
  const { entityType } = req.params;
  if (!entityType) throw ApiError.badRequest('entityType is required');

  let items = [];
  switch (entityType) {
    case 'plan':
      items = await Plan.find({ active: true }).sort({ displayOrder: 1 });
      items = items.map(p => ({ _id: p._id, name: p.name, type: 'plan' }));
      // Virtual "Members" item — aggregates all invites sent to the Membership entity
      items.unshift({ _id: '__all_members__', name: 'Members', type: 'plan', isVirtual: true });
      break;
    case 'service':
      items = await Service.find({ active: true }).sort({ name: 1 });
      items = items.map(s => ({ _id: s._id, name: s.name, type: 'service' }));
      break;
    case 'course':
      items = await Course.find({ active: true }).sort({ title: 1 });
      items = items.map(c => ({ _id: c._id, name: c.title, type: 'course' }));
      break;
    case 'workshop':
      items = await Workshop.find({ status: { $ne: 'cancelled' } }).sort({ date: -1 });
      items = items.map(w => ({ _id: w._id, name: w.name, type: 'workshop', date: w.date }));
      break;
    case 'trial':
      // Free Trial: group by user, show user name + trial details
      items = await FreeTrial.find({ status: 'active' })
        .populate('user', 'name email')
        .sort({ createdAt: -1 });
      items = items.map(t => ({
        _id: t._id,
        name: t.user ? t.user.name : 'Unknown Student',
        userEmail: t.user ? t.user.email : '',
        type: 'trial',
        user: t.user?._id,
        sessionsLeft: t.sessionsLeft,
      }));
      break;
    case 'batch':
      items = await Batch.find({ status: 'Active' }).sort({ name: 1 });
      items = items.map(b => ({ _id: b._id, name: b.name, type: 'batch' }));
      break;
    default:
      break;
  }

  res.json(items);
});

// Get class invites for a specific enrollment (only past/completed sessions that can have attendance marked)
export const getAttendanceClassInvites = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  if (!entityType || !entityId) throw ApiError.badRequest('entityType and entityId are required');

  const now = new Date();

  const invites = await ClassInvite.find({
    entityType,
    entityId,
    status: { $ne: 'cancelled' },
    date: { $lte: now }, // Only past/completed sessions
  })
    .sort({ date: -1 })
    .populate('createdBy', 'name email');

  // Enrich with attendance counts per invite
  const enriched = await Promise.all(invites.map(async (inv) => {
    const totalRecipients = inv.recipients.length;
    const attendanceCount = await Attendance.countDocuments({ invitation: inv._id });
    const presentCount = await Attendance.countDocuments({ invitation: inv._id, status: 'present' });
    return {
      _id: inv._id,
      title: inv.title,
      date: inv.date,
      startTime: inv.startTime,
      endTime: inv.endTime,
      duration: inv.duration,
      instructor: inv.instructor,
      platform: inv.platform,
      meetingLink: inv.meetingLink,
      entityType: inv.entityType,
      entityName: inv.entityName,
      entityLabel: inv.entityLabel,
      status: inv.status,
      totalRecipients,
      attendanceCount,
      presentCount,
      absentCount: attendanceCount - presentCount,
      attendanceMarked: attendanceCount > 0,
    };
  }));

  res.json(enriched);
});

// Get ALL class invites where entityType=membership (for the virtual "Members" view)
export const getAllMembershipInvites = asyncHandler(async (req, res) => {
  const now = new Date();

  const invites = await ClassInvite.find({
    entityType: 'membership',
    status: { $ne: 'cancelled' },
    date: { $lte: now },
  })
    .sort({ date: -1 })
    .populate('createdBy', 'name email');

  const enriched = await Promise.all(invites.map(async (inv) => {
    const totalRecipients = inv.recipients.length;
    const attendanceCount = await Attendance.countDocuments({ invitation: inv._id });
    const presentCount = await Attendance.countDocuments({ invitation: inv._id, status: 'present' });
    return {
      _id: inv._id,
      title: inv.title,
      date: inv.date,
      startTime: inv.startTime,
      endTime: inv.endTime,
      duration: inv.duration,
      instructor: inv.instructor,
      platform: inv.platform,
      meetingLink: inv.meetingLink,
      entityType: inv.entityType,
      entityId: inv.entityId,
      entityName: inv.entityName,
      entityLabel: inv.entityLabel,
      status: inv.status,
      totalRecipients,
      attendanceCount,
      presentCount,
      absentCount: attendanceCount - presentCount,
      attendanceMarked: attendanceCount > 0,
    };
  }));

  res.json(enriched);
});

// Get all active members who received a specific invite (any plan type)
export const getActiveMembersForInvite = asyncHandler(async (req, res) => {
  const { inviteId } = req.params;
  const invite = await ClassInvite.findById(inviteId);
  if (!invite) throw ApiError.notFound('Class invite not found');

  // All active memberships (any plan type)
  const activeMemberships = await Membership.find({
    status: 'active',
  }).populate('user', 'name email phone avatar');

  // Recipient lookup from the invite
  const recipientMap = {};
  for (const r of invite.recipients) {
    recipientMap[r.user.toString()] = r;
  }

  // Cross-reference: active members who also received this invite
  const userIds = [];
  const matched = [];

  for (const m of activeMemberships) {
    if (!m.user) continue;
    const uid = m.user._id.toString();
    if (recipientMap[uid]) {
      userIds.push(m.user._id);
      matched.push({
        membershipId: m._id,
        user: m.user,
        planType: m.planType,
        totalSessions: m.totalSessions,
        completedSessions: m.completedSessions,
        recipientStatus: recipientMap[uid].status,
      });
    }
  }

  const attendanceRecords = await Attendance.find({
    invitation: inviteId,
    user: { $in: userIds },
  });
  const attendanceMap = {};
  for (const rec of attendanceRecords) {
    attendanceMap[rec.user.toString()] = rec;
  }

  const result = matched.map(mm => ({
    student: {
      _id: mm.user._id,
      name: mm.user.name,
      email: mm.user.email,
      phone: mm.user.phone,
      avatar: mm.user.avatar,
    },
    membershipId: mm.membershipId,
    planType: mm.planType,
    totalSessions: mm.totalSessions,
    completedSessions: mm.completedSessions,
    recipientStatus: mm.recipientStatus,
    attendance: attendanceMap[mm.user._id.toString()] ? {
      _id: attendanceMap[mm.user._id.toString()]._id,
      status: attendanceMap[mm.user._id.toString()].status,
      date: attendanceMap[mm.user._id.toString()].date,
      locked: attendanceMap[mm.user._id.toString()].locked,
    } : null,
  }));

  res.json({
    invite: {
      _id: invite._id,
      title: invite.title,
      description: invite.description,
      date: invite.date,
      startTime: invite.startTime,
      endTime: invite.endTime,
      duration: invite.duration,
      instructor: invite.instructor,
      platform: invite.platform,
      meetingLink: invite.meetingLink,
      meetingPassword: invite.meetingPassword,
      entityType: invite.entityType,
      entityId: invite.entityId,
      entityName: invite.entityName,
      entityLabel: invite.entityLabel,
      notes: invite.notes,
      status: invite.status,
      totalRecipients: invite.recipients.length,
      totalMembers: result.length,
    },
    students: result,
  });
});

// Get students for a class invite with their attendance status
export const getAttendanceStudents = asyncHandler(async (req, res) => {
  const { inviteId } = req.params;
  const invite = await ClassInvite.findById(inviteId);
  if (!invite) throw ApiError.notFound('Class invite not found');

  const recipientIds = invite.recipients.map(r => r.user);
  const students = await User.find({ _id: { $in: recipientIds } }).select('name email avatar phone');

  const attendanceRecords = await Attendance.find({ invitation: inviteId });

  const attendanceMap = {};
  for (const rec of attendanceRecords) {
    attendanceMap[rec.user.toString()] = rec;
  }

  const result = students.map(student => {
    const att = attendanceMap[student._id.toString()];
    const recipient = invite.recipients.find(r => r.user.toString() === student._id.toString());
    return {
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        avatar: student.avatar,
        phone: student.phone,
      },
      recipientStatus: recipient?.status || 'pending',
      attendance: att ? {
        _id: att._id,
        status: att.status,
        date: att.date,
        mode: att.mode,
        notes: att.notes,
        locked: att.locked,
      } : null,
    };
  });

  res.json({
    invite: {
      _id: invite._id,
      title: invite.title,
      description: invite.description,
      date: invite.date,
      startTime: invite.startTime,
      endTime: invite.endTime,
      duration: invite.duration,
      instructor: invite.instructor,
      platform: invite.platform,
      meetingLink: invite.meetingLink,
      meetingPassword: invite.meetingPassword,
      entityType: invite.entityType,
      entityId: invite.entityId,
      entityName: invite.entityName,
      entityLabel: invite.entityLabel,
      notes: invite.notes,
      status: invite.status,
    },
    students: result,
  });
});

// Get students with active membership for a specific plan + invite
export const getMembershipAttendanceStudents = asyncHandler(async (req, res) => {
  const { planId, inviteId } = req.params;
  if (!planId || !inviteId) throw ApiError.badRequest('planId and inviteId are required');

  const [invite, plan] = await Promise.all([
    ClassInvite.findById(inviteId),
    Plan.findById(planId),
  ]);
  if (!invite) throw ApiError.notFound('Class invite not found');
  if (!plan) throw ApiError.notFound('Plan not found');

  // All active memberships for this plan type
  const activeMemberships = await Membership.find({
    planType: plan.name,
    status: 'active',
  }).populate('user', 'name email phone avatar');

  // Recipient lookup from the invite
  const recipientMap = {};
  for (const r of invite.recipients) {
    recipientMap[r.user.toString()] = r;
  }

  // Cross-reference: active members who also received this invite
  const userIds = [];
  const matchedMemberships = [];

  for (const m of activeMemberships) {
    if (!m.user) continue;
    const uid = m.user._id.toString();
    if (recipientMap[uid]) {
      userIds.push(m.user._id);
      matchedMemberships.push({
        membershipId: m._id,
        user: m.user,
        planType: m.planType,
        totalSessions: m.totalSessions,
        completedSessions: m.completedSessions,
        recipientStatus: recipientMap[uid].status,
      });
    }
  }

  // Existing attendance records for this invite
  const attendanceRecords = await Attendance.find({
    invitation: inviteId,
    user: { $in: userIds },
  });
  const attendanceMap = {};
  for (const rec of attendanceRecords) {
    attendanceMap[rec.user.toString()] = rec;
  }

  const result = matchedMemberships.map(mm => ({
    student: {
      _id: mm.user._id,
      name: mm.user.name,
      email: mm.user.email,
      phone: mm.user.phone,
      avatar: mm.user.avatar,
    },
    membershipId: mm.membershipId,
    planType: mm.planType,
    totalSessions: mm.totalSessions,
    completedSessions: mm.completedSessions,
    recipientStatus: mm.recipientStatus,
    attendance: attendanceMap[mm.user._id.toString()] ? {
      _id: attendanceMap[mm.user._id.toString()]._id,
      status: attendanceMap[mm.user._id.toString()].status,
      date: attendanceMap[mm.user._id.toString()].date,
      locked: attendanceMap[mm.user._id.toString()].locked,
    } : null,
  }));

  res.json({
    invite: {
      _id: invite._id,
      title: invite.title,
      description: invite.description,
      date: invite.date,
      startTime: invite.startTime,
      endTime: invite.endTime,
      duration: invite.duration,
      instructor: invite.instructor,
      platform: invite.platform,
      meetingLink: invite.meetingLink,
      meetingPassword: invite.meetingPassword,
      entityType: invite.entityType,
      entityId: invite.entityId,
      entityName: invite.entityName,
      entityLabel: invite.entityLabel,
      notes: invite.notes,
      status: invite.status,
      totalRecipients: invite.recipients.length,
      totalMembers: result.length,
    },
    plan: {
      _id: plan._id,
      name: plan.name,
    },
    students: result,
  });
});

// Map a frontend-provided status to the correct stored status.
// "present" becomes "present" (offline) or "zoom" (online) so the
// student calendar shows the correct color per the legend.
function mapAttendanceStatus(platform, rawStatus) {
  if (rawStatus !== 'present') return rawStatus;
  return platform === 'Offline' ? 'present' : 'zoom';
}

// Resolve the correct enrollment document ID for a student so that
// attendance records can be linked to the actual enrollment (Membership,
// UserService, FreeTrial) rather than a catalog item.
async function resolveEnrollmentId(entityType, catalogId, userId) {
  switch (entityType) {
    case 'membership': {
      const m = await Membership.findOne({ user: userId, status: 'active', expiryDate: { $gt: new Date() } }).sort({ createdAt: -1 }).select('_id').lean();
      return m?._id || null;
    }
    case 'service': {
      const us = await UserService.findOne({ user: userId, status: 'active', service: catalogId }).select('_id').lean();
      return us?._id || null;
    }
    case 'trial': {
      const t = await FreeTrial.findOne({ user: userId, status: 'active' }).select('_id').lean();
      return t?._id || null;
    }
    default:
      return catalogId;
  }
}

// Bulk mark attendance for a class invite
export const bulkMarkAttendance = asyncHandler(async (req, res) => {
  const { inviteId, attendanceData } = req.body;
  if (!inviteId || !attendanceData || !Array.isArray(attendanceData)) {
    throw ApiError.badRequest('inviteId and attendanceData array are required');
  }

  const invite = await ClassInvite.findById(inviteId);
  if (!invite) throw ApiError.notFound('Class invite not found');

  const results = [];
  for (const item of attendanceData) {
    const { user, status } = item;
    if (!user || !status) continue;
    if (!ATTENDANCE_STATUSES.includes(status)) continue;

    const enrollmentId = await resolveEnrollmentId(invite.entityType, invite.entityId, user);
    const resolvedStatus = mapAttendanceStatus(invite.platform, status);

    const result = await markAttendanceAtomic({
      user,
      date: invite.date,
      status: resolvedStatus,
      mode: invite.platform === 'Offline' ? 'offline' : 'online',
      classType: invite.title || 'Class',
      invitation: inviteId,
      entityType: invite.entityType || 'none',
      entityId: enrollmentId,
      adminId: req.user._id,
    });
    results.push(result);
  }

  await log(`Bulk marked ${results.length} attendance records for invite ${invite.title}`, req);
  res.json({ success: true, count: results.length });
});

export const markAllPresent = asyncHandler(async (req, res) => {
  const { inviteId } = req.body;
  if (!inviteId) throw ApiError.badRequest('inviteId is required');

  const invite = await ClassInvite.findById(inviteId);
  if (!invite) throw ApiError.notFound('Class invite not found');
  if (invite.status === 'cancelled') throw ApiError.badRequest('Cannot mark attendance for a cancelled invite');

  const results = [];
  for (const recipient of invite.recipients) {
    const enrollmentId = await resolveEnrollmentId(invite.entityType, invite.entityId, recipient.user);
    const resolvedStatus = mapAttendanceStatus(invite.platform, 'present');
    const result = await markAttendanceAtomic({
      user: recipient.user,
      date: invite.date,
      status: resolvedStatus,
      mode: invite.platform === 'Offline' ? 'offline' : 'online',
      classType: invite.title || 'Class',
      invitation: inviteId,
      entityType: invite.entityType || 'none',
      entityId: enrollmentId,
      adminId: req.user._id,
    });
    results.push(result);
  }

  await log(`Marked all present (${results.length}) for invite ${invite.title}`, req);
  res.json({ success: true, count: results.length });
});

export const resetAttendance = asyncHandler(async (req, res) => {
  const { inviteId } = req.params;
  const invite = await ClassInvite.findById(inviteId);
  if (!invite) throw ApiError.notFound('Class invite not found');

  const deleted = await Attendance.deleteMany({ invitation: inviteId, locked: { $ne: true } });

  await log(`Reset attendance (deleted ${deleted.deletedCount} unlocked records) for invite ${invite.title}`, req);
  res.json({ success: true, deletedCount: deleted.deletedCount });
});

export const lockAttendance = asyncHandler(async (req, res) => {
  const { inviteId } = req.params;
  const invite = await ClassInvite.findByIdAndUpdate(
    inviteId,
    { status: 'completed' },
    { returnDocument: 'after' }
  );
  if (!invite) throw ApiError.notFound('Class invite not found');

  const locked = await Attendance.updateMany(
    { invitation: inviteId, locked: { $ne: true } },
    { $set: { locked: true } }
  );

  await log(`Locked attendance (${locked.modifiedCount} records) for invite ${invite.title}`, req);
  res.json({ success: true, invite, lockedCount: locked.modifiedCount });
});

export const getAttendanceByDate = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) throw ApiError.badRequest('Date is required');

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const records = await Attendance.find({
    date: { $gte: dayStart, $lte: dayEnd },
  }).populate('user', 'name email avatar');

  res.json(records);
});

// ── Enrollment Expiry ────────────────────────────────────────
import { expireDueEnrollments } from '../services/expiryService.js';

export const expireEnrollments = asyncHandler(async (req, res) => {
  const results = await expireDueEnrollments();
  await log(`Expired enrollments: memberships=${results.memberships}, services=${results.services}, trials=${results.trials}`, req);
  res.json({ success: true, ...results });
});
