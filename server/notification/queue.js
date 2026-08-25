// ============================================================
// notification/queue.js
//
// HISTORICAL NOTE: This file was the original in-memory delivery
// queue. As of the enterprise refactor, all delivery is handled
// by the NotificationWorker which polls the NotificationLog
// collection directly — no in-memory queue is needed.
//
// The `process()` and `add()` API is preserved as a no-op
// passthrough for backward compatibility with any code that
// imports this module. New code should import and use
// NotificationService directly.
// ============================================================
import logger from './logger.js';

const MODULE = 'NotificationQueue';

const jobHandlers = new Map();

export function process(name, handler) {
  if (jobHandlers.has(name)) {
    logger.warn(MODULE, `Overwriting handler for job "${name}"`);
  }
  jobHandlers.set(name, handler);
  logger.debug(MODULE, `Job handler registered: ${name}`);
}

export function add(name, data) {
  const handler = jobHandlers.get(name);
  if (handler) {
    handler(data).catch((err) => {
      logger.error(MODULE, `Job "${name}" failed`, { error: err.message });
    });
  }
  // No handler = no-op (the old in-memory path has been removed).
  // All delivery is handled by NotificationLog + NotificationWorker.
}

export function enqueue() {
  logger.warn(MODULE, 'enqueue() is deprecated — use NotificationService.send()');
}

export function size() {
  return 0;
}

export default { enqueue, size, process, add };
