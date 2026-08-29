// ============================================================
// controllers/studentController.js
// All student-facing data + action endpoints. Every handler is
// scoped to the authenticated user (req.user).
//
// SECURITY: All paid-feature activation must go through the
// PaymentService (payment/PaymentService.js). Direct creation
// of Payment documents with status 'paid' is FORBIDDEN —
// the two-axis state machine (paymentStatus + fulfillmentStatus)
// ensures every captured payment activates the corresponding
// feature via FulfillmentService.
// ============================================================
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { buildStudentDashboard } from '../services/dashboardService.js';
import { ensureReferral } from '../services/referralService.js';
import { notify } from '../services/notificationService.js';
import notificationService from '../notification/core/NotificationService.js';
import emailService from '../services/email/email.service.js';
import logger from '../notification/logger.js';
import { escapeHtml } from '../notification/templates/engine/components.js';
import { convertTrial } from './freeTrialController.js';
import Membership from '../models/Membership.js';
import Attendance from '../models/Attendance.js';
import Payment from '../payment/models/Payment.js';
import { PaymentService } from '../payment/PaymentService.js';
import { IdempotencyPlugin } from '../payment/plugins/IdempotencyPlugin.js';
import ClassSession from '../models/ClassSession.js';
import ClassInvite from '../models/ClassInvite.js';
import Workshop from '../models/Workshop.js';
import Download from '../models/Download.js';
import Consultation from '../models/Consultation.js';
import Notification from '../models/Notification.js';
import Referral from '../models/Referral.js';
import Plan from '../models/Plan.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import TimeSlot from '../models/TimeSlot.js';
import UserService from '../models/UserService.js';
import FreeTrial from '../models/FreeTrial.js';
import Service from '../models/Service.js';
import { isSingleSessionService } from '../utils/serviceHelpers.js';
import { buildStudentServices, buildAllEnrollments } from '../services/serviceService.js';
import { ATTENDANCE_STATUSES, YTTC_MODES } from '../shared/constants/index.js';

const MODULE = 'StudentCtrl';
const DAY = 86400000;
const ONE_DAY_MS = 86400000;

// ── Auto-resume helper ─────────────────────────────────────────
// If a membership is paused but has no remaining pause days, or if
// the expected resume date has passed, automatically resume it.
async function maybeAutoResume(m) {
  if (!m || m.status !== 'paused' || !m.pauseStartedAt) return false;
  const remaining = m.remainingPauseDays;
  const elapsed = Math.floor((Date.now() - m.pauseStartedAt.getTime()) / ONE_DAY_MS);
  const shouldResume = remaining <= 0 || (remaining - elapsed) <= 0;

  if (!shouldResume) return false;

  const { daysCounted } = calcPauseDays(m.pauseStartedAt);
  const pauseEntry = {
    pauseStartedAt: m.pauseStartedAt,
    pauseEndedAt: new Date(),
    daysCounted,
  };
  m.pauseHistory.push(pauseEntry);
  if (daysCounted > 0) {
    m.pauseDaysUsed = Math.min(m.pauseDaysAllowed, m.pauseDaysUsed + daysCounted);
    m.expiryDate = new Date(m.expiryDate.getTime() + daysCounted * ONE_DAY_MS);
  }
  m.status = 'active';
  m.pauseStartedAt = null;
  m.zoomAccess = true;
  m.history.push({
    action: 'resumed',
    note: `Auto-resumed after pause allowance exhausted. Extended ${daysCounted} day(s).`,
    at: new Date(),
  });
  await m.save();

  notify(m.user, {
    title: 'Membership Automatically Resumed',
    message: `Your ${m.planType} membership is active again. Expiry extended by ${daysCounted} day(s). New expiry: ${m.expiryDate.toISOString().split('T')[0]}.`,
    type: 'success',
  }).catch(() => {});

  return true;
}

function calcPauseDays(pauseStartedAt) {
  const now = Date.now();
  const elapsed = now - new Date(pauseStartedAt).getTime();
  const daysCounted = Math.floor(elapsed / ONE_DAY_MS);
  return { daysCounted, actualDurationMs: elapsed };
}

// Shared instances for the new payment engine
// Instantiated here so controllers stay thin — business logic lives in services.
const paymentService = new PaymentService();
const idempotencyPlugin = new IdempotencyPlugin();

// ── GET /api/student/dashboard ───────────────────────────────
export const getDashboard = asyncHandler(async (req, res) => {
  const data = await buildStudentDashboard(req.user._id);
  if (!data) throw ApiError.notFound('Profile not found');
  res.json(data);
});

// ── Membership ───────────────────────────────────────────────
export const getMembership = asyncHandler(async (req, res) => {
  const m = await Membership.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  if (m) await maybeAutoResume(m);
  res.json(m || null);
});

// ── GET /api/student/membership-plans (active plans for student view) ──
export const getMembershipPlans = asyncHandler(async (req, res) => {
  const plans = await Plan.find({
    active: true,
    visibility: { $ne: 'hidden' },
  }).sort({ displayOrder: 1, durationMonths: 1 });
  res.json(plans);
});

// ── POST /api/student/membership/purchase ─────────────────────
// Initiates a Razorpay payment for the selected plan.
// The plan is NOT activated here — activation happens after
// the client calls /verify-payment with the Razorpay response,
// at which point FulfillmentService creates the Membership record.
export const purchaseMembership = asyncHandler(async (req, res) => {
  const { planId, idempotencyKey } = req.body;
  if (!planId) throw ApiError.badRequest('planId is required');

  const plan = await Plan.findById(planId);
  if (!plan) throw ApiError.notFound('Plan not found');
  if (!plan.active || plan.visibility === 'hidden') throw ApiError.badRequest('This plan is not available for purchase');

  // Check for existing active membership for the same plan
  const existing = await Membership.findOne({
    user: req.user._id,
    plan: planId,
    status: 'active',
    expiryDate: { $gt: new Date() },
  });
  if (existing) throw ApiError.badRequest('You already have an active subscription to this plan');

  // ── Initiate payment via PaymentService ──
  // This creates a Razorpay order and stores a pending Payment document.
  // The client receives the razorpay_order_id to complete checkout in the browser.
  // Full membership activation happens when verify-payment succeeds.
  const payment = await paymentService.initiate({
    user: req.user._id,
    items: [
      {
        itemType: 'membership',
        itemId: planId,
        quantity: 1,
        metadata: { planName: plan.name, durationMonths: plan.durationMonths },
      },
    ],
    label: `${plan.name} Membership`,
    description: `Purchase of ${plan.name} – ${plan.durationMonths} month(s)`,
    idempotencyKey,
  });

  logger.info(MODULE, 'Membership purchase initiated', {
    userId: String(req.user._id),
    planId,
    planName: plan.name,
    paymentId: String(payment._id),
    razorpayOrderId: payment.razorpayOrderId,
  });

  res.status(201).json({
    success: true,
    message: 'Payment initiated. Complete the Razorpay checkout to activate your membership.',
    requiresPayment: true,
    payment: {
      _id: payment._id,
      amount: payment.amount,
      status: payment.paymentStatus,
      gateway: payment.gateway,
    },
    razorpay: {
      order_id: payment.razorpayOrderId,
      amount: payment.amount,
      currency: payment.currency,
      key: process.env.RAZORPAY_KEY_ID,
    },
    plan: {
      _id: plan._id,
      name: plan.name,
      durationMonths: plan.durationMonths,
      price: plan.price,
    },
  });
});

// ── GET /api/student/membership/status ──────────────────────────
// Lightweight status-only endpoint for the Navbar and other
// components that just need the computed membership status.
export const getMembershipStatus = asyncHandler(async (req, res) => {
  const m = await Membership.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  if (m) await maybeAutoResume(m);
  res.json({
    planActive: m ? m.isActive : false,
    computedStatus: m ? m.computedStatus : 'none',
    planMonths: m?.planMonths || 0,
    remainingPauseDays: m?.remainingPauseDays ?? 0,
    pauseDaysUsed: m?.pauseDaysUsed ?? 0,
    pauseDaysAllowed: m?.pauseDaysAllowed ?? 0,
    isPaused: m?.isPaused ?? false,
  });
});

// ── GET /api/student/membership/active ────────────────────────
// Returns the student's current membership (active OR paused).
// Paused memberships are included so the Active Plan page can
// display pause state. Auto-resumes if pause allowance exhausted.
export const getActiveMembership = asyncHandler(async (req, res) => {
  const m = await Membership.findOne({
    user: req.user._id,
    status: { $in: ['active', 'paused'] },
  }).sort({ createdAt: -1 }).populate('plan');

  if (!m) return res.json(null);

  if (m.status === 'paused') await maybeAutoResume(m);

  res.json({
    _id: m._id,
    planId: m.plan?._id || null,
    planType: m.planType,
    planMonths: m.planMonths,
    price: m.price,
    purchaseDate: m.purchaseDate,
    startDate: m.startDate,
    expiryDate: m.expiryDate,
    daysLeft: m.daysLeft,
    isActive: m.isActive,
    computedStatus: m.computedStatus,
    status: m.status,
    benefits: m.benefits,
    pauseDaysAllowed: m.pauseDaysAllowed,
    pauseDaysUsed: m.pauseDaysUsed,
    remainingPauseDays: m.remainingPauseDays,
    isPaused: m.isPaused,
    pauseStartedAt: m.pauseStartedAt,
    currentPauseDuration: m.currentPauseDuration,
    expectedResumeDate: m.expectedResumeDate,
    pauseHistory: m.pauseHistory,
    totalSessions: m.totalSessions,
    completedSessions: m.completedSessions,
    remainingSessions: m.remainingSessions,
    sessionsProgressPct: m.sessionsProgressPct,
    sessionHistory: (m.sessionHistory || []).slice(-20).reverse(),
    history: m.history,
    invoice: m.invoice,
    plan: m.plan ? {
      _id: m.plan._id,
      name: m.plan.name,
      description: m.plan.description,
      price: m.plan.price,
      durationMonths: m.plan.durationMonths,
      benefits: m.plan.benefits,
      badge: m.plan.badge || (m.plan.isPopular ? 'Most Popular' : m.plan.isRecommended ? 'Recommended' : ''),
    } : null,
  });
});

// ── POST /api/student/membership/cancel ───────────────────────
export const cancelMembership = asyncHandler(async (req, res) => {
  const m = await Membership.findOne({
    user: req.user._id,
    status: 'active',
    expiryDate: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!m) throw ApiError.notFound('No active membership to cancel');

  m.status = 'cancelled';
  m.history.push({ action: 'cancelled', note: 'Cancelled by user', at: new Date() });
  await m.save();

  await User.findByIdAndUpdate(req.user._id, { planMonths: 0 });
  await notify(req.user._id, {
    title: 'Membership cancelled',
    message: `Your ${m.planType} has been cancelled. If you believe this was a mistake, please contact support.`,
    type: 'info',
    channels: ['inApp', 'email'],
  });

  res.json({ success: true, membership: m });
});

export const renewMembership = asyncHandler(async (req, res) => {
  logger.warn(MODULE, 'renewMembership deprecated – use POST /api/student/membership/purchase with planId');
  throw ApiError.badRequest(
    'This endpoint is deprecated. Use POST /api/student/membership/purchase with a planId to purchase or renew a membership.',
  );
});

export const upgradeMembership = asyncHandler(async (req, res) => {
  logger.warn(MODULE, 'upgradeMembership deprecated – use POST /api/student/membership/purchase with planId');
  throw ApiError.badRequest(
    'This endpoint is deprecated. Use POST /api/student/membership/purchase with a planId to upgrade your membership.',
  );
});

// ── POST /api/student/membership/pause ──────────────────────────
export const pauseMembership = asyncHandler(async (req, res) => {
  const m = await Membership.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  if (!m) throw ApiError.notFound('No membership found');

  // Validation
  if (m.computedStatus === 'paused') throw ApiError.badRequest('Membership is already paused');
  if (m.computedStatus !== 'active') throw ApiError.badRequest('Only active memberships can be paused');
  if (m.remainingPauseDays <= 0) throw ApiError.badRequest('No pause days remaining on this plan');

  // Atomic update
  m.status = 'paused';
  m.pauseStartedAt = new Date();
  m.zoomAccess = false;
  m.history.push({ action: 'paused', note: `Paused on ${new Date().toISOString()}`, at: new Date() });
  await m.save();

  await notify(req.user._id, {
    title: 'Membership Paused',
    message: `Your ${m.planType} membership has been paused. Benefits are temporarily suspended. You have ${m.remainingPauseDays} pause days remaining.`,
    type: 'info',
  });

  res.json({ success: true, membership: m });
});

// ── POST /api/student/membership/resume ─────────────────────────
export const resumeMembership = asyncHandler(async (req, res) => {
  const m = await Membership.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  if (!m) throw ApiError.notFound('No membership found');
  if (m.computedStatus !== 'paused') throw ApiError.badRequest('Membership is not paused');
  if (!m.pauseStartedAt) throw ApiError.badRequest('Pause start date is missing — cannot resume');

  const { daysCounted } = calcPauseDays(m.pauseStartedAt);

  // Build the pause history entry
  const pauseEntry = {
    pauseStartedAt: m.pauseStartedAt,
    pauseEndedAt: new Date(),
    daysCounted,
  };

  m.pauseHistory.push(pauseEntry);

  // Only count full calendar days
  if (daysCounted > 0) {
    m.pauseDaysUsed = Math.min(m.pauseDaysAllowed, m.pauseDaysUsed + daysCounted);
    m.expiryDate = new Date(m.expiryDate.getTime() + daysCounted * ONE_DAY_MS);
  }

  // Restore membership
  m.status = 'active';
  m.pauseStartedAt = null;
  m.zoomAccess = true;
  m.history.push({
    action: 'resumed',
    note: `Resumed after ${daysCounted} pause day(s). Expiry extended to ${m.expiryDate.toISOString().split('T')[0]}.`,
    at: new Date(),
  });
  await m.save();

  await notify(req.user._id, {
    title: 'Membership Resumed',
    message: `Your ${m.planType} membership is active again. Expiry extended by ${daysCounted} day(s). New expiry: ${m.expiryDate.toISOString().split('T')[0]}.`,
    type: 'success',
  });

  res.json({ success: true, membership: m });
});

// ── Attendance ───────────────────────────────────────────────
export const getAttendance = asyncHandler(async (req, res) => {
  const records = await Attendance.find({ user: req.user._id }).sort({ date: -1 });
  const counted = records.filter((r) => ATTENDANCE_STATUSES.slice(0, 4).includes(r.status));
  const present = records.filter((r) => r.status === 'present' || r.status === 'zoom').length;
  res.json({
    records,
    summary: {
      total: counted.length,
      present,
      absent: records.filter((r) => r.status === 'absent').length,
      zoom: records.filter((r) => r.status === 'zoom').length,
      rate: counted.length ? Math.round((present / counted.length) * 100) : 0,
    },
  });
});

// ── My Enrollments (for attendance selector) ──────────────────
export const getMyEnrollments = asyncHandler(async (req, res) => {
  const uid = req.user._id;
  const now = new Date();

  const [membership, userServices, trial, courses, workshops, yttcInvites] = await Promise.all([
    Membership.findOne({ user: uid, status: 'active', expiryDate: { $gt: now } }).sort({ createdAt: -1 }),
    UserService.find({ user: uid, status: 'active' }).sort({ createdAt: -1 }),
    FreeTrial.findOne({ user: uid, status: 'active' }).sort({ createdAt: -1 }),
    ClassInvite.find({
      'recipients.user': uid,
      entityType: 'course',
      status: { $ne: 'cancelled' },
    }).sort({ date: -1 }),
    ClassInvite.find({
      'recipients.user': uid,
      entityType: 'workshop',
      status: { $ne: 'cancelled' },
    }).sort({ date: -1 }),
    ClassInvite.find({
      'recipients.user': uid,
      entityType: 'yttc',
      status: { $ne: 'cancelled' },
    }).sort({ date: -1 }),
  ]);

  const result = [];

  if (membership) {
    result.push({
      _id: membership._id,
      type: 'membership',
      typeLabel: 'Plan',
      label: membership.planType,
      name: membership.planType,
      icon: 'ti-shield-check',
      color: '#F97316',
      totalSessions: membership.totalSessions || null,
      completedSessions: membership.completedSessions || 0,
    });
  }

  for (const us of userServices) {
    result.push({
      _id: us._id,
      type: 'service',
      typeLabel: 'Service',
      label: us.serviceName,
      name: us.serviceName,
      icon: 'ti-package',
      color: '#16A34A',
      totalSessions: us.totalSessions || 0,
      completedSessions: us.usedSessions || 0,
    });
  }

  if (trial) {
    result.push({
      _id: trial._id,
      type: 'trial',
      typeLabel: 'Trial',
      label: 'Free Trial',
      name: 'Free Trial',
      icon: 'ti-gift',
      color: '#D97706',
      totalSessions: trial.maxSessions,
      completedSessions: trial.completedSessions || 0,
    });
  }

  // De-duplicate courses using a Set by entityId
  const seenCourses = new Set();
  for (const invite of courses) {
    if (invite.entityId && !seenCourses.has(invite.entityId.toString())) {
      seenCourses.add(invite.entityId.toString());
      result.push({
        _id: invite.entityId,
        type: 'course',
        typeLabel: 'Course',
        label: invite.entityName || invite.entityLabel || 'Course',
        name: invite.entityName || invite.entityLabel || 'Course',
        icon: 'ti-books',
        color: '#8B5CF6',
        totalSessions: null,
        completedSessions: 0,
      });
    }
  }

  // De-duplicate workshops by entityId
  const seenWorkshops = new Set();
  for (const invite of workshops) {
    if (invite.entityId && !seenWorkshops.has(invite.entityId.toString())) {
      seenWorkshops.add(invite.entityId.toString());
      result.push({
        _id: invite.entityId,
        type: 'workshop',
        typeLabel: 'Workshop',
        label: invite.entityName || invite.entityLabel || 'Workshop',
        name: invite.entityName || invite.entityLabel || 'Workshop',
        icon: 'ti-award',
        color: '#7C3AED',
        totalSessions: null,
        completedSessions: 0,
      });
    }
  }

  // De-duplicate YTTC by entityId
  const seenYttc = new Set();
  for (const invite of yttcInvites) {
    if (invite.entityId && !seenYttc.has(invite.entityId.toString())) {
      seenYttc.add(invite.entityId.toString());
      result.push({
        _id: invite.entityId,
        type: 'yttc',
        typeLabel: 'YTTC',
        label: invite.entityName || invite.entityLabel || 'YTTC Program',
        name: invite.entityName || invite.entityLabel || 'YTTC Program',
        icon: 'ti-certificate',
        color: '#0891B2',
        totalSessions: null,
        completedSessions: 0,
      });
    }
  }

  res.json(result);
});

// ── Enrollment-specific attendance ────────────────────────────
export const getEnrollmentAttendance = asyncHandler(async (req, res) => {
  const uid = req.user._id;
  const { entityType, entityId } = req.query;

  if (!entityType || !entityId) {
    throw ApiError.badRequest('entityType and entityId are required');
  }

  const records = await Attendance.find({
    user: uid,
    entityType,
    entityId,
  }).sort({ date: -1 });

  const inviteIds = records.filter(r => r.invitation).map(r => r.invitation);
  const invites = inviteIds.length > 0
    ? await ClassInvite.find({ _id: { $in: inviteIds } }).select('title date startTime endTime instructor platform meetingLink notes entityType entityName')
    : [];

  const inviteMap = {};
  for (const inv of invites) {
    inviteMap[inv._id.toString()] = inv;
  }

  const counted = records.filter(r => ATTENDANCE_STATUSES.slice(0, 4).includes(r.status));
  const present = records.filter(r => r.status === 'present' || r.status === 'zoom').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const late = records.filter(r => r.status === 'late').length;

  res.json({
    records: records.map(r => ({
      _id: r._id,
      date: r.date,
      status: r.status,
      classType: r.classType,
      mode: r.mode,
      notes: r.notes,
      instructor: r.instructor,
      locked: r.locked,
      invitation: r.invitation,
      invite: r.invitation && inviteMap[r.invitation.toString()] ? {
        title: inviteMap[r.invitation.toString()].title,
        date: inviteMap[r.invitation.toString()].date,
        startTime: inviteMap[r.invitation.toString()].startTime,
        endTime: inviteMap[r.invitation.toString()].endTime,
        instructor: inviteMap[r.invitation.toString()].instructor,
        platform: inviteMap[r.invitation.toString()].platform,
        meetingLink: inviteMap[r.invitation.toString()].meetingLink,
        notes: inviteMap[r.invitation.toString()].notes,
      } : null,
    })),
    summary: {
      total: counted.length,
      present,
      absent,
      late,
      zoom: records.filter(r => r.status === 'zoom').length,
      rate: counted.length ? Math.round((present / counted.length) * 100) : 0,
    },
  });
});

// ── Payments ─────────────────────────────────────────────────
export const getPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(payments);
});

// ── YTTC ─────────────────────────────────────────────────────
export const getYTTCStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("yttcEnrollment name email");

  if (!user) throw ApiError.notFound("Student not found");

  res.json({
    yttcEnrollment: user.yttcEnrollment || {
      isEnrolled: false,
      mode: "",
      status: "not_enrolled",
      enrolledAt: null,
    },
  });
});

export const enrollYTTC = asyncHandler(async (req, res) => {
  const { mode = "online" } = req.body;

  if (!YTTC_MODES.filter(Boolean).includes(mode)) {
    throw ApiError.badRequest("Mode must be online or hybrid");
  }

  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.notFound("Student not found");

  if (user.yttcEnrollment?.isEnrolled) {
    return res.json({
      success: true,
      msg: "Already enrolled in YTTC",
      yttcEnrollment: user.yttcEnrollment,
    });
  }

  user.yttcEnrollment = {
    isEnrolled: true,
    mode,
    status: "active",
    enrolledAt: new Date(),
  };

  await user.save();

  await notify(req.user._id, {
    title: "YTTC enrollment confirmed",
    message: `You are enrolled in the 200 Hours Yoga Teacher Training Course (${mode} mode).`,
    type: "success",
    channels: ['inApp', 'email'],
  });

  res.status(201).json({
    success: true,
    msg: "YTTC enrolled successfully",
    yttcEnrollment: user.yttcEnrollment,
  });
});

// ── Classes ──────────────────────────────────────────────────
export const getClasses = asyncHandler(async (req, res) => {
  const now = new Date();
  const [upcoming, recordings] = await Promise.all([
    ClassSession.find({ date: { $gte: now }, status: 'upcoming' }).sort({ date: 1 }),
    ClassSession.find({ status: 'completed', recordingUrl: { $ne: '' } }).sort({ date: -1 }),
  ]);
  res.json({ upcoming, recordings });
});

export const enrollClass = asyncHandler(async (req, res) => {
  const session = await ClassSession.findById(req.params.id);
  if (!session) throw ApiError.notFound('Class not found');
  if (session.enrolledUsers.some((id) => id.equals(req.user._id))) {
    return res.json({ success: true, msg: 'Already enrolled' });
  }
  if (session.enrolledUsers.length >= session.capacity) throw ApiError.badRequest('This class is full');

  session.enrolledUsers.push(req.user._id);
  await session.save();
  notificationService.send(req.user._id, {
    template: 'class-enrollment',
    channels: ['inApp', 'email'],
    data: {
      className: session.name,
      classDate: session.date.toLocaleDateString('en-KE'),
      classTime: session.time || '',
      instructor: session.trainer || '',
      meetLink: session.zoomUrl || '',
      name: req.user.name,
    },
    subject: `Enrolled: ${session.name}`,
    message: `You're enrolled in <strong>${session.name}</strong>.`,
    priority: 'normal',
  }).catch((err) => logger.error(MODULE, 'Enrollment notification failed', { error: err.message }));
  res.json({ success: true, msg: 'Enrolled successfully' });
});

// ── Workshops ────────────────────────────────────────────────
export const getWorkshopDetail = asyncHandler(async (req, res) => {
  const wk = await Workshop.findById(req.params.id).populate('registrations.user', 'name email');
  if (!wk) throw ApiError.notFound('Workshop not found');

  // Check plan eligibility
  if (wk.allowedPlans && wk.allowedPlans.length > 0) {
    const membership = await Membership.findOne({
      user: req.user._id,
      status: 'active',
      expiryDate: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    const eligible = membership && wk.allowedPlans.some(
      (ap) => ap.toLowerCase() === membership.planType.toLowerCase()
    );
    if (!eligible) throw ApiError.forbidden('Your current membership plan does not have access to this workshop');
  }

  const myReg = wk.registrations.find((r) => r.user && r.user._id.equals(req.user._id));
  const totalRegs = wk.registrations.length;
  const remainingSeats = Math.max(0, wk.capacity - totalRegs);

  // Auto-generate reminder notification if workshop is within 24 hours and student is registered
  if (myReg && wk.date) {
    const now = new Date();
    const workshopStart = new Date(wk.date);
    const hoursUntil = (workshopStart.getTime() - now.getTime()) / 3600000;
    if (hoursUntil > 0 && hoursUntil <= 24) {
      const existingReminder = await Notification.findOne({
        user: req.user._id,
        workshop: wk._id,
        type: 'workshop',
        title: { $regex: /reminder/i },
      });
      if (!existingReminder) {
        await notify(req.user._id, {
          title: 'Reminder: ' + wk.name,
          message: `<strong>${wk.name}</strong> starts ${wk.startTime ? 'at ' + wk.startTime : 'soon'}! Click to join.`,
          type: 'workshop',
          workshop: wk._id,
        });
      }
    }
  }

  res.json({
    id: wk._id,
    _id: wk._id,
    name: wk.name,
    description: wk.description,
    date: wk.date,
    startTime: wk.startTime,
    endTime: wk.endTime,
    duration: wk.duration,
    price: wk.price,
    capacity: wk.capacity,
    instructor: wk.instructor,
    zoomLink: wk.zoomLink,
    image: wk.image,
    registrationDeadline: wk.registrationDeadline,
    isPaid: wk.isPaid,
    allowedPlans: wk.allowedPlans,
    status: wk.status,
    isPublished: wk.isPublished,
    remainingSeats,
    totalRegistrations: totalRegs,
    registered: !!myReg,
    myRegistration: myReg
      ? {
          _id: myReg._id,
          paid: myReg.paid,
          attended: myReg.attended,
          enrolledAt: myReg.at,
          planType: myReg.planType || '',
          planMonths: myReg.planMonths || 0,
          lastJoinTime: myReg.lastJoinTime || null,
        }
      : null,
    createdAt: wk.createdAt,
    updatedAt: wk.updatedAt,
  });
});

export const getWorkshops = asyncHandler(async (req, res) => {
  // Find the student's active membership to determine eligible plan names
  const membership = await Membership.findOne({
    user: req.user._id,
    status: 'active',
    expiryDate: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  const eligiblePlanNames = membership?.planType ? [membership.planType] : [];

  // Fetch all published, non-archived workshops
  const allWorkshops = await Workshop.find({
    isPublished: true,
    archived: { $ne: true },
  }).sort({ date: 1 });

  // Filter workshops: either no allowedPlans restriction, or student's plan matches
  const workshops = allWorkshops.filter((wk) => {
    if (!wk.allowedPlans || wk.allowedPlans.length === 0) return true;
    return eligiblePlanNames.some((pn) =>
      wk.allowedPlans.some((ap) => ap.toLowerCase() === pn.toLowerCase())
    );
  });

  res.json(workshops);
});

export const registerWorkshop = asyncHandler(async (req, res) => {
  const wk = await Workshop.findById(req.params.id);
  if (!wk) throw ApiError.notFound('Workshop not found');

  // Find active membership
  const membership = await Membership.findOne({
    user: req.user._id,
    status: 'active',
    expiryDate: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  // Check plan eligibility
  if (wk.allowedPlans && wk.allowedPlans.length > 0) {
    const eligible = membership && wk.allowedPlans.some(
      (ap) => ap.toLowerCase() === membership.planType.toLowerCase()
    );
    if (!eligible) throw ApiError.forbidden('Your current membership plan does not have access to this workshop');
  }

  if (wk.registrations.some((r) => r.user && r.user.equals(req.user._id))) {
    return res.json({ success: true, msg: 'Already registered' });
  }
  if (wk.registrations.length >= wk.capacity) throw ApiError.badRequest('This workshop is full');

  // Reserve a spot (paid: false initially).
  // FulfillmentService sets paid: true during fulfillment.
  wk.registrations.push({
    user: req.user._id,
    paid: false,
    planType: membership?.planType || '',
    planMonths: membership?.planMonths || 0,
  });
  await wk.save();

  let razorpayInfo = null;
  let paymentRecord = null;

  if (wk.price > 0) {
    // ── Paid workshop: initiate Razorpay payment ──
    const payment = await paymentService.initiate({
      user: req.user._id,
      items: [
        {
          itemType: 'workshop',
          itemId: wk._id,
          quantity: 1,
          metadata: { workshopName: wk.name, workshopDate: wk.date },
        },
      ],
      label: `Workshop: ${wk.name}`,
      description: `Registration for ${wk.name} on ${wk.date?.toLocaleDateString('en-KE')}`,
      idempotencyKey: req.body?.idempotencyKey,
    });

    razorpayInfo = {
      order_id: payment.razorpayOrderId,
      amount: payment.amount,
      currency: payment.currency,
      key: process.env.RAZORPAY_KEY_ID,
    };
    paymentRecord = { _id: payment._id, amount: payment.amount, status: payment.paymentStatus };
  } else {
    // ── Free workshop: immediate fulfillment via PaymentService.initiateFree() ──
    // FulfillmentService._registerWorkshop will flip paid to true.
    const payment = await paymentService.initiateFree({
      user: req.user._id,
      items: [
        {
          itemType: 'workshop',
          itemId: wk._id,
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          metadata: { workshopName: wk.name, workshopDate: wk.date },
        },
      ],
      label: `Workshop: ${wk.name}`,
      description: `Free registration for ${wk.name}`,
      idempotencyKey: req.body?.idempotencyKey,
    });

    paymentRecord = { _id: payment._id, amount: 0, status: payment.paymentStatus };
  }

  // Send registration confirmation notification
  notificationService.send(req.user._id, {
    template: 'workshop-confirmation',
    channels: ['inApp', 'email'],
    data: {
      workshopName: wk.name,
      workshopDate: wk.date.toLocaleDateString('en-KE'),
      workshopTime: wk.startTime || '',
      instructor: wk.instructor || '',
      meetLink: wk.zoomLink || '',
      price: wk.price > 0 ? `KES ${wk.price.toLocaleString('en-KE')}` : 'Free',
      name: req.user.name,
    },
    workshop: wk._id,
    priority: 'normal',
  }).catch((err) => logger.error(MODULE, 'Workshop confirmation notification failed', { error: err.message }));

  logger.info(MODULE, 'Workshop registration', {
    userId: String(req.user._id),
    workshopId: String(wk._id),
    workshopName: wk.name,
    paid: wk.price > 0,
    paymentInitiated: !!razorpayInfo,
  });

  res.json({
    success: true,
    msg: wk.price > 0
      ? 'Spot reserved. Complete payment via Razorpay to confirm registration.'
      : 'Registered successfully',
    registered: true,
    ...(paymentRecord ? { payment: paymentRecord } : {}),
    ...(razorpayInfo ? { razorpay: razorpayInfo, requiresPayment: true } : { requiresPayment: false }),
  });
});

// ── Downloads ────────────────────────────────────────────────
export const getDownloads = asyncHandler(async (req, res) => {
  const files = await Download.find({ visibility: { $in: ['all', 'plan'] } }).sort({ createdAt: -1 });
  res.json(files);
});

export const trackDownload = asyncHandler(async (req, res) => {
  await Download.findByIdAndUpdate(req.params.id, { $inc: { downloadCount: 1 } });
  res.json({ success: true });
});

// ── Consultations ────────────────────────────────────────────
export const getConsultations = asyncHandler(async (req, res) => {
  const consultations = await Consultation.find({ user: req.user._id }).sort({ date: -1 });
  res.json(consultations);
});

export const getConsultationSlots = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  const { date } = req.query;
  if (!date) throw ApiError.badRequest('Date is required');
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const booked = await Consultation.find({
    date: { $gte: dayStart, $lte: dayEnd },
    status: { $in: ['upcoming', 'confirmed'] },
  }).select('timeSlot');

  const bookedSlots = new Set(booked.map((c) => c.timeSlot).filter(Boolean));
  const fee = settings.consultationFee || 300;
  const duration = settings.consultationDuration || 30;

  const timeSlotDocs = await TimeSlot.find({
    date: { $gte: dayStart, $lte: dayEnd },
    isActive: true,
  }).sort({ time: 1 }).lean();

  let slots;
  if (timeSlotDocs.length > 0) {
    slots = timeSlotDocs.map((t) => ({
      time: t.time,
      available: !bookedSlots.has(t.time),
    }));
  } else {
    slots = (settings.consultationTimeSlots || []).map((t) => ({
      time: t,
      available: !bookedSlots.has(t),
    }));
  }

  res.json({ slots, fee, duration });
});

export const bookConsultation = asyncHandler(async (req, res) => {
  const { date, timeSlot, topic } = req.body;
  if (!date) throw ApiError.badRequest('A consultation date is required');
  if (!timeSlot) throw ApiError.badRequest('A time slot is required');

  const settings = await Settings.getSingleton();
  const fee = settings.consultationFee || 300;
  const duration = settings.consultationDuration || 30;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existing = await Consultation.findOne({
    date: { $gte: dayStart, $lte: dayEnd },
    timeSlot,
    status: { $in: ['upcoming', 'confirmed'] },
  });
  if (existing) throw ApiError.conflict('This time slot is already booked. Please choose another.');

  let payment = null;
  // Payment integration skipped for now — will be added with Razorpay later

  const c = await Consultation.create({
    user: req.user._id,
    date: new Date(date),
    timeSlot,
    duration,
    doctor: 'Soma Wellness Team',
    topic: topic || 'General consultation',
    price: fee,
    paymentStatus: 'pending',
    paymentRef: null,
    status: 'upcoming',
  });
  await Promise.all([
    notificationService.send(req.user._id, {
      template: 'consultation-confirmation',
      channels: ['inApp', 'email'],
      data: {
        name: req.user.name,
        consultationDate: new Date(date).toLocaleDateString('en-KE'),
        doctor: c.doctor,
        topic: c.topic,
      },
      subject: 'Consultation booked',
      message: `Your consultation is scheduled for ${new Date(date).toLocaleDateString('en-KE')} with ${c.doctor}.`,
      priority: 'normal',
    }).catch((err) => logger.error(MODULE, 'Consultation confirmation failed', { error: err.message })),
    notify(req.user._id, {
      title: 'Consultation booked',
      message: `Your ${duration}-min consultation is scheduled for ${new Date(date).toLocaleDateString('en-KE')} at ${timeSlot}.`,
      type: 'info',
    }),
  ]);

  res.status(201).json({ success: true, consultation: c, payment });
});

export const rescheduleConsultation = asyncHandler(async (req, res) => {
  const { date, timeSlot } = req.body;
  if (!date) throw ApiError.badRequest('A new date is required');
  const updates = { date: new Date(date), status: 'upcoming' };
  if (timeSlot) updates.timeSlot = timeSlot;
  const c = await Consultation.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    updates,
    { returnDocument: 'after' }
  );
  if (!c) throw ApiError.notFound('Consultation not found');
  res.json({ success: true, consultation: c });
});

export const cancelConsultation = asyncHandler(async (req, res) => {
  const c = await Consultation.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { status: 'cancelled' },
    { returnDocument: 'after' }
  );
  if (!c) throw ApiError.notFound('Consultation not found');
  res.json({ success: true, consultation: c });
});

// ── Notifications (DEPRECATED) ──────────────────────────────
// These legacy endpoints query the old Notification model directly
// and are NOT mounted in the student routes. The active notification
// endpoints live in notificationController.js and use NotificationRecipient.
// Kept to prevent import breakage – will be removed after verifying zero usage.

/** @deprecated Use notificationController.getStudentNotifications */
export const getNotifications = asyncHandler(async (req, res) => {
  logger.warn('studentController.getNotifications is deprecated – use /api/student/notifications');
  const notifs = await Notification.find({ $or: [{ user: req.user._id }, { user: null }] }).sort({ createdAt: -1 }).limit(100);
  res.json(notifs);
});

/** @deprecated Use notificationController.markStudentNotificationRead */
export const markNotificationRead = asyncHandler(async (req, res) => {
  logger.warn('studentController.markNotificationRead is deprecated');
  const n = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!n) throw ApiError.notFound('Notification not found');
  if (!n.read) {
    n.read = true;
    await n.save();
    await User.findByIdAndUpdate(req.user._id, { $inc: { unreadNotifications: -1 } });
  }
  res.json({ success: true });
});

/** @deprecated Use notificationController.markAllStudentNotificationsRead */
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  logger.warn('studentController.markAllNotificationsRead is deprecated');
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  await User.findByIdAndUpdate(req.user._id, { unreadNotifications: 0 });
  res.json({ success: true });
});

/** @deprecated Use notificationController.deleteStudentNotification */
export const deleteNotification = asyncHandler(async (req, res) => {
  logger.warn('studentController.deleteNotification is deprecated');
  const n = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!n) throw ApiError.notFound('Notification not found');
  if (!n.read) await User.findByIdAndUpdate(req.user._id, { $inc: { unreadNotifications: -1 } });
  res.json({ success: true });
});

// ── Referral ─────────────────────────────────────────────────
export const getReferral = asyncHandler(async (req, res) => {
  const ref = await ensureReferral(req.user);
  res.json({
    code: ref.code,
    link: `http://localhost:5173/newuser?ref=${ref.code}`,
    earned: ref.earned,
    invited: ref.invited,
    joined: ref.joined,
    stats: { invited: ref.invited.length, joined: ref.joined.length, earned: ref.earned },
  });
});

export const inviteReferral = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  if (!email) throw ApiError.badRequest('An email to invite is required');
  const ref = await ensureReferral(req.user);
  ref.invited.push({ name: name || '', email });
  await ref.save();

  const referralLink = `${process.env.FRONTEND_URL || 'https://somawellness.in'}/newuser?ref=${ref.code}`;

  // Send invitation email via NotificationService.
  notificationService.send(null, {
    template: 'referral-invite',
    channels: ['email'],
    email: email,
    data: {
      inviteeName: name || 'there',
      senderName: req.user.name || 'A friend',
      referralLink,
    },
    subject: `${req.user.name} invites you to Soma Wellness!`,
    title: 'You\'re Invited!',
    priority: 'normal',
  }).catch((err) => logger.error(MODULE, 'Referral email failed', { email, error: err.message }));

  // Send referral invite email via new email service
  emailService.sendMail(
    email,
    `${req.user.name} invites you to Soma Wellness!`,
    `<h2 style="color:#2D1406;">You're Invited!</h2>
     <p>Hi ${name || 'there'},</p>
     <p>Your friend <strong>${req.user.name}</strong> invites you to join <strong>Soma Wellness</strong>.</p>
     <p>Start your wellness journey with authentic Indian yoga and holistic wellness.</p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;">
       <tr>
         <td align="center">
           <table role="presentation" cellpadding="0" cellspacing="0">
             <tr>
               <td align="center" style="background:#FA8112;border-radius:8px;padding:12px 32px;">
                 <a href="${referralLink}" style="color:#FFFFFF;font-family:Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;">Accept Invitation</a>
               </td>
             </tr>
           </table>
         </td>
       </tr>
     </table>
     <p style="color:#7C6A58;font-size:12px;">— Soma Wellness Team</p>`,
    `You're Invited!\n\nHi ${name || 'there'},\n\nYour friend ${req.user.name} invites you to join Soma Wellness.\n\nStart your wellness journey with authentic Indian yoga and holistic wellness.\n\nAccept: ${referralLink}\n\n— Soma Wellness Team`,
  ).catch((err) => logger.error(MODULE, 'Referral invite email failed', { email, error: err.message }));

  res.json({ success: true, msg: 'Invitation recorded', stats: { invited: ref.invited.length, joined: ref.joined.length, earned: ref.earned } });
});

// ── Enrollment Progress ──────────────────────────────────────
export const getMyEnrollmentProgress = asyncHandler(async (req, res) => {
  const uid = req.user._id;

  const [membership, userServices, trial] = await Promise.all([
    Membership.findOne({ user: uid }).sort({ createdAt: -1 }),
    UserService.find({ user: uid }).sort({ createdAt: -1 }),
    FreeTrial.findOne({ user: uid }).sort({ createdAt: -1 }),
  ]);

  const result = {};

  if (membership) {
    result.membership = {
      _id: membership._id,
      planType: membership.planType,
      planMonths: membership.planMonths,
      status: membership.status,
      computedStatus: membership.computedStatus,
      daysLeft: membership.daysLeft,
      isActive: membership.isActive,
      isPaused: membership.isPaused,
      remainingPauseDays: membership.remainingPauseDays,
      pauseDaysUsed: membership.pauseDaysUsed,
      pauseDaysAllowed: membership.pauseDaysAllowed,
      pauseStartedAt: membership.pauseStartedAt,
      currentPauseDuration: membership.currentPauseDuration,
      expectedResumeDate: membership.expectedResumeDate,
      pauseHistory: membership.pauseHistory,
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

  res.json(result);
});

export const getActiveServices = asyncHandler(async (req, res) => {
  const data = await buildStudentServices(req.user._id);
  res.json(data);
});

export const getAllEnrollments = asyncHandler(async (req, res) => {
  const data = await buildAllEnrollments(req.user._id);
  res.json(data);
});

export const getServiceCatalog = asyncHandler(async (req, res) => {
  const services = await Service.find({ active: true, visibility: { $ne: 'hidden' } })
    .populate('instructor', 'name avatar')
    .populate('instructors', 'name avatar')
    .sort({ displayOrder: 1, name: 1 });

  const enrollmentCounts = await UserService.aggregate([
    { $group: { _id: '$service', count: { $sum: 1 } } },
  ]);
  const countMap = {};
  for (const e of enrollmentCounts) countMap[e._id.toString()] = e.count;

  const userEnrollments = await UserService.find({ user: req.user._id })
    .select('service status serviceName');

  const enrolledServiceIds = new Set();
  const activeEnrolledServiceIds = new Set();
  for (const e of userEnrollments) {
    enrolledServiceIds.add(e.service.toString());
    if (e.status === 'active') {
      activeEnrolledServiceIds.add(e.service.toString());
    }
  }

  const catalog = services.map((s) => {
    let alreadyEnrolled;
    if (isSingleSessionService(s.name)) {
      alreadyEnrolled = activeEnrolledServiceIds.has(s._id.toString());
    } else {
      alreadyEnrolled = enrolledServiceIds.has(s._id.toString());
    }

    return {
      _id: s._id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      category: s.category,
      type: s.type,
      mode: s.mode,
      instructor: s.instructor
        ? { _id: s.instructor._id, name: s.instructor.name, avatar: s.instructor.avatar }
        : null,
      instructors: (s.instructors || []).map(i => i ? { _id: i._id, name: i.name, avatar: i.avatar } : null).filter(Boolean),
      timeSlots: s.timeSlots || [],
      price: s.price,
      pricingModel: s.pricingModel || 'flat',
      contactEmail: s.contactEmail || '',
      totalSessions: s.totalSessions,
      sessionDuration: s.sessionDuration || 60,
      validityDuration: s.validityDuration || 0,
      validityUnit: s.validityUnit || 'weeks',
      durationWeeks: s.durationWeeks,
      scheduleDays: s.scheduleDays,
      scheduleTime: s.scheduleTime,
      image: s.image,
      images: s.images || [],
      icon: s.icon || '',
      tags: s.tags,
      isPopular: s.isPopular,
      featured: s.featured,
      enrolledCount: countMap[s._id.toString()] || 0,
      alreadyEnrolled,
    };
  });

  res.json(catalog);
});

export const enrollService = asyncHandler(async (req, res) => {
  const { serviceId, idempotencyKey } = req.body;
  if (!serviceId) throw ApiError.badRequest('serviceId is required');

  const service = await Service.findById(serviceId).populate('instructor', 'name');
  if (!service) throw ApiError.notFound('Service not found');
  if (!service.active) throw ApiError.badRequest('This service is not available');

  const existing = await UserService.findOne({
    user: req.user._id,
    service: serviceId,
    status: 'active',
  });
  if (existing) throw ApiError.badRequest('You already have an active enrollment for this service');

  if (service.price > 0) {
    const payment = await paymentService.initiate({
      user: req.user._id,
      items: [{
        itemType: 'service',
        itemId: serviceId,
        quantity: 1,
        metadata: { serviceName: service.name, price: service.price },
      }],
      label: `Service: ${service.name}`,
      description: `Enrollment in ${service.name}`,
      idempotencyKey,
    });

    res.status(201).json({
      success: true,
      message: 'Payment initiated. Complete the Razorpay checkout to activate your service.',
      requiresPayment: true,
      payment: {
        _id: payment._id,
        amount: payment.amount,
        status: payment.paymentStatus,
      },
      razorpay: {
        order_id: payment.razorpayOrderId,
        amount: payment.amount,
        currency: payment.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
      service: { _id: service._id, name: service.name, price: service.price },
    });
  } else {
    const payment = await paymentService.initiateFree({
      user: req.user._id,
      items: [{
        itemType: 'service',
        itemId: serviceId,
        quantity: 1,
        metadata: { serviceName: service.name, price: 0 },
      }],
      label: `Service: ${service.name}`,
      description: `Free enrollment in ${service.name}`,
      idempotencyKey,
    });

    res.status(201).json({
      success: true,
      message: 'Free service activated successfully.',
      requiresPayment: false,
      payment: { _id: payment._id, amount: 0, status: payment.paymentStatus },
    });
  }
});

export const renewService = asyncHandler(async (req, res) => {
  const us = await UserService.findById(req.params.id);
  if (!us) throw ApiError.notFound('Service enrollment not found');
  if (String(us.user) !== String(req.user._id)) throw ApiError.forbidden('Not your enrollment');

  const service = await Service.findById(us.service);
  if (!service) throw ApiError.notFound('Service not found');

  if (service.price > 0) {
    const payment = await paymentService.initiate({
      user: req.user._id,
      items: [{
        itemType: 'service',
        itemId: service._id,
        quantity: 1,
        metadata: { serviceName: service.name, price: service.price, renewal: true },
      }],
      label: `Service Renewal: ${service.name}`,
      description: `Renewal of ${service.name}`,
      idempotencyKey: req.body?.idempotencyKey,
    });

    res.json({
      success: true,
      message: 'Payment initiated. Complete Razorpay checkout to renew your service.',
      requiresPayment: true,
      payment: {
        _id: payment._id,
        amount: payment.amount,
        status: payment.paymentStatus,
      },
      razorpay: {
        order_id: payment.razorpayOrderId,
        amount: payment.amount,
        currency: payment.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } else {
    const payment = await paymentService.initiateFree({
      user: req.user._id,
      items: [{
        itemType: 'service',
        itemId: service._id,
        quantity: 1,
        metadata: { serviceName: service.name, price: 0, renewal: true },
      }],
      label: `Service Renewal: ${service.name}`,
      description: `Free renewal of ${service.name}`,
      idempotencyKey: req.body?.idempotencyKey,
    });

    res.json({
      success: true,
      message: 'Free service renewed successfully.',
      requiresPayment: false,
      payment: { _id: payment._id, amount: 0, status: payment.paymentStatus },
    });
  }
});

export const cancelService = asyncHandler(async (req, res) => {
  const us = await UserService.findOne({ _id: req.params.id, user: req.user._id });
  if (!us) throw ApiError.notFound('Service enrollment not found');
  us.status = 'cancelled';
  const now = new Date();
  if (us.activationDate && us.expiryDate) {
    const total = us.expiryDate.getTime() - us.activationDate.getTime();
    const elapsed = now.getTime() - us.activationDate.getTime();
    us.frozenProgressPct = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 100;
  }
  us.history.push({ action: 'cancelled', note: 'Cancelled by user', at: now });
  await us.save();
  await notify(req.user._id, { title: 'Service cancelled', message: `Your <strong>${us.serviceName}</strong> has been cancelled.`, type: 'info' });
  notificationService.send(req.user._id, {
    channels: ['inApp', 'email'],
    data: {
      name: req.user.name,
      serviceName: us.serviceName,
    },
    subject: `Service cancelled: ${us.serviceName}`,
    message: `Your <strong>${us.serviceName}</strong> has been cancelled. If you believe this was a mistake, please contact support.`,
    priority: 'normal',
  }).catch((err) => logger.error(MODULE, 'Cancel service email failed', { error: err.message }));
  res.json({ success: true, userService: us });
});
