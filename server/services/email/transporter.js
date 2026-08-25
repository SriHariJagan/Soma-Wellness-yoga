import SmtpProvider from '../../notification/providers/SmtpProvider.js';
import logger from '../../notification/logger.js';

const MODULE = 'EmailTransporter';

let provider = null;

function getProvider() {
  if (!provider) {
    provider = new SmtpProvider();
  }
  return provider;
}

export async function sendMail(mailOptions) {
  const p = getProvider();
  if (!p._initialized) await p.initialize();
  return p.send(mailOptions);
}

export async function verify() {
  const p = getProvider();
  return p.verify();
}

export function getStatus() {
  const p = getProvider();
  return p.getStatus();
}

export function close() {
  if (provider) {
    provider.close();
    provider = null;
  }
}

export default { sendMail, verify, getStatus, close };