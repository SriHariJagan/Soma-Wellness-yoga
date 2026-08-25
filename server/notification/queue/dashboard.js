import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getNotificationQueue } from './notificationQueue.js';
import { getDLQ } from './dlq.js';
import logger from '../logger.js';

const MODULE = 'QueueDashboard';

let router = null;

/**
 * Create and return the Bull Board Express router.
 * Mount at `/admin/queues` (requires admin auth).
 */
export function getDashboardRouter() {
  if (router) return router;

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const notificationQueue = getNotificationQueue();
  const dlq = getDLQ();

  const queueAdapters = [
    new BullMQAdapter(notificationQueue, { readOnlyMode: false }),
  ];

  // Only add DLQ adapter if it's a real BullMQ Queue, not the
  // in-memory fallback (which is returned when Redis is unavailable).
  if (typeof dlq?.toKey === 'function') {
    queueAdapters.push(new BullMQAdapter(dlq, { readOnlyMode: false }));
  } else {
    logger.info(MODULE, 'DLQ is in-memory fallback — skipping BullBoard adapter');
  }

  createBullBoard({
    queues: queueAdapters,
    serverAdapter,
  });

  router = serverAdapter.getRouter();
  logger.info(MODULE, 'Dashboard mounted at /admin/queues');

  return router;
}

export default { getDashboardRouter };
