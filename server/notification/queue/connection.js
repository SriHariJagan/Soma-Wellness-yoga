import IORedis from 'ioredis';
import logger from '../logger.js';

const MODULE = 'RedisConnection';

let client = null;
let subscriber = null;

const DEFAULT_REDIS_URL = 'redis://localhost:6379';

function buildRedisOptions() {
  const url = process.env.REDIS_URL || DEFAULT_REDIS_URL;

  const MAX_RETRIES = 60; // ~30 minutes of exponential backoff
  const common = {
    // BullMQ requires maxRetriesPerRequest: null, but commands must still
    // fail fast when the connection is down instead of queueing forever.
    maxRetriesPerRequest: null,
    commandTimeout: 3000,
    enableOfflineQueue: false,
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > MAX_RETRIES) {
        logger.error(MODULE, `Max Redis retries (${MAX_RETRIES}) exceeded — stopping`);
        return null; // stop retrying
      }
      // Exponential backoff: 200ms, 400ms, 800ms, ... up to 30s
      const delay = Math.min(200 * Math.pow(2, times - 1), 30000);
      logger.warn(MODULE, `Retrying Redis connection (attempt ${times})`, { delayMs: delay });
      return delay;
    },
    reconnectOnError(err) {
      logger.error(MODULE, 'Redis reconnect on error', { error: err.message });
      return true;
    },
  };

  // If URL is provided, parse TLS from the protocol.
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

/**
 * Get or create the shared Redis connection used by BullMQ.
 * BullMQ uses this connection for both client and subscriber roles.
 */
export function getRedisConnection() {
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

/**
 * Get a dedicated subscriber connection (needed for BullMQ worker).
 */
export function getSubscriberConnection() {
  if (!subscriber) {
    const url = process.env.REDIS_URL || DEFAULT_REDIS_URL;
    const opts = buildRedisOptions();
    subscriber = new IORedis(url, opts);
  }
  return subscriber;
}

/**
 * Close both Redis connections gracefully.
 */
export async function closeRedisConnections() {
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
  logger.info(MODULE, 'Connections closed');
}

export default { getRedisConnection, getSubscriberConnection, closeRedisConnections };
