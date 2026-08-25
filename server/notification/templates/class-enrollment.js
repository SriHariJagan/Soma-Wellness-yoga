import { STUDIO_NAME } from './engine/tokens.js';
import { button, p, heading, infoTable, card, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function classEnrollment(notification) {
  const data = notification.templateData || {};
  const user = notification.user || {};

  const className  = data.className  || 'your class';
  const classTime  = data.classTime  || '';
  const classDate  = data.classDate  || '';
  const instructor = data.instructor || '';
  const meetLink   = data.meetLink   || notification.link || '';
  const name       = data.name || user.name || 'there';

  const subject = notification.subject || `Enrolled: ${escapeHtml(className)}`;

  const rows = [
    { label: 'Class', value: `<strong>${escapeHtml(className)}</strong>` },
  ];
  if (classDate) rows.push({ label: 'Date', value: escapeHtml(classDate) });
  if (classTime) rows.push({ label: 'Time', value: escapeHtml(classTime) });
  if (instructor) rows.push({ label: 'Instructor', value: escapeHtml(instructor) });

  const body = `
    ${heading('Enrollment Confirmed')}
    ${p(`Hi ${escapeHtml(name)},`)}
    ${p(`You have been enrolled in <strong>${escapeHtml(className)}</strong>. We look forward to seeing you in class!`)}
    ${card({ title: 'Class Details', content: infoTable(rows) })}
    ${meetLink ? button({ label: 'Join Class', url: meetLink }) : ''}
    ${p('A reminder will be sent before the class begins.', { muted: true, small: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    `Enrolled: ${className}`,
    '',
    `Hi ${name},`,
    `You have been enrolled in ${className}. We look forward to seeing you in class!`,
    '',
    ...(classDate ? [`Date: ${classDate}`] : []),
    ...(classTime ? [`Time: ${classTime}`] : []),
    ...(instructor ? [`Instructor: ${instructor}`] : []),
    '',
    ...(meetLink ? [`Join here: ${meetLink}`] : []),
    '',
    'A reminder will be sent before the class begins.',
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `Enrolled in ${escapeHtml(className)}` }) };
}
