import crypto from 'node:crypto';
import logger, { asyncContext } from '../notification/logger.js';

const MODULE = 'HTTP';

export function requestLogger(req, res, next) {
  const requestId = crypto.randomUUID();
  const start = Date.now();

  const store = { requestId };
  if (req.userId) store.userId = req.userId;

  asyncContext.enterWith(store);

  req.requestId = requestId;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](MODULE, `${req.method} ${req.originalUrl}`, {
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      userId: req.userId || store.userId || undefined,
      userAgent: req.get('user-agent') || undefined,
      ip: req.ip || req.socket?.remoteAddress || undefined,
    });
  });

  next();
}

export default requestLogger;
