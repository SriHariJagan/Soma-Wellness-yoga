import logger from '../notification/logger.js';

const MODULE = 'Timeout';

export function withTimeout(promise, ms = 120000, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${label} timed out after ${ms}ms`);
      err.code = 'TIMEOUT';
      err.timeoutMs = ms;
      reject(err);
    }, ms);
  });

  const raced = Promise.race([promise, timeout]);

  raced
    .finally(() => clearTimeout(timer))
    .catch(() => {});

  promise.then(
    (result) => {
      // If this fires after the timeout already rejected, the result is orphaned.
      // We log it so we know delivery may have actually succeeded.
      logger.warn(MODULE, `${label} completed after timeout was triggered`, {
        timeoutMs: ms,
        label,
      });
      return result;
    },
    (err) => {
      if (err.code !== 'TIMEOUT') {
        logger.warn(MODULE, `${label} failed after timeout was triggered`, {
          timeoutMs: ms,
          label,
          error: err.message,
        });
      }
    },
  );

  return raced;
}

export default withTimeout;
