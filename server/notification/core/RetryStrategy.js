import { isSmtpRetryable } from '../../mailer.js';
import logger from '../logger.js';

const MODULE = 'RetryStrategy';

const DEFAULTS = {
  baseDelayMs: 60_000,       // 1 minute — SMTP providers rate-limit aggressively
  maxDelayMs:  86_400_000,   // 24 hours
  jitter:      0.2,          // +/- 20% random jitter
};

const NON_RETRYABLE_CODES = new Set([
  'INVALID_RECIPIENT',
  'REJECTED',
  'BOUNCE',
  'COMPLAINT',
  'EAUTH',
  'EENVELOPE',
]);

const BUILTIN_POLICIES = {
  inApp:    { maxAttempts: 1 },
  email:    { maxAttempts: 5 },
  whatsapp: { maxAttempts: 3 },
  sms:      { maxAttempts: 3 },
  push:     { maxAttempts: 2 },
};

export class RetryStrategy {
  constructor(opts = {}) {
    this.baseDelayMs = opts.baseDelayMs ?? DEFAULTS.baseDelayMs;
    this.maxDelayMs  = opts.maxDelayMs  ?? DEFAULTS.maxDelayMs;
    this.jitter      = opts.jitter      ?? DEFAULTS.jitter;
    this._policies   = { ...BUILTIN_POLICIES, ...opts.policies };
  }

  setPolicy(channel, maxAttempts) {
    this._policies[channel] = { maxAttempts };
  }

  maxAttempts(channel) {
    return this._policies[channel]?.maxAttempts ?? 1;
  }

  /**
   * Determine whether a failed delivery should be retried.
   *
   * Rules:
   *   - Exhausted max attempts → no
   *   - Known non-retryable error code → no
   *   - SMTP 5xx (permanent) → no
   *   - SMTP 4xx (transient) → yes
   *   - All others → yes
   */
  shouldRetry(attempt, channel, error) {
    if (attempt >= this.maxAttempts(channel)) return false;

    if (!error) return true;

    // Check known non-retryable codes first.
    if (NON_RETRYABLE_CODES.has(error.code)) {
      logger.debug(MODULE, 'Non-retryable code', { code: error.code, attempt, channel });
      return false;
    }

    // Check SMTP status codes.
    if (channel === 'email' && !isSmtpRetryable(error)) {
      logger.debug(MODULE, 'Non-retryable SMTP error', { responseCode: error.responseCode, message: error.message, attempt });
      return false;
    }

    return true;
  }

  /**
   * Exponential backoff with full jitter.
   *
   * Formula: min(base * 2^(attempt-1), maxDelay) * (1 + jitter * random(-1, 1))
   *
   * Attempt 1: 60s ±20%
   * Attempt 2: 120s ±20%
   * Attempt 3: 4min ±20%
   * Attempt 4: 8min ±20%
   * Attempt 5: 16min ±20%
   */
  nextDelayMs(attempt) {
    const delay = Math.min(
      this.baseDelayMs * Math.pow(2, attempt - 1),
      this.maxDelayMs,
    );

    const jitterRange = delay * this.jitter;
    const jitterOffset = (Math.random() * 2 - 1) * jitterRange;

    return Math.round(delay + jitterOffset);
  }

  nextRetryAt(attempt) {
    return new Date(Date.now() + this.nextDelayMs(attempt));
  }
}

export default RetryStrategy;
