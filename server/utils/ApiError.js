// ============================================================
// utils/ApiError.js
// Operational error with an HTTP status code. Anything thrown
// as an ApiError is reported to the client; everything else is
// treated as a 500 and the details are hidden.
// ============================================================
export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', details)   { return new ApiError(400, msg, details); }
  static unauthorized(msg = 'Unauthorized', details) { return new ApiError(401, msg, details); }
  static forbidden(msg = 'Forbidden', details)       { return new ApiError(403, msg, details); }
  static notFound(msg = 'Resource not found', details) { return new ApiError(404, msg, details); }
  static conflict(msg = 'Conflict', details)         { return new ApiError(409, msg, details); }
  static tooManyRequests(msg = 'Too many requests', details) { return new ApiError(429, msg, details); }
}

export default ApiError;
