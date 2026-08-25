import mongoose from 'mongoose';
import ReminderLog from '../models/ReminderLog.js';
import { getReminderQueue, closeReminderQueue } from './reminder/reminderQueue.js';
import { createReminderWorker } from './reminder/reminderWorker.js';
import * as checks from './reminder/checks.js';
import logger from './logger.js';

const MODULE = 'ReminderScheduler';

const ONE_HOUR_MS = 60 * 60 * 1000;
const TICK_INTERVAL_MS = 5 * 60 * 1000;
const MAX_CATCHUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const REMINDER_LOG_TTL_DAYS = 90;
const STATE_COLLECTION = 'SchedulerState';
const STATE_KEY = 'reminder-scheduler';

const CHECK_JOBS = [
  { name: 'class-reminder-check',   handler: checks.checkClassReminders },
  { name: 'workshop-reminder-check', handler: checks.checkWorkshopReminders },
  { name: 'event-reminder-check',    handler: checks.checkEventReminders },
  { name: 'membership-expiry-check', handler: checks.checkMembershipExpiry },
  { name: 'birthday-check',          handler: checks.checkBirthdays },
];

export class NotificationScheduler {
  constructor() {
    this._queue = null;
    this._worker = null;
    this._started = false;
  }

  async start() {
    if (this._started) return;
    this._started = true;

    await this._ensureIndexes();
    this._queue = getReminderQueue();

    try {
      await this._catchUp();
    } catch (err) {
      logger.error(MODULE, 'Catch-up failed', { error: err.message });
    }

    const repeatableJobs = await this._queue.getRepeatableJobs();
    const existingKeys = new Set(repeatableJobs.map((j) => j.key));

    for (const job of CHECK_JOBS) {
      const jobKey = `${job.name}:::${TICK_INTERVAL_MS}`;
      if (!existingKeys.has(jobKey)) {
        await this._queue.add(
          job.name,
          { type: job.name },
          {
            repeat: { every: TICK_INTERVAL_MS },
            removeOnComplete: { age: 3600, count: 100 },
            removeOnFail: { age: 604800, count: 500 },
          },
        );
        logger.info(MODULE, `Registered repeatable job: ${job.name}`);
      }
    }

    this._worker = createReminderWorker(async (bullJob) => {
      const jobDef = CHECK_JOBS.find((j) => j.name === bullJob.name);
      if (!jobDef) {
        logger.warn(MODULE, 'Unknown job type', { name: bullJob.name, jobId: bullJob.id });
        return;
      }

      const start = Date.now();
      const now = new Date();
      logger.debug(MODULE, 'Scheduler job started', { name: bullJob.name, jobId: bullJob.id, time: now.toISOString() });

      try {
        const result = await jobDef.handler(now);
        const duration = Date.now() - start;
        logger.info(MODULE, 'Scheduler job completed', {
          name: bullJob.name,
          jobId: bullJob.id,
          duration,
          status: 'complete',
          sent: result?.sent,
          skipped: result?.skipped,
        });
        await this._recordTick(bullJob.name, now, result);
      } catch (err) {
        const duration = Date.now() - start;
        logger.error(MODULE, 'Scheduler job failed', {
          name: bullJob.name,
          jobId: bullJob.id,
          duration,
          error: err.message,
          status: 'failed',
        });
        await this._recordTick(bullJob.name, now, { error: err.message });
        throw err;
      }
    });

    logger.info(MODULE, 'Started with BullMQ repeatable jobs', {
      jobs: CHECK_JOBS.map((j) => j.name),
      intervalMs: TICK_INTERVAL_MS,
    });
  }

  async _ensureIndexes() {
    try {
      await ReminderLog.collection.createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: REMINDER_LOG_TTL_DAYS * 86400, background: true },
      );
    } catch { }
  }

  async _getLastTick() {
    try {
      const doc = await mongoose.connection.db.collection(STATE_COLLECTION).findOne(
        { _id: STATE_KEY },
      );
      return doc?.lastTickAt ? new Date(doc.lastTickAt) : null;
    } catch {
      return null;
    }
  }

  async _catchUp() {
    const lastTick = await this._getLastTick();
    const now = new Date();

    let catchUpSince;
    if (lastTick) {
      catchUpSince = lastTick;
    } else {
      catchUpSince = new Date(now.getTime() - ONE_HOUR_MS);
    }

    const gapMs = now.getTime() - catchUpSince.getTime();
    if (gapMs < TICK_INTERVAL_MS) {
      logger.debug(MODULE, 'Catch-up skipped — gap too small', { gapMs });
      return;
    }

    const catchUpEnd = new Date(Math.min(now.getTime(), catchUpSince.getTime() + MAX_CATCHUP_WINDOW_MS));
    const truncated = catchUpEnd.getTime() < now.getTime();
    logger.info(MODULE, 'Catch-up start', {
      since: catchUpSince.toISOString(),
      to: catchUpEnd.toISOString(),
      gapMinutes: Math.round(gapMs / 60000),
      truncated: truncated || undefined,
    });

    const results = await Promise.allSettled([
      checks.catchUpTimeWindowed(catchUpEnd, catchUpSince),
      checks.catchUpMembershipExpiry(catchUpSince, catchUpEnd),
      checks.catchUpBirthdays(catchUpSince, catchUpEnd),
    ]);

    let totalSent = 0;
    let totalSkipped = 0;

    for (const r of results) {
      if (r.status === 'fulfilled') {
        totalSent += r.value.sent;
        totalSkipped += r.value.skipped;
      } else {
        logger.error(MODULE, 'Catch-up check failed', { error: r.reason?.message });
      }
    }

    await this._recordTick('catch-up', catchUpEnd, { sent: totalSent, skipped: totalSkipped });

    logger.info(MODULE, 'Catch-up complete', { sent: totalSent, skipped: totalSkipped });
  }

  async _recordTick(jobName, time, result) {
    try {
      await mongoose.connection.db.collection(STATE_COLLECTION).updateOne(
        { _id: STATE_KEY },
        {
          $set: {
            lastTickAt: time,
            lastJobName: jobName,
            lastResult: result,
            updatedAt: new Date(),
          },
          $setOnInsert: { firstTickAt: time },
        },
        { upsert: true },
      );
    } catch (err) {
      logger.warn(MODULE, 'Failed to record tick state', { error: err.message });
    }
  }

  async stop() {
    this._started = false;

    if (this._worker) {
      logger.info(MODULE, 'Closing worker');
      try {
        await this._worker.close({ force: false });
      } catch (err) {
        logger.error(MODULE, 'Error closing worker', { error: err.message });
      }
      this._worker = null;
    }

    if (this._queue) {
      logger.info(MODULE, 'Removing repeatable jobs');
      try {
        const repeatableJobs = await this._queue.getRepeatableJobs();
        for (const job of repeatableJobs) {
          await this._queue.removeRepeatableByKey(job.key);
        }
      } catch (err) {
        logger.error(MODULE, 'Error removing repeatable jobs', { error: err.message });
      }

      await closeReminderQueue();
      this._queue = null;
    }

    logger.info(MODULE, 'Stopped');
  }
}

const notificationScheduler = new NotificationScheduler();
export default notificationScheduler;
