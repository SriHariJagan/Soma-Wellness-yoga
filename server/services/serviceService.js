import UserService from '../models/UserService.js';
import Service from '../models/Service.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import FreeTrial from '../models/FreeTrial.js';
import ClassInvite from '../models/ClassInvite.js';
import { PaymentRepository } from '../payment/repository/PaymentRepository.js';
import { notify } from './notificationService.js';
import { isSingleSessionService, SINGLE_SESSION_VALIDITY_DAYS } from '../utils/serviceHelpers.js';
import notificationService from '../notification/core/NotificationService.js';
import logger from '../notification/logger.js';

const MODULE = 'ServiceService';

const DAY = 86400000;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export async function buildStudentServices(userId) {
  const services = await UserService.find({ user: userId })
    .populate('service', 'name slug')
    .populate('instructor', 'name avatar')
    .populate('payment', 'amount status method transactionId invoiceNo')
    .sort({ createdAt: -1 });

  const now = new Date();
  const activeList = services.filter((s) => s.isActive);
  const archivedList = services.filter((s) => !s.isActive);
  const expiringSoon = activeList.filter(
    (s) => s.expiryDate && s.daysLeft <= 14
  );

  const activeSessions = activeList.reduce((a, s) => a + (s.totalSessions || 0), 0);
  const activeUsed = activeList.reduce((a, s) => a + (s.usedSessions || 0), 0);

  const catalog = await Service.find({ active: true })
    .populate('instructor', 'name avatar')
    .sort({ displayOrder: 1, name: 1 });

  return {
    services: activeList.map(formatService),
    archived: archivedList.map(formatService),
    stats: {
      totalServices: activeList.length + archivedList.length,
      activeServices: activeList.length,
      archivedServices: archivedList.length,
      expiringSoon: expiringSoon.length,
      totalSessions: activeSessions,
      usedSessions: activeUsed,
      remainingSessions: Math.max(0, activeSessions - activeUsed),
    },
    catalog: catalog.map((s) => ({
      _id: s._id,
      name: s.name,
      description: s.description,
      category: s.category,
      type: s.type,
      mode: s.mode,
      instructor: s.instructor ? { _id: s.instructor._id, name: s.instructor.name } : null,
      price: s.price,
      totalSessions: s.totalSessions,
      durationWeeks: s.durationWeeks,
      scheduleDays: s.scheduleDays,
      scheduleTime: s.scheduleTime,
      image: s.image,
      isPopular: s.isPopular,
    })),
  };
}

function calcTimeBetweenDates(start, end) {
  if (!start || !end) return 0;
  const total = new Date(end).getTime() - new Date(start).getTime();
  if (total <= 0) return 100;
  const elapsed = Date.now() - new Date(start).getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

function calcProgressPct(us) {
  if (us.frozenProgressPct !== null && us.frozenProgressPct !== undefined) return us.frozenProgressPct;
  return calcTimeBetweenDates(us.activationDate, us.expiryDate);
}

function formatService(us) {
  return {
    _id: us._id,
    service: us.service ? { _id: us.service._id, name: us.serviceName } : { _id: us.service?._id, name: us.serviceName },
    instructor: us.instructor
      ? { _id: us.instructor._id, name: us.instructorName || us.instructor.name }
      : null,
    payment: us.payment
      ? { _id: us.payment._id, amount: us.payment.amount, status: us.payment.paymentStatus || us.payment.status, method: us.payment.gateway || us.payment.method, transactionId: us.payment.transactionId, invoiceNo: us.payment.invoiceNo }
      : null,
    serviceName: us.serviceName,
    serviceDesc: us.serviceDesc,
    category: us.category,
    type: us.type,
    mode: us.mode,
    instructorName: us.instructorName,
    scheduleDays: us.scheduleDays,
    scheduleTime: us.scheduleTime,
    price: us.price,
    totalSessions: us.totalSessions,
    usedSessions: us.usedSessions,
    remainingSessions: us.remainingSessions,
    status: us.status,
    paymentStatus: us.paymentStatus,
    transactionId: us.transactionId,
    purchaseDate: us.purchaseDate,
    activationDate: us.activationDate,
    expiryDate: us.expiryDate,
    completionDate: us.completionDate,
    daysLeft: us.daysLeft,
    isActive: us.isActive,
    progressPct: calcProgressPct(us),
    frozenProgressPct: us.frozenProgressPct,
    history: us.history || [],
    createdAt: us.createdAt,
    updatedAt: us.updatedAt,
  };
}

export async function purchaseService(userId, serviceId, options = {}) {
  const service = await Service.findById(serviceId).populate('instructor', 'name');
  if (!service) throw Object.assign(new Error('Service not found'), { statusCode: 404 });
  if (!service.active) throw Object.assign(new Error('Service is not available'), { statusCode: 400 });

  const now = new Date();

  const singleSession = isSingleSessionService(service.name);

  if (singleSession) {
    const existingActive = await UserService.findOne({ user: userId, service: serviceId, status: 'active' });
    if (existingActive) throw Object.assign(new Error('You already have an active enrollment for this service'), { statusCode: 409 });
  } else {
    const existing = await UserService.findOne({ user: userId, service: serviceId, status: 'active' });
    if (existing) throw Object.assign(new Error('You already have an active enrollment for this service'), { statusCode: 409 });
  }

  let expiryDate;
  let totalSessions;
  if (singleSession) {
    totalSessions = 1;
    expiryDate = options.expiryDate || new Date(now.getTime() + SINGLE_SESSION_VALIDITY_DAYS * DAY);
  } else {
    totalSessions = service.totalSessions || 0;
    const durationMs = (service.durationWeeks || 4) * 7 * DAY;
    expiryDate = options.expiryDate || new Date(now.getTime() + durationMs);
  }

  const paymentStatus = options.paymentStatus || 'paid';

  const userService = await UserService.create({
    user: userId,
    service: serviceId,
    instructor: service.instructor?._id || null,
    serviceName: service.name,
    serviceDesc: service.description || '',
    category: service.category || '',
    type: service.type || '',
    mode: service.mode || '',
    instructorName: service.instructor?.name || '',
    scheduleDays: service.scheduleDays || [],
    scheduleTime: service.scheduleTime || '',
    price: options.price ?? service.price ?? 0,
    totalSessions,
    status: 'active',
    paymentStatus,
    transactionId: options.transactionId || '',
    purchaseDate: now,
    activationDate: now,
    expiryDate,
    history: [{ action: 'purchased', note: `Enrolled in ${service.name}`, at: now }],
  });

  let payment;
  if (options.performedBy) {
    const paymentRepo = new PaymentRepository();
    payment = await paymentRepo.createManualPayment({
      user: userId,
      label: `${service.name} (Admin Enrollment)`,
      amount: (options.price ?? service.price ?? 0) * 100,
      description: `Admin enrollment in ${service.name}`,
      items: [{
        itemType: 'service',
        itemId: serviceId,
        name: service.name,
        quantity: 1,
        unitPrice: (options.price ?? service.price ?? 0) * 100,
        totalPrice: (options.price ?? service.price ?? 0) * 100,
      }],
      adminId: options.performedBy,
      receiptUrl: options.receiptUrl || '',
    });
  }

  userService.payment = payment ? payment._id : null;
  await userService.save();

  if (singleSession) {
    await notify(userId, {
      title: 'Service activated',
      message: `Your <strong>${service.name}</strong> service has been activated. It is valid for 7 days and includes one session.`,
      type: 'success',
    });
  } else {
    await notify(userId, {
      title: 'Service enrolled',
      message: `You are now enrolled in <strong>${service.name}</strong>.`,
      type: 'success',
    });
  }
  const userDoc = await User.findById(userId).select('name').lean();
  notificationService.send(userId, {
    template: 'service-enrollment',
    channels: ['inApp', 'email'],
    data: {
      name: userDoc?.name || 'Student',
      serviceName: service.name,
      dashboardUrl: `${process.env.FRONTEND_URL || 'https://somawellness.in'}/dashboard`,
    },
    subject: `Enrolled in ${service.name}`,
    priority: 'normal',
  }).catch((err) => logger.error(MODULE, 'Enrollment email failed', { error: err.message }));

  return userService;
}

export async function renewUserService(userServiceId, options = {}) {
  const us = await UserService.findById(userServiceId).populate('service', 'name totalSessions durationWeeks');
  if (!us) throw Object.assign(new Error('Service enrollment not found'), { statusCode: 404 });

  const now = new Date();
  const singleSession = isSingleSessionService(us.serviceName);

  let newExpiry;
  if (singleSession) {
    newExpiry = new Date(now.getTime() + SINGLE_SESSION_VALIDITY_DAYS * DAY);
  } else {
    const base = us.expiryDate && us.expiryDate > now ? us.expiryDate.getTime() : now.getTime();
    const durationWeeks = us.service?.durationWeeks || 4;
    newExpiry = new Date(base + durationWeeks * 7 * DAY);
  }

  us.status = 'active';
  us.expiryDate = newExpiry;
  us.usedSessions = 0;
  us.completionDate = null;
  us.frozenProgressPct = null;
  if (singleSession) {
    us.totalSessions = 1;
  } else {
    us.totalSessions = us.service?.totalSessions || us.totalSessions;
  }
  us.history.push({ action: 'renewed', note: `Renewed ${us.serviceName}`, at: now });

  let payment;
  if (options.performedBy) {
    const paymentRepo = new PaymentRepository();
    payment = await paymentRepo.createManualPayment({
      user: us.user,
      label: `${us.serviceName} (Admin Renewal)`,
      amount: (options.price ?? us.price ?? 0) * 100,
      description: `Admin renewal of ${us.serviceName}`,
      items: [{
        itemType: 'service',
        itemId: us.service?._id || null,
        name: us.serviceName,
        quantity: 1,
        unitPrice: (options.price ?? us.price ?? 0) * 100,
        totalPrice: (options.price ?? us.price ?? 0) * 100,
      }],
      adminId: options.performedBy,
      receiptUrl: options.receiptUrl || '',
    });
  }

  us.payment = payment ? payment._id : null;
  await us.save();

  await notify(us.user, {
    title: 'Service renewed',
    message: `Your <strong>${us.serviceName}</strong> has been renewed until ${newExpiry.toLocaleDateString('en-KE')}.`,
    type: 'success',
  });
  const userDoc = await User.findById(us.user).select('name').lean();
  notificationService.send(us.user, {
    template: 'service-enrollment',
    channels: ['inApp', 'email'],
    data: {
      name: userDoc?.name || 'Student',
      serviceName: us.serviceName,
      dashboardUrl: `${process.env.FRONTEND_URL || 'https://somawellness.in'}/dashboard`,
    },
    subject: `Service renewed: ${us.serviceName}`,
    priority: 'normal',
  }).catch((err) => logger.error(MODULE, 'Renewal email failed', { error: err.message }));

  return us;
}

function calcFrozenPct(us, now = new Date()) {
  if (!us.activationDate || !us.expiryDate) return null;
  const total = us.expiryDate.getTime() - us.activationDate.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - us.activationDate.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export async function expireDueServices() {
  const due = await UserService.find({ status: 'active', expiryDate: { $lte: new Date() } });
  const now = new Date();
  for (const us of due) {
    us.status = 'expired';
    us.frozenProgressPct = calcFrozenPct(us, now);
    us.history.push({ action: 'expired', note: 'Service period ended', at: now });
    await us.save();
  }
  return due.length;
}

export async function consumeSession(userServiceId) {
  const us = await UserService.findById(userServiceId);
  if (!us) throw Object.assign(new Error('Service enrollment not found'), { statusCode: 404 });
  if (!us.isActive) throw Object.assign(new Error('Service is not active'), { statusCode: 400 });
  if (us.status === 'completed') throw Object.assign(new Error('This service has already been completed.'), { statusCode: 400 });

  if (isSingleSessionService(us.serviceName)) {
    us.usedSessions = 1;
    us.totalSessions = 1;
    us.status = 'completed';
    us.completionDate = new Date();
    us.frozenProgressPct = 100;
    us.history = us.history || [];
    us.history.push({ action: 'completed', note: 'Session consumed — service completed', at: new Date() });
  } else {
    us.usedSessions = (us.usedSessions || 0) + 1;
  }
  await us.save();
  return us;
}

export async function getServiceAnalytics() {
  const now = new Date();
  const [totalAssignments, activeAssignments, revenueAgg, byService] = await Promise.all([
    UserService.countDocuments(),
    UserService.countDocuments({ status: 'active', $or: [{ expiryDate: { $gt: now } }, { expiryDate: null }] }),
    UserService.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]),
    UserService.aggregate([
      { $group: { _id: '$serviceName', count: { $sum: 1 }, revenue: { $sum: '$price' } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return {
    totalEnrollments: totalAssignments,
    activeEnrollments: activeAssignments,
    totalRevenue: revenueAgg[0]?.total || 0,
    topServices: byService.slice(0, 10),
    expiringSoon: await UserService.countDocuments({
      status: 'active',
      expiryDate: { $gte: now, $lte: new Date(now.getTime() + 14 * DAY) },
    }),
  };
}

export async function buildAllEnrollments(userId) {
  const now = new Date();

  const [userServices, memberships, trials, invites] = await Promise.all([
    UserService.find({ user: userId })
      .populate('instructor', 'name avatar')
      .populate('payment', 'amount status method transactionId invoiceNo')
      .sort({ createdAt: -1 }),
    Membership.find({ user: userId }).sort({ createdAt: -1 }),
    FreeTrial.find({ user: userId }).sort({ createdAt: -1 }),
    ClassInvite.find({
      'recipients.user': userId,
      entityType: { $in: ['course', 'workshop', 'yttc'] },
    }).sort({ date: -1 }),
  ]);

  const enrollments = [];

  for (const us of userServices) {
    const e = formatService(us);
    e.type = 'service';
    e.typeLabel = 'Service';
    enrollments.push(e);
  }

  for (const m of memberships) {
    enrollments.push({
      _id: m._id,
      type: 'membership',
      typeLabel: 'Plan',
      name: m.planType,
      status: m.computedStatus || m.status,
      computedStatus: m.computedStatus,
      isActive: m.isActive,
      paymentStatus: null,
      progressPct: m.isActive ? calcTimeBetweenDates(m.startDate, m.expiryDate) : (m.sessionsProgressPct || 0),
      activationDate: m.startDate,
      expiryDate: m.expiryDate,
      purchaseDate: m.startDate,
      daysLeft: m.daysLeft,
      category: null,
      typeMeta: null,
      mode: null,
      instructorName: null,
      scheduleDays: [],
      scheduleTime: null,
      price: m.price,
      totalSessions: m.totalSessions,
      usedSessions: m.completedSessions,
      remainingSessions: m.remainingSessions,
      transactionId: null,
      invoiceNo: null,
      payment: null,
      history: m.history || [],
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    });
  }

  for (const t of trials) {
    const isActive = t.status === 'active' && t.endDate > now;
    enrollments.push({
      _id: t._id,
      type: 'trial',
      typeLabel: 'Trial',
      name: 'Free Trial',
      status: isActive ? 'active' : t.status,
      isActive,
      paymentStatus: null,
      progressPct: isActive ? calcTimeBetweenDates(t.startDate, t.endDate) : (t.sessionsProgressPct || 0),
      activationDate: t.startDate,
      expiryDate: t.endDate,
      purchaseDate: t.startDate,
      daysLeft: t.daysLeft || 0,
      category: null,
      typeMeta: null,
      mode: null,
      instructorName: null,
      scheduleDays: [],
      scheduleTime: null,
      price: 0,
      totalSessions: t.maxSessions,
      usedSessions: t.completedSessions,
      remainingSessions: t.sessionsLeft,
      transactionId: null,
      invoiceNo: null,
      payment: null,
      history: t.history || [],
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    });
  }

  const seenEntities = new Set();
  for (const invite of invites) {
    const recipient = invite.recipients.find((r) => r.user.toString() === userId.toString());
    if (!recipient) continue;
    const key = `${invite.entityType}-${invite.entityId || invite._id}`;
    if (seenEntities.has(key)) continue;
    seenEntities.add(key);

    const isPast = invite.date < now;
    const isCancelled = invite.status === 'cancelled';
    const isActive = !isPast && !isCancelled;

    enrollments.push({
      _id: invite._id,
      type: invite.entityType,
      typeLabel: invite.entityType === 'course' ? 'Course' : invite.entityType === 'workshop' ? 'Workshop' : 'YTTC',
      name: invite.entityName || invite.title,
      status: isCancelled ? 'cancelled' : isPast ? 'completed' : 'active',
      isActive,
      paymentStatus: null,
      progressPct: recipient?.status === 'joined' ? 100 : (isPast ? 100 : 0),
      activationDate: null,
      expiryDate: invite.date,
      purchaseDate: null,
      daysLeft: isActive ? Math.max(0, Math.ceil((invite.date - now) / 86400000)) : 0,
      category: null,
      typeMeta: null,
      mode: null,
      instructorName: invite.instructor || null,
      scheduleDays: [],
      scheduleTime: `${invite.startTime} - ${invite.endTime}`,
      price: 0,
      totalSessions: null,
      usedSessions: null,
      remainingSessions: null,
      transactionId: null,
      invoiceNo: null,
      payment: null,
      history: [],
      createdAt: invite.createdAt,
      updatedAt: invite.updatedAt,
    });
  }

  enrollments.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  const activeList = enrollments.filter((e) => e.isActive);
  const archivedList = enrollments.filter((e) => !e.isActive);
  const expiringSoon = activeList.filter((e) => e.daysLeft !== null && e.daysLeft <= 14);
  const totalSess = activeList.reduce((a, e) => a + (e.totalSessions || 0), 0);
  const usedSess = activeList.reduce((a, e) => a + (e.usedSessions || 0), 0);

  const catalog = await Service.find({ active: true })
    .populate('instructor', 'name avatar')
    .sort({ displayOrder: 1, name: 1 });

  return {
    enrollments,
    stats: {
      activeCount: activeList.length,
      archivedCount: archivedList.length,
      expiringSoon: expiringSoon.length,
      totalSessions: totalSess,
      remainingSessions: Math.max(0, totalSess - usedSess),
    },
    catalog: catalog.map((s) => ({
      _id: s._id,
      name: s.name,
      description: s.description,
      category: s.category,
      type: s.type,
      mode: s.mode,
      instructor: s.instructor ? { _id: s.instructor._id, name: s.instructor.name } : null,
      price: s.price,
      totalSessions: s.totalSessions,
      durationWeeks: s.durationWeeks,
      scheduleDays: s.scheduleDays,
      scheduleTime: s.scheduleTime,
      image: s.image,
      isPopular: s.isPopular,
    })),
  };
}

export default {
  buildStudentServices,
  buildAllEnrollments,
  purchaseService,
  renewUserService,
  expireDueServices,
  consumeSession,
  getServiceAnalytics,
};
