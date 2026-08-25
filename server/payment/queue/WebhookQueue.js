import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from '../../notification/queue/connection.js';
import { WebhookEventRepository } from '../repository/WebhookEventRepository.js';
import { WebhookService } from '../services/WebhookService.js';
import logger from '../../notification/logger.js';

const MODULE = 'WebhookQueue';

const RETRY_QUEUE = 'webhook-retry';
const DLQ_NAME = 'webhook-dlq';

let retryQueueInstance = null;
let dlqInstance = null;
let workerInstance = null;

export function getWebhookRetryQueue() {
  if (!retryQueueInstance) {
    retryQueueInstance = new Queue(RETRY_QUEUE, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 60000 },
        removeOnComplete: { age: 86400, count: 500 },
        removeOnFail: { age: 604800, count: 1000 },
      },
    });
    logger.info(MODULE, 'Retry queue initialized', { name: RETRY_QUEUE });
  }
  return retryQueueInstance;
}

export function getWebhookDLQ() {
  if (!dlqInstance) {
    dlqInstance = new Queue(DLQ_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: false,
        removeOnFail: false,
      },
    });
    logger.info(MODULE, 'DLQ initialized', { name: DLQ_NAME });
  }
  return dlqInstance;
}

export async function enqueueWebhookRetry(webhookEventId, error) {
  const queue = getWebhookRetryQueue();
  const jobId = `webhook-retry-${webhookEventId}`;

  const existing = await queue.getJob(jobId);
  if (existing) {
    logger.debug(MODULE, 'Retry job already exists – skipping', { webhookEventId, jobId });
    return existing;
  }

  const job = await queue.add(
    'webhook-process',
    { webhookEventId },
    { jobId },
  );

  logger.warn(MODULE, 'Webhook retry job enqueued', {
    webhookEventId,
    jobId,
    error,
  });

  return job;
}

export async function enqueueWebhookDLQ(entry) {
  const dlq = getWebhookDLQ();

  await dlq.add(
    'webhook-failed',
    {
      ...entry,
      failedAt: entry.failedAt instanceof Date ? entry.failedAt.toISOString() : new Date().toISOString(),
    },
    { jobId: `webhook-dlq-${entry.webhookEventId}` },
  );

  logger.warn(MODULE, 'Webhook moved to DLQ', {
    webhookEventId: entry.webhookEventId,
    event: entry.event,
    error: entry.lastError,
    attempts: entry.attempts,
  });
}

async function processRetryJob(job) {
  const { webhookEventId } = job.data;
  const webhookEventRepo = new WebhookEventRepository();
  const webhookService = new WebhookService();

  const webhookEvent = await webhookEventRepo.findByEventId(webhookEventId);
  if (!webhookEvent) {
    logger.error(MODULE, 'Webhook event not found for retry', { webhookEventId });
    return;
  }

  if (webhookEvent.status === 'processed') {
    logger.info(MODULE, 'Webhook already processed – skipping retry', { webhookEventId });
    return;
  }

  await webhookEventRepo.updateStatus(webhookEvent._id, 'processing');

  try {
    const payload = typeof webhookEvent.payload === 'string'
      ? JSON.parse(webhookEvent.payload)
      : webhookEvent.payload;

    const result = await webhookService.processEvent(
      webhookEvent.event,
      payload,
      webhookEvent.rawBody,
      webhookEvent.signature,
    );

    await webhookEventRepo.updateStatus(webhookEvent._id, 'processed', {
      processedAt: new Date(),
    });

    logger.info(MODULE, 'Webhook retry succeeded', {
      webhookEventId,
      event: webhookEvent.event,
      action: result.action || 'handled',
    });
  } catch (err) {
    const attempts = webhookEvent.attempts + 1;

    if (webhookService.shouldRetry(attempts) && webhookService.isRetryable(err)) {
      await webhookEventRepo.markFailed(webhookEvent._id, err.message);
      throw err;
    }

    await webhookEventRepo.markDlq(webhookEvent._id, err.message);

    await enqueueWebhookDLQ({
      webhookEventId,
      event: webhookEvent.event,
      paymentId: webhookEvent.paymentId,
      lastError: err.message,
      attempts,
      failedAt: new Date(),
    });
  }
}

export function startWebhookWorker() {
  if (workerInstance) return workerInstance;

  workerInstance = new Worker(RETRY_QUEUE, processRetryJob, {
    connection: getRedisConnection(),
    concurrency: 5,
    maxStalledCount: 3,
    stalledInterval: 30000,
  });

  workerInstance.on('completed', (job) => {
    logger.info(MODULE, 'Retry job completed', { jobId: job.id });
  });

  workerInstance.on('failed', (job, err) => {
    logger.error(MODULE, 'Retry job failed', {
      jobId: job?.id,
      attempt: job?.attemptsMade,
      error: err.message,
    });
  });

  logger.info(MODULE, 'Webhook retry worker started', {
    queue: RETRY_QUEUE,
    concurrency: 5,
  });

  return workerInstance;
}

export async function stopWebhookWorker() {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
    logger.info(MODULE, 'Webhook retry worker stopped');
  }
}

export async function closeWebhookQueues() {
  await Promise.all([
    retryQueueInstance?.close(),
    dlqInstance?.close(),
  ]);
  retryQueueInstance = null;
  dlqInstance = null;
  logger.info(MODULE, 'Webhook queues closed');
}

export default {
  getWebhookRetryQueue,
  getWebhookDLQ,
  enqueueWebhookRetry,
  enqueueWebhookDLQ,
  startWebhookWorker,
  stopWebhookWorker,
  closeWebhookQueues,
};
