import { STUDIO_NAME } from '../../../notification/templates/engine/tokens.js';
import { p, heading, card, infoTable, escapeHtml } from '../../../notification/templates/engine/components.js';
import layout from '../../../notification/templates/engine/layout.js';

export default function render(data = {}) {
  const studentName = escapeHtml(data.studentName || 'Unknown');
  const email = escapeHtml(data.email || '');
  const phone = escapeHtml(data.phone || '');
  const registrationDate = data.registrationDate || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const subject = `New Registration — ${STUDIO_NAME}`;

  const rows = [
    { label: 'Name', value: studentName },
    { label: 'Email', value: email },
    { label: 'Phone', value: phone || 'Not provided' },
    { label: 'Date', value: registrationDate },
  ];

  const body = `
    ${heading('New Student Registration')}
    ${p('A new student has registered on the website. Details are below.')}
    ${card({ title: 'Student Details', content: infoTable(rows) })}
    ${p(`— ${STUDIO_NAME} System`, { muted: true, small: true })}
  `;

  const text = [
    'New Student Registration',
    '',
    'A new student has registered on the website.',
    '',
    `Name: ${data.studentName || 'Unknown'}`,
    `Email: ${data.email || ''}`,
    `Phone: ${data.phone || 'Not provided'}`,
    `Date: ${registrationDate}`,
    '',
    `— ${STUDIO_NAME} System`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: 'New student registration' }) };
}