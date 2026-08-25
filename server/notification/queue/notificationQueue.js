import { Queue } from 'bullmq';
import { getRedisConnection } from './connection.js';
import { getChannel } from '../registry.js';
import Notification from '../../models/Notification.js';
import NotificationLog from '../../models/NotificationLog.js';
import { PRIORITY_MAP } from '../../shared/constants/index.js';
import logger from '../logger.js';

const MODULE = 'NotificationQueueBull';

const QUEUE_NAME = 'notification-delivery';

/**
 * Default job options applied to every notification delivery job.
 * Each job can override these per-call via Queue.add() options.
 */
const DEFAULT_JOB_OPTIONS = {
  // Remove completed jobs after 1 hour (keep for monitoring visibility).
  removeOnComplete: { age: 3600, count: 1000 },
  // Keep failed jobs for 7 days (for DLQ inspection and manual retry).
  removeOnFail:     { age: 604800, count: 5000 },
  // Default exponential backoff: 1min, 2min, 4min, 8min, 16min, 32min
  backoff: {
    type: 'exponential',
    delay: 60000,
  },
};

let queueInstance = null;

/**
 * Get or create the singleton BullMQ Queue for notification delivery.
 */
export function getNotificationQueue() {
  if (!queueInstance) {
    const connection = getRedisConnection();
    queueInstance = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });

    // Log queue events for monitoring.
    queueInstance.on('active', ({ jobId, name }) => {
      logger.debug(MODULE, 'Job active', { jobId, name });
    });

    logger.info(MODULE, 'Queue initialized', { name: QUEUE_NAME });
  }
  return queueInstance;
}

/**
 * Send a NotificationLog entry directly through its channel, bypassing
 * BullMQ. Used in degraded mode when Redis is unavailable so email and
 * in-app delivery still works. Marks the log as sent/failed and updates
 * the notification status accordingly.
 */
export async function sendDirect(log) {
  const channel = getChannel(log.channel);
  if (!channel) {
    const err = new Error(`Channel "${log.channel}" not registered for direct send`);
    err.code = 'CHANNEL_NOT_FOUND';
    await NotificationLog.findByIdAndUpdate(log._id, {
      $set: { status: 'failed', lastError: err.message, failedAt: new Date(), 'error.code': 'CHANNEL_NOT_FOUND' },
    });
    throw err;
  }

  const notification = await Notification.findById(log.notification)
    .populate('user', 'name email phone city');

  if (!notification) {
    const err = new Error(`Notification ${log.notification} not found for direct send`);
    err.code = 'NOTIFICATION_NOT_FOUND';
    await NotificationLog.findByIdAndUpdate(log._id, {
      $set: { status: 'failed', lastError: err.message, failedAt: new Date(), 'error.code': 'NOTIFICATION_NOT_FOUND' },
    });
    throw err;
  }

  try {
    const result = await channel.send(notification);
    await NotificationLog.findByIdAndUpdate(log._id, {
      $set: { status: 'sent', sentAt: new Date(), providerMessageId: result?.providerMessageId || '' },
    });
    await Notification.findByIdAndUpdate(log.notification, { status: 'delivered' }).catch(() => {});
    logger.info(MODULE, 'Direct send succeeded', { logId: String(log._id), channel: log.channel, providerMessageId: result?.providerMessageId });
    return result;
  } catch (err) {
    await NotificationLog.findByIdAndUpdate(log._id, {
      $set: { status: 'failed', lastError: err.message, failedAt: new Date(), 'error.code': err.code || 'DIRECT_SEND_FAILED' },
    });
    logger.error(MODULE, 'Direct send failed', { logId: String(log._id), channel: log.channel, error: err.message, errorCode: err.code });
    throw err;
  }
}

/**
 * Add a delivery job for a single NotificationLog entry.
 *
 * @param {Object} log     - NotificationLog document (plain object).
 * @param {Object} options - { priority?: string, delay?: number, attempts?: number }
 * @returns {Promise<Object>} The BullMQ Job.
 */
export async function enqueueDelivery(log, options = {}) {
  const client = getRedisConnection();
  const logId = String(log._id);

  const priority = PRIORITY_MAP[options.priority] ?? PRIORITY_MAP.normal;
  const delay = options.delay || 0;
  const attempts = options.attempts || log.maxAttempts || 5;

  // ── Redis-outage fallback: bypass BullMQ when Redis is down ────
  // When Redis is unavailable we send the notification directly via the
  // channel (degraded mode) so email/in-app delivery still works instead
  // of silently waiting on a queue no worker can consume. The BullMQ
  // retry/DLQ machinery is preferred whenever Redis is healthy.
  if (client.status !== 'ready') {
    logger.warn(MODULE, 'Redis not ready — sending notification directly (bypassing BullMQ)', {
      logId,
      channel: log.channel,
      redisStatus: client.status,
      nodeEnv: process.env.NODE_ENV,
    });
    return sendDirect(log);
  }

  // ── Normal BullMQ enqueue path ─────────────────────────────
  const queue = getNotificationQueue();

  const jobId = logId; // idempotent: same logId = same jobId

  logger.info(MODULE, 'queue.add: starting', {
    jobId,
    logId,
    channel: log.channel,
    priority,
    delay,
    attempts,
  });

  let job;
  try {
    job = await queue.add(
      'deliver',
      {
        logId,
        notificationId: String(log.notification),
        channel: log.channel,
        userId: log.user ? String(log.user) : null,
      },
      {
        jobId,
        priority,
        delay,
        attempts,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
      },
    );

    logger.info(MODULE, 'queue.add: succeeded', {
      jobId,
      logId,
      channel: log.channel,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error(MODULE, 'queue.add: threw', {
      jobId,
      logId,
      channel: log.channel,
      error: err.message,
      errorCode: err.code,
      errorStack: err.stack,
      timestamp: new Date().toISOString(),
    });
    throw err;
  }

  logger.debug(MODULE, 'Job enqueued', {
    jobId,
    logId,
    channel: log.channel,
    priority,
    delay,
    attempts,
  });

  return job;
}

/**
 * Close the queue and its Redis connection.
 */
export async function closeQueue() {
  if (queueInstance) {
    await queueInstance.close();
    queueInstance = null;
    logger.info(MODULE, 'Queue closed');
  }
}

export default { getNotificationQueue, enqueueDelivery, sendDirect, closeQueue, PRIORITY_MAP };
