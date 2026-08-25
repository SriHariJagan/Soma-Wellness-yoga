import { STUDIO_NAME, STUDIO_TAGLINE } from './engine/tokens.js';
import { p, heading, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function leadConfirmation(notification) {
  const data = notification.templateData || {};

  const name = escapeHtml(data.name || 'there');
  const interestType = escapeHtml(data.interestType || 'yoga');

  const subject = 'Thank you for reaching out!';

  const body = `
    ${heading('We received your enquiry')}
    ${p(`Hi ${name},`)}
    ${p(`Thank you for your interest in <strong>${interestType}</strong> at ${STUDIO_NAME}.`)}
    ${p('One of our team members will get back to you shortly — usually within 24 hours. If you have any urgent questions, feel free to reply to this email.')}
    ${p(`We look forward to helping you on your journey with ${STUDIO_NAME}!`, { muted: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    'Thank you for reaching out!',
    '',
    `Hi ${data.name || 'there'},`,
    `Thank you for your interest in ${data.interestType || 'yoga'} at ${STUDIO_NAME}.`,
    'One of our team members will get back to you shortly — usually within 24 hours.',
    'If you have any urgent questions, feel free to reply to this email.',
    '',
    `We look forward to helping you on your journey with ${STUDIO_NAME}!`,
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: 'Thank you for reaching out!' }) };
}
