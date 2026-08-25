import { Queue } from 'bullmq';
import { getRedisConnection } from '../queue/connection.js';
import logger from '../logger.js';

const MODULE = 'ReminderQueue';
const REMINDER_QUEUE_NAME = 'reminder-checks';

let queueInstance = null;

export function getReminderQueue() {
  if (!queueInstance) {
    const connection = getRedisConnection();
    queueInstance = new Queue(REMINDER_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },
        removeOnFail: { age: 30 * 24 * 3600, count: 5000 },
      },
    });
    logger.info(MODULE, 'Queue initialized', { name: REMINDER_QUEUE_NAME });
  }
  return queueInstance;
}

export async function closeReminderQueue() {
  if (queueInstance) {
    await queueInstance.close();
    queueInstance = null;
    logger.info(MODULE, 'Queue closed');
  }
}

export default { getReminderQueue, closeReminderQueue };
