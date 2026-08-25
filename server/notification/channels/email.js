import { NotificationChannel } from '../channelInterface.js';
import { render } from '../templates/index.js';
import SmtpProvider from '../providers/SmtpProvider.js';
import logger from '../logger.js';

const MODULE = 'EmailChannel';

let provider = null;

function getProvider() {
  if (!provider) {
    provider = new SmtpProvider();
  }
  return provider;
}

export class EmailChannel extends NotificationChannel {
  async send(notification) {
    const start = Date.now();
    const user = notification.user;
    const recipientEmail = notification.recipientEmail || user?.email;
    const notificationId = String(notification._id);
    const template = notification.template || notification.type || 'unknown';

    if (!recipientEmail) {
      const err = new Error(`No recipient email for notification ${notificationId}`);
      err.code = 'INVALID_RECIPIENT';
      err.retryable = false;
      logger.error(MODULE, 'Missing recipient', { notificationId, template });
      throw err;
    }

    const rendered = render(notification);
    const { subject, text, html } = rendered;

    const cfg = getProvider()._resolveConfig();
    const fromName = cfg.fromName;
    const fromAddr = cfg.fromEmail || cfg.user;

    if (!fromAddr) {
      const err = new Error('SMTP from address not configured');
      err.code = 'MISSING_FROM';
      err.retryable = false;
      throw err;
    }

    const mailOpts = {
      from: `"${fromName}" <${fromAddr}>`,
      to: recipientEmail,
      subject,
      text,
      html,
    };

    if (cfg.replyTo) {
      mailOpts.replyTo = cfg.replyTo;
    }

    logger.info(MODULE, 'Sending email', {
      notificationId,
      to: recipientEmail,
      template,
      subject,
    });

    let result;
    try {
      result = await getProvider().send(mailOpts);
    } catch (err) {
      const duration = Date.now() - start;
      logger.error(MODULE, 'Email delivery failed', {
        notificationId,
        to: recipientEmail,
        template,
        subject,
        duration,
        error: err.message,
        errorCode: err.code,
        retryable: err.retryable,
      });
      throw err;
    }

    const duration = Date.now() - start;

    if (!result.providerMessageId) {
      const err = new Error('Provider returned empty messageId');
      err.code = 'INVALID_PROVIDER_RESPONSE';
      err.retryable = false;
      logger.error(MODULE, 'Empty providerMessageId', {
        notificationId, to: recipientEmail, duration,
      });
      throw err;
    }

    logger.info(MODULE, 'Email accepted by provider', {
      notificationId,
      to: recipientEmail,
      template,
      subject,
      messageId: result.providerMessageId,
      duration,
    });

    return {
      providerMessageId: result.providerMessageId,
      providerResponse: result.providerResponse,
    };
  }
}

export default EmailChannel;
