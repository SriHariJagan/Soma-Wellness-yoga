import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import User from '../models/User.js';
import Coupon from '../models/Coupon.js';
import Membership from '../models/Membership.js';
import UserService from '../models/UserService.js';
import Workshop from '../models/Workshop.js';
import Consultation from '../models/Consultation.js';
import ActivityLog from '../models/ActivityLog.js';
import Notification from '../models/Notification.js';
import NotificationRecipient from '../models/NotificationRecipient.js';

/* ── GET /api/student/orders ── */
export const getStudentOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = { student: req.user._id };

  if (type) {
    const orderIds = await OrderItem.distinct('order', { itemType: type });
    filter._id = { $in: orderIds };
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Order.countDocuments(filter),
  ]);

  const ordersWithItems = await Promise.all(
    orders.map(async (o) => {
      const items = await OrderItem.find({ order: o._id }).lean();
      return { ...o, items };
    }),
  );

  res.json({ orders: ordersWithItems, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

/* ── GET /api/student/orders/:id ── */
export const getStudentOrderDetail = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, student: req.user._id })
    .populate('payment')
    .populate('student', 'name email phone')
    .lean();
  if (!order) throw ApiError.notFound('Order not found');
  const items = await OrderItem.find({ order: order._id }).lean();
  let coupon = null;
  if (order.coupon) {
    coupon = await Coupon.findById(order.coupon).lean();
  }
  res.json({ ...order, items, coupon });
});

/* ── GET /api/admin/orders ── */
export const listAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, search, type, paymentMethod, dateFrom, dateTo } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  if (status) conditions.push({ status });
  if (paymentMethod) conditions.push({ paymentMethod });

  if (dateFrom || dateTo) {
    const dateFilter = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom);
    if (dateTo) dateFilter.$lte = new Date(dateTo);
    conditions.push({ createdAt: dateFilter });
  }

  if (type) {
    const typeOrderIds = await OrderItem.distinct('order', { itemType: type });
    conditions.push({ _id: { $in: typeOrderIds } });
  }

  if (search) {
    const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(esc, 'i');
    const [matchingStudents, matchingItems, matchingPayments] = await Promise.all([
      User.find({ $or: [{ name: regex }, { email: regex }] }).distinct('_id'),
      OrderItem.find({ name: regex }).distinct('order'),
      // Invoice / payment-reference search: Payment lives in its own
      // collection, so resolve matching payment ids first.
      (await import('../payment/models/Payment.js')).default.find({
        $or: [{ invoiceNo: regex }, { merchant_reference: regex }, { provider_transaction_id: regex }],
      }).distinct('_id'),
    ]);
    conditions.push({
      $or: [
        { orderNumber: regex },
        { couponCode: regex },
        { transactionId: regex },
        { student: { $in: matchingStudents } },
        { _id: { $in: matchingItems } },
        { payment: { $in: matchingPayments } },
      ],
    });
  }

  const filter = conditions.length > 0 ? { $and: conditions } : {};

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('student', 'name email phone')
      .populate('payment')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Order.countDocuments(filter),
  ]);

  const ordersWithItems = await Promise.all(
    orders.map(async (o) => {
      const items = await OrderItem.find({ order: o._id }).lean();
      return { ...o, items };
    }),
  );

  res.json({ orders: ordersWithItems, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

/* ── GET /api/admin/orders/:id ── (enriched) */
export const getOrderDetail = asyncHandler(async (req, res) => {
  const { default: mongoose } = await import('mongoose');
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw ApiError.notFound('Order not found');
  const order = await Order.findById(req.params.id)
    .populate('student', 'name email phone')
    .populate('payment')
    .lean();
  if (!order) throw ApiError.notFound('Order not found');

  const items = await OrderItem.find({ order: order._id }).lean();

  let coupon = null;
  if (order.coupon) {
    coupon = await Coupon.findById(order.coupon).lean();
  }

  const userId = order.student?._id || order.student || null;

  // Enrollment lookups are best-effort and parallel: a deleted catalog
  // entry or a non-ObjectId itemId must never 500 the whole detail view
  // or stall it serially. Each item falls back to `unknown`.
  const validId = (v) => mongoose.Types.ObjectId.isValid(v);
  const enrollments = await Promise.all(items.map(async (item) => {
    try {
      switch (item.itemType) {
        case 'plan': {
          const membership = validId(item.itemId) && userId
            ? await Membership.findOne({ user: userId, plan: item.itemId }).sort({ createdAt: -1 }).lean()
            : null;
          return { itemType: item.itemType, name: item.name, status: membership?.status || 'unknown', expiryDate: membership?.expiryDate, _id: membership?._id };
        }
        case 'service': {
          const us = validId(item.itemId) && userId
            ? await UserService.findOne({ user: userId, service: item.itemId }).sort({ createdAt: -1 }).lean()
            : null;
          return { itemType: item.itemType, name: item.name, status: us?.status || 'unknown', expiryDate: us?.expiryDate, _id: us?._id };
        }
        case 'course': {
          return { itemType: item.itemType, name: item.name, status: 'enrolled' };
        }
        case 'workshop': {
          const workshop = validId(item.itemId)
            ? await Workshop.findOne({ _id: item.itemId, 'registrations.user': userId }).lean()
            : null;
          const reg = workshop?.registrations?.find((r) => r.user?.toString() === userId?.toString());
          return { itemType: item.itemType, name: item.name, status: reg ? 'registered' : 'unknown', _id: item.itemId };
        }
        case 'consultation': {
          const consult = userId
            ? await Consultation.findOne({ user: userId, _id: item._id }).lean()
            : null;
          return { itemType: item.itemType, name: item.name, status: consult?.status || 'unknown', _id: consult?._id };
        }
        default:
          return { itemType: item.itemType, name: item.name, status: 'unknown' };
      }
    } catch {
      return { itemType: item.itemType, name: item.name, status: 'unknown' };
    }
  }));

  const timeline = await ActivityLog.find({
    $or: [
      { 'meta.orderId': order._id },
      { 'meta.orderNumber': order.orderNumber },
      { action: { $in: [/checkout/i, /order/i, /payment/i, /notif/i] }, targetUser: userId },
    ],
  })
    .select('action meta createdAt')
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();

  res.json({ ...order, items, coupon, enrollments, timeline });
});

/* ── DELETE /api/student/orders/:id/cancel ──
   Owner-scoped cancel of a still-pending checkout. Deletes the order +
   items and fails the linked payment (unless already captured). Gives
   students control instead of waiting for the 15-min sweeper. */
export const cancelStudentOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, student: req.user._id });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status !== 'pending') {
    throw ApiError.badRequest(`Only pending orders can be cancelled (current: ${order.status})`);
  }
  if (order.payment) {
    const Payment = (await import('../payment/models/Payment.js')).default;
    const pay = await Payment.findById(order.payment).select('paymentStatus').lean();
    if (pay?.paymentStatus === 'captured') {
      // Paid while the cancel raced verify — heal instead of deleting.
      order.status = 'completed';
      await order.save();
      return res.json({ success: true, msg: 'Payment already completed — order confirmed.', orderNumber: order.orderNumber, status: order.status });
    }
    await Payment.updateOne(
      { _id: order.payment, paymentStatus: { $ne: 'captured' } },
      { $set: { paymentStatus: 'failed', failedAt: new Date(), failure_reason: 'Cancelled by student' } },
    );
  }
  await OrderItem.deleteMany({ order: order._id });
  const CouponUsage = (await import('../models/CouponUsage.js')).default;
  await CouponUsage.deleteMany({ order: order._id }).catch(() => {});
  await Order.deleteOne({ _id: order._id, status: 'pending' });
  await ActivityLog.create({
    action: 'order_cancelled_by_student',
    performedBy: req.user._id,
    targetUser: req.user._id,
    meta: { orderId: order._id, orderNumber: order.orderNumber },
  }).catch(() => {});
  res.json({ success: true, msg: 'Pending order cancelled.', orderNumber: order.orderNumber });
});

/* ── POST /api/admin/orders/:id/resend-notification ── */
export const resendOrderNotification = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('student', 'name email')
    .populate('payment', 'invoiceNo merchant_reference provider_transaction_id')
    .lean();
  if (!order) throw ApiError.notFound('Order not found');
  const items = await OrderItem.find({ order: order._id }).lean();

  const itemList = items.map((i) => `\u2022 ${i.name}`).join('\n');
  const title = 'Purchase Successful';
  const message = `You have successfully enrolled in:\n${itemList}\n\nInvoice: ${order.payment?.invoiceNo || order.orderNumber}\nAmount Paid: KES ${(order.total || 0).toLocaleString('en-KE')}`;

  const notif = await Notification.create({ email: order.student?.email || 'system', title, message, type: 'general', sender: order.student?._id, recipientCount: 1 });
  await NotificationRecipient.create({ notification: notif._id, student: order.student?._id });
  if (order.student?._id) await User.findByIdAndUpdate(order.student._id, { $inc: { unreadNotifications: 1 } });

  await ActivityLog.create({ action: 'Resent purchase notification', performedBy: req.user._id, targetUser: order.student?._id, meta: { orderId: order._id, orderNumber: order.orderNumber } });

  res.json({ success: true, msg: 'Purchase notification resent successfully.' });
});
