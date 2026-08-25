import { STUDIO_NAME } from './engine/tokens.js';
import { p, heading, infoTable, card, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function consultationConfirmation(notification) {
  const data = notification.templateData || {};
  const user = notification.user || {};
  const name = data.name || user.name || 'there';
  const consultationDate = data.consultationDate || '';
  const doctor = data.doctor || 'Pragya Wellness Team';
  const topic = data.topic || 'General consultation';

  const subject = notification.subject || 'Consultation Booked';

  const rows = [];
  if (consultationDate) rows.push({ label: 'Date', value: escapeHtml(consultationDate) });
  if (doctor) rows.push({ label: 'Consultant', value: escapeHtml(doctor) });
  if (topic) rows.push({ label: 'Topic', value: escapeHtml(topic) });

  const body = `
    ${heading('Consultation Confirmed')}
    ${p(`Hi ${escapeHtml(name)},`)}
    ${p('Your consultation has been scheduled successfully. Here are the details:')}
    ${card({ title: 'Consultation Details', content: infoTable(rows) })}
    ${p('You will receive a reminder closer to the date. If you need to reschedule, please log in to your dashboard.', { muted: true, small: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    'Consultation Confirmed',
    '',
    `Hi ${name},`,
    'Your consultation has been scheduled successfully. Here are the details:',
    '',
    ...(consultationDate ? [`Date: ${consultationDate}`] : []),
    ...(doctor ? [`Consultant: ${doctor}`] : []),
    ...(topic ? [`Topic: ${topic}`] : []),
    '',
    'You will receive a reminder closer to the date. If you need to reschedule, please log in to your dashboard.',
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: 'Consultation confirmed' }) };
}
