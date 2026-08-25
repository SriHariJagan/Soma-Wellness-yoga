import { STUDIO_NAME } from './engine/tokens.js';
import { button, p, heading, infoTable, card, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function eventReminder(notification) {
  const data = notification.templateData || {};
  const user = notification.user || {};

  const eventName  = data.eventName  || 'the upcoming event';
  const eventDate  = data.eventDate  || '';
  const eventTime  = data.eventTime  || '';
  const location   = data.location   || '';
  const meetLink   = data.meetLink   || notification.link || '';
  const name       = data.name || user.name || 'there';

  const subject = notification.subject || `Reminder: ${escapeHtml(eventName)}`;

  const rows = [
    { label: 'Event', value: `<strong>${escapeHtml(eventName)}</strong>` },
  ];
  if (eventDate) rows.push({ label: 'Date', value: escapeHtml(eventDate) });
  if (eventTime) rows.push({ label: 'Time', value: escapeHtml(eventTime) });
  if (location) rows.push({ label: 'Location', value: escapeHtml(location) });

  const body = `
    ${heading('Event Reminder')}
    ${p(`Hi ${escapeHtml(name)},`)}
    ${p(`Here's a quick reminder about <strong>${escapeHtml(eventName)}</strong>:`)}
    ${card({ title: 'Event Details', content: infoTable(rows) })}
    ${meetLink ? button({ label: 'View Event', url: meetLink }) : ''}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    `Reminder: ${eventName}`,
    '',
    `Hi ${name},`,
    `Here's a quick reminder about ${eventName}:`,
    '',
    ...(eventDate ? [`Date: ${eventDate}`] : []),
    ...(eventTime ? [`Time: ${eventTime}`] : []),
    ...(location ? [`Location: ${location}`] : []),
    '',
    ...(meetLink ? [`View event: ${meetLink}`] : []),
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `${escapeHtml(eventName)} reminder` }) };
}
