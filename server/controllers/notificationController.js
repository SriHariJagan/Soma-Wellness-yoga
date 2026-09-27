import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import Notification from '../models/Notification.js';
import NotificationRecipient from '../models/NotificationRecipient.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Plan from '../models/Plan.js';
import Service from '../models/Service.js';
import Course from '../models/Course.js';
import Workshop from '../models/Workshop.js';
import UserService from '../models/UserService.js';
import ApiError from '../utils/ApiError.js';
import ActivityLog from '../models/ActivityLog.js';

async function log(action, req, targetUser = null, meta = {}) {
  try { await ActivityLog.create({ action, performedBy: req.user._id, targetUser, meta }); }
  catch (e) { /* non-fatal */ }
}

/* ============================================================
   ADMIN ENDPOINTS
   ============================================================ */

/**
 * GET /api/admin/notifications
 * List all notifications sent by admin, with stats per notification
 */
export const listNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [notifications, total] = await Promise.all([
    Notification.find()
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Notification.countDocuments(),
  ]);

  res.json({ notifications, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

/**
 * GET /api/admin/notifications/:id
 * Get full details of a notification including recipient read status
 */
export const getNotificationDetail = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id)
    .populate('sender', 'name email')
    .lean();
  if (!notification) throw ApiError.notFound('Notification not found');

  const [recipients, readCount, unreadCount] = await Promise.all([
    NotificationRecipient.find({ notification: req.params.id })
      .populate('student', 'name email phone avatar')
      .sort({ isRead: 1, createdAt: -1 })
      .lean(),
    NotificationRecipient.countDocuments({ notification: req.params.id, isRead: true }),
    NotificationRecipient.countDocuments({ notification: req.params.id, isRead: false }),
  ]);

  res.json({
    notification,
    recipients,
    stats: {
      total: recipients.length,
      read: readCount,
      unread: unreadCount,
      readPercent: recipients.length > 0 ? Math.round((readCount / recipients.length) * 100) : 0,
    },
  });
});

/**
 * POST /api/admin/notifications/send
 * Send notification to selected recipients. Accepts:
 * {
 *   title, message, type, priority,
 *   url, route, courseId, serviceId, planId, workshopId,
 *   recipientIds: ["userId1", "userId2", ...]
 * }
 */
export const sendNotification = asyncHandler(async (req, res) => {
  const {
    title, message, type, priority,
    url, route, courseId, serviceId, planId, workshopId,
    recipientIds,
  } = req.body;

  if (!title || !title.trim()) throw ApiError.badRequest('Title is required');
  if (!message || !message.trim()) throw ApiError.badRequest('Message is required');
  if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
    throw ApiError.badRequest('At least one recipient is required');
  }

  // Deduplicate valid student IDs
  const validStudents = await User.find({
    _id: { $in: recipientIds },
    role: 'student',
    status: { $ne: 'banned' },
  }).distinct('_id');

  if (validStudents.length === 0) throw ApiError.badRequest('No valid student recipients found');

  const notification = await Notification.create({
    email: 'broadcast',
    title: title.trim(),
    message: message.trim(),
    type: type || 'general',
    priority: priority || 'normal',
    sender: req.user._id,
    url: url || '',
    route: route || '',
    courseId: courseId || null,
    serviceId: serviceId || null,
    planId: planId || null,
    workshopId: workshopId || null,
    recipientCount: validStudents.length,
    readCount: 0,
  });

  // Create individual recipient records
  const recipientDocs = validStudents.map((studentId) => ({
    notification: notification._id,
    student: studentId,
    deliveredAt: new Date(),
  }));

  await NotificationRecipient.insertMany(recipientDocs);

  // Increment unread count for each recipient
  await User.updateMany(
    { _id: { $in: validStudents } },
    { $inc: { unreadNotifications: 1 } },
  );

  // Update notification with actual recipient count
  await Notification.findByIdAndUpdate(notification._id, { recipientCount: validStudents.length });

  try { await log(`Sent notification "${title}" to ${validStudents.length} students`, req); } catch {}

  res.status(201).json({
    success: true,
    notification,
    recipientCount: validStudents.length,
  });
});

/**
 * GET /api/admin/notifications/stats
 */
export const getNotificationStats = asyncHandler(async (req, res) => {
  const [totalSent, totalRecipients, totalRead, recentNotifications] = await Promise.all([
    Notification.countDocuments(),
    Notification.aggregate([{ $group: { _id: null, total: { $sum: '$recipientCount' } } }]),
    Notification.aggregate([{ $group: { _id: null, total: { $sum: '$readCount' } } }]),
    Notification.find()
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  res.json({
    totalSent,
    totalRecipients: totalRecipients[0]?.total || 0,
    totalRead: totalRead[0]?.total || 0,
    recentNotifications,
  });
});

/* ============================================================
   RECIPIENT QUERY ENDPOINTS
   ============================================================ */

/**
 * GET /api/admin/notifications/recipients?category=...
 * Returns student IDs and details based on the selected category.
 */
export const getRecipientsByCategory = asyncHandler(async (req, res) => {
  const { category, entityId, search } = req.query;

  let students = [];

  switch (category) {
    case 'all': {
      students = await User.find({ role: 'student', status: { $ne: 'banned' } })
        .select('name email phone avatar status')
        .sort({ name: 1 })
        .lean();
      break;
    }

    case 'membership_plan': {
      if (!entityId) {
        const plans = await Plan.find({ active: true }).select('name durationMonths').sort({ displayOrder: 1 }).lean();
        return res.json({ plans });
      }
      const membershipUserIds = await Membership.find({ plan: entityId, status: 'active' }).distinct('user');
      students = await User.find({ _id: { $in: membershipUserIds }, role: 'student', status: { $ne: 'banned' } })
        .select('name email phone avatar status')
        .sort({ name: 1 })
        .lean();
      break;
    }

    case 'service_member': {
      if (!entityId) {
        const services = await Service.find({ active: true }).select('name').sort({ displayOrder: 1 }).lean();
        return res.json({ services });
      }
      const serviceUserIds = await UserService.find({ service: entityId, status: 'active' }).distinct('user');
      students = await User.find({ _id: { $in: serviceUserIds }, role: 'student', status: { $ne: 'banned' } })
        .select('name email phone avatar status')
        .sort({ name: 1 })
        .lean();
      break;
    }

    case 'course_student': {
      if (!entityId) {
        const courses = await Course.find({ active: true }).select('title').sort({ title: 1 }).lean();
        return res.json({ courses });
      }
      const courseUserIds = await UserService.find({ service: entityId, status: 'active' }).distinct('user');
      students = await User.find({ _id: { $in: courseUserIds }, role: 'student', status: { $ne: 'banned' } })
        .select('name email phone avatar status')
        .sort({ name: 1 })
        .lean();
      break;
    }

    case 'workshop_participant': {
      if (!entityId) {
        const workshops = await Workshop.find({ archived: { $ne: true } }).select('name date').sort({ date: -1 }).lean();
        return res.json({ workshops });
      }
      const workshop = await Workshop.findById(entityId).lean();
      if (!workshop) throw ApiError.notFound('Workshop not found');
      const participantIds = workshop.registrations.map((r) => r.user);
      students = await User.find({ _id: { $in: participantIds }, role: 'student', status: { $ne: 'banned' } })
        .select('name email phone avatar status')
        .sort({ name: 1 })
        .lean();
      break;
    }

    case 'trial_student': {
      const FreeTrial = mongoose.models.FreeTrial;
      if (!FreeTrial) {
        students = [];
        break;
      }
      const trialUserIds = await FreeTrial.find({ status: 'active' }).distinct('user');
      students = await User.find({ _id: { $in: trialUserIds }, role: 'student', status: { $ne: 'banned' } })
        .select('name email phone avatar status')
        .sort({ name: 1 })
        .lean();
      break;
    }

    case 'expired_membership': {
      const expiredUserIds = await Membership.find({ expiryDate: { $lte: new Date() }, status: 'expired' }).distinct('user');
      students = await User.find({ _id: { $in: expiredUserIds }, role: 'student', status: { $ne: 'banned' } })
        .select('name email phone avatar status')
        .sort({ name: 1 })
        .lean();
      break;
    }

    case 'pending_payment': {
      const Payment = mongoose.models.Payment;
      if (!Payment) {
        students = [];
        break;
      }
      const pendingUserIds = await Payment.find({ paymentStatus: 'pending' }).distinct('user');
      students = await User.find({ _id: { $in: pendingUserIds }, role: 'student', status: { $ne: 'banned' } })
        .select('name email phone avatar status')
        .sort({ name: 1 })
        .lean();
      break;
    }

    case 'active_membership': {
      const activeUserIds = await Membership.find({ status: 'active', expiryDate: { $gt: new Date() } }).distinct('user');
      students = await User.find({ _id: { $in: activeUserIds }, role: 'student', status: { $ne: 'banned' } })
        .select('name email phone avatar status')
        .sort({ name: 1 })
        .lean();
      break;
    }

    case 'custom': {
      if (search && search.length >= 2) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        students = await User.find({
          role: 'student',
          status: { $ne: 'banned' },
          $or: [
            { name: regex },
            { email: regex },
            { phone: regex },
          ],
        })
          .select('name email phone avatar status')
          .sort({ name: 1 })
          .limit(50)
          .lean();
      }
      break;
    }

    default:
      throw ApiError.badRequest(`Unknown recipient category: ${category}`);
  }

  // Enrich with membership status
  const enriched = await enrichStudentsWithStatus(students);

  res.json({ students: enriched });
});

async function enrichStudentsWithStatus(students) {
  if (!students.length) return [];

  const userIds = students.map((s) => s._id);
  const memberships = await Membership.find({ user: { $in: userIds }, status: 'active', expiryDate: { $gt: new Date() } })
    .populate('plan', 'name')
    .lean();

  const membershipMap = {};
  for (const m of memberships) {
    membershipMap[m.user.toString()] = m;
  }

  return students.map((s) => ({
    _id: s._id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    avatar: s.avatar,
    membershipPlan: membershipMap[s._id.toString()]?.plan?.name || null,
    membershipStatus: membershipMap[s._id.toString()] ? 'Active' : 'Inactive',
  }));
}

/* ============================================================
   STUDENT ENDPOINTS
   ============================================================ */

/**
 * GET /api/student/notifications
 * Fetch paginated notifications for the current student.
 * Supports filters: type, status (all|unread|read), page, limit
 */
export const getStudentNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, status } = req.query;
  const userId = req.user._id;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = { student: userId, deleted: false };

  if (status === 'unread') filter.isRead = false;
  if (status === 'read') filter.isRead = true;
  if (status === 'archived') filter.archived = true;
  else filter.archived = false;
  if (type) {
    const types = type.split(',').map((t) => t.trim()).filter(Boolean);
    const matchingNotifs = await Notification.find({ type: { $in: types } }).distinct('_id');
    if (matchingNotifs.length > 0) {
      filter.notification = { $in: matchingNotifs };
    } else {
      filter.notification = null;
    }
  }

  const [recipients, total] = await Promise.all([
    NotificationRecipient.find(filter)
      .populate({
        path: 'notification',
        populate: { path: 'sender', select: 'name' },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    NotificationRecipient.countDocuments(filter),
  ]);

  const unreadCount = await NotificationRecipient.countDocuments({
    student: userId,
    isRead: false,
    deleted: false,
    archived: false,
  });

  const notifications = recipients.map((r) => ({
    _id: r._id,
    notificationId: r.notification?._id,
    title: r.notification?.title || '',
    message: r.notification?.message || '',
    type: r.notification?.type || 'general',
    priority: r.notification?.priority || 'normal',
    sender: r.notification?.sender?.name || 'Soma Wellness',
    url: r.notification?.url || '',
    route: r.notification?.route || '',
    courseId: r.notification?.courseId,
    serviceId: r.notification?.serviceId,
    planId: r.notification?.planId,
    workshopId: r.notification?.workshopId,
    isRead: r.isRead,
    readAt: r.readAt,
    archived: r.archived,
    createdAt: r.createdAt,
  }));

  res.json({ notifications, total, unreadCount, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

/**
 * PATCH /api/student/notifications/:id/read
 */
export const markStudentNotificationRead = asyncHandler(async (req, res) => {
  const recipient = await NotificationRecipient.findOne({
    _id: req.params.id,
    student: req.user._id,
  });
  if (!recipient) throw ApiError.notFound('Notification not found');

  if (!recipient.isRead) {
    recipient.isRead = true;
    recipient.readAt = new Date();
    await recipient.save();

    // Update notification read count
    await Notification.findByIdAndUpdate(recipient.notification, { $inc: { readCount: 1 } });
    // Decrement student unread count
    await User.findByIdAndUpdate(req.user._id, { $inc: { unreadNotifications: -1 } });
  }

  res.json({ success: true });
});

/**
 * PATCH /api/student/notifications/read-all
 */
export const markAllStudentNotificationsRead = asyncHandler(async (req, res) => {
  const result = await NotificationRecipient.updateMany(
    { student: req.user._id, isRead: false, archived: false, deleted: false },
    { isRead: true, readAt: new Date() },
  );

  if (result.modifiedCount > 0) {
    // Recalculate unread count instead of bulk decrement for accuracy
    const unreadCount = await NotificationRecipient.countDocuments({
      student: req.user._id,
      isRead: false,
      archived: false,
      deleted: false,
    });

    // Update read counts on affected notifications
    const affectedRecipients = await NotificationRecipient.find({
      student: req.user._id,
      readAt: { $ne: null },
      isRead: true,
    }).distinct('notification');

    for (const notifId of affectedRecipients) {
      const readCount = await NotificationRecipient.countDocuments({ notification: notifId, isRead: true });
      await Notification.findByIdAndUpdate(notifId, { readCount });
    }

    await User.findByIdAndUpdate(req.user._id, { unreadNotifications: unreadCount });
  }

  res.json({ success: true, marked: result.modifiedCount });
});

/**
 * PATCH /api/student/notifications/:id/archive
 */
export const archiveStudentNotification = asyncHandler(async (req, res) => {
  const recipient = await NotificationRecipient.findOneAndUpdate(
    { _id: req.params.id, student: req.user._id },
    { archived: true },
    { new: true },
  );
  if (!recipient) throw ApiError.notFound('Notification not found');

  if (!recipient.isRead) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { unreadNotifications: -1 } });
  }

  res.json({ success: true });
});

/**
 * DELETE /api/student/notifications/:id (soft delete)
 */
export const deleteStudentNotification = asyncHandler(async (req, res) => {
  const recipient = await NotificationRecipient.findOneAndUpdate(
    { _id: req.params.id, student: req.user._id },
    { deleted: true },
    { new: true },
  );
  if (!recipient) throw ApiError.notFound('Notification not found');

  if (!recipient.isRead) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { unreadNotifications: -1 } });
  }

  res.json({ success: true });
});

/**
 * GET /api/student/notifications/unread-count
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await NotificationRecipient.countDocuments({
    student: req.user._id,
    isRead: false,
    archived: false,
    deleted: false,
  });
  res.json({ unreadCount: count });
});
