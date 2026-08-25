import { STUDIO_NAME } from './engine/tokens.js';
import { button, p, heading, infoTable, card, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function workshopReminder(notification) {
  const data = notification.templateData || {};
  const user = notification.user || {};

  const workshopName = data.workshopName || 'your workshop';
  const workshopDate = data.workshopDate || '';
  const workshopTime = data.workshopTime || '';
  const instructor   = data.instructor   || '';
  const meetLink     = data.meetLink     || notification.link || '';
  const name         = data.name || user.name || 'there';

  const subject = notification.subject || `Reminder: ${escapeHtml(workshopName)} Workshop`;

  const rows = [
    { label: 'Workshop', value: `<strong>${escapeHtml(workshopName)}</strong>` },
  ];
  if (workshopDate) rows.push({ label: 'Date', value: escapeHtml(workshopDate) });
  if (workshopTime) rows.push({ label: 'Time', value: escapeHtml(workshopTime) });
  if (instructor) rows.push({ label: 'Instructor', value: escapeHtml(instructor) });

  const body = `
    ${heading('Workshop Reminder')}
    ${p(`Hi ${escapeHtml(name)},`)}
    ${p(`Excited to see you at <strong>${escapeHtml(workshopName)}</strong>! Here are the details:`)}
    ${card({ title: 'Workshop Details', content: infoTable(rows) })}
    ${meetLink ? button({ label: 'Join Workshop', url: meetLink }) : ''}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    `Reminder: ${workshopName} Workshop`,
    '',
    `Hi ${name},`,
    `Excited to see you at ${workshopName}! Here are the details:`,
    '',
    ...(workshopDate ? [`Date: ${workshopDate}`] : []),
    ...(workshopTime ? [`Time: ${workshopTime}`] : []),
    ...(instructor ? [`Instructor: ${instructor}`] : []),
    '',
    ...(meetLink ? [`Join here: ${meetLink}`] : []),
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `${escapeHtml(workshopName)} workshop reminder` }) };
}
