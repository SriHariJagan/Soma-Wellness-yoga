import { Queue } from 'bullmq';
import { getRedisConnection } from './connection.js';
import logger from '../logger.js';

const MODULE = 'DeadLetterQueue';

const DLQ_NAME = 'notification-dlq';

let dlqInstance = null;

// In-memory DLQ fallback used when Redis is unavailable.
// Prevents circular failure: delivery fails → enqueueDLQ fails → notification lost.
const memoryDLQ = [];
const MAX_MEMORY_DLQ = 1000;

export function getDLQ() {
  if (!dlqInstance) {
    const client = getRedisConnection();
    if (client.status !== 'ready') {
      logger.warn(MODULE, 'Redis not ready — returning in-memory DLQ fallback', {
        redisStatus: client.status,
      });
      return createMemoryDLQ();
    }

    dlqInstance = new Queue(DLQ_NAME, {
      connection: client,
      defaultJobOptions: {
        removeOnComplete: false,
        removeOnFail: false,
      },
    });
    logger.info(MODULE, 'DLQ initialized', { name: DLQ_NAME });
  }
  return dlqInstance;
}

function createMemoryDLQ() {
  return {
    add: async (name, data, opts) => {
      if (memoryDLQ.length >= MAX_MEMORY_DLQ) {
        memoryDLQ.shift();
      }
      const entry = {
        id: opts?.jobId || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        data,
        timestamp: Date.now(),
        failedAt: data.failedAt || new Date().toISOString(),
      };
      memoryDLQ.push(entry);
      logger.warn(MODULE, 'DLQ entry stored in memory (Redis unavailable)', {
        jobId: entry.id,
        logId: data.logId,
        channel: data.channel,
        error: data.error?.message,
      });
      return entry;
    },
    getJobs: async () => [],
    getJob: async () => null,
    close: async () => {
      logger.info(MODULE, 'In-memory DLQ closed');
    },
  };
}

export async function enqueueDLQ(entry) {
  const dlq = getDLQ();

  const payload = {
    ...entry,
    failedAt: entry.failedAt instanceof Date ? entry.failedAt.toISOString() : entry.failedAt,
  };

  await dlq.add(
    'delivery-failed',
    payload,
    {
      jobId: `${entry.originalJobId}-dlq`,
    },
  );

  logger.warn(MODULE, 'Job moved to DLQ', {
    originalJobId: entry.originalJobId,
    logId: entry.logId,
    channel: entry.channel,
    error: entry.error?.message,
    attempts: entry.attempts,
  });
}

export async function listDLQ(limit = 50, offset = 0) {
  if (memoryDLQ.length > 0) {
    const sorted = memoryDLQ.sort((a, b) => b.timestamp - a.timestamp);
    const page = sorted.slice(offset, offset + limit);
    return page.map((e) => ({
      id: e.id,
      name: e.name,
      data: e.data,
      attempts: e.data.attempts || 0,
      timestamp: e.timestamp,
    }));
  }

  const dlq = getDLQ();
  const [failed, waiting] = await Promise.all([
    dlq.getJobs(['failed'], offset, offset + limit - 1),
    dlq.getJobs(['waiting'], offset, offset + limit - 1),
  ]);
  const jobs = [...failed, ...waiting].sort((a, b) => b.timestamp - a.timestamp);

  return jobs.map((j) => ({
    id: j.id,
    name: j.name,
    data: j.data,
    attempts: j.attemptsMade,
    failedReason: j.failedReason,
    stacktrace: j.stacktrace?.slice(0, 3) || [],
    timestamp: j.timestamp,
    processedOn: j.processedOn,
    finishedOn: j.finishedOn,
  }));
}

export async function replayDLQ(dlqJobId, mainQueue) {
  if (memoryDLQ.length > 0) {
    logger.warn(MODULE, 'Cannot replay from in-memory DLQ — Redis is required', { dlqJobId });
    throw new Error('In-memory DLQ replay not supported. Start Redis and re-enqueue manually.');
  }

  const dlq = getDLQ();
  const job = await dlq.getJob(dlqJobId);
  if (!job) throw new Error(`DLQ job ${dlqJobId} not found`);

  const data = job.data;
  if (!data.logId) throw new Error('DLQ job missing logId');

  const NotificationLog = (await import('../../models/NotificationLog.js')).default;
  const log = await NotificationLog.findById(data.logId);
  if (log) {
    log.status = 'queued';
    log.attempt = 0;
    log.lastError = '';
    log.nextRetryAt = null;
    log.error = { code: '', message: '', retryable: true };
    await log.save();
  }

  await mainQueue.add(
    'deliver',
    {
      logId: data.logId,
      notificationId: data.notificationId,
      channel: data.channel,
      userId: data.userId || null,
    },
    {
      jobId: `${data.logId}-replay-${Date.now()}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 60000 },
    },
  );

  await job.remove();

  logger.info(MODULE, 'DLQ job replayed', { dlqJobId, logId: data.logId });
}

export async function closeDLQ() {
  if (dlqInstance) {
    await dlqInstance.close();
    dlqInstance = null;
    logger.info(MODULE, 'DLQ closed');
  }
}

export default { getDLQ, enqueueDLQ, listDLQ, replayDLQ, closeDLQ };
