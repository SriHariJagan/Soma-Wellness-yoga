// ============================================================
// controllers/bulkEmailController.js — admin weekly bulk email.
// Access: requireAuth + requirePermission('communications.bulk')
// (admin/manager bypass; reception needs the explicit grant;
// students are always rejected). Frontend must hide the UI too,
// but backend authorization is authoritative.
// ============================================================
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import NotificationSchedule from '../models/NotificationSchedule.js';
import BulkEmailRun from '../models/BulkEmailRun.js';
import ActivityLog from '../models/ActivityLog.js';
import logger from '../notification/logger.js';
import { executeScheduleRun, resolveAudience, ensureNewsletterTemplate } from '../services/bulkEmailService.js';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]; // Mon..Sun
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function validateWeeklyBody(body) {
  const { name, subject, bodyHtml, dayOfWeek, time } = body;
  if (!name || !String(name).trim()) throw ApiError.badRequest('Campaign name is required');
  if (!subject || !String(subject).trim()) throw ApiError.badRequest('Subject is required');
  if (!bodyHtml || !String(bodyHtml).trim()) throw ApiError.badRequest('Email content is required');
  const dow = Number(dayOfWeek);
  if (!WEEKDAYS.includes(dow)) throw ApiError.badRequest('dayOfWeek must be 1 (Monday) … 7 (Sunday)');
  if (!TIME_RE.test(String(time || ''))) throw ApiError.badRequest('time must be HH:MM (24h)');
}

function toScheduleDoc(body) {
  return {
    name: String(body.name).trim(),
    description: String(body.description || '').slice(0, 500),
    type: 'recurring',
    template: 'newsletter',
    templateData: {
      subject: String(body.subject).trim(),
      title: String(body.title || body.name).trim(),
      bodyHtml: String(body.bodyHtml),
    },
    trigger: {
      cron: 'WEEKLY',
      dayOfWeek: Number(body.dayOfWeek),
      time: String(body.time),
      timezone: 'Africa/Nairobi',
    },
    audience: {
      allUsers: Boolean(body.allUsers),
      roles: Array.isArray(body.roles) ? body.roles : [],
      planTypes: Array.isArray(body.planTypes) ? body.planTypes : [],
      countries: Array.isArray(body.countries) ? body.countries.map((c) => String(c).toUpperCase()) : [],
      userQuery: body.userQuery && typeof body.userQuery === 'object' ? body.userQuery : null,
      excludeRecentHours: Number(body.excludeRecentHours) || 0,
    },
    channels: ['email'],
    status: body.status === 'paused' ? 'paused' : 'active',
  };
}

async function log(action, req, meta = {}) {
  try { await ActivityLog.create({ action, performedBy: req.user._id, meta }); } catch { /* non-fatal */ }
}

export const listSchedules = asyncHandler(async (req, res) => {
  await ensureNewsletterTemplate();
  const schedules = await NotificationSchedule.find({ 'trigger.cron': 'WEEKLY' }).sort({ createdAt: -1 }).lean();
  const runs = await BulkEmailRun.aggregate([
    { $group: { _id: '$schedule', lastRun: { $max: '$createdAt' }, totalSent: { $sum: '$sent' }, runCount: { $sum: 1 } } },
  ]);
  const runMap = new Map(runs.map((r) => [String(r._id), r]));
  res.json(schedules.map((s) => ({ ...s, stats: runMap.get(String(s._id)) || null })));
});

export const createSchedule = asyncHandler(async (req, res) => {
  validateWeeklyBody(req.body);
  const doc = await NotificationSchedule.create(toScheduleDoc(req.body));
  await log('bulk_email_schedule_created', req, { scheduleId: String(doc._id), name: doc.name });
  res.status(201).json(doc);
});

export const updateSchedule = asyncHandler(async (req, res) => {
  validateWeeklyBody(req.body);
  const doc = await NotificationSchedule.findByIdAndUpdate(
    req.params.id,
    { $set: toScheduleDoc(req.body) },
    { returnDocument: 'after', runValidators: true },
  );
  if (!doc) throw ApiError.notFound('Campaign not found');
  await log('bulk_email_schedule_updated', req, { scheduleId: String(doc._id) });
  res.json(doc);
});

export const deleteSchedule = asyncHandler(async (req, res) => {
  const doc = await NotificationSchedule.findByIdAndDelete(req.params.id);
  if (!doc) throw ApiError.notFound('Campaign not found');
  await log('bulk_email_schedule_deleted', req, { scheduleId: req.params.id });
  res.json({ success: true });
});

export const previewSchedule = asyncHandler(async (req, res) => {
  const schedule = await NotificationSchedule.findById(req.params.id).lean();
  if (!schedule) throw ApiError.notFound('Campaign not found');
  const recipients = await resolveAudience(schedule);
  res.json({
    subject: schedule.templateData?.subject || '',
    title: schedule.templateData?.title || '',
    bodyHtml: schedule.templateData?.bodyHtml || '',
    recipientCount: recipients.length,
    sample: recipients.slice(0, 10).map((r) => ({ name: r.name, email: r.email, countryCode: r.countryCode })),
  });
});

export const testSend = asyncHandler(async (req, res) => {
  const { emails } = req.body;
  if (!Array.isArray(emails) || !emails.length || emails.length > 5) {
    throw ApiError.badRequest('Provide 1–5 test email addresses');
  }
  const schedule = await NotificationSchedule.findById(req.params.id).lean();
  if (!schedule) throw ApiError.notFound('Campaign not found');
  const today = new Date().toISOString().slice(0, 10);
  // Test sends bypass the run ledger (never counted, never block real runs).
  const { executeScheduleRun: run } = await import('../services/bulkEmailService.js');
  const result = await run({ ...schedule, _id: schedule._id }, `test-${today}`, { testEmails: emails, triggeredBy: String(req.user._id) });
  // Remove the test ledger row so stats stay clean.
  await BulkEmailRun.deleteOne({ schedule: schedule._id, runDate: `test-${today}` }).catch(() => {});
  await log('bulk_email_test_sent', req, { scheduleId: req.params.id, emails });
  res.json({ success: true, ...result });
});

export const triggerRun = asyncHandler(async (req, res) => {
  const schedule = await NotificationSchedule.findById(req.params.id);
  if (!schedule) throw ApiError.notFound('Campaign not found');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
  // Fire-and-forget: large audiences take minutes/hours, so the HTTP
  // request returns immediately and the run completes in the background.
  // Duplicate protection lives in the run ledger claim, so double-clicks
  // still can't produce a second send for the same week.
  const triggeredBy = String(req.user._id);
  executeScheduleRun(schedule, today, { triggeredBy })
    .then((result) => {
      if (!result.duplicate) log('bulk_email_manual_run', req, { scheduleId: req.params.id, ...result }).catch(() => {});
    })
    .catch((err) => logger.error('BulkEmailCtrl', 'Background manual run failed', { error: err.message }));
  await log('bulk_email_manual_run_started', req, { scheduleId: req.params.id, runDate: today });
  res.status(202).json({ success: true, accepted: true, msg: 'Send started in the background — watch Recent sends for counts.' });
});

export const listRuns = asyncHandler(async (req, res) => {
  const { scheduleId, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (scheduleId) filter.schedule = scheduleId;
  const skip = (Number(page) - 1) * Number(limit);
  const [runs, total] = await Promise.all([
    BulkEmailRun.find(filter).populate('schedule', 'name').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    BulkEmailRun.countDocuments(filter),
  ]);
  res.json({ runs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});
