import { STUDIO_NAME } from '../../../notification/templates/engine/tokens.js';
import { p, heading, card, infoTable, escapeHtml } from '../../../notification/templates/engine/components.js';
import layout from '../../../notification/templates/engine/layout.js';

export default function render(data = {}) {
  const name = escapeHtml(data.name || 'Unknown');
  const email = escapeHtml(data.email || '');
  const phone = escapeHtml(data.phone || '');
  const subjectInput = escapeHtml(data.subject || '');
  const message = escapeHtml(data.message || '');
  const submissionDate = data.submissionDate || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const ip = data.ip || 'Not available';

  const subject = 'New Website Enquiry';

  const rows = [
    { label: 'Name', value: name },
    { label: 'Email', value: email },
    { label: 'Phone', value: phone || 'Not provided' },
    { label: 'Subject', value: subjectInput || 'Not provided' },
    { label: 'Date', value: submissionDate },
    { label: 'IP Address', value: ip },
  ];

  const body = `
    ${heading('New Website Enquiry')}
    ${p('A visitor has submitted an enquiry through the website contact form. Details are below.')}
    ${card({ title: 'Enquiry Details', content: infoTable(rows) })}
    ${message ? card({ title: 'Message', content: `<p style="margin:0;font-size:14px;line-height:1.7;">${message}</p>` }) : ''}
    ${p(`— ${STUDIO_NAME} System`, { muted: true, small: true })}
  `;

  const text = [
    'New Website Enquiry',
    '',
    'A visitor has submitted an enquiry through the website contact form.',
    '',
    `Name: ${data.name || 'Unknown'}`,
    `Email: ${data.email || ''}`,
    `Phone: ${data.phone || 'Not provided'}`,
    `Subject: ${data.subject || 'Not provided'}`,
    `Date: ${submissionDate}`,
    `IP: ${ip}`,
    '',
    data.message ? `Message:\n${data.message}` : '',
    '',
    `— ${STUDIO_NAME} System`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: 'New website enquiry received' }) };
}