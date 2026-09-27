// ============================================================
// services/bulkEmailScheduler.js — weekly bulk-email evaluator.
// Reuses the SAME BullMQ/Redis infrastructure as reminders.
// Tick: every 15 min. Matches active WEEKLY schedules whose
// (dayOfWeek, time) equals the current Africa/Nairobi slot,
// then executes once per (schedule + runDate) — the unique
// ledger index makes double-execution impossible.
// ============================================================
import { Queue, Worker } from 'bullmq';
import NotificationSchedule from '../models/NotificationSchedule.js';
import BulkEmailRun from '../models/BulkEmailRun.js';
import { executeScheduleRun, ensureNewsletterTemplate } from './bulkEmailService.js';
import logger from '../notification/logger.js';
import { getRedisConnection, isRedisReady } from '../notification/queue/connection.js';

const MODULE = 'BulkEmailScheduler';
const QUEUE_NAME = 'bulk-email-eval';
const TICK_MS = 15 * 60 * 1000;

let queue = null;
let worker = null;
let timer = null;
let started = false;

function nairobiParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    weekday: 'short', hour: '2-digit', minute: '2-digit',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  // en-GB weekday short: Mon..Sun → 1..7
  const dow = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[parts.weekday] || 1;
  const runDate = `${parts.year}-${parts.month}-${parts.day}`;
  return { dow, time: `${parts.hour}:${parts.minute}`, runDate };
}

export async function evaluateDueSchedules(now = new Date()) {
  const { dow, time, runDate } = nairobiParts(now);
  // Match schedules whose HH:MM falls in the current 15-min slot.
  const [hh, mm] = time.split(':').map(Number);
  const slotStart = hh * 60 + mm - (mm % 15);
  const candidates = await NotificationSchedule.find({
    status: 'active',
    'trigger.cron': 'WEEKLY',
    'trigger.dayOfWeek': dow,
  }).lean();

  const due = candidates.filter((s) => {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s.trigger?.time || '');
    if (!m) return false;
    const schedMin = Number(m[1]) * 60 + Number(m[2]);
    return schedMin >= slotStart && schedMin < slotStart + 15;
  });

  const results = [];
  for (const s of due) {
    const exists = await BulkEmailRun.findOne({ schedule: s._id, runDate }).lean();
    if (exists) {
      results.push({ schedule: String(s._id), skipped: true, reason: 'already-ran' });
      continue;
    }
    try {
      const r = await executeScheduleRun(s, runDate, { triggeredBy: 'scheduler' });
      results.push({ schedule: String(s._id), ...r });
    } catch (err) {
      logger.error(MODULE, 'Scheduled bulk run failed', { schedule: String(s._id), error: err.message });
      results.push({ schedule: String(s._id), error: err.message });
    }
  }
  return { runDate, dow, time, evaluated: due.length, results };
}

export async function startBulkEmailScheduler() {
  if (started) return;
  started = true;
  await ensureNewsletterTemplate().catch((err) => logger.warn(MODULE, 'Template ensure failed', { error: err.message }));

  if (!isRedisReady()) {
    logger.warn(MODULE, 'Redis unavailable — falling back to in-process interval');
    timer = setInterval(() => {
      evaluateDueSchedules().catch((err) => logger.error(MODULE, 'Eval failed', { error: err.message }));
    }, TICK_MS);
    return;
  }

  try {
    const connection = getRedisConnection();
    queue = new Queue(QUEUE_NAME, { connection });
    const existing = await queue.getRepeatableJobs().catch(() => []);
    if (!existing.length) {
      await queue.add('eval', {}, {
        repeat: { every: TICK_MS },
        removeOnComplete: { age: 3600, count: 50 },
        removeOnFail: { age: 86400, count: 100 },
      });
      logger.info(MODULE, 'Registered repeatable eval job');
    }
    worker = new Worker(QUEUE_NAME, async () => {
      await evaluateDueSchedules();
    }, { connection });
    worker.on('failed', (job, err) => logger.error(MODULE, 'Eval job failed', { error: err?.message }));
    logger.info(MODULE, 'Started with BullMQ repeatable eval', { intervalMs: TICK_MS });
  } catch (err) {
    logger.error(MODULE, 'BullMQ start failed, using interval fallback', { error: err.message });
    timer = setInterval(() => {
      evaluateDueSchedules().catch((e) => logger.error(MODULE, 'Eval failed', { error: e.message }));
    }, TICK_MS);
  }
}

export async function stopBulkEmailScheduler() {
  started = false;
  if (timer) { clearInterval(timer); timer = null; }
  try { await worker?.close(); } catch { /* ignore */ }
  worker = null;
  try { await queue?.close(); } catch { /* ignore */ }
  queue = null;
  logger.info(MODULE, 'Stopped');
}

export default { startBulkEmailScheduler, stopBulkEmailScheduler, evaluateDueSchedules };
