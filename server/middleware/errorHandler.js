import ApiError from '../utils/ApiError.js';
import logger, { getContext } from '../notification/logger.js';

const MODULE = 'ErrorHandler';

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `That ${field} is already in use`;
  }

  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Invalid token'; }
  if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Token expired'; }

  // SECURITY: Strip internal error details from all responses to avoid leaking
  // gateway internals, stack traces, or Razorpay error details to clients.
  // Razorpay GatewayError.details can contain API keys and integration internals.
  if (statusCode >= 500 || err.name === 'GatewayError' || err.razorpayError) {
    details = undefined;
  }

  const ctx = getContext();
  const logMeta = {
    error: message,
    errorCode: err.code || err.name,
    statusCode,
    method: req.method,
    url: req.originalUrl,
    requestId: ctx.requestId || req.requestId || undefined,
    userId: ctx.userId || req.userId || undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    // Log the full details server-side for debugging 5xx errors
    internalDetails: statusCode >= 500 ? details : undefined,
  };

  if (statusCode >= 500) {
    logger.error(MODULE, err.message, logMeta);
  } else {
    logger.warn(MODULE, err.message, logMeta);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(details && statusCode < 500 ? { details } : {}),
  });
}
