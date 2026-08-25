import { STUDIO_NAME } from '../../../notification/templates/engine/tokens.js';
import { button, p, heading, alert, escapeHtml } from '../../../notification/templates/engine/components.js';
import layout from '../../../notification/templates/engine/layout.js';

export default function render(data = {}) {
  const name = escapeHtml(data.name || 'there');
  const resetLink = data.resetLink || '#';

  const subject = `Reset Your ${STUDIO_NAME} Password`;

  const body = `
    ${heading('Password Reset Request')}
    ${p(`Hi ${name},`)}
    ${p(`We received a request to reset the password for your ${STUDIO_NAME} account. Click the button below to set a new password.`)}
    ${button({ label: 'Reset Password', url: resetLink })}
    ${alert({ type: 'warning', message: 'This link expires in 15 minutes. If you did not request a password reset, please ignore this email or contact support.' })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    'Password Reset Request',
    '',
    `Hi ${name},`,
    `We received a request to reset the password for your ${STUDIO_NAME} account.`,
    '',
    `Reset your password here: ${resetLink}`,
    '',
    'This link expires in 15 minutes. If you did not request a password reset, please ignore this email or contact support.',
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: 'Password reset requested' }) };
}