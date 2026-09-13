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
};

const PAYMENT_METHODS = ['Cash', 'M-Pesa', 'Card', 'Bank transfer'];

function itemName(kind, doc) {
  if (kind === 'course') return doc.title;
  return doc.name;
}

// ── GET /api/reception/catalog ───────────────────────────────
export const getCatalog = asyncHandler(async (req, res) => {
  const [courses, plans, services] = await Promise.all([
    Course.find({ active: { $ne: false } })
      .select('title price duration mode description hours earlyPrice currency category')
      .sort({ price: 1 })
      .lean(),
    Plan.find({}).select('name price durationMonths benefits').sort({ price: 1 }).lean(),
    Service.find({ active: { $ne: false } })
      .select('name price category mode')
      .sort({ price: 1 })
      .lean(),
  ]);
  res.json({ courses, plans, services, paymentMethods: PAYMENT_METHODS });
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
// Body: { kind: 'course'|'plan'|'service', itemId, paymentMethod }
export const recordPurchase = asyncHandler(async (req, res) => {
  const { kind, itemId, paymentMethod = 'Cash' } = req.body;

  if (!kind || !KINDS[kind]) {
    throw ApiError.badRequest(`kind must be one of: ${Object.keys(KINDS).join(', ')}`);
  }
  if (!itemId) throw ApiError.badRequest('itemId is required');
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw ApiError.badRequest(`paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`);
  }

  const student = await User.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');
  if (student.role !== 'student') throw ApiError.badRequest('Purchases can only be recorded for student accounts');
  if (student.status === 'banned') throw ApiError.forbidden('Cannot record a purchase for a suspended account');

  const { model, itemType, label } = KINDS[kind];
  const item = await model.findById(itemId).lean();
  if (!item) throw ApiError.notFound(`${label} not found`);
  if (item.active === false) throw ApiError.badRequest(`${label} is not currently on sale`);

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

  const now = new Date();
  const paymentItem = {
    itemType,
    itemId: String(item._id),
    name,
    quantity: 1,
    unitPrice: price,
    totalPrice: price,
    metadata: { paymentMethod, soldBy: String(req.user._id) },
  };

  const payment = await Payment.create({
    user: student._id,
    label: name,
    description: `Counter sale (${paymentMethod}) by ${req.user.name || req.user.email}`,
    items: [paymentItem],
    amount: price,
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
    meta: { kind, itemId: String(item._id), name, price, paymentMethod, paymentId: String(payment._id) },
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
    subject: `Your SomaWellness purchase: ${name}`,
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
      capturedAt: payment.capturedAt,
    },
    fulfillment,
  });
});
