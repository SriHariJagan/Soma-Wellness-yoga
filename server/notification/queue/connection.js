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

/**
 * Ping Redis with a short timeout to decide whether BullMQ workers
 * should start. Returns true when Redis answers, false otherwise.
 * Logs only once per process to avoid spamming when Redis is down.
 */
let _redisUnavailableLogged = false;
export function isRedisReady() {
  return !!client && client.status === 'ready';
}

const REDIS_READY_POLL_MS = 25;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function pingRedis(timeoutMs = 1500) {
  const deadline = Date.now() + Math.max(0, timeoutMs);
  try {
    const conn = getRedisConnection();
    if (conn.status === 'ready') return true;

    // The connection is created lazily, so right after
    // getRedisConnection() the client is usually still "connecting".
    // Because buildRedisOptions() sets `enableOfflineQueue: false` (so a
    // dead Redis fails fast instead of queueing forever), issuing a command
    // in that window throws immediately:
    //   "Stream isn't writeable and enableOfflineQueue options is false"
    // The previous implementation pinged straight away, so on any cold or
    // slow boot this returned false even though Redis was healthy — and
    // server.js then skipped startBullWorker(), startWebhookWorker() and
    // notificationScheduler() for the entire process lifetime (no later
    // re-check). Background notifications, webhook retries, reminders and
    // bulk-email silently degraded on every cold start.
    //
    // Wait for 'ready' first, bounded by timeoutMs.
    while (conn.status !== 'ready' && Date.now() < deadline) {
      await sleep(REDIS_READY_POLL_MS);
    }
    if (conn.status !== 'ready') {
      throw new Error('Redis connection did not become ready in time');
    }

    const ping = conn.ping();
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis ping timed out')), Math.max(0, deadline - Date.now())),
    );
    await Promise.race([ping, timeout]);
    return true;
  } catch (err) {
    if (!_redisUnavailableLogged) {
      logger.warn(MODULE, 'Redis unavailable — BullMQ workers will be skipped (direct-send fallback active)', {
        error: err.message,
      });
      _redisUnavailableLogged = true;
    }
    return false;
  }
}

export default { getRedisConnection, getSubscriberConnection, closeRedisConnections, isRedisReady, pingRedis };
