import NotificationLog from '../models/NotificationLog.js';
import { isWorkerRunning } from './queue/notificationWorker.js';
import { getRedisConnection } from './queue/connection.js';
import { sendDirect } from './queue/notificationQueue.js';
import logger from './logger.js';

const MODULE = 'NotificationWorker';

export class NotificationWorker {
  constructor(opts = {}) {
    this.pollIntervalMs = opts.pollIntervalMs || 2000;
    this._timer = null;
    this._stopped = false;
    this._draining = false;
    this._active = 0;

    this.metrics = {
      orphansRecovered: 0,
    };
  }

  start() {
    if (this._timer) return;
    this._stopped = false;
    this._draining = false;
    this._schedule();
    logger.info(MODULE, 'Started', { pollIntervalMs: this.pollIntervalMs });
  }

  async stop() {
    this._stopped = true;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    if (this._active > 0) {
      this._draining = true;
      await new Promise((resolve) => {
        const check = () => {
          if (this._active <= 0) {
            this._draining = false;
            resolve();
          } else {
            setTimeout(check, 200);
          }
        };
        check();
      });
    }

    logger.info(MODULE, 'Stopped', this.metrics);
  }

  activeCount() { return this._active; }

  _schedule() {
    if (this._stopped) return;
    this._timer = setTimeout(() => this._poll(), this.pollIntervalMs);
  }

  async _poll() {
    if (this._stopped) return;

    try {
      const now = new Date();
      const orphanThreshold = new Date(now.getTime() - 300_000);

      // Recover logs stuck in 'sending' for > 5 minutes.
      // This happens when the BullMQ worker crashes mid-delivery.
      // Reset them to 'queued' so BullMQ retries them.
      const recoverResult = await NotificationLog.updateMany(
        {
          status: 'sending',
          updatedAt: { $lt: orphanThreshold },
        },
        {
          $set: {
            status: 'queued',
            lastError: 'Recovered from stuck sending status after worker crash',
            nextRetryAt: now,
          },
          $inc: { attempt: 1 },
        },
      );

      if (recoverResult.modifiedCount > 0) {
        this.metrics.orphansRecovered += recoverResult.modifiedCount;
        logger.warn(MODULE, 'Recovered stuck sending logs', {
          count: recoverResult.modifiedCount,
        });
      }

      // Recover logs stuck in 'queued'.
      // - BullMQ worker NOT running (worker crash): re-queue them so a new
      //   worker can pick them up.
      // - BullMQ worker running but Redis down: the worker can never consume
      //   them — direct-send in degraded mode so emails still go out.
      const stuckThreshold = new Date(now.getTime() - 120_000);
      const stuckLogs = await NotificationLog.find({
        status: 'queued',
        updatedAt: { $lt: stuckThreshold },
        nextRetryAt: { $lte: now },
      }).limit(25).lean();

      if (stuckLogs.length > 0 && !isWorkerRunning()) {
        const stuckResult = await NotificationLog.updateMany(
          { _id: { $in: stuckLogs.map((l) => l._id) } },
          {
            $set: {
              lastError: 'Re-queued after BullMQ worker inactivity',
            },
          },
        );

        if (stuckResult.modifiedCount > 0) {
          logger.warn(MODULE, 'Detected queued logs with no active worker', {
            count: stuckResult.modifiedCount,
          });
        }
      }

      if (stuckLogs.length > 0 && isWorkerRunning() && getRedisConnection().status !== 'ready') {
        for (const log of stuckLogs) {
          sendDirect(log).catch((err) =>
            logger.error(MODULE, 'Direct-send recovery failed', { logId: String(log._id), error: err.message }),
          );
        }
        logger.warn(MODULE, 'Redis down — direct-sending stuck queued logs', {
          count: stuckLogs.length,
        });
      }
    } catch (err) {
      logger.error(MODULE, 'Poll error', { error: err.message });
    }

    if (!this._stopped) this._schedule();
  }
}

const notificationWorker = new NotificationWorker();
export default notificationWorker;
