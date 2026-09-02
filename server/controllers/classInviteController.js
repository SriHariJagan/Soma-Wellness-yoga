import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ClassInvite from '../models/ClassInvite.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import UserService from '../models/UserService.js';
import FreeTrial from '../models/FreeTrial.js';
import Workshop from '../models/Workshop.js';
import Batch from '../models/Batch.js';
import Course from '../models/Course.js';
import Service from '../models/Service.js';
import { notify } from '../services/notificationService.js';
import ActivityLog from '../models/ActivityLog.js';
import { isSingleSessionService } from '../utils/serviceHelpers.js';

async function log(action, req, targetUser = null, meta = {}) {
  return ActivityLog.create({
    action,
    admin: req.user?._id,
    targetUser,
    meta,
    ip: req.ip,
  });
}

async function getFilteredStudents(filter) {
  const { recipientType, batchId, serviceId, courseId, workshopId, planType, inviteCategory } = filter;
  let userIds = [];

  switch (recipientType) {

    case 'yttc_students': {
      const users = await User.find({
        role: 'student',
        'yttcEnrollment.isEnrolled': true,
        'yttcEnrollment.status': 'active',
      }).select('_id');
    
      userIds = users.map(u => u._id);
      break;
    }

    case 'all_members': {
      // Paused members are excluded from invitations. Only active
      // (non-paused, non-expired) memberships are eligible.
      const pipeline = await Membership.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$user' } },
        { $match: { _id: { $ne: null } } },
      ]);
      userIds = pipeline.map(r => r._id);
      break;
    }
    case 'service_members': {
      const query = { status: 'active' };
      if (serviceId) query.service = serviceId;
      const assignments = await UserService.find(query).populate('user', '_id');
      userIds = assignments.map(a => a.user?._id).filter(Boolean);
      break;
    }
    case 'batch': {
      if (!batchId) return [];
      const users = await User.find({ batch: batchId, role: 'student' }).select('_id');
      userIds = users.map(u => u._id);
      break;
    }
    case 'course': {
      if (!courseId) return [];
      const users = await User.find({ enrolledCourses: courseId, role: 'student' }).select('_id');
      userIds = users.map(u => u._id);
      break;
    }
    case 'trial': {
      const trials = await FreeTrial.find({ status: 'active' }).populate('user', '_id');
      userIds = trials.map(t => t.user?._id).filter(Boolean);
      break;
    }
    case 'workshop': {
      if (!workshopId) return [];
      const workshop = await Workshop.findById(workshopId);
      if (!workshop) return [];
      userIds = workshop.registrations.map(r => r.user).filter(Boolean);
      break;
    }
    case 'custom':
    default:
      userIds = filter.studentIds || [];
      break;
  }

  const unique = [...new Set(userIds.map(id => id.toString()))];
  const users = await User.find({ _id: { $in: unique } }).select('name email phone city batch status role');
  return users;
}

// ── Admin endpoints ──

// Diagnostic: compare Membership counts with recipient counts
export const debugMembershipRecipients = asyncHandler(async (req, res) => {
  const now = new Date();
  const [
    totalMemberships,
    activeMemberships,
    statusOnlyResult,   // unique users by status='active' only (the production query)
  ] = await Promise.all([
    Membership.countDocuments(),
    Membership.countDocuments({ status: 'active' }),
    Membership.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$user' } },
      { $match: { _id: { $ne: null } } },
    ]),
  ]);

  const uniqueUserIds = [...new Set(statusOnlyResult.map(r => r._id.toString()))];
  const userDocs = await User.find({ _id: { $in: uniqueUserIds } }).select('name email phone status');

  // Fetch memberships with expiryDate stored as string (type check)
  const stringDates = await Membership.aggregate([
    { $match: { status: 'active' } },
    { $match: { $expr: { $eq: [{ $type: '$expiryDate' }, 'string'] } } },
    { $project: { user: 1, expiryDate: 1 } },
  ]);

  // Memberships missing a user reference
  const noUserMemberships = await Membership.countDocuments({ status: 'active', user: { $exists: false } });
  const nullUserMemberships = await Membership.countDocuments({ status: 'active', user: null });

  // Also list every active-status membership with its user info for manual comparison
  const allActiveMemberships = await Membership.find({ status: 'active' })
    .populate('user', 'name email')
    .lean();

  res.json({
    summary: {
      totalMemberships,
      activeStatus: activeMemberships,
      uniqueUsersFromStatusOnly: uniqueUserIds.length,
      usersFound: userDocs.length,
      stringDateCount: stringDates.length,
      membershipsWithNoUser: noUserMemberships + nullUserMemberships,
    },
    stringDateMemberships: stringDates,
    uniqueUserIds,
    users: userDocs.map(u => ({ _id: u._id, name: u.name, email: u.email, status: u.status })),
    allActiveMemberships: allActiveMemberships.map(m => ({
      membershipId: m._id,
      user: m.user ? { _id: m.user._id, name: m.user.name, email: m.user.email } : null,
      planType: m.planType,
      expiryDate: m.expiryDate,
      expiryDateType: typeof m.expiryDate,
      status: m.status,
    })),
    serverTime: now.toISOString(),
  });
});

export const getRecipients = asyncHandler(async (req, res) => {
  const { type, batchId, serviceId, courseId, workshopId, planType, search, inviteCategory } = req.query;

  const finalType =
    inviteCategory === 'yttc' && (!type || type === 'custom')
      ? 'yttc_students'
      : type;

  const students = await getFilteredStudents({
    recipientType: finalType,
    batchId,
    serviceId,
    courseId,
    workshopId,
    planType,
    inviteCategory,
  });

  if (search) {
    const q = search.toLowerCase();
    return res.json(students.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q)
    ));
  }

  res.json(students);
});

export const getServiceEligibleStudents = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const { search } = req.query;

  if (!serviceId) throw ApiError.badRequest('serviceId is required');

  const service = await Service.findById(serviceId).select('name active');
  if (!service) throw ApiError.notFound('Service not found');

  const isSingleSession = isSingleSessionService(service.name);

  const enrollments = await UserService.find({
    service: serviceId,
    status: 'active',
    paymentStatus: 'paid',
  }).populate('user', 'name email phone');

  const eligible = enrollments.filter(e => {
    const remaining = (e.totalSessions || 0) - (e.usedSessions || 0);
    return remaining > 0;
  });

  let result = eligible.map(e => ({
    _id: e.user?._id,
    name: e.user?.name || '',
    email: e.user?.email || '',
    phone: e.user?.phone || '',
    enrollmentId: e._id,
    purchaseDate: e.purchaseDate,
    expiryDate: e.expiryDate,
    remainingSessions: (e.totalSessions || 0) - (e.usedSessions || 0),
    usedSessions: e.usedSessions || 0,
    totalSessions: e.totalSessions || 0,
    status: e.status,
  }));

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q)
    );
  }

  res.json({
    serviceName: service.name,
    isSingleSession,
    students: result,
    totalEligible: result.length,
  });
});

async function resolveEntityMeta(recipientType, recipientFilter) {
  // Returns { entityType, entityId, entityName, entityLabel } based on the
  // recipient filter so every invitation permanently knows what it belongs to.
  switch (recipientType) {
    case 'all_members': {
      // If a specific plan type was selected, try to find it
      return { entityType: 'membership', entityId: null, entityName: 'Membership Plan', entityLabel: 'Membership' };
    }
    case 'service_members': {
      if (recipientFilter?.serviceId) {
        const svc = await Service.findById(recipientFilter.serviceId).select('name');
        if (svc) return { entityType: 'service', entityId: svc._id, entityName: svc.name, entityLabel: svc.name };
      }
      return { entityType: 'service', entityId: null, entityName: 'Service', entityLabel: 'Service' };
    }
    case 'batch': {
      if (recipientFilter?.batchId) {
        const b = await Batch.findById(recipientFilter.batchId).select('name');
        if (b) return { entityType: 'batch', entityId: b._id, entityName: b.name, entityLabel: b.name };
      }
      return { entityType: 'batch', entityId: null, entityName: 'Batch', entityLabel: 'Batch' };
    }
    case 'course': {
      if (recipientFilter?.courseId) {
        const c = await Course.findById(recipientFilter.courseId).select('title');
        if (c) return { entityType: 'course', entityId: c._id, entityName: c.title, entityLabel: c.title };
      }
      return { entityType: 'course', entityId: null, entityName: 'Course', entityLabel: 'Course' };
    }
    case 'workshop': {
      if (recipientFilter?.workshopId) {
        const w = await Workshop.findById(recipientFilter.workshopId).select('name');
        if (w) return { entityType: 'workshop', entityId: w._id, entityName: w.name, entityLabel: w.name };
      }
      return { entityType: 'workshop', entityId: null, entityName: 'Workshop', entityLabel: 'Workshop' };
    }
    case 'trial':
      return { entityType: 'trial', entityId: null, entityName: 'Free Trial', entityLabel: 'Free Trial' };
    case 'custom':
    default:
      return { entityType: 'none', entityId: null, entityName: '', entityLabel: '' };
  }
}

export const createInvite = asyncHandler(async (req, res) => {
  const {
    title, description, date, startTime, endTime, duration,
    instructor, platform, meetingLink, meetingPassword, notes, attachments,
    recipientType, recipientFilter, reminderConfig, studentIds,
    inviteCategory = 'class',
    entityType, entityId, entityName, entityLabel,
  } = req.body;

  if (!title || !date || !startTime) {
    return res.status(400).json({ message: 'Title, date, and start time are required.' });
  }

  let recipients = [];
  if (Array.isArray(studentIds) && studentIds.length > 0) {
    const users = await User.find({ _id: { $in: studentIds } }).select('name email');
    // Check for paused members and warn
    const pausedMemberships = await Membership.find({
      user: { $in: studentIds },
      status: 'paused',
    }).populate('user', 'name email');
    const pausedUserIds = new Set(pausedMemberships.map(pm => pm.user?._id?.toString()).filter(Boolean));
    const pausedNames = pausedMemberships
      .map(pm => pm.user?.name || pm.user?.email || 'Unknown')
      .filter(Boolean);

    if (pausedNames.length > 0) {
      return res.status(400).json({
        message: `The following students have a paused membership and cannot receive invitations: ${pausedNames.join(', ')}. Please resume their membership first.`,
        pausedStudents: pausedNames,
      });
    }

    recipients = users.map(u => ({
      user: u._id,
      name: u.name || '',
      email: u.email || '',
      status: 'pending',
    }));
  } else {
    const filter = {
      recipientType,
      batchId: recipientFilter?.batchId,
      serviceId: recipientFilter?.serviceId,
      courseId: recipientFilter?.courseId,
      workshopId: recipientFilter?.workshopId,
      inviteCategory,
    };
    const students = await getFilteredStudents(filter);
    recipients = students.map(s => ({
      user: s._id,
      name: s.name || '',
      email: s.email || '',
      status: 'pending',
    }));
  }

  if (recipients.length === 0) {
    return res.status(400).json({ message: 'No recipients found for the selected criteria.' });
  }

  // Dedup: reject if identical invite (title + date + startTime + recipientType)
  // was created within the last 2 minutes by the same admin
  const duplicateWindow = new Date(Date.now() - 2 * 60 * 1000);
  const existing = await ClassInvite.findOne({
    title,
    date: new Date(date),
    startTime,
    recipientType,
    createdBy: req.user._id,
    createdAt: { $gte: duplicateWindow },
    status: { $ne: 'cancelled' },
  });
  if (existing) {
    return res.status(409).json({
      message: 'A duplicate invitation was detected. Please wait before creating another.',
    });
  }

  // Resolve entity linkage — prefer explicit body fields, fall back to auto-resolution
  let resolvedEntity;
  if (entityType && entityType !== 'none') {
    resolvedEntity = { entityType, entityId: entityId || null, entityName: entityName || '', entityLabel: entityLabel || '' };
  } else {
    resolvedEntity = await resolveEntityMeta(recipientType, recipientFilter || {});
  }

  const invite = await ClassInvite.create({
    title,
    inviteCategory,
    description: description || '',
    date,
    startTime,
    endTime: endTime || '',
    duration: duration || 60, instructor: instructor || '', platform: platform || 'Zoom',
    meetingLink: meetingLink || '', meetingPassword: meetingPassword || '', notes: notes || '',
    attachments: attachments || '',
    recipientType: recipientType || 'custom',
    recipientFilter: recipientFilter || {},
    reminderConfig: reminderConfig || { enabled: false, reminders: [1440, 60, 15] },
    ...resolvedEntity,
    recipients,
    createdBy: req.user._id,
    totalRecipients: recipients.length,
    pendingCount: recipients.length,
    history: [{ action: 'created', note: `Invitation created for ${recipients.length} students`, by: req.user._id, at: new Date() }],
  });

  const entityNameForNotif = resolvedEntity.entityName || '';
  const isSingleSessionNotif = entityNameForNotif && isSingleSessionService(entityNameForNotif);

  for (const r of recipients) {
    let notifMessage;
    if (isSingleSessionNotif) {
      notifMessage = `You have been invited for your <strong>${entityNameForNotif}</strong> session on ${new Date(date).toLocaleDateString('en-KE')} at ${startTime}.${notes ? ` ${notes}` : ''}${meetingPassword ? ` Password: ${meetingPassword}` : ''}`;
    } else {
      notifMessage = `You have been invited to "${title}" on ${new Date(date).toLocaleDateString('en-KE')} at ${startTime}.${notes ? ` ${notes}` : ''}${meetingPassword ? ` Password: ${meetingPassword}` : ''}`;
    }
    await notify(r.user, {
      title: `${inviteCategory === 'yttc' ? 'YTTC Class Invitation' : 'Class Invitation'}: ${title}`,
      message: notifMessage,
      type: inviteCategory === 'yttc' ? 'yttc' : 'class',
      link: meetingLink || '',
      channels: ['inApp', 'email'],
    });
  }

  invite.deliveredCount = recipients.length;
  await invite.save();

  await log(`Created class invite "${title}" for ${recipients.length} students`, req);

  const populated = await ClassInvite.findById(invite._id).populate('createdBy', 'name');
  res.status(201).json({ success: true, invite: populated });
});

export const getInvites = asyncHandler(async (req, res) => {
  const { search, status, inviteCategory = 'class', page = 1, limit = 20 } = req.query;
  const query = { inviteCategory };
  if (status && status !== 'all') query.status = status;
  if (search) {
    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { instructor: { $regex: safeSearch, $options: 'i' } },
    ];
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [invites, total] = await Promise.all([
    ClassInvite.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    ClassInvite.countDocuments(query),
  ]);
  res.json({ invites, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

export const getInviteById = asyncHandler(async (req, res) => {
  const invite = await ClassInvite.findById(req.params.id)
    .populate('createdBy', 'name')
    .populate('recipients.user', 'name email phone avatar city');
  if (!invite) return res.status(404).json({ message: 'Invitation not found' });
  res.json(invite);
});

export const cancelInvite = asyncHandler(async (req, res) => {
  const invite = await ClassInvite.findById(req.params.id);
  if (!invite) return res.status(404).json({ message: 'Invitation not found' });
  if (invite.status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });

  invite.status = 'cancelled';
  invite.cancelledAt = new Date();
  invite.cancelReason = req.body.reason || '';
  invite.history.push({ action: 'cancelled', note: `Cancelled by admin. Reason: ${invite.cancelReason}`, by: req.user._id, at: new Date() });
  await invite.save();

  for (const r of invite.recipients) {
    await notify(r.user, {
      title: `Class Cancelled: ${invite.title}`,
      message: `The class "${invite.title}" scheduled for ${new Date(invite.date).toLocaleDateString('en-KE')} at ${invite.startTime} has been cancelled.`,
      type: 'class',
    });
  }

  await log(`Cancelled class invite "${invite.title}"`, req);
  res.json({ success: true, invite });
});

export const resendInvite = asyncHandler(async (req, res) => {
  const invite = await ClassInvite.findById(req.params.id);
  if (!invite) return res.status(404).json({ message: 'Invitation not found' });

  let sentCount = 0;
  for (const r of invite.recipients) {
    if (r.status !== 'read' && r.status !== 'joined') {
      await notify(r.user, {
        title: `Reminder: ${invite.title}`,
        message: `Reminder: "${invite.title}" is scheduled for ${new Date(invite.date).toLocaleDateString('en-KE')} at ${invite.startTime}.${invite.notes ? ` ${invite.notes}` : ''}${invite.meetingPassword ? ` Password: ${invite.meetingPassword}` : ''}`,
        type: 'class',
        link: invite.meetingLink || '',
        channels: ['inApp', 'email'],
      });
      r.notified = true;
      r.notifiedAt = new Date();
      sentCount++;
    }
  }
  invite.history.push({ action: 'resent', note: `Resent to ${sentCount} pending students`, by: req.user._id, at: new Date() });
  await invite.save();

  await log(`Resent class invite "${invite.title}" to ${sentCount} students`, req);
  res.json({ success: true, sentCount });
});

export const duplicateInvite = asyncHandler(async (req, res) => {
  const original = await ClassInvite.findById(req.params.id);
  if (!original) return res.status(404).json({ message: 'Invitation not found' });

  const invite = await ClassInvite.create({
    title: `${original.title} (Copy)`,
    inviteCategory: original.inviteCategory || 'class',
    description: original.description,
    date: original.date,
    startTime: original.startTime,
    endTime: original.endTime,
    duration: original.duration,
    instructor: original.instructor,
    platform: original.platform,
    meetingLink: original.meetingLink,
    meetingPassword: original.meetingPassword,
    notes: original.notes,
    recipientType: original.recipientType,
    recipientFilter: original.recipientFilter,
    reminderConfig: original.reminderConfig,
    entityType: original.entityType,
    entityId: original.entityId,
    entityName: original.entityName,
    entityLabel: original.entityLabel,
    createdBy: req.user._id,
    recipients: [],
    history: [{ action: 'duplicated', note: `Duplicated from "${original.title}"`, by: req.user._id, at: new Date() }],
  });

  await log(`Duplicated class invite "${original.title}" → "${invite.title}"`, req);
  res.status(201).json({ success: true, invite });
});

export const getInviteStats = asyncHandler(async (req, res) => {
  const { inviteCategory = 'class' } = req.query;
  const query = { inviteCategory };

  const total = await ClassInvite.countDocuments(query);
  const active = await ClassInvite.countDocuments({ ...query, status: 'active' });
  const cancelled = await ClassInvite.countDocuments({ ...query, status: 'cancelled' });
  const upcoming = await ClassInvite.countDocuments({ ...query, status: 'active', date: { $gte: new Date() } });
  const totalRecipients = await ClassInvite.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: '$totalRecipients' } } },
  ]);
  const totalRead = await ClassInvite.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: '$readCount' } } },
  ]);
  res.json({
    total, active, cancelled, upcoming,
    totalRecipients: totalRecipients[0]?.total || 0,
    totalRead: totalRead[0]?.total || 0,
  });
});

// ── Student endpoints ──

export const getMyInvites = asyncHandler(async (req, res) => {
  const now = new Date();
  const { inviteCategory = 'class' } = req.query;

  const query = {
    inviteCategory,
    'recipients.user': req.user._id,
    status: { $ne: 'cancelled' },
  };

  if (inviteCategory === 'yttc') {
    const user = await User.findById(req.user._id).select('yttcEnrollment');
    if (!user?.yttcEnrollment?.isEnrolled || user.yttcEnrollment?.status !== 'active') {
      return res.json([]);
    }
  }

  const invites = await ClassInvite.find(query).sort({ date: -1 });

  const enriched = invites.map(invite => {
    const my = invite.recipients.find(r => r.user.toString() === req.user._id.toString());
    const startDateTime = new Date(invite.date);
    const [h, m] = (invite.startTime || '00:00').split(':').map(Number);
    startDateTime.setHours(h, m, 0, 0);

    let computedStatus = 'upcoming';
    if (invite.status === 'cancelled') computedStatus = 'cancelled';
    else if (now > startDateTime && now < new Date(startDateTime.getTime() + (invite.duration || 60) * 60000)) computedStatus = 'live';
    else if (now > new Date(startDateTime.getTime() + (invite.duration || 60) * 60000)) computedStatus = 'completed';

    return {
      ...invite.toObject(),
      myStatus: my?.status || 'pending',
      myReadAt: my?.readAt || null,
      myJoinedAt: my?.joinedAt || null,
      computedStatus,
      entityBadge: invite.entityLabel || invite.entityName || '',
    };
  });

  res.json(enriched);
});

export const getMyInviteById = asyncHandler(async (req, res) => {
  const { inviteCategory = 'class' } = req.query;

  if (inviteCategory === 'yttc') {
    const user = await User.findById(req.user._id).select('yttcEnrollment');
    if (!user?.yttcEnrollment?.isEnrolled || user.yttcEnrollment?.status !== 'active') {
      return res.status(403).json({ message: 'YTTC enrollment is required to view this invitation.' });
    }
  }

  const invite = await ClassInvite.findOne({
    _id: req.params.id,
    inviteCategory,
    'recipients.user': req.user._id,
  }).populate('createdBy', 'name');

  if (!invite) return res.status(404).json({ message: 'Invitation not found' });

  const now = new Date();
  const my = invite.recipients.find(r => r.user.toString() === req.user._id.toString());
  const startDateTime = new Date(invite.date);
  const [h, m] = (invite.startTime || '00:00').split(':').map(Number);
  startDateTime.setHours(h, m, 0, 0);

  let computedStatus = 'upcoming';
  if (invite.status === 'cancelled') computedStatus = 'cancelled';
  else if (now > startDateTime && now < new Date(startDateTime.getTime() + (invite.duration || 60) * 60000)) computedStatus = 'live';
  else if (now > new Date(startDateTime.getTime() + (invite.duration || 60) * 60000)) computedStatus = 'completed';

  res.json({
    ...invite.toObject(),
    myStatus: my?.status || 'pending',
    myReadAt: my?.readAt || null,
    myJoinedAt: my?.joinedAt || null,
    computedStatus,
    entityBadge: invite.entityLabel || invite.entityName || '',
  });
});

export const markInviteRead = asyncHandler(async (req, res) => {
  const invite = await ClassInvite.findOneAndUpdate(
    { _id: req.params.id, 'recipients.user': req.user._id },
    {
      $set: {
        'recipients.$.status': 'read',
        'recipients.$.readAt': new Date(),
      },
      $inc: { readCount: 1 },
    },
    { returnDocument: 'after' }
  );
  if (!invite) return res.status(404).json({ message: 'Invitation not found' });
  res.json({ success: true });
});

export const trackJoin = asyncHandler(async (req, res) => {
const { inviteCategory = 'class' } = req.query;
  const invite = await ClassInvite.findOne({
    _id: req.params.id,
    inviteCategory,
    'recipients.user': req.user._id,
    status: { $ne: 'cancelled' },
  });
  if (!invite) {
    return res.status(404).json({ message: 'Invitation not found' });
  }
  if (invite.inviteCategory === 'yttc') {
    const user = await User.findById(req.user._id).select('yttcEnrollment');
    if (!user?.yttcEnrollment?.isEnrolled || user.yttcEnrollment?.status !== 'active') {
      return res.status(403).json({
        message: 'YTTC enrollment is required to join this class.',
      });
    }
  }
  if (!invite.meetingLink) {
    return res.status(400).json({
      message: 'Meeting link is not available for this invitation.',
    });
  }
  const recipient = invite.recipients.find(
    (r) => r.user.toString() === req.user._id.toString()
  );

  if (!recipient) {
    return res.status(404).json({ message: 'Recipient not found' });
  }

  const wasJoined = recipient.status === 'joined';

  if (!wasJoined) {
    if (recipient.status !== 'read') {
      invite.readCount = (invite.readCount || 0) + 1;
      recipient.readAt = recipient.readAt || new Date();
    }

    recipient.status = 'joined';
    recipient.joinedAt = new Date();

    invite.history.push({
      action: 'joined',
      note: `${recipient.name || recipient.email || 'Student'} joined the class`,
      by: req.user._id,
      at: new Date(),
    });

    await invite.save();
  }

  res.json({
    success: true,
    meetingLink: invite.meetingLink,
    joinedAt: recipient.joinedAt,
    status: recipient.status,
  });
});
