import { STUDIO_NAME } from '../../../notification/templates/engine/tokens.js';
import { p, heading, escapeHtml } from '../../../notification/templates/engine/components.js';
import layout from '../../../notification/templates/engine/layout.js';

export default function render(data = {}) {
  const name = escapeHtml(data.name || 'there');

  const subject = `Thank you for contacting ${STUDIO_NAME}`;

  const body = `
    ${heading('We received your enquiry')}
    ${p(`Hi ${name},`)}
    ${p(`Thank you for reaching out to <strong>${STUDIO_NAME}</strong>. We have received your enquiry and our team will review it shortly.`)}
    ${p('You can expect to hear back from us within 24 hours. If your matter is urgent, please reply to this email or contact us directly.')}
    ${p('We look forward to connecting with you and supporting your wellness journey!', { muted: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    'We received your enquiry',
    '',
    `Hi ${name},`,
    `Thank you for reaching out to ${STUDIO_NAME}. We have received your enquiry and our team will review it shortly.`,
    'You can expect to hear back from us within 24 hours. If your matter is urgent, please reply to this email or contact us directly.',
    '',
    'We look forward to connecting with you and supporting your wellness journey!',
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: 'Thank you for contacting us' }) };
}