import { Worker } from 'bullmq';
import { getRedisConnection } from './connection.js';
import { deliveryJobHandler } from './handlers.js';
import logger from '../logger.js';

const MODULE = 'NotificationWorkerBull';

const WORKER_NAME = 'notification-delivery-worker';
const QUEUE_NAME = 'notification-delivery';

let workerInstance = null;

/**
 * BullMQ Worker configuration.
 */
const WORKER_OPTS = {
  concurrency: 10,               // Max simultaneous jobs per worker
  lockDuration: 30000,           // 30s job lock before another worker can pick it up
  lockRenewTime: 15000,          // Renew lock every 15s
  stalledInterval: 30000,        // Check for stalled jobs every 30s
  maxStalledCount: 3,            // Max times a job can be marked stalled before failing
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 604800, count: 5000 },
};

/**
 * Start the BullMQ Worker for notification delivery.
 *
 * The worker:
 *   - Picks up jobs from the 'notification-delivery' queue
 *   - Processes them via deliveryJobHandler
 *   - Handles retries and backoff automatically (per job options)
 *   - Moves permanently failed jobs to the Dead Letter Queue
 *
 * @param {Object} [opts] - Override WORKER_OPTS.
 * @returns {Worker}
 */
export function startWorker(opts = {}) {
  if (workerInstance) {
    logger.warn(MODULE, 'Worker already started');
    return workerInstance;
  }

  const connection = getRedisConnection();

  workerInstance = new Worker(
    QUEUE_NAME,
    async (job) => {
      logger.debug(MODULE, 'Job received', {
        jobId: job.id,
        name: job.name,
        attempt: job.attemptsMade + 1,
      });

      const startTime = Date.now();
      try {
        const result = await deliveryJobHandler(job);
        const duration = Date.now() - startTime;
        logger.info(MODULE, 'Job completed', {
          jobId: job.id,
          durationMs: duration,
          result: result?.success ? 'success' : result?.skipped ? 'skipped' : 'failed',
        });
        return result;
      } catch (err) {
        const duration = Date.now() - startTime;
        logger.warn(MODULE, 'Job failed (will retry if attempts remain)', {
          jobId: job.id,
          durationMs: duration,
          attempt: job.attemptsMade + 1,
          maxAttempts: job.opts.attempts,
          error: err.message,
        });
        throw err; // Let BullMQ handle retry/backoff
      }
    },
    {
      ...WORKER_OPTS,
      connection,
    },
  );

  // The correct pattern: BullMQ v5+ uses `connection` option.
  // A subscriber connection is created internally if not provided separately.
  // But for reliability, we override to use our dedicated subscriber.

  // ── Worker event logging ──
  workerInstance.on('active', ({ jobId }) => {
    logger.debug(MODULE, 'Job active', { jobId });
  });

  workerInstance.on('completed', ({ jobId, returnvalue }) => {
    logger.debug(MODULE, 'Worker completed event', { jobId });
  });

  workerInstance.on('failed', ({ jobId, failedReason }) => {
    logger.error(MODULE, 'Worker failed event', { jobId, failedReason });
  });

  workerInstance.on('error', (err) => {
    logger.error(MODULE, 'Worker error', { error: err.message });
  });

  workerInstance.on('closing', (msg) => {
    logger.warn(MODULE, 'Worker closing', { msg });
  });

  workerInstance.on('closed', () => {
    logger.info(MODULE, 'Worker closed');
  });

  logger.info(MODULE, 'Worker started', {
    queue: QUEUE_NAME,
    concurrency: WORKER_OPTS.concurrency,
    stalledInterval: WORKER_OPTS.stalledInterval,
  });

  return workerInstance;
}

/**
 * Gracefully stop the BullMQ Worker.
 * Waits for active jobs to complete before resolving.
 */
export async function stopWorker() {
  if (!workerInstance) return;

  logger.info(MODULE, 'Stopping worker — waiting for active jobs');

  try {
    await workerInstance.close({ force: false });
    logger.info(MODULE, 'Worker stopped');
  } catch (err) {
    logger.error(MODULE, 'Error stopping worker', { error: err.message });
  }

  workerInstance = null;
}

/**
 * Check if the worker is currently running.
 */
export function isWorkerRunning() {
  return workerInstance !== null && !workerInstance.closed;
}

export default { startWorker, stopWorker, isWorkerRunning };
