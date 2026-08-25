import ClassSession from '../../models/ClassSession.js';
import Workshop from '../../models/Workshop.js';
import Event from '../../models/Event.js';
import Membership from '../../models/Membership.js';
import User from '../../models/User.js';
import ReminderLog from '../../models/ReminderLog.js';
import notificationService from '../core/NotificationService.js';
import logger from '../logger.js';

const MODULE = 'ReminderChecks';

const HALF_HOUR_MS  = 30 * 60 * 1000;
const ONE_HOUR_MS   = 60 * 60 * 1000;
const ONE_DAY_MS    = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
const THREE_DAYS_MS = 3 * ONE_DAY_MS;

function getTimezone() {
  return process.env.SCHEDULER_TIMEZONE || 'Asia/Kolkata';
}

function getDatePartsInTimezone(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const str = formatter.format(date);
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function getTodayStartInTimezone(now, timezone) {
  const { year, month, day } = getDatePartsInTimezone(now, timezone);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

async function claimAndSend(reminderType, reference, userId, dateKey, sendFn) {
  try {
    await ReminderLog.create({
      type: reminderType,
      reference,
      user: userId,
      dateKey,
    });
  } catch (err) {
    if (err.code === 11000) return { skipped: true };
    logger.error(MODULE, 'ReminderLog create failed', { error: err.message, code: err.code });
    return { skipped: true };
  }

  try {
    await sendFn();
    return { sent: true };
  } catch (err) {
    logger.error(MODULE, 'Send reminder failed', { userId, reference: String(reference), error: err.message, reminderType, status: 'failed' });
    return { sent: false, error: err.message };
  }
}

export async function checkClassReminders(now, windowOverride) {
  const windowStart = windowOverride?.start || new Date(now.getTime() + HALF_HOUR_MS);
  const windowEnd   = windowOverride?.end   || new Date(now.getTime() + ONE_HOUR_MS);

  const sessions = await ClassSession.find({
    status: 'upcoming',
    date: { $gte: windowStart, $lte: windowEnd },
  }).lean();

  if (!sessions.length) return { sent: 0, skipped: 0 };

  const allUserIds = [...new Set(sessions.flatMap((s) => (s.enrolledUsers || []).map((id) => id.toString())))];
  const users = await User.find({ _id: { $in: allUserIds } }, 'name email').lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  let sent = 0;
  let skipped = 0;

  for (const session of sessions) {
    const dateKey = session.date.toISOString().slice(0, 16);

    for (const userId of session.enrolledUsers || []) {
      const uid = userId.toString();

      const result = await claimAndSend('class-reminder', session._id, uid, dateKey, async () => {
        const user = userMap.get(uid);
        if (!user) throw new Error('User not found in cache');

        await notificationService.send(uid, {
          template: 'class-reminder',
          channels: ['inApp', 'email'],
          data: {
            className:  session.name,
            classDate:  session.date.toLocaleDateString('en-IN'),
            classTime:  session.time || '',
            instructor: session.trainer || '',
            meetLink:   session.zoomUrl || '',
            name:       user.name || 'Student',
          },
          priority: 'normal',
        });
      });

      if (result.sent) sent++;
      else skipped++;
    }
  }

  logger.debug(MODULE, 'Class reminders done', { sent, skipped, status: 'complete' });
  return { sent, skipped };
}

export async function checkWorkshopReminders(now, windowOverride) {
  const windowStart = windowOverride?.start || new Date(now.getTime() + HALF_HOUR_MS);
  const windowEnd   = windowOverride?.end   || new Date(now.getTime() + ONE_HOUR_MS);

  const workshops = await Workshop.find({
    status: 'available',
    isPublished: true,
    date: { $gte: windowStart, $lte: windowEnd },
  }).lean();

  if (!workshops.length) return { sent: 0, skipped: 0 };

  const allUserIds = [...new Set(workshops.flatMap((w) => (w.registrations || []).map((r) => r.user).filter(Boolean).map((id) => id.toString())))];
  const users = await User.find({ _id: { $in: allUserIds } }, 'name email').lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  let sent = 0;
  let skipped = 0;

  for (const workshop of workshops) {
    const dateKey = workshop.date.toISOString().slice(0, 16);
    const userIds = (workshop.registrations || []).map((r) => r.user).filter(Boolean);

    for (const userId of userIds) {
      const uid = userId.toString();

      const result = await claimAndSend('workshop-reminder', workshop._id, uid, dateKey, async () => {
        const user = userMap.get(uid);
        if (!user) throw new Error('User not found in cache');

        await notificationService.send(uid, {
          template: 'workshop-reminder',
          channels: ['inApp', 'email'],
          data: {
            workshopName:  workshop.name,
            workshopDate:  workshop.date.toLocaleDateString('en-IN'),
            workshopTime:  workshop.startTime || '',
            instructor:    workshop.instructor || '',
            meetLink:      workshop.zoomLink || '',
            name:          user.name || 'Student',
          },
          priority: 'normal',
        });
      });

      if (result.sent) sent++;
      else skipped++;
    }
  }

  logger.debug(MODULE, 'Workshop reminders done', { sent, skipped, status: 'complete' });
  return { sent, skipped };
}

export async function checkEventReminders(now, windowOverride) {
  const windowStart = windowOverride?.start || new Date(now.getTime() + HALF_HOUR_MS);
  const windowEnd   = windowOverride?.end   || new Date(now.getTime() + ONE_HOUR_MS);

  const events = await Event.find({
    status: 'upcoming',
    date: { $gte: windowStart, $lte: windowEnd },
  }).lean();

  if (!events.length) return { sent: 0, skipped: 0 };

  const allUserIds = [...new Set(events.flatMap((e) => (e.registrations || []).map((r) => r.user).filter(Boolean).map((id) => id.toString())))];
  const users = await User.find({ _id: { $in: allUserIds } }, 'name email').lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  let sent = 0;
  let skipped = 0;

  for (const event of events) {
    const dateKey = event.date.toISOString().slice(0, 16);
    const userIds = (event.registrations || []).map((r) => r.user).filter(Boolean);

    for (const userId of userIds) {
      const uid = userId.toString();

      const result = await claimAndSend('event-reminder', event._id, uid, dateKey, async () => {
        const user = userMap.get(uid);
        if (!user) throw new Error('User not found in cache');

        await notificationService.send(uid, {
          template: 'event-reminder',
          channels: ['inApp', 'email'],
          data: {
            eventName: event.name,
            eventDate: event.date.toLocaleDateString('en-IN'),
            eventTime: event.time || '',
            location:  event.location || '',
            meetLink:  event.link || '',
            name:      user.name || 'Student',
          },
          priority: 'normal',
        });
      });

      if (result.sent) sent++;
      else skipped++;
    }
  }

  logger.debug(MODULE, 'Event reminders done', { sent, skipped, status: 'complete' });
  return { sent, skipped };
}

export async function checkMembershipExpiry(now) {
  const timezone = getTimezone();
  const todayStart = getTodayStartInTimezone(now, timezone);

  const boundaries = [
    { days: 7,  type: 'membership-expiry-7d', target: new Date(todayStart.getTime() + SEVEN_DAYS_MS) },
    { days: 3,  type: 'membership-expiry-3d', target: new Date(todayStart.getTime() + THREE_DAYS_MS) },
    { days: 1,  type: 'membership-expiry-1d', target: new Date(todayStart.getTime() + ONE_DAY_MS) },
  ];

  let sent = 0;
  let skipped = 0;

  for (const boundary of boundaries) {
    const dayStart = new Date(Date.UTC(boundary.target.getUTCFullYear(), boundary.target.getUTCMonth(), boundary.target.getUTCDate()));
    const dayEnd   = new Date(dayStart.getTime() + ONE_DAY_MS);

    const memberships = await Membership.find({
      status: 'active',
      expiryDate: { $gte: dayStart, $lt: dayEnd },
    }).lean();

    if (!memberships.length) continue;

    const allUserIds = [...new Set(memberships.map((m) => m.user?.toString()).filter(Boolean))];
    const users = await User.find({ _id: { $in: allUserIds } }, 'name email').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    for (const membership of memberships) {
      const y = boundary.target.getUTCFullYear();
      const m = String(boundary.target.getUTCMonth() + 1).padStart(2, '0');
      const d = String(boundary.target.getUTCDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;

      const uid = membership.user?.toString();
      if (!uid) continue;

      const result = await claimAndSend(boundary.type, membership._id, uid, dateKey, async () => {
        const user = userMap.get(uid);
        if (!user) throw new Error('User not found');

        await notificationService.send(uid, {
          template: 'membership-reminder',
          channels: ['inApp', 'email'],
          data: {
            planName:      membership.planType || 'Membership',
            expiryDate:    membership.expiryDate.toLocaleDateString('en-IN'),
            daysRemaining: String(boundary.days),
            name:          user.name || 'Student',
          },
          priority: 'high',
        });
      });

      if (result.sent) sent++;
      else skipped++;
    }
  }

  logger.debug(MODULE, 'Membership expiry check done', { sent, skipped, status: 'complete' });
  return { sent, skipped };
}

export async function checkBirthdays(now) {
  const timezone = getTimezone();
  const { month, day } = getDatePartsInTimezone(now, timezone);

  const users = await User.find({
    dateOfBirth: { $ne: null },
    birthMonth: month,
    birthDay: day,
  }).lean();

  if (!users.length) return { sent: 0, skipped: 0 };

  const todayStart = getTodayStartInTimezone(now, timezone);
  const dateKey = todayStart.toISOString().slice(0, 10);

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    const result = await claimAndSend('birthday', user._id, user._id, dateKey, async () => {
      await notificationService.send(user._id, {
        template: 'birthday',
        channels: ['inApp', 'email'],
        data: {
          name: user.name || 'Yoga Seeker',
        },
        subject: `Happy Birthday, ${user.name || 'Yoga Seeker'}!`,
        title: `Happy Birthday, ${user.name || 'Yoga Seeker'}!`,
        message: 'Wishing you a wonderful day filled with peace, joy, and yoga!',
        priority: 'high',
      });
    });

    if (result.sent) sent++;
    else skipped++;
  }

  logger.debug(MODULE, 'Birthday check done', { sent, skipped, status: 'complete' });
  return { sent, skipped };
}

export async function catchUpTimeWindowed(now, catchUpSince) {
  let totalSent = 0;
  let totalSkipped = 0;

  const endWindow = new Date(now.getTime() + ONE_HOUR_MS);
  let windowStart = new Date(catchUpSince.getTime() + HALF_HOUR_MS);

  while (windowStart < endWindow) {
    const windowEnd = new Date(windowStart.getTime() + HALF_HOUR_MS);
    const override = { start: windowStart, end: windowEnd };

    const [classRes, workshopRes, eventRes] = await Promise.allSettled([
      checkClassReminders(now, override),
      checkWorkshopReminders(now, override),
      checkEventReminders(now, override),
    ]);

    for (const r of [classRes, workshopRes, eventRes]) {
      if (r.status === 'fulfilled') {
        totalSent += r.value.sent;
        totalSkipped += r.value.skipped;
      } else {
        logger.error(MODULE, 'Catch-up window check failed', { error: r.reason?.message, windowStart: windowStart.toISOString() });
      }
    }

    windowStart = new Date(windowStart.getTime() + HALF_HOUR_MS);
  }

  return { sent: totalSent, skipped: totalSkipped };
}

export async function catchUpMembershipExpiry(catchUpSince, now) {
  const timezone = getTimezone();
  const sinceDayStart = getTodayStartInTimezone(catchUpSince, timezone);
  const nowDayStart = getTodayStartInTimezone(now, timezone);

  const dayDiff = Math.round((nowDayStart.getTime() - sinceDayStart.getTime()) / ONE_DAY_MS);
  if (dayDiff <= 0) return { sent: 0, skipped: 0 };

  let sent = 0;
  let skipped = 0;

  const boundaries = [
    { days: 7, type: 'membership-expiry-7d' },
    { days: 3, type: 'membership-expiry-3d' },
    { days: 1, type: 'membership-expiry-1d' },
  ];

  for (let i = 0; i <= dayDiff; i++) {
    const checkDate = new Date(sinceDayStart.getTime() + i * ONE_DAY_MS);

    for (const boundary of boundaries) {
      const targetDate = new Date(checkDate.getTime() + boundary.days * ONE_DAY_MS);
      const dayStart = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));
      const dayEnd = new Date(dayStart.getTime() + ONE_DAY_MS);

      const memberships = await Membership.find({
        status: 'active',
        expiryDate: { $gte: dayStart, $lt: dayEnd },
      }).lean();

      if (!memberships.length) continue;

      const allUserIds = [...new Set(memberships.map((m) => m.user?.toString()).filter(Boolean))];
      const users = await User.find({ _id: { $in: allUserIds } }, 'name email').lean();
      const userMap = new Map(users.map((u) => [u._id.toString(), u]));

      for (const membership of memberships) {
        const y = targetDate.getUTCFullYear();
        const m = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
        const d = String(targetDate.getUTCDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${d}`;

        const uid = membership.user?.toString();
        if (!uid) continue;

        const result = await claimAndSend(boundary.type, membership._id, uid, dateKey, async () => {
          const user = userMap.get(uid);
          if (!user) throw new Error('User not found');

          await notificationService.send(uid, {
            template: 'membership-reminder',
            channels: ['inApp', 'email'],
            data: {
              planName:      membership.planType || 'Membership',
              expiryDate:    membership.expiryDate.toLocaleDateString('en-IN'),
              daysRemaining: String(boundary.days),
              name:          user.name || 'Student',
            },
            priority: 'high',
          });
        });

        if (result.sent) sent++;
        else skipped++;
      }
    }
  }

  logger.info(MODULE, 'Membership expiry catch-up done', { sent, skipped, daysCovered: dayDiff });
  return { sent, skipped };
}

export async function catchUpBirthdays(catchUpSince, now) {
  const timezone = getTimezone();
  const sinceParts = getDatePartsInTimezone(catchUpSince, timezone);
  const nowParts = getDatePartsInTimezone(now, timezone);

  const sinceDay = new Date(Date.UTC(sinceParts.year, sinceParts.month - 1, sinceParts.day));
  const nowDay = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day));
  const dayDiff = Math.round((nowDay.getTime() - sinceDay.getTime()) / ONE_DAY_MS);

  if (dayDiff <= 0) return { sent: 0, skipped: 0 };

  let sent = 0;
  let skipped = 0;

  for (let i = 1; i <= dayDiff; i++) {
    const checkDate = new Date(sinceDay.getTime() + i * ONE_DAY_MS);
    const month = checkDate.getUTCMonth() + 1;
    const day = checkDate.getUTCDate();
    const dateKey = checkDate.toISOString().slice(0, 10);

    const birthdayUsers = await User.find({
      dateOfBirth: { $ne: null },
      birthMonth: month,
      birthDay: day,
    }).lean();

    for (const user of birthdayUsers) {
      const result = await claimAndSend('birthday', user._id, user._id, dateKey, async () => {
        await notificationService.send(user._id, {
          template: 'birthday',
          channels: ['inApp', 'email'],
          data: {
            name: user.name || 'Yoga Seeker',
          },
          subject: `Happy Birthday, ${user.name || 'Yoga Seeker'}!`,
          title: `Happy Birthday, ${user.name || 'Yoga Seeker'}!`,
          message: 'Wishing you a wonderful day filled with peace, joy, and yoga!',
          priority: 'high',
        });
      });

      if (result.sent) sent++;
      else skipped++;
    }
  }

  logger.info(MODULE, 'Birthday catch-up done', { sent, skipped, daysCovered: dayDiff });
  return { sent, skipped };
}
