import ApiError from '../utils/ApiError.js';

const DEFAULT_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 120000;

export function requestTimeout(timeoutMs = DEFAULT_TIMEOUT) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        next(new ApiError(503, 'Request timed out'));
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timer));

    next();
  };
}

export default requestTimeout;
