import SmtpProvider from './notification/providers/SmtpProvider.js';
import logger from './notification/logger.js';

const MODULE = 'Mailer';

let provider = null;

function getProvider() {
  if (!provider) {
    provider = new SmtpProvider();
  }
  return provider;
}

export function isSmtpRetryable(err) {
  if (!err) return true;
  if (err.retryable === false) return false;
  if (err.retryable === true) return true;

  const code = err.code || '';
  const responseCode = parseInt(err.responseCode, 10);

  if (code === 'EAUTH') return false;
  if (code === 'SMTP_VALIDATION_FAILED') return false;
  if (code === 'ECOMPARE' || code === 'ECONNECTION' || code === 'ETIMEDOUT') return true;
  if (code === 'ERATE') return true;
  if (responseCode >= 500) return false;
  if (responseCode >= 400 && responseCode < 500) return true;

  return true;
}

export function getSmtpConfig() {
  const p = getProvider();
  return p._resolveConfig();
}

const transporter = {
  sendMail: async (opts) => {
    const p = getProvider();
    if (!p._initialized) await p.initialize();
    return p._transporter.sendMail(opts);
  },

  async verify() {
    const p = getProvider();
    return p.verify();
  },

  getStatus() {
    const p = getProvider();
    return p.getStatus();
  },

  close() {
    if (provider) {
      provider.close();
      provider = null;
    }
  },
};

export default transporter;
