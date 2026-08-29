// ============================================================
// WhatsAppChannel — Notification channel for WhatsApp messages
// Uses the Meta Cloud API via WhatsAppProvider.
// Follows the exact same pattern as EmailChannel.
// ============================================================
import { NotificationChannel } from '../channelInterface.js';
import { render } from '../templates/index.js';
import WhatsAppProvider from '../providers/WhatsAppProvider.js';
import logger from '../logger.js';

const MODULE = 'WhatsAppChannel';

let provider = null;

function getProvider() {
  if (!provider) {
    provider = new WhatsAppProvider();
  }
  return provider;
}

export class WhatsAppChannel extends NotificationChannel {
  async send(notification) {
    const start = Date.now();
    const user = notification.user;
    const recipientPhone = notification.recipientPhone || user?.phone;
    const notificationId = String(notification._id);
    const template = notification.template || notification.type || 'unknown';

    if (!recipientPhone) {
      const err = new Error(`No recipient phone for notification ${notificationId}`);
      err.code = 'INVALID_RECIPIENT';
      err.retryable = false;
      logger.error(MODULE, 'Missing recipient phone', { notificationId, template });
      throw err;
    }

    if (!getProvider().isConfigured && process.env.WHATSAPP_DEV_MODE !== 'true') {
      const err = new Error('WhatsApp provider not configured');
      err.code = 'MISSING_PROVIDER_CONFIG';
      err.retryable = false;
      throw err;
    }

    // Use the rendered text content from the template system
    // WhatsApp is text-only — no HTML needed
    const rendered = render(notification);
    const messageText = this._buildMessage(notification, rendered);

    logger.info(MODULE, 'Sending WhatsApp message', {
      notificationId,
      to: recipientPhone,
      template,
      preview: messageText.slice(0, 80),
    });

    let result;
    try {
      result = await getProvider().send({
        to: recipientPhone,
        message: messageText,
      });
    } catch (err) {
      const duration = Date.now() - start;
      logger.error(MODULE, 'WhatsApp delivery failed', {
        notificationId,
        to: recipientPhone,
        template,
        duration,
        error: err.message,
        errorCode: err.code,
        retryable: err.retryable,
      });
      throw err;
    }

    const duration = Date.now() - start;

    if (!result.providerMessageId) {
      const err = new Error('Provider returned empty message ID');
      err.code = 'INVALID_PROVIDER_RESPONSE';
      err.retryable = false;
      logger.error(MODULE, 'Empty providerMessageId', {
        notificationId, to: recipientPhone, duration,
      });
      throw err;
    }

    logger.info(MODULE, 'WhatsApp message accepted', {
      notificationId,
      to: recipientPhone,
      template,
      messageId: result.providerMessageId,
      duration,
    });

    return {
      providerMessageId: result.providerMessageId,
      providerResponse: result.providerResponse,
    };
  }

  /**
   * Build the final WhatsApp message text.
   * Uses the notification's message field if present,
   * otherwise falls back to the template's plain text output.
   */
  _buildMessage(notification, rendered) {
    // Priority 1: Explicit message from the notification
    if (notification.message) return notification.message;

    // Priority 2: Template's plain text (strip email signatures/footers)
    if (rendered.text) {
      return this._stripEmailArtifacts(rendered.text);
    }

    // Priority 3: Template's subject as a short notice
    if (rendered.subject) return rendered.subject;

    return 'You have a new notification from Soma Wellness.';
  }

  /**
   * Strip common email artifacts from plain text to make it
   * suitable for WhatsApp (shorter, no email headers/signatures).
   */
  _stripEmailArtifacts(text) {
    let msg = text;

    // Remove email-style headers (Subject:, From:, etc.)
    msg = msg.replace(/^(Subject|From|To|Date|Sent|CC|BCC)\s*:.*$/gm, '');

    // Remove common email footers/signatures
    msg = msg.replace(/-+\s*Original Message\s*-+/gi, '');
    msg = msg.replace(/-+\s*Forwarded message\s*-+/gi, '');
    msg = msg.replace(/On\s+\w+,\s+\w+\s+\d+,.*wrote:/gi, '');

    // Remove multiple blank lines
    msg = msg.replace(/\n{3,}/g, '\n\n');

    // Trim
    msg = msg.trim();

    // Truncate to WhatsApp's 4096 char limit
    if (msg.length > 4000) {
      msg = msg.slice(0, 3990) + '\n\n…';
    }

    return msg;
  }
}

export default WhatsAppChannel;
