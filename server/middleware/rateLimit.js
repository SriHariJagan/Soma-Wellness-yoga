import ApiError from '../utils/ApiError.js';
import { getRedisClient } from '../config/redis.js';

const memoryStore = new Map();

function getWindowStart(windowMs) {
  return Math.floor(Date.now() / windowMs) * windowMs;
}

export function rateLimit({ windowMs = 15 * 60 * 1000, max = 100, message } = {}) {
  return async (req, res, next) => {
    try {
      const redis = getRedisClient();
      const key = `rateLimit:${req.ip}:${req.baseUrl}${req.path}:${getWindowStart(windowMs)}`;

      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, windowMs).catch(() => {});
      }

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));

      if (count > max) {
        return next(new ApiError(429, message || 'Too many requests, please try again later.'));
      }
      next();
    } catch {
      // Redis unavailable — fall back to in-memory rate limiting
      const memKey = `${req.ip}:${req.baseUrl}${req.path}`;
      const now = Date.now();
      const windowKey = Math.floor(now / windowMs);

      if (!memoryStore.has(memKey) || memoryStore.get(memKey).window !== windowKey) {
        memoryStore.set(memKey, { window: windowKey, count: 1 });
      } else {
        const entry = memoryStore.get(memKey);
        entry.count += 1;
        if (entry.count > max) {
          return next(new ApiError(429, message || 'Too many requests, please try again later.'));
        }
      }

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 'degraded');

      next();
    }
  };
}

// Clean up stale memory entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.window < Math.floor(now / (15 * 60 * 1000)) - 1) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export default rateLimit;
