// ============================================================
// utils/asyncHandler.js
// Wraps async route handlers so thrown errors / rejected
// promises are forwarded to the central error middleware.
// ============================================================
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
