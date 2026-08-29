// ============================================================
// WhatsAppProvider.js — Meta Cloud API (WhatsApp Business Platform)
// Handles token management and message sending via the
// WhatsApp Cloud API v19.0
// ============================================================
import { BaseProvider } from './BaseProvider.js';
import logger from '../logger.js';

const MODULE = 'WhatsAppProvider';
const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_BASE = 'https://graph.facebook.com';

class WhatsAppProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this._initialized = false;
    this._lastVerifyResult = null;
    this._lastVerifyTime = null;
  }

  async initialize() {
    const cfg = this._resolveConfig();
    if (!cfg.accessToken || !cfg.phoneNumberId) {
      logger.warn(MODULE, 'WhatsApp not fully configured — provider disabled', {
        accessTokenConfigured: !!cfg.accessToken,
        phoneNumberIdConfigured: !!cfg.phoneNumberId,
      });
      this._initialized = true;
      return;
    }
    this._initialized = true;
    logger.info(MODULE, 'WhatsApp provider initialized', {
      phoneNumberId: cfg.phoneNumberId,
      businessAccountId: cfg.businessAccountId,
    });
  }

  get isConfigured() {
    const cfg = this._resolveConfig();
    return !!(cfg.accessToken && cfg.phoneNumberId);
  }

  /**
   * Send a WhatsApp message via the Cloud API.
   * @param {Object} opts
   * @param {string} opts.to — Recipient phone number (E.164 or raw)
   * @param {string} opts.message — Plain text message body
   * @param {Object} [opts.template] — Optional pre-approved template
   * @returns {Object} { providerMessageId, providerResponse }
   */
  async send({ to, message, template }) {
    if (!this._initialized) await this.initialize();

    const cfg = this._resolveConfig();
    const phone = this._normalisePhone(to);

    if (!phone) {
      const err = new Error('Invalid recipient phone number');
      err.code = 'INVALID_RECIPIENT';
      err.retryable = false;
      throw err;
    }

    // ── Dev mode: log to console when no real credentials ──
    if (!cfg.accessToken || cfg.accessToken.startsWith('TEST_') || process.env.WHATSAPP_DEV_MODE === 'true') {
      const devMsg = {
        _devMode: true,
        to: phone,
        type: template ? 'template' : 'text',
        message: message || template?.name || '',
        timestamp: new Date().toISOString(),
        mockMessageId: `wamid.dev.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`,
      };
      console.log('\n╔══════════════════════════════════════════════════╗');
      console.log('║  📱 WHATSAPP DEV MODE — Message logged (not sent) ║');
      console.log('╚══════════════════════════════════════════════════╝');
      console.log(`  To:      ${phone}`);
      console.log(`  Type:    ${devMsg.type}`);
      console.log(`  Message: ${devMsg.message}`);
      console.log(`  ID:      ${devMsg.mockMessageId}`);
      console.log('');
      return {
        providerMessageId: devMsg.mockMessageId,
        providerResponse: devMsg,
      };
    }

    // ── Production: call Meta Cloud API ──
    const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${cfg.phoneNumberId}/messages`;
    const start = Date.now();

    let body;
    if (template) {
      body = this._buildTemplateBody(phone, template);
    } else {
      body = this._buildTextBody(phone, message);
    }

    logger.info(MODULE, 'Sending WhatsApp message', {
      to: phone,
      type: template ? 'template' : 'text',
      preview: (message || template?.name || '').slice(0, 60),
    });

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      const duration = Date.now() - start;
      const classified = this._classifyError(err);
      logger.error(MODULE, 'WhatsApp API network error', {
        to: phone,
        duration,
        error: err.message,
        retryable: classified.retryable,
      });
      err.retryable = classified.retryable;
      throw err;
    }

    const duration = Date.now() - start;
    const data = await res.json();

    if (!res.ok || data.error) {
      const errorCode = data.error?.code || res.status;
      const errorMsg = data.error?.message || `HTTP ${res.status}`;
      const classified = this._classifyApiError(errorCode, res.status);

      logger.error(MODULE, 'WhatsApp API error', {
        to: phone,
        duration,
        httpStatus: res.status,
        errorCode,
        errorMsg,
        retryable: classified.retryable,
      });

      const err = new Error(`WhatsApp API error: ${errorMsg}`);
      err.code = classified.code;
      err.retryable = classified.retryable;
      err.providerResponse = data;
      throw err;
    }

    const messageId = data.messages?.[0]?.id;
    if (!messageId) {
      const err = new Error('WhatsApp API returned no message ID');
      err.code = 'INVALID_PROVIDER_RESPONSE';
      err.retryable = false;
      err.providerResponse = data;
      throw err;
    }

    logger.info(MODULE, 'WhatsApp message sent', {
      to: phone,
      messageId,
      duration,
    });

    return {
      providerMessageId: messageId,
      providerResponse: data,
    };
  }

  /**
   * Send a template message (for initiating conversations or structured messages).
   * Templates must be pre-approved by Meta.
   */
  async sendTemplate({ to, templateName, language = 'en', components = [] }) {
    return this.send({
      to,
      template: { name: templateName, language, components },
    });
  }

  /** Check if the WhatsApp Business account is reachable */
  async verify() {
    const cfg = this._resolveConfig();
    if (!cfg.accessToken || !cfg.phoneNumberId) {
      this._lastVerifyResult = false;
      this._lastVerifyTime = Date.now();
      return false;
    }

    try {
      const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${cfg.phoneNumberId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${cfg.accessToken}` },
      });
      const data = await res.json();
      this._lastVerifyResult = res.ok && !data.error;
      this._lastVerifyTime = Date.now();
      if (this._lastVerifyResult) {
        logger.info(MODULE, 'WhatsApp phone number verified', {
          phoneNumberId: cfg.phoneNumberId,
          displayPhoneNumber: data.display_phone_number,
          verifiedName: data.verified_name,
        });
      } else {
        logger.warn(MODULE, 'WhatsApp verification failed', { error: data.error?.message });
      }
      return this._lastVerifyResult;
    } catch (err) {
      this._lastVerifyResult = false;
      this._lastVerifyTime = Date.now();
      logger.error(MODULE, 'WhatsApp verification error', { error: err.message });
      return false;
    }
  }

  getStatus() {
    const cfg = this._resolveConfig();
    return {
      provider: 'whatsapp',
      configured: this.isConfigured,
      verified: this._lastVerifyResult,
      lastVerified: this._lastVerifyTime,
      phoneNumberId: cfg.phoneNumberId || '',
      businessAccountId: cfg.businessAccountId || '',
      displayPhone: cfg.displayPhone || '',
    };
  }

  close() {
    this._initialized = false;
  }

  // ── Private helpers ─────────────────────────────────────────

  _resolveConfig() {
    const env = process.env;
    return {
      accessToken: env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || '',
      businessAccountId: env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
      displayPhone: env.WHATSAPP_DISPLAY_PHONE || '',
      apiVersion: env.WHATSAPP_API_VERSION || GRAPH_API_VERSION,
    };
  }

  _normalisePhone(phone) {
    let p = String(phone).replace(/[\s\-()]/g, '');
    if (p.startsWith('+')) p = p.slice(1);
    // Kenya: leading 0 → 254
    if (p.startsWith('0')) p = '254' + p.slice(1);
    // India: leading 0 → 91
    if (p.startsWith('91') && p.length === 12) return p; // already correct
    if (p.length === 10 && (p.startsWith('6') || p.startsWith('7') || p.startsWith('8') || p.startsWith('9'))) {
      p = '91' + p; // Indian mobile
    }
    if (!p.startsWith('254') && !p.startsWith('91') && p.length === 9) p = '254' + p;
    return p;
  }

  _buildTextBody(phone, message) {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: { preview_url: false, body: message },
    };
  }

  _buildTemplateBody(phone, template) {
    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: template.name,
        language: { code: template.language || 'en' },
      },
    };
    if (template.components?.length) {
      body.template.components = template.components;
    }
    return body;
  }

  _classifyError(err) {
    const code = err.code || '';
    if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
      return { retryable: true, reason: 'network_error' };
    }
    if (code === 'ECONNRESET' || code === 'EPIPE') {
      return { retryable: true, reason: 'connection_lost' };
    }
    return { retryable: true, reason: 'unknown_error' };
  }

  _classifyApiError(errorCode, httpStatus) {
    // Rate limiting
    if (httpStatus === 429 || errorCode === 32) {
      return { code: 'RATE_LIMITED', retryable: true };
    }
    // Temporary errors
    if (httpStatus === 500 || httpStatus === 502 || httpStatus === 503) {
      return { code: 'SERVER_ERROR', retryable: true };
    }
    // Auth errors
    if (httpStatus === 401 || httpStatus === 403) {
      return { code: 'AUTH_ERROR', retryable: false };
    }
    // Invalid parameter
    if (errorCode === 100 || errorCode === 102) {
      return { code: 'INVALID_PARAMETER', retryable: false };
    }
    // Phone not in allowed list (sandbox)
    if (errorCode === 131047 || errorCode === 131026) {
      return { code: 'RECIPIENT_NOT_ALLOWED', retryable: false };
    }
    // Message Undeliverable
    if (errorCode === 131047) {
      return { code: 'UNDELIVERABLE', retryable: false };
    }
    return { code: 'API_ERROR', retryable: httpStatus >= 500 };
  }
}

export default WhatsAppProvider;
