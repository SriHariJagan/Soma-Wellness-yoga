import { STUDIO_NAME } from './engine/tokens.js';
import { button, p, heading, infoTable, card, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function workshopConfirmation(notification) {
  const data = notification.templateData || {};
  const user = notification.user || {};

  const workshopName = data.workshopName || 'your workshop';
  const workshopDate = data.workshopDate || '';
  const workshopTime = data.workshopTime || '';
  const instructor   = data.instructor   || '';
  const meetLink     = data.meetLink     || notification.link || '';
  const price        = data.price        || '';
  const name         = data.name || user.name || 'there';

  const subject = notification.subject || `Registration Confirmed: ${escapeHtml(workshopName)}`;

  const rows = [
    { label: 'Workshop', value: `<strong>${escapeHtml(workshopName)}</strong>` },
  ];
  if (workshopDate) rows.push({ label: 'Date', value: escapeHtml(workshopDate) });
  if (workshopTime) rows.push({ label: 'Time', value: escapeHtml(workshopTime) });
  if (instructor) rows.push({ label: 'Instructor', value: escapeHtml(instructor) });
  if (price) rows.push({ label: 'Amount', value: escapeHtml(price) });

  const body = `
    ${heading('Registration Confirmed!')}
    ${p(`Hi ${escapeHtml(name)},`)}
    ${p(`You are now registered for <strong>${escapeHtml(workshopName)}</strong>. We look forward to having you!`)}
    ${card({ title: 'Workshop Details', content: infoTable(rows) })}
    ${meetLink ? button({ label: 'Join Workshop', url: meetLink }) : ''}
    ${p('A reminder will be sent shortly before the workshop begins.', { muted: true, small: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    `Registration Confirmed: ${workshopName}`,
    '',
    `Hi ${name},`,
    `You are now registered for ${workshopName}. We look forward to having you!`,
    '',
    ...(workshopDate ? [`Date: ${workshopDate}`] : []),
    ...(workshopTime ? [`Time: ${workshopTime}`] : []),
    ...(instructor ? [`Instructor: ${instructor}`] : []),
    ...(price ? [`Amount: ${price}`] : []),
    '',
    ...(meetLink ? [`Join Link: ${meetLink}`] : []),
    '',
    'A reminder will be sent shortly before the workshop begins.',
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `Registered for ${escapeHtml(workshopName)}` }) };
}
