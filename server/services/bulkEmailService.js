// ============================================================
// services/bulkEmailService.js — weekly bulk-email execution.
// Reuses: NotificationSchedule, NotificationTemplate ('newsletter'),
// NotificationPreference (unsubscribe), notificationService
// (per-recipient send + NotificationLog retry), ReminderLog
// (per-recipient idempotency: schedule+runDate+user).
// Provider-agnostic: all sends go through notificationService,
// so Gmail SMTP can later be swapped for SES/Brevo/Mailgun.
// ============================================================
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import NotificationSchedule from '../models/NotificationSchedule.js';
import NotificationPreference from '../models/NotificationPreference.js';
import NotificationTemplate from '../models/NotificationTemplate.js';
import ReminderLog from '../models/ReminderLog.js';
import BulkEmailRun from '../models/BulkEmailRun.js';
import notificationService from '../notification/core/NotificationService.js';
import { pingRedis } from '../notification/queue/connection.js';
import logger from '../notification/logger.js';

const MODULE = 'BulkEmail';
const BATCH_SIZE = Number(process.env.BULK_EMAIL_BATCH_SIZE || 25);
const BATCH_DELAY_MS = Number(process.env.BULK_EMAIL_BATCH_DELAY_MS || 1000);

function sanitizeHtml(html) {
  // Allow basic formatting only; strip scripts/event handlers.
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

export function buildAudienceFilter(schedule) {
  const a = schedule.audience || {};
  const filter = { status: { $ne: 'banned' }, isDeleted: { $ne: true } };
  if (!a.allUsers && Array.isArray(a.roles) && a.roles.length) {
    filter.role = { $in: a.roles };
  } else if (!a.allUsers && !a.userQuery) {
    filter.role = 'student';
  }
  if (Array.isArray(a.countries) && a.countries.length) {
    filter.countryCode = { $in: a.countries.map((c) => String(c).toUpperCase()) };
  }
  if (a.userQuery && typeof a.userQuery === 'object') {
    Object.assign(filter, a.userQuery);
  }
  return filter;
}

export async function resolveAudience(schedule) {
  const a = schedule.audience || {};
  // Plan-based audience: users with an active membership of given planTypes.
  if (Array.isArray(a.planTypes) && a.planTypes.length && !a.allUsers) {
    const memberships = await Membership.find({
      status: 'active',
      planType: { $in: a.planTypes },
    }).select('user').lean();
    const ids = [...new Set(memberships.map((m) => m.user?.toString()).filter(Boolean))];
    const filter = buildAudienceFilter(schedule);
    delete filter.role;
    filter._id = { $in: ids };
    if (!ids.length) return [];
    return User.find(filter).select('_id name email countryCode role').lean();
  }
  const filter = buildAudienceFilter(schedule);
  return User.find(filter).select('_id name email countryCode role').lean();
}

function isOptedOut(pref) {
  if (!pref) return false;
  const ch = pref.channels || {};
  if (ch.email === false) return true;
  const override = (pref.typeOverrides || []).find((o) => o.type === 'newsletter');
  if (override && override.channels && override.channels.email === false) return true;
  return false;
}

// Redis health decides the delivery path for the whole run.
// When Redis/BullMQ is flaky, queued jobs stall in limbo ("sent" in the
// ledger but never delivered), so we send directly via SMTP instead and
// "sent" truthfully means accepted by the mail provider.
// Forced with BULK_EMAIL_DIRECT=true.
async function shouldSendDirect() {
  if (process.env.BULK_EMAIL_DIRECT === 'true') return true;
  try {
    await pingRedis(2000);
    return false;
  } catch {
    return true;
  }
}

export async function executeScheduleRun(schedule, runDate, { testEmails = null, triggeredBy = null } = {}) {
  const subject = schedule.templateData?.subject || schedule.name;
  const title = schedule.templateData?.title || schedule.name;
  const rawBody = schedule.templateData?.bodyHtml || schedule.templateData?.body || '';
  const body = sanitizeHtml(rawBody);

  // Claim the run first — unique index prevents double execution.
  let run;
  try {
    run = await BulkEmailRun.create({
      schedule: schedule._id,
      runDate,
      status: 'running',
      subject,
      audienceSnapshot: schedule.audience || {},
      total: 0,
    });
  } catch (err) {
    if (err.code === 11000) {
      logger.info(MODULE, 'Run already claimed, skipping duplicate', { schedule: String(schedule._id), runDate });
      return { duplicate: true };
    }
    throw err;
  }

  try {
    let recipients;
    if (testEmails && testEmails.length) {
      recipients = testEmails.map((email) => ({ _id: null, name: 'Test recipient', email }));
    } else {
      recipients = await resolveAudience(schedule);
    }

    const ids = recipients.filter((r) => r._id).map((r) => r._id);
    const prefs = ids.length
      ? await NotificationPreference.find({ user: { $in: ids } }).lean()
      : [];
    const prefMap = new Map(prefs.map((p) => [p.user.toString(), p]));

    const direct = await shouldSendDirect();
    logger.info(MODULE, 'Bulk run delivery mode', {
      schedule: String(schedule._id), runDate, direct: direct ? 'smtp-direct' : 'bullmq-queue',
    });

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      // Sequential within a batch to respect SMTP rate limits; batches spaced out.
      for (const r of batch) {
        const email = r.email;
        if (!email) { skipped++; continue; }
        if (r._id && isOptedOut(prefMap.get(r._id.toString()))) { skipped++; continue; }

        // Idempotency: schedule + runDate + user (or email for test sends).
        if (r._id) {
          try {
            await ReminderLog.create({
              type: `bulk-email:${schedule._id}:${runDate}`,
              reference: schedule._id,
              user: r._id,
              dateKey: runDate,
            });
          } catch (err) {
            if (err.code === 11000) { skipped++; continue; }
            throw err;
          }
        }

        try {
          let result = null;
          const sendOpts = {
            template: 'newsletter',
            channels: ['email'],
            subject,
            title,
            message: body,
            data: { name: r.name || 'there' },
            priority: 'normal',
            ...(direct ? { direct: true } : {}),
          };
          if (r._id) {
            result = await notificationService.send(r._id.toString(), sendOpts);
          } else {
            // Test send: no user record — explicit recipient email.
            result = await notificationService.send(null, { ...sendOpts, email, data: { name: 'there' } });
          }
          // send() returns null when user preferences block the channel.
          if (result === null) skipped++;
          else sent++;
        } catch (err) {
          logger.error(MODULE, 'Bulk send failed for recipient', { email, error: err.message });
          failed++;
        }
      }
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    run.status = 'completed';
    run.sent = sent;
    run.failed = failed;
    run.skipped = skipped;
    run.total = recipients.length;
    run.finishedAt = new Date();
    await run.save();

    await NotificationSchedule.findByIdAndUpdate(schedule._id, {
      $set: { lastRunAt: new Date() },
      $inc: { totalSent: sent },
    });

    logger.info(MODULE, 'Bulk run completed', {
      schedule: String(schedule._id), runDate, sent, failed, skipped, triggeredBy,
    });
    return { sent, failed, skipped, total: recipients.length, runId: run._id };
  } catch (err) {
    run.status = 'failed';
    run.error = err.message;
    run.finishedAt = new Date();
    await run.save().catch(() => {});
    throw err;
  }
}

export async function ensureNewsletterTemplate() {
  const existing = await NotificationTemplate.findOne({ key: 'newsletter' }).lean();
  if (!existing) {
    await NotificationTemplate.create({
      key: 'newsletter',
      name: 'Newsletter / Bulk Email',
      description: 'Weekly bulk email campaigns',
      category: 'marketing',
      channels: { email: true },
      variables: ['name', 'subject', 'body'],
      active: true,
    });
  }
}

export default { resolveAudience, executeScheduleRun, ensureNewsletterTemplate, buildAudienceFilter };
