import asyncHandler from '../utils/asyncHandler.js';
import FreeTrial from '../models/FreeTrial.js';
import TrialSession from '../models/TrialSession.js';
import TrialNotification from '../models/TrialNotification.js';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import { TRIAL_STATUSES } from '../shared/constants/index.js';

const MAX_SESSIONS = 7;
const MAX_DAYS = 7;
const REMINDER_THRESHOLD = 6; // Notify when 6 of 7 sessions completed

function addHistory(trial, action, note, by) {
  if (!trial.history) trial.history = [];
  let byVal = by?._id || by;
  // 'system' is not a valid ObjectId — store without `by` so validation passes
  if (byVal === 'system') byVal = undefined;
  const entry = { action, note, at: new Date() };
  if (byVal) entry.by = byVal;
  trial.history.push(entry);
}

async function createNotification(trialId, userId, type, title, body, createdBy) {
  let creator = createdBy?._id || createdBy;
  if (creator === 'system') creator = undefined;
  const doc = { trial: trialId, user: userId, type, title, body };
  if (creator) doc.createdBy = creator;
  return TrialNotification.create(doc);
}

function computeSessionStatus(session, now) {
  if (session.cancelled) return 'cancelled';
  if (session.status === 'cancelled') return 'cancelled';
  if (session.status === 'rescheduled') return 'rescheduled';
  if (session.status === 'completed') return 'completed';
  if (session.status === 'missed') return 'missed';

  if (session.attended === true) return 'completed';
  if (session.attended === false && session.status !== 'scheduled') return 'missed';

  return 'upcoming';
}

function computeCountdown(session, now) {
  const [h, m] = (session.startTime || '00:00').split(':').map(Number);
  const sessionStart = new Date(session.date);
  sessionStart.setHours(h, m, 0, 0);
  const diff = sessionStart.getTime() - now.getTime();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return { text: `Starts in ${days}d ${hours}h`, type: 'days' };
  if (hours > 0) return { text: `Starts in ${hours}h ${minutes}m`, type: 'hours' };
  return { text: `Starts in ${minutes}m`, type: 'minutes' };
}

function enrichSession(session, now) {
  const s = session.toObject ? session.toObject() : session;
  s.computedStatus = computeSessionStatus(session, now);
  s.countdown = computeCountdown(session, now);
  return s;
}

async function checkAndExpireTrial(trial) {
  if (trial.status !== 'active') return false;
  const now = new Date();
  const timeExpired = trial.endDate <= now;
  const sessionsExpired = trial.completedSessions >= trial.maxSessions;
  if (timeExpired || sessionsExpired) {
    trial.status = 'expired';
    if (sessionsExpired) trial.completedAt = new Date();
    addHistory(trial, 'expired', `Trial ended. Days: ${trial.daysLeft <= 0 ? 'expired' : 'remaining'}, Sessions completed: ${trial.completedSessions}/${trial.maxSessions}`, 'system');
    await trial.save();
    await createNotification(trial._id, trial.user, 'announcement', 'Free trial ended', sessionsExpired
      ? `You have completed all ${trial.maxSessions} trial sessions. Upgrade to a membership to continue!`
      : 'Your 7-day free trial has ended. Upgrade to a membership to continue!', 'system');
    return true;
  }
  return false;
}

async function checkAndSendCompletionReminder(trial, sessionCount) {
  if (trial.status !== 'active') return;
  const threshold = REMINDER_THRESHOLD;
  if (sessionCount >= threshold && sessionCount < trial.maxSessions && !trial.reminderSent) {
    trial.reminderSent = true;
    await trial.save();
    await createNotification(trial._id, trial.user, 'reminder',
      'Your Free Trial is Almost Complete!',
      `You've completed ${sessionCount} of ${trial.maxSessions} trial sessions. Your free trial will end after ${trial.maxSessions} sessions. To continue your yoga journey without interruption, explore our membership plans and courses.`,
      'system'
    );
  }
}

// ── Student endpoints ──

export const checkTrialEligibility = asyncHandler(async (req, res) => {
  const user = req.user;

  const existing = await FreeTrial.findOne({ user: user._id }).sort({ createdAt: -1 });

  let hasUsedTrial = false;
  let hasActiveTrial = false;
  let trialUsedMessage = '';

  if (existing) {
    if (existing.status === 'active') {
      hasActiveTrial = true;
      trialUsedMessage = 'You already have an active free trial.';
    } else if (TRIAL_STATUSES.filter(s => s !== 'active').includes(existing.status)) {
      hasUsedTrial = true;
      trialUsedMessage = 'You have already used your 7-day free trial. Upgrade to a membership to continue your yoga journey.';
    }
  }

  const activeMembership = await Membership.findOne({ user: user._id, status: 'active', expiryDate: { $gt: new Date() } });

  const hasActivePlan = !!activeMembership;
  const eligible = !hasActivePlan && !hasUsedTrial && !hasActiveTrial;

  res.json({
    eligible,
    hasActivePlan,
    hasUsedTrial,
    hasActiveTrial,
    message: eligible
      ? 'You are eligible for the 7-day free trial.'
      : hasActivePlan
        ? 'The free trial is only available for students without an active membership plan.'
        : trialUsedMessage,
  });
});

export const startTrial = asyncHandler(async (req, res) => {
  const user = req.user;

  const existing = await FreeTrial.findOne({ user: user._id }).sort({ createdAt: -1 });
  if (existing) {
    return res.status(400).json({ message: 'You have already used your free trial. Free trial can only be activated once per account.' });
  }

  const activeMembership = await Membership.findOne({ user: user._id, status: 'active', expiryDate: { $gt: new Date() } });
  if (activeMembership) {
    return res.status(400).json({ message: 'You already have an active membership. Free trial is only available for students without an active plan.' });
  }

  const trial = await FreeTrial.create({
    user: user._id,
    startDate: new Date(),
    endDate: new Date(Date.now() + MAX_DAYS * 86400000),
    maxSessions: MAX_SESSIONS,
    completedSessions: 0,
    status: 'active',
    history: [{ action: 'started', note: 'Free trial started', at: new Date() }],
  });

  const populated = await FreeTrial.findById(trial._id).populate('user', 'name email phone avatar');
  res.json({ success: true, trial: populated });
});

export const getMyTrial = asyncHandler(async (req, res) => {
  let trial = await FreeTrial.findOne({ user: req.user._id }).sort({ createdAt: -1 }).populate('user', 'name email phone avatar');
  if (!trial) return res.json({ status: 'none' });
  if (trial.status === 'active') await checkAndExpireTrial(trial);
  const now = new Date();
  const sessions = await TrialSession.find({ trial: trial._id, user: req.user._id }).sort({ date: 1, startTime: 1 });
  const completedSessions = sessions.filter(s => s.status === 'completed' || s.status === 'missed').length;
  const presentSessions = sessions.filter(s => s.status === 'completed').length;
  const absentSessions = sessions.filter(s => s.status === 'missed').length;
  const cancelledSessions = sessions.filter(s => s.status === 'cancelled').length;
  const rescheduledSessions = sessions.filter(s => s.status === 'rescheduled').length;
  if (completedSessions !== trial.completedSessions) {
    trial.completedSessions = completedSessions;
    await trial.save();
  }
  await checkAndExpireTrial(trial);
  res.json({ ...trial.toObject(), presentSessions, absentSessions, cancelledSessions, rescheduledSessions, totalSessions: sessions.length });
});

export const getMyTrialSessions = asyncHandler(async (req, res) => {
  const trial = await FreeTrial.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  if (!trial) return res.json([]);
  const sessions = await TrialSession.find({ trial: trial._id, user: req.user._id }).sort({ date: 1, startTime: 1 });
  const now = new Date();
  res.json(sessions.map(s => enrichSession(s, now)));
});

export const getMyTrialSessionById = asyncHandler(async (req, res) => {
  const session = await TrialSession.findById(req.params.id).populate('trial', 'status startDate endDate maxSessions completedSessions');
  if (!session) return res.status(404).json({ message: 'Session not found' });
  if (session.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    return res.status(403).json({ message: 'Access denied' });
  }
  const now = new Date();
  res.json(enrichSession(session, now));
});

export const getMyTrialNotifications = asyncHandler(async (req, res) => {
  const trial = await FreeTrial.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  if (!trial) return res.json([]);
  const notifs = await TrialNotification.find({ trial: trial._id, user: req.user._id }).sort({ createdAt: -1 });
  res.json(notifs);
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const notif = await TrialNotification.findOneAndUpdate(
    { _id: id, user: req.user._id },
    { read: true, readAt: new Date() },
    { returnDocument: 'after' }
  );
  if (!notif) return res.status(404).json({ message: 'Notification not found' });
  res.json(notif);
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const trial = await FreeTrial.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  if (!trial) return res.json({ modifiedCount: 0 });
  const result = await TrialNotification.updateMany(
    { trial: trial._id, user: req.user._id, read: false },
    { read: true, readAt: new Date() }
  );
  res.json(result);
});

// ── Admin endpoints ──

export const getTrials = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status && status !== 'all') query.status = status;
  if (search) {
    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({ $or: [{ name: { $regex: safeSearch, $options: 'i' } }, { email: { $regex: safeSearch, $options: 'i' } }] }).select('_id');
    query.user = { $in: users.map((u) => u._id) };
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [trials, total] = await Promise.all([
    FreeTrial.find(query).populate('user', 'name email phone avatar city planMonths').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    FreeTrial.countDocuments(query),
  ]);
  res.json({ trials, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), totalPages: Math.ceil(total / parseInt(limit)) });
});

export const getTrialStats = asyncHandler(async (req, res) => {
  const total = await FreeTrial.countDocuments();
  const active = await FreeTrial.countDocuments({ status: 'active' });
  const expired = await FreeTrial.countDocuments({ status: 'expired' });
  const converted = await FreeTrial.countDocuments({ status: 'converted' });
  const cancelled = await FreeTrial.countDocuments({ status: 'cancelled' });
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todaySessions = await TrialSession.countDocuments({ date: { $gte: today, $lt: tomorrow }, cancelled: { $ne: true }, status: { $ne: 'cancelled' } });
  const totalSessionsAll = await TrialSession.countDocuments();

  const sessionsToday = await TrialSession.aggregate([
    { $match: { date: { $gte: today, $lt: tomorrow }, cancelled: { $ne: true }, status: { $ne: 'cancelled' } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  res.json({ total, active, expired, converted, cancelled, conversionRate, todaySessions, totalSessionsAll, sessionsToday });
});

export const getTrialDetail = asyncHandler(async (req, res) => {
  const trial = await FreeTrial.findById(req.params.id).populate('user', 'name email phone avatar city planMonths style level bio gender dateOfBirth');
  if (!trial) return res.status(404).json({ message: 'Trial not found' });
  const now = new Date();
  const sessions = await TrialSession.find({ trial: trial._id }).sort({ date: 1, startTime: 1 });
  const notifications = await TrialNotification.find({ trial: trial._id }).sort({ createdAt: -1 });

  const completedSessions = sessions.filter(s => s.status === 'completed' || s.status === 'missed').length;
  const presentSessions = sessions.filter(s => s.status === 'completed').length;
  const absentSessions = sessions.filter(s => s.status === 'missed').length;
  const cancelledSessions = sessions.filter(s => s.status === 'cancelled').length;
  const rescheduledSessions = sessions.filter(s => s.status === 'rescheduled').length;
  if (completedSessions !== trial.completedSessions) {
    trial.completedSessions = completedSessions;
    await trial.save();
  }

  const enriched = {
    trial: { ...trial.toObject(), presentSessions, absentSessions, cancelledSessions, rescheduledSessions, totalSessions: sessions.length },
    sessions: sessions.map(s => enrichSession(s, now)),
    notifications,
  };
  res.json(enriched);
});

export const createTrialSession = asyncHandler(async (req, res) => {
  const { trialId, title, description, instructor, date, startTime, time, endTime, duration, meetingPlatform, meetingLink, location, notes, adminNotes } = req.body || {};
  const trial = await FreeTrial.findById(trialId);
  if (!trial) return res.status(404).json({ message: 'Trial not found' });

  const sessionCount = await TrialSession.countDocuments({ trial: trialId, cancelled: { $ne: true }, status: { $nin: ['cancelled', 'rescheduled'] } });
  if (sessionCount >= trial.maxSessions) {
    return res.status(400).json({ message: `This trial already has the maximum of ${trial.maxSessions} sessions.` });
  }

  const session = await TrialSession.create({
    trial: trialId,
    user: trial.user,
    title,
    description: description || '',
    instructor: instructor || '',
    date,
    startTime: startTime || time || '',
    endTime: endTime || '',
    duration: duration || 60,
    meetingPlatform: meetingPlatform || 'Zoom',
    meetingLink: meetingLink || '',
    location: location || '',
    notes: notes || '',
    adminNotes: adminNotes || '',
    status: 'scheduled',
    createdBy: req.user?._id || req.user,
  });

  try {
    await createNotification(trialId, trial.user, 'session_added', `New session: ${title}`, `A new trial session "${title}" has been scheduled for ${new Date(date).toLocaleDateString()}.`, req.user?._id || req.user);
  } catch (e) {
    console.warn('[createTrialSession] notification failed:', e.message);
  }

  const trialDoc = await FreeTrial.findById(trialId);
  if (trialDoc) {
    addHistory(trialDoc, 'session_created', `Session "${title}" added`, req.user);
    await trialDoc.save();
  }

  res.json({ success: true, session: enrichSession(session, new Date()) });
});

export const updateTrialSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const session = await TrialSession.findById(id);
  if (!session) return res.status(404).json({ message: 'Session not found' });
  const oldTitle = session.title;
  Object.assign(session, updates, { updatedBy: req.user?._id || req.user });
  await session.save();

  try {
    await createNotification(session.trial, session.user, 'session_updated', `Session updated: ${session.title}`, `Details for "${session.title}" have been updated.`, req.user?._id || req.user);
  } catch (e) {
    console.warn('[updateTrialSession] notification failed:', e.message);
  }

  const trialDoc = await FreeTrial.findById(session.trial);
  if (trialDoc) {
    addHistory(trialDoc, 'session_updated', `Session "${oldTitle}" updated`, req.user);
    await trialDoc.save();
  }

  res.json({ success: true, session: enrichSession(session, new Date()) });
});

export const cancelTrialSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await TrialSession.findById(id);
  if (!session) return res.status(404).json({ message: 'Session not found' });

  session.cancelled = true;
  session.status = 'cancelled';
  session.cancelReason = req.body?.reason || '';
  session.updatedBy = req.user?._id || req.user;
  await session.save();

  try {
    await createNotification(session.trial, session.user, 'session_cancelled', `Session cancelled: ${session.title}`, `"${session.title}" has been cancelled.${session.cancelReason ? ` Reason: ${session.cancelReason}` : ''}`, req.user?._id || req.user);
  } catch (e) {
    console.warn('[cancelTrialSession] notification failed:', e.message);
  }

  const trialDoc = await FreeTrial.findById(session.trial);
  if (trialDoc) {
    addHistory(trialDoc, 'session_cancelled', `Session "${session.title}" cancelled`, req.user);
    await trialDoc.save();
  }

  res.json({ success: true, session: enrichSession(session, new Date()) });
});

export const markSessionAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { attendance, status, reason } = req.body || {};

  const session = await TrialSession.findById(id);
  if (!session) return res.status(404).json({ message: 'Session not found' });

  if (status === 'cancelled') {
    session.cancelled = true;
    session.status = 'cancelled';
    session.cancelReason = reason || '';
  } else if (status === 'rescheduled') {
    session.status = 'rescheduled';
  } else if (attendance === 'present' || status === 'completed') {
    session.attended = true;
    session.status = 'completed';
  } else if (attendance === 'absent' || status === 'missed') {
    session.attended = false;
    session.status = 'missed';
  }

  session.updatedBy = req.user?._id || req.user;
  await session.save();

  const trial = await FreeTrial.findById(session.trial);
  if (trial) {
    const processedSessions = await TrialSession.countDocuments({
      trial: session.trial,
      status: { $in: ['completed', 'missed'] },
    });
    trial.completedSessions = processedSessions;
    addHistory(trial, 'attendance_updated', `Session "${session.title}" marked as ${session.status}`, req.user);
    await trial.save();

    await checkAndExpireTrial(trial);
    await checkAndSendCompletionReminder(trial, processedSessions);
  }

  try {
    await createNotification(session.trial, session.user, 'session_updated', `Session "${session.title}" updated to ${session.status}`,
      `Your session "${session.title}" has been marked as ${session.status}.${reason ? ` Reason: ${reason}` : ''}`, req.user?._id || req.user);
  } catch (e) {
    console.warn('[markSessionAttendance] notification failed:', e.message);
  }

  res.json({ success: true, session: enrichSession(session, new Date()), trial });
});

export const sendTrialNotification = asyncHandler(async (req, res) => {
  const { trialId, type, title, body } = req.body || {};
  const trial = await FreeTrial.findById(trialId);
  if (!trial) return res.status(404).json({ message: 'Trial not found' });

  const notif = await createNotification(trialId, trial.user, type || 'announcement', title, body, req.user?._id || req.user);

  const trialDoc = await FreeTrial.findById(trialId);
  if (trialDoc) {
    addHistory(trialDoc, 'notification_sent', `Notification sent: ${title}`, req.user);
    await trialDoc.save();
  }

  res.json({ success: true, notification: notif });
});

export const broadcastToActiveTrials = asyncHandler(async (req, res) => {
  const { type, title, body } = req.body || {};
  const activeTrials = await FreeTrial.find({ status: 'active' });
  const notifications = [];
  for (const trial of activeTrials) {
    try {
      const notif = await createNotification(trial._id, trial.user, type || 'announcement', title, body, req.user?._id || req.user);
      notifications.push(notif);
    } catch (e) {
      console.warn('[broadcastToActiveTrials] notification failed for', String(trial._id), e.message);
    }
  }
  res.json({ success: true, count: notifications.length });
});

export const cancelTrial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const trial = await FreeTrial.findById(id);
  if (!trial) return res.status(404).json({ message: 'Trial not found' });
  trial.status = 'cancelled';
  trial.cancelledAt = new Date();
  trial.cancelReason = req.body?.reason || '';
  addHistory(trial, 'cancelled', `Trial cancelled by admin. Reason: ${trial.cancelReason || 'no reason'}`, req.user);
  await trial.save();

  try {
    await createNotification(trial._id, trial.user, 'announcement', 'Free trial ended', 'Your free trial has been ended by the admin.', req.user?._id || req.user);
  } catch (e) {
    // notification failure must not break the main cancel operation
    console.warn('[cancelTrial] notification failed:', e.message);
  }

  res.json({ success: true, trial });
});

export const expireTrialsJob = asyncHandler(async (req, res) => {
  const result = await expireTrials();
  res.json({ success: true, ...result, expired: result.timeExpiredCount + result.sessionExpiredCount });
});

export async function expireTrials() {
  const now = new Date();
  const timeExpired = await FreeTrial.updateMany(
    { status: 'active', endDate: { $lte: now } },
    { $set: { status: 'expired' } }
  );
  const sessionExpired = await FreeTrial.updateMany(
    { status: 'active', completedSessions: { $gte: MAX_SESSIONS } },
    { $set: { status: 'expired', completedAt: now } }
  );
  return {
    timeExpiredCount: timeExpired.modifiedCount,
    sessionExpiredCount: sessionExpired.modifiedCount,
  };
}

export async function convertTrial(userId, planName) {
  const trial = await FreeTrial.findOne({ user: userId, status: 'active' }).sort({ createdAt: -1 });
  if (!trial) return null;
  trial.status = 'converted';
  trial.convertedAt = new Date();
  trial.convertedToPlan = planName;
  addHistory(trial, 'converted', `Trial converted to plan: ${planName}`, userId);
  await trial.save();

  await createNotification(trial._id, userId, 'announcement', 'Trial converted!', `Your free trial has been converted to a ${planName} membership. Welcome aboard!`, userId);
  return trial;
}

export const createBulkSessions = asyncHandler(async (req, res) => {
  const { studentIds, sessions } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ message: 'At least one student must be selected.' });
  }
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return res.status(400).json({ message: 'At least one session must be provided.' });
  }

  const activeTrials = await FreeTrial.find({
    user: { $in: studentIds },
    status: 'active',
  });

  const trialMap = new Map();
  for (const trial of activeTrials) {
    trialMap.set(trial.user.toString(), trial);
  }

  const created = [];
  const errors = [];

  for (const sid of studentIds) {
    const trial = trialMap.get(sid);
    if (!trial) {
      errors.push({ studentId: sid, error: 'No active trial found' });
      continue;
    }
    for (const sData of sessions) {
      try {
        const session = await TrialSession.create({
          trial: trial._id,
          user: sid,
          title: sData.title,
          description: sData.description || '',
          instructor: sData.instructor || '',
          date: sData.date,
          startTime: sData.startTime,
          endTime: sData.endTime || '',
          duration: sData.duration || 60,
          meetingPlatform: sData.meetingPlatform || '',
          meetingLink: sData.meetingLink || '',
          location: sData.location || '',
          notes: sData.notes || '',
          adminNotes: sData.adminNotes || '',
          status: 'scheduled',
          createdBy: req.user._id,
          updatedBy: req.user._id,
        });
        created.push(session);
      } catch (err) {
        errors.push({ studentId: sid, sessionTitle: sData.title, error: err.message });
      }
    }
  }

  for (const trial of activeTrials) {
    addHistory(trial, 'sessions_created', `${created.filter(s => s.user.toString() === trial.user.toString()).length} sessions created via bulk operation`, req.user);
    await trial.save();

    await createNotification(trial._id, trial.user, 'session_added',
      'New trial sessions scheduled',
      `You have ${created.filter(s => s.user.toString() === trial.user.toString()).length} new trial session(s) added to your schedule. Check your dashboard for details.`,
      req.user._id
    );
  }

  res.json({
    success: true,
    created: created.length,
    errors,
    sessions: created.map(s => enrichSession(s, new Date())),
  });
});

export async function getTrialProgress(userId) {
  const trial = await FreeTrial.findOne({ user: userId }).sort({ createdAt: -1 });
  if (!trial) return null;
  if (trial.status === 'active') await checkAndExpireTrial(trial);
  const sessions = await TrialSession.find({ trial: trial._id, user: userId }).sort({ date: 1, startTime: 1 });
  const completedSessions = sessions.filter(s => s.status === 'completed' || s.status === 'missed').length;
  return {
    trial,
    sessions,
    sessionsCompleted: completedSessions,
    sessionsTotal: trial.maxSessions,
    sessionsLeft: trial.sessionsLeft,
    sessionsProgressPct: trial.sessionsProgressPct,
    daysLeft: trial.daysLeft,
    daysTotal: trial.daysTotal,
    overallProgressPct: trial.progressPct,
    status: trial.status,
    isExpired: trial.status !== 'active',
    expiryReason: trial.status === 'expired'
      ? (trial.completedAt ? `All ${trial.maxSessions} sessions completed.` : '7-day period ended.')
      : null,
  };
}
