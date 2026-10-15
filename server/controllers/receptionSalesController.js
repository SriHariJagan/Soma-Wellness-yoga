// ============================================================
// controllers/receptionSalesController.js
// Front-desk counter sales for reception staff:
//   - browse the sellable catalog (courses / plans / services)
//   - record a purchase for a student (payment + fulfillment)
//   - view a student's purchase history + enrollments
// Prices are always resolved server-side from the catalog — the
// client never decides what anything costs.
// ============================================================
import mongoose from 'mongoose';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Plan from '../models/Plan.js';
import Service from '../models/Service.js';
import Membership from '../models/Membership.js';
import UserService from '../models/UserService.js';
import Workshop from '../models/Workshop.js';
import Event from '../models/Event.js';
import Payment from '../payment/models/Payment.js';
import { FulfillmentService } from '../payment/services/FulfillmentService.js';
import ActivityLog from '../models/ActivityLog.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import notificationService from '../notification/core/NotificationService.js';
import logger from '../notification/logger.js';

const MODULE = 'ReceptionSales';

const KINDS = {
  course: { model: Course, itemType: 'course', label: 'Course' },
  plan: { model: Plan, itemType: 'plan', label: 'Membership plan' },
  service: { model: Service, itemType: 'service', label: 'Service' },
  workshop: { model: Workshop, itemType: 'workshop', label: 'Workshop' },
};

const PAYMENT_METHODS = ['Cash', 'M-Pesa', 'Card', 'Bank transfer'];

function itemName(kind, doc) {
  if (kind === 'course') return doc.title;
  return doc.name;
}

// ── GET /api/reception/catalog ───────────────────────────────
export const getCatalog = asyncHandler(async (req, res) => {
  const [courses, plans, services, workshops] = await Promise.all([
    Course.find({ active: { $ne: false } })
      .select('title price duration mode description hours earlyPrice currency category')
      .sort({ price: 1 })
      .lean(),
    // Membership counter sales: only active, visible plans (SOMA Wellness Circle).
    // Hidden auxiliary plans (passes, monthly tiers) are excluded.
    Plan.find({ active: { $ne: false }, visibility: { $ne: 'hidden' } })
      .select('name price durationMonths pauseDays benefits badge')
      .sort({ price: 1 })
      .lean(),
    Service.find({ active: { $ne: false } })
      .select('name price category mode')
      .sort({ price: 1 })
      .lean(),
    // Workshops the desk may book users into: admin-published, not archived.
    Workshop.find({ isPublished: true, archived: { $ne: true } })
      .select('name price date startTime capacity')
      .sort({ date: 1 })
      .lean(),
  ]);
  // Website parity for the desk too: flag services whose bookings the admin
  // disabled on the same-named offering, so Sell can be gated in the UI
  // (the sale endpoint enforces it regardless).
  const { getBookingDisabledMap } = await import('../services/serviceBooking.js');
  const disabledByName = await getBookingDisabledMap(services.map((s) => s.name));
  res.json({
    courses,
    plans,
    services: services.map((s) => ({ ...s, bookingEnabled: disabledByName.get(s.name) ? false : true })),
    workshops,
    paymentMethods: PAYMENT_METHODS,
  });
});

// ── GET /api/reception/workshops ─────────────────────────────
// Admin-hosted workshops visible to the front desk (published only).
export const getWorkshops = asyncHandler(async (req, res) => {
  const workshops = await Workshop.find({ isPublished: true, archived: { $ne: true } })
    .select('name date startTime endTime duration price description instructor location zoomLink image capacity registrations isPaid status')
    .sort({ date: 1 })
    .lean();
  res.json(workshops.map((w) => {
    const total = (w.registrations || []).length;
    const out = { ...w };
    delete out.registrations;
    out.totalRegistrations = total;
    out.remainingSeats = Math.max(0, (w.capacity || 0) - total);
    return out;
  }));
});

// ── POST /api/reception/events/:id/register ──────────────────
// Front desk books a user into an admin-hosted event. Mirrors the
// student self-register rules, but targets the chosen student, with two
// deliberate desk differences:
//  • Past EVENTS never take registrations (the event already happened).
//  • A passed registration DEADLINE does not block the desk — the deadline
//    is the online cutoff; walk-ins at the counter are the late channel.
//    Late bookings are flagged in the activity log + response.
export const registerUserForEvent = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) throw ApiError.badRequest('userId is required');

  const ev = await Event.findById(req.params.id);
  if (!ev) throw ApiError.notFound('Event not found');
  if (!ev.isPublished || ev.status !== 'available') {
    throw ApiError.badRequest('Registration is not open for this event');
  }
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  if (ev.date && new Date(ev.date) < dayStart) {
    throw ApiError.badRequest('This event has already taken place');
  }
  const late = !!(ev.registrationDeadline && new Date(ev.registrationDeadline) < new Date());

  const student = await User.findById(userId);
  if (!student) throw ApiError.notFound('Student not found');
  if (student.role !== 'student') throw ApiError.badRequest('Only student accounts can be registered');
  if (student.status === 'banned') throw ApiError.forbidden('Cannot register a suspended account');

  if (ev.registrations.some((r) => r.user && String(r.user) === String(student._id))) {
    return res.json({ success: true, msg: `${student.name} is already registered` });
  }
  if (ev.capacity > 0 && ev.registrations.length >= ev.capacity) {
    throw ApiError.badRequest('This event is full');
  }

  ev.registrations.push({ user: student._id, name: student.name || '', email: student.email || '' });
  await ev.save();

  ActivityLog.create({
    action: 'event_registration',
    performedBy: req.user._id,
    targetUser: student._id,
    meta: { eventId: String(ev._id), title: ev.title, ...(late ? { lateRegistration: true } : {}) },
  }).catch(() => {});

  res.status(201).json({
    success: true,
    late,
    msg: late
      ? `${student.name} registered for ${ev.title} (late registration — deadline had passed)`
      : `${student.name} registered for ${ev.title}`,
  });
});

// ── GET /api/reception/students/:id/purchases ────────────────
export const getStudentPurchases = asyncHandler(async (req, res) => {
  const student = await User.findById(req.params.id).select('name email').lean();
  if (!student) throw ApiError.notFound('Student not found');

  const [payments, courses, memberships, services] = await Promise.all([
    Payment.find({ user: student._id, isDeleted: { $ne: true } })
      .select('label amount currency paymentStatus fulfillmentStatus items capturedAt createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Course.find({ 'enrolledUsers.user': student._id }).select('title price').lean(),
    Membership.find({ user: student._id }).select('planType status startDate expiryDate price').sort({ createdAt: -1 }).lean(),
    UserService.find({ user: student._id }).select('serviceName status expiryDate price purchaseDate').sort({ createdAt: -1 }).lean(),
  ]);

  res.json({ student, payments, courses, memberships, services });
});

// ── POST /api/reception/students/:id/purchases ───────────────
// Body: { kind: 'course'|'plan'|'service'|'workshop', itemId, paymentMethod,
//         paymentReference, note }
// Cash needs no proof; every electronic method must carry its transaction /
// reference ID (M-Pesa code, card auth code, bank reference) so the sale is
// reconcilable like a real checkout.
export const recordPurchase = asyncHandler(async (req, res) => {
  const { kind, itemId, paymentMethod = 'Cash', paymentReference = '', note = '' } = req.body;

  if (!kind || !KINDS[kind]) {
    throw ApiError.badRequest(`kind must be one of: ${Object.keys(KINDS).join(', ')}`);
  }
  if (!itemId) throw ApiError.badRequest('itemId is required');
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw ApiError.badRequest(`paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`);
  }
  let reference = String(paymentReference || '').trim();
  if (paymentMethod === 'M-Pesa') reference = reference.toUpperCase();
  if (paymentMethod !== 'Cash' && !reference) {
    throw ApiError.badRequest(`${paymentMethod} payments require a transaction / reference ID`);
  }
  if (reference.length > 40) throw ApiError.badRequest('Transaction / reference ID is too long (max 40 characters)');
  const saleNote = String(note || '').trim().slice(0, 200);

  const student = await User.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');
  if (student.role !== 'student') throw ApiError.badRequest('Purchases can only be recorded for student accounts');
  if (student.status === 'banned') throw ApiError.forbidden('Cannot record a purchase for a suspended account');

  const { model, itemType, label } = KINDS[kind];
  const item = await model.findById(itemId).lean();
  if (!item) throw ApiError.notFound(`${label} not found`);
  if (item.active === false) throw ApiError.badRequest(`${label} is not currently on sale`);
  // Website parity: the desk honors the booking switch on the same-named
  // offering, exactly like the student dashboard does.
  if (kind === 'service') {
    const { isServiceBookingEnabled } = await import('../services/serviceBooking.js');
    if (!(await isServiceBookingEnabled(item))) throw ApiError.badRequest('Booking is not enabled for this service');
  }

  // Single-membership world: the counter may sell ONLY the visible
  // SOMA Wellness Circle — never hidden monthly tiers, passes, or DAILY.
  if (kind === 'plan') {
    if (item.visibility === 'hidden') throw ApiError.badRequest(`${label} is not currently on sale`);
    const { isCirclePlanName } = await import('../config/wellnessCircle.js');
    if (!isCirclePlanName(item.name)) {
      throw ApiError.badRequest('Only the SOMA Wellness Circle membership can be sold.');
    }
  }

  const price = Number(item.price || 0);
  const name = itemName(kind, item);

  // ── Duplicate protection (checked BEFORE any money record) ──
  if (kind === 'course') {
    const already = await Course.exists({ _id: item._id, 'enrolledUsers.user': student._id });
    if (already) throw ApiError.conflict(`${student.name} is already enrolled in "${name}"`);
  }
  if (kind === 'plan') {
    const active = await Membership.findOne({
      user: student._id,
      planType: item.name,
      status: 'active',
      expiryDate: { $gt: new Date() },
    }).lean();
    if (active) throw ApiError.conflict(`${student.name} already has an active "${item.name}" membership`);
  }
  if (kind === 'workshop') {
    // Same booking rules as student self-registration: published, seats
    // left, no duplicate, and the student's membership must unlock it.
    if (item.archived || !item.isPublished) throw ApiError.badRequest(`"${name}" is not currently on sale`);
    if ((item.registrations || []).some((r) => String(r.user) === String(student._id))) {
      throw ApiError.conflict(`${student.name} is already registered for "${name}"`);
    }
    if (item.capacity > 0 && (item.registrations || []).length >= item.capacity) {
      throw ApiError.badRequest(`"${name}" is full`);
    }
    if (item.allowedPlans && item.allowedPlans.length > 0) {
      const membership = await Membership.findOne({
        user: student._id,
        status: 'active',
        expiryDate: { $gt: new Date() },
      }).sort({ createdAt: -1 }).lean();
      const eligible = membership && item.allowedPlans.some(
        (ap) => ap.toLowerCase() === membership.planType.toLowerCase()
      );
      if (!eligible) throw ApiError.forbidden(`${student.name}'s current membership plan does not have access to this workshop`);
    }
  }

  const now = new Date();
  // Payment.amount convention is minor units (cents) everywhere else in the
  // system (admin manual payments, cart, M-Pesa). Store cents so revenue
  // reports and invoices stay consistent.
  const amountCents = Math.round(Number(price) * 100);
  const paymentItem = {
    itemType,
    itemId: String(item._id),
    name,
    quantity: 1,
    unitPrice: amountCents,
    totalPrice: amountCents,
    metadata: {
      paymentMethod,
      ...(reference ? { paymentReference: reference } : {}),
      ...(saleNote ? { note: saleNote } : {}),
      soldBy: String(req.user._id),
    },
  };

  const payment = await Payment.create({
    user: student._id,
    label: name,
    description: `Counter sale (${paymentMethod}${reference ? ` ${reference}` : ''}) by ${req.user.name || req.user.email}${saleNote ? ` — ${saleNote}` : ''}`,
    items: [paymentItem],
    amount: amountCents,
    currency: 'KES',
    gateway: 'manual',
    source: 'admin',
    paymentStatus: 'captured',
    fulfillmentStatus: 'pending',
    initiatedAt: now,
    capturedAt: now,
    attempts: [{ attempt: 1, action: 'counter_sale', timestamp: now }],
    auditTrail: [{
      action: 'counter_sale_recorded',
      from: 'initiated',
      to: 'captured',
      by: req.user._id,
      reason: `Front-desk ${paymentMethod} sale`,
    }],
  });

  // ── Fulfill (enroll / activate). A session is used for causal
  // consistency; no multi-doc transaction so this also works on
  // standalone MongoDB deployments.
  const session = await mongoose.startSession();
  let fulfillment;
  try {
    const service = new FulfillmentService();
    fulfillment = await service.activateItem(paymentItem, payment._id, student._id, session);
    payment.fulfillmentStatus = 'completed';
    payment.auditTrail.push({
      action: 'counter_sale_fulfilled',
      from: 'captured',
      to: 'captured',
      by: req.user._id,
      reason: `${label} activated`,
    });
    await payment.save();
  } catch (err) {
    payment.fulfillmentStatus = 'cancelled';
    payment.auditTrail.push({
      action: 'counter_sale_fulfillment_failed',
      from: 'captured',
      to: 'captured',
      by: req.user._id,
      reason: err.message,
    });
    await payment.save().catch(() => {});
    logger.error(MODULE, 'Counter-sale fulfillment failed', {
      paymentId: String(payment._id),
      error: err.message,
    });
    throw ApiError.conflict(`Payment recorded but activation failed: ${err.message}`);
  } finally {
    await session.endSession().catch(() => {});
  }

  ActivityLog.create({
    action: 'counter_sale',
    performedBy: req.user._id,
    targetUser: student._id,
    meta: { kind, itemId: String(item._id), name, price, paymentMethod, ...(reference ? { paymentReference: reference } : {}), paymentId: String(payment._id) },
  }).catch(() => {});

  notificationService.send(student._id, {
    template: 'invoice',
    channels: ['inApp', 'email'],
    data: {
      planName: name,
      amount: `KES ${price.toLocaleString('en-KE')}`,
      invoiceDate: now.toLocaleDateString('en-KE'),
      invoiceNumber: payment.invoiceNo || String(payment._id),
    },
    subject: `Your Soma Wellness purchase: ${name}`,
    message: `Hello ${student.name},<br><br>Your purchase of <strong>${name}</strong> (KES ${price.toLocaleString('en-KE')}, paid via ${paymentMethod}) is confirmed and active.`,
    priority: 'high',
  }).catch((err) => logger.error(MODULE, 'Sale invoice notification failed', {
    paymentId: String(payment._id),
    error: err.message,
  }));

  res.status(201).json({
    success: true,
    student: { _id: student._id, name: student.name, email: student.email },
    payment: {
      _id: payment._id,
      label: payment.label,
      amount: payment.amount,
      paymentStatus: payment.paymentStatus,
      fulfillmentStatus: payment.fulfillmentStatus,
      paymentMethod,
      ...(reference ? { paymentReference: reference } : {}),
      capturedAt: payment.capturedAt,
    },
    fulfillment,
  });
});
