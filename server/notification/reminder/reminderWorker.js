import { Worker } from 'bullmq';
import { getRedisConnection } from '../queue/connection.js';
import logger from '../logger.js';

const MODULE = 'ReminderWorker';
const REMINDER_QUEUE_NAME = 'reminder-checks';

export function createReminderWorker(handler) {
  const worker = new Worker(
    REMINDER_QUEUE_NAME,
    async (job) => {
      logger.debug(MODULE, 'Job received', { jobId: job.id, name: job.name, attempt: job.attemptsMade + 1 });
      try {
        const result = await handler(job);
        return result;
      } catch (err) {
        logger.error(MODULE, 'Reminder job failed', { jobId: job.id, name: job.name, error: err.message, status: 'failed' });
        throw err;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
      lockDuration: 120000,
      lockRenewTime: 30000,
      stalledInterval: 30000,
      maxStalledCount: 3,
    },
  );

  worker.on('active', ({ jobId, name }) => logger.debug(MODULE, 'Job active', { jobId, name }));
  worker.on('completed', ({ jobId, name }) => logger.debug(MODULE, 'Job completed', { jobId, name }));
  worker.on('failed', ({ jobId, name, failedReason }) => logger.error(MODULE, 'Job failed permanently', { jobId, name, failedReason }));
  worker.on('error', (err) => logger.error(MODULE, 'Worker error', { error: err.message }));
  worker.on('closing', (msg) => logger.warn(MODULE, 'Worker closing', { msg }));
  worker.on('closed', () => logger.info(MODULE, 'Worker closed'));

  logger.info(MODULE, 'Worker created', { queue: REMINDER_QUEUE_NAME, concurrency: 5 });
  return worker;
}

export default { createReminderWorker };
