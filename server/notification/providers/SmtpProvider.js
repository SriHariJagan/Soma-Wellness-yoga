import nodemailer from 'nodemailer';
import { BaseProvider } from './BaseProvider.js';
import logger from '../logger.js';

const MODULE = 'SmtpProvider';

function parseSmtpResponse(response) {
  if (!response || typeof response !== 'string') return { code: 0, enhancedCode: '', text: '' };
  const match = response.match(/^(\d{3})(?:\s(\d+\.\d+\.\d+))?\s?(.*)/);
  if (!match) return { code: 0, enhancedCode: '', text: response };
  return {
    code: parseInt(match[1], 10),
    enhancedCode: match[2] || '',
    text: match[3] || '',
  };
}

export class SmtpProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this._transporter = null;
    this._verifyInProgress = null;
    this._lastVerifyResult = null;
    this._lastVerifyTime = null;
  }

  async initialize() {
    const cfg = this._resolveConfig();

    if (!cfg.host || !cfg.user || !cfg.pass) {
      logger.warn(MODULE, 'SMTP not fully configured — using no-op transport', {
        hostConfigured: !!cfg.host,
        userConfigured: !!cfg.user,
      });
      this._transporter = this._createNoopTransport(cfg);
      this._initialized = true;
      return;
    }

    logger.info(MODULE, 'Creating SMTP transport', {
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      user: cfg.user,
    });

    this._transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      family: 4,
      auth: { user: cfg.user, pass: cfg.pass },
      pool: false,
      connectionTimeout: cfg.connectionTimeoutMs || 15000,
      greetingTimeout: cfg.greetingTimeoutMs || 15000,
      socketTimeout: cfg.socketTimeoutMs || 60000,
      requireTLS: !cfg.secure,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });

    this._initialized = true;
  }

  async send(mailOptions) {
    if (!this._initialized) await this.initialize();
    if (!this._transporter) throw new Error('SMTP transport not initialized');

    const start = Date.now();
    let info;

    try {
      info = await this._transporter.sendMail(mailOptions);
    } catch (err) {
      const duration = Date.now() - start;
      const classified = this._classifyError(err);
      logger.error(MODULE, 'SMTP sendMail threw', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        duration,
        error: err.message,
        errorCode: err.code,
        responseCode: err.responseCode,
        command: err.command,
        retryable: classified.retryable,
      });
      err.retryable = classified.retryable;
      throw err;
    }

    const duration = Date.now() - start;

    const validation = this._validateResponse(info);
    if (!validation.valid) {
      logger.error(MODULE, 'SMTP response validation failed', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        duration,
        messageId: info.messageId,
        rawResponse: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
        pending: info.pending,
        errors: validation.errors.map((e) => e.message),
      });
      const combined = new Error(`SMTP response invalid: ${validation.errors.map((e) => e.message).join('; ')}`);
      combined.code = 'SMTP_VALIDATION_FAILED';
      combined.retryable = false;
      combined.info = info;
      throw combined;
    }

    logger.info(MODULE, 'SMTP accepted message', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      duration,
      messageId: info.messageId,
      response: info.response,
    });

    return {
      providerMessageId: info.messageId,
      providerResponse: {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        pending: info.pending,
        response: info.response,
      },
    };
  }

  async verify() {
    if (this._verifyInProgress) return this._verifyInProgress;

    this._verifyInProgress = (async () => {
      try {
        await this.initialize();
        if (typeof this._transporter?.verify === 'function') {
          await this._transporter.verify();
        }
        this._lastVerifyResult = true;
        this._lastVerifyTime = Date.now();
        const cfg = this._resolveConfig();
        logger.info(MODULE, 'SMTP connection verified', { host: cfg.host, port: cfg.port });
        return true;
      } catch (err) {
        this._lastVerifyResult = false;
        this._lastVerifyTime = Date.now();
        logger.error(MODULE, 'SMTP verification failed', { error: err.message });
        return false;
      } finally {
        this._verifyInProgress = null;
      }
    })();

    return this._verifyInProgress;
  }

  getStatus() {
    const cfg = this._resolveConfig();
    return {
      provider: 'smtp',
      configured: !!(cfg.host && cfg.user && cfg.pass),
      verified: this._lastVerifyResult,
      lastVerified: this._lastVerifyTime,
      host: cfg.host,
      port: cfg.port,
      fromEmail: cfg.fromEmail,
      fromName: cfg.fromName,
    };
  }

  close() {
    if (this._transporter?.close) {
      try { this._transporter.close(); } catch { }
    }
    this._transporter = null;
    this._initialized = false;
  }

  _resolveConfig() {
    const env = process.env;
    const host = env.SMTP_HOST || '';
    const user = env.SMTP_USER || env.EMAIL_USER || '';
    const pass = env.SMTP_PASS || env.EMAIL_PASS || '';
    const effectiveHost = host || (env.EMAIL_USER ? 'smtp.gmail.com' : '');
    const defaultPort = env.SMTP_SECURE === 'true' ? 465 : (effectiveHost ? 587 : 0);

    return {
      host: effectiveHost,
      port: parseInt(env.SMTP_PORT, 10) || defaultPort,
      secure: env.SMTP_SECURE === 'true',
      user,
      pass,
      fromEmail: env.FROM_EMAIL || env.EMAIL_FROM || '',
      fromName: env.FROM_NAME || env.EMAIL_FROM_NAME || 'Pragya Yoga Alliance',
      replyTo: env.REPLY_TO || '',
      connectionTimeoutMs: parseInt(env.SMTP_CONNECTION_TIMEOUT_MS, 10) || 15000,
      greetingTimeoutMs: parseInt(env.SMTP_GREETING_TIMEOUT_MS, 10) || 15000,
      socketTimeoutMs: parseInt(env.SMTP_SOCKET_TIMEOUT_MS, 10) || 60000,
    };
  }

  _createNoopTransport(cfg) {
    return {
      sendMail: async (opts) => {
        logger.info(MODULE, 'NOOP send', { to: opts.to, subject: opts.subject });
        return {
          accepted: [opts.to],
          rejected: [],
          pending: [],
          messageId: 'noop-' + Date.now(),
          response: '250 2.0.0 OK (noop)',
        };
      },
      verify: async () => false,
      close: () => {},
    };
  }

  _validateResponse(info) {
    const errors = [];

    if (!info) return { valid: false, errors: [new Error('SMTP returned null/undefined response')] };

    const parsed = parseSmtpResponse(info.response);

    if (parsed.code !== 250) {
      errors.push(new Error(`SMTP status ${parsed.code} ${parsed.enhancedCode} — ${parsed.text}`));
    }

    if (parsed.enhancedCode && !parsed.enhancedCode.startsWith('2.')) {
      errors.push(new Error(`SMTP enhanced code indicates failure: ${parsed.enhancedCode}`));
    }

    if (!info.messageId || typeof info.messageId !== 'string' || info.messageId.length < 3) {
      errors.push(new Error(`Invalid or missing messageId: ${JSON.stringify(info.messageId)}`));
    }

    if (info.pending?.length > 0) {
      errors.push(new Error(`SMTP deferred recipients: ${info.pending.join(', ')}`));
    }

    return { valid: errors.length === 0, errors };
  }

  _classifyError(err) {
    const code = err.code || '';
    const responseCode = parseInt(err.responseCode, 10);

    if (code === 'EAUTH') return { retryable: false, reason: 'authentication_failure' };
    if (code === 'ECOMPARE' || code === 'ECONNECTION' || code === 'ETIMEDOUT') return { retryable: true, reason: 'network_error' };
    if (code === 'ERATE') return { retryable: true, reason: 'rate_limited' };
    if (code === 'SMTP_VALIDATION_FAILED') return { retryable: false, reason: 'invalid_response' };
    if (responseCode >= 500) return { retryable: false, reason: 'permanent_failure' };
    if (responseCode >= 400 && responseCode < 500) return { retryable: true, reason: 'transient_failure' };

    return { retryable: true, reason: 'unknown_error' };
  }
}

export default SmtpProvider;
