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
    const matchingStudents = await User.find({
      $or: [{ name: regex }, { email: regex }],
    }).distinct('_id');
    const matchingItems = await OrderItem.find({ name: regex }).distinct('order');
    conditions.push({
      $or: [
        { orderNumber: regex },
        { couponCode: regex },
        { student: { $in: matchingStudents } },
        { _id: { $in: matchingItems } },
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

  const userId = order.student?._id || order.student;

  const enrollments = [];
  for (const item of items) {
    switch (item.itemType) {
      case 'plan': {
        const membership = await Membership.findOne({ user: userId, plan: item.itemId })
          .sort({ createdAt: -1 })
          .lean();
        enrollments.push({ itemType: item.itemType, name: item.name, status: membership?.status || 'unknown', expiryDate: membership?.expiryDate, _id: membership?._id });
        break;
      }
      case 'service': {
        const us = await UserService.findOne({ user: userId, service: item.itemId })
          .sort({ createdAt: -1 })
          .lean();
        enrollments.push({ itemType: item.itemType, name: item.name, status: us?.status || 'unknown', expiryDate: us?.expiryDate, _id: us?._id });
        break;
      }
      case 'course': {
        enrollments.push({ itemType: item.itemType, name: item.name, status: 'enrolled' });
        break;
      }
      case 'workshop': {
        const workshop = await Workshop.findOne({ _id: item.itemId, 'registrations.user': userId }).lean();
        const reg = workshop?.registrations?.find((r) => r.user?.toString() === userId.toString());
        enrollments.push({ itemType: item.itemType, name: item.name, status: reg ? 'registered' : 'unknown', _id: item.itemId });
        break;
      }
      case 'consultation': {
        const consult = await Consultation.findOne({ user: userId, _id: item._id }).lean();
        enrollments.push({ itemType: item.itemType, name: item.name, status: consult?.status || 'unknown', _id: consult?._id });
        break;
      }
      default:
        enrollments.push({ itemType: item.itemType, name: item.name, status: 'unknown' });
    }
  }

  const timeline = await ActivityLog.find({
    $or: [
      { 'meta.orderId': order._id },
      { 'meta.orderNumber': order.orderNumber },
      { action: { $in: [/checkout/i, /order/i, /payment/i, /notif/i] }, targetUser: userId },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  res.json({ ...order, items, coupon, enrollments, timeline });
});

/* ── POST /api/admin/orders/:id/resend-notification ── */
export const resendOrderNotification = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('student', 'name email').lean();
  if (!order) throw ApiError.notFound('Order not found');
  const items = await OrderItem.find({ order: order._id }).lean();

  const itemList = items.map((i) => `\u2022 ${i.name}`).join('\n');
  const title = 'Purchase Successful';
  const message = `You have successfully enrolled in:\n${itemList}\n\nInvoice: ${order.payment?.invoiceNo || order.orderNumber}\nAmount Paid: \u20B9${(order.total || 0).toLocaleString('en-KE')}`;

  const notif = await Notification.create({ email: order.student?.email || 'system', title, message, type: 'general', sender: order.student?._id, recipientCount: 1 });
  await NotificationRecipient.create({ notification: notif._id, student: order.student?._id });
  if (order.student?._id) await User.findByIdAndUpdate(order.student._id, { $inc: { unreadNotifications: 1 } });

  await ActivityLog.create({ action: 'Resent purchase notification', performedBy: req.user._id, targetUser: order.student?._id, meta: { orderId: order._id, orderNumber: order.orderNumber } });

  res.json({ success: true, msg: 'Purchase notification resent successfully.' });
});
