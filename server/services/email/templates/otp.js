import { STUDIO_NAME } from '../../../notification/templates/engine/tokens.js';
import { p, heading, card, alert, escapeHtml } from '../../../notification/templates/engine/components.js';
import layout from '../../../notification/templates/engine/layout.js';

export default function render(data = {}) {
  const name = escapeHtml(data.name || 'there');
  const otp = escapeHtml(data.otp || '000000');
  const expiryMinutes = data.expiryMinutes || 10;

  const subject = `Your OTP for ${STUDIO_NAME}`;

  const otpDisplay = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;">
      <tr>
        <td align="center" style="background:#F8F4EC;border-radius:8px;padding:20px;letter-spacing:8px;font-family:'Inter','Segoe UI',Arial,sans-serif;font-size:32px;font-weight:700;color:#2D1406;">
          ${otp}
        </td>
      </tr>
    </table>
  `;

  const body = `
    ${heading('Your One-Time Password')}
    ${p(`Hi ${name},`)}
    ${p(`Use the following OTP to complete your verification on ${STUDIO_NAME}.`)}
    ${card({ title: 'OTP', content: otpDisplay })}
    ${alert({ type: 'warning', message: `This OTP is valid for ${expiryMinutes} minutes. For security reasons, please do not share this code with anyone.` })}
    ${p('If you did not request this OTP, please ignore this email.', { muted: true, small: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    'Your One-Time Password',
    '',
    `Hi ${name},`,
    `Use the following OTP to complete your verification on ${STUDIO_NAME}.`,
    '',
    `OTP: ${otp}`,
    '',
    `This OTP is valid for ${expiryMinutes} minutes. For security reasons, please do not share this code with anyone.`,
    '',
    'If you did not request this OTP, please ignore this email.',
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: 'Your OTP code' }) };
}