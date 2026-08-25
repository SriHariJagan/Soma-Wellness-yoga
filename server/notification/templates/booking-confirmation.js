import { STUDIO_NAME } from './engine/tokens.js';
import { button, p, heading, infoTable, card, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function bookingConfirmation(notification) {
  const data = notification.templateData || {};

  const name = escapeHtml(data.name || 'there');
  const courseName = escapeHtml(data.courseName || 'your course');
  const coursePrice = data.coursePrice || '';

  const subject = `Booking Confirmed: ${courseName}`;

  const details = [];
  if (courseName) details.push({ label: 'Course', value: courseName });
  if (coursePrice) details.push({ label: 'Amount', value: `₹${coursePrice}` });

  const body = `
    ${heading('Booking Confirmed!')}
    ${p(`Hi ${name},`)}
    ${p(`Thank you for booking <strong>${courseName}</strong> with ${STUDIO_NAME}.`)}
    ${card({ title: 'Booking Details', content: infoTable(details) })}
    ${p('Our team will reach out to you with further details. If you have any questions, please reply to this email.', { muted: true, small: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    `Booking Confirmed: ${data.courseName || courseName}`,
    '',
    `Hi ${data.name || 'there'},`,
    `Thank you for booking ${data.courseName || 'your course'} with ${STUDIO_NAME}.`,
    '',
    ...(data.courseName ? [`Course: ${data.courseName}`] : []),
    ...(data.coursePrice ? [`Amount: ₹${data.coursePrice}`] : []),
    '',
    'Our team will reach out to you with further details. If you have any questions, please reply to this email.',
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `Booking confirmed for ${courseName}` }) };
}
