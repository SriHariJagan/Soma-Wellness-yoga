import { getRedisConnection } from '../../notification/queue/connection.js';
import { IdempotencyError } from '../errors/PaymentErrors.js';
import logger from '../../notification/logger.js';

const MODULE = 'IdempotencyPlugin';
const DEFAULT_TTL_SECONDS = 86400;

export class IdempotencyPlugin {
  constructor(options = {}) {
    this.ttlSeconds = options.ttlSeconds || DEFAULT_TTL_SECONDS;
    this.redis = options.redis || getRedisConnection();
    this.prefix = 'idempotency:';
  }

  _buildKey(rawKey) {
    return `${this.prefix}${rawKey}`;
  }

  async lock(key, ttlSeconds) {
    const redisKey = this._buildKey(key);
    const ttl = ttlSeconds || this.ttlSeconds;
    try {
      const result = await this.redis.set(redisKey, 'locked', 'NX', 'EX', ttl);
      return result === 'OK';
    } catch (err) {
      // Redis unavailable — degrade to "lock acquired" so payments never
      // fail because of a down cache. Duplicate protection still exists
      // at the database layer.
      logger.warn(MODULE, 'Redis unavailable — skipping lock', { error: err.message, key });
      return true;
    }
  }

  async unlock(key) {
    const redisKey = this._buildKey(key);
    await this.redis.del(redisKey).catch(() => {});
  }

  async executeWithIdempotency(key, ttlSeconds, fn) {
    const redisKey = this._buildKey(key);

    let acquired = false;
    try {
      acquired = await this.redis.set(redisKey, 'locked', 'NX', 'EX', ttlSeconds || this.ttlSeconds);
    } catch (err) {
      // Redis unavailable — proceed without the lock rather than fail
      // the payment. The checkout flow also checks for an existing order
      // at the DB level before executing.
      logger.warn(MODULE, 'Redis unavailable — proceeding without idempotency lock', { error: err.message, key });
      acquired = 'OK';
    }

    if (acquired !== 'OK') {
      throw new IdempotencyError('Duplicate request – a payment with this idempotency key is already being processed');
    }

    try {
      const result = await fn();
      return result;
    } catch (err) {
      await this.redis.del(redisKey).catch(() => {});
      throw err;
    }
  }

  async release(key) {
    const redisKey = this._buildKey(key);
    await this.redis.del(redisKey).catch(() => {});
    logger.debug(MODULE, 'Idempotency lock released', { key });
  }
}

export default IdempotencyPlugin;
