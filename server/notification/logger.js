import { AsyncLocalStorage } from 'node:async_hooks';

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL] ?? 2;
const ENABLED = process.env.NODE_ENV !== 'test';

export const asyncContext = new AsyncLocalStorage();

export function getContext() {
  return asyncContext.getStore() || {};
}

const IST_OFFSET = '+05:30';

let _dtf = null;
function getFormatter() {
  if (!_dtf) {
    _dtf = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }
  return _dtf;
}

export function istTimestamp() {
  const now = new Date();
  const parts = getFormatter().formatToParts(now);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}.${ms}${IST_OFFSET}`;
}

const SENSITIVE_KEYS = new Set([
  'password', 'newPassword', 'currentPassword', 'token', 'refreshToken', 'accessToken',
  'secret', 'apiKey', 'authorization', 'cookie', 'set-cookie',
  'razorpay_key_secret', 'razorpay_webhook_secret', 'jwt_secret', 'jwt_refresh_secret',
  'smtp_pass', 'email_pass', 'monog_uri',
]);

function redactMeta(meta) {
  const redacted = {};
  for (const [key, val] of Object.entries(meta)) {
    if (val !== undefined && val !== null) {
      redacted[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : val;
    }
  }
  return redacted;
}

function emit(level, module, message, meta = {}) {
  if (!ENABLED || LOG_LEVELS[level] === undefined || LOG_LEVELS[level] > CURRENT_LEVEL) return;

  const ctx = getContext();

  const entry = {
    timestamp: istTimestamp(),
    level,
    module,
    message,
  };

  if (ctx.requestId) entry.requestId = ctx.requestId;
  if (ctx.userId) entry.userId = ctx.userId;
  if (ctx.jobId) entry.jobId = ctx.jobId;

  for (const [key, val] of Object.entries(redactMeta(meta))) {
    entry[key] = val;
  }

  const line = JSON.stringify(entry);
  if (level === 'error') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

export const logger = {
  error: (module, msg, meta) => emit('error', module, msg, meta),
  warn:  (module, msg, meta) => emit('warn',  module, msg, meta),
  info:  (module, msg, meta) => emit('info',  module, msg, meta),
  debug: (module, msg, meta) => emit('debug', module, msg, meta),
};

export default logger;
