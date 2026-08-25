import { STUDIO_NAME } from './engine/tokens.js';
import { button, p, heading, infoTable, card, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function classReminder(notification) {
  const data = notification.templateData || {};
  const user = notification.user || {};

  const className  = data.className  || 'your class';
  const classTime  = data.classTime  || '';
  const classDate  = data.classDate  || '';
  const instructor = data.instructor || '';
  const meetLink   = data.meetLink   || notification.link || '';
  const name       = data.name || user.name || 'there';

  const subject = notification.subject || `Reminder: ${escapeHtml(className)}`;

  const rows = [
    { label: 'Class', value: `<strong>${escapeHtml(className)}</strong>` },
  ];
  if (classDate) rows.push({ label: 'Date', value: escapeHtml(classDate) });
  if (classTime) rows.push({ label: 'Time', value: escapeHtml(classTime) });
  if (instructor) rows.push({ label: 'Instructor', value: escapeHtml(instructor) });

  const body = `
    ${heading('Class Reminder')}
    ${p(`Hi ${escapeHtml(name)},`)}
    ${p(`This is a friendly reminder that <strong>${escapeHtml(className)}</strong> is coming up soon.`)}
    ${card({ title: 'Class Details', content: infoTable(rows) })}
    ${meetLink ? button({ label: 'Join Class', url: meetLink }) : ''}
    ${p(`See you on the mat! — ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    `Reminder: ${className}`,
    '',
    `Hi ${name},`,
    `This is a friendly reminder that ${className} is coming up soon.`,
    '',
    ...(classDate ? [`Date: ${classDate}`] : []),
    ...(classTime ? [`Time: ${classTime}`] : []),
    ...(instructor ? [`Instructor: ${instructor}`] : []),
    '',
    ...(meetLink ? [`Join here: ${meetLink}`] : []),
    '',
    `See you on the mat! — ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `${escapeHtml(className)} reminder` }) };
}
