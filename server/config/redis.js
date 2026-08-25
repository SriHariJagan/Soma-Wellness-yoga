import IORedis from 'ioredis';
import logger from '../notification/logger.js';

const MODULE = 'RedisConfig';

let client = null;
let subscriber = null;

const DEFAULT_REDIS_URL = 'redis://localhost:6379';

function buildRedisOptions() {
  const url = process.env.REDIS_URL || DEFAULT_REDIS_URL;

  const MAX_RETRIES = 60; // ~30 minutes of exponential backoff
  const common = {
    // Fail fast when Redis is down/flaky: don't queue commands forever or
    // retry them endlessly — otherwise every request (rate limiter etc.)
    // blocks for seconds waiting on a dead connection.
    commandTimeout: 2000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > MAX_RETRIES) {
        logger.error(MODULE, `Max Redis retries (${MAX_RETRIES}) exceeded — stopping`);
        return null; // stop retrying
      }
      const delay = Math.min(200 * Math.pow(2, times - 1), 30000);
      logger.warn(MODULE, `Retrying Redis connection (attempt ${times})`, { delayMs: delay });
      return delay;
    },
    reconnectOnError(err) {
      logger.error(MODULE, 'Redis reconnect on error', { error: err.message });
      return true;
    },
    keyPrefix: 'pragya:',
  };

  if (url.startsWith('rediss://')) {
    return {
      ...common,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
      retryStrategy: common.retryStrategy,
    };
  }

  return { ...common };
}

export function getRedisClient() {
  if (!client) {
    const url = process.env.REDIS_URL || DEFAULT_REDIS_URL;
    const opts = buildRedisOptions();

    client = new IORedis(url, opts);

    client.on('connect', () => logger.info(MODULE, 'Connected'));
    client.on('ready', () => logger.info(MODULE, 'Ready'));
    client.on('error', (err) => logger.error(MODULE, 'Error', { error: err.message }));
    client.on('close', () => logger.warn(MODULE, 'Connection closed'));
    client.on('reconnecting', () => logger.warn(MODULE, 'Reconnecting'));
  }
  return client;
}

export function getSubscriberClient() {
  if (!subscriber) {
    const url = process.env.REDIS_URL || DEFAULT_REDIS_URL;
    const opts = buildRedisOptions();
    subscriber = new IORedis(url, opts);
  }
  return subscriber;
}

export async function closeRedisClients() {
  const tasks = [];
  if (client) {
    tasks.push(client.quit().catch(() => {}));
    client = null;
  }
  if (subscriber) {
    tasks.push(subscriber.quit().catch(() => {}));
    subscriber = null;
  }
  await Promise.all(tasks);
  logger.info(MODULE, 'Clients closed');
}

export default { getRedisClient, getSubscriberClient, closeRedisClients };
