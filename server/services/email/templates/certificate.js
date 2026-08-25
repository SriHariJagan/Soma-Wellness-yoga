import { STUDIO_NAME } from '../../../notification/templates/engine/tokens.js';
import { button, p, heading, card, escapeHtml } from '../../../notification/templates/engine/components.js';
import layout from '../../../notification/templates/engine/layout.js';

export default function render(data = {}) {
  const name = escapeHtml(data.name || 'Valued Student');
  const certificateName = escapeHtml(data.certificateName || 'Yoga Certificate');
  const certificateUrl = data.certificateUrl || '#';
  const issueDate = data.issueDate || new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

  const subject = `Your Certificate is Ready — ${STUDIO_NAME}`;

  const body = `
    ${heading('Certificate Ready!')}
    ${p(`Congratulations, ${name}!`)}
    ${p(`Your <strong>${certificateName}</strong> certificate is now available for download.`)}
    ${card({ title: 'Certificate Details', content: `<p style="margin:0;font-size:14px;color:#3B1D0D;"><strong>Certificate:</strong> ${certificateName}<br><strong>Issue Date:</strong> ${issueDate}</p>` })}
    ${button({ label: 'Download Certificate', url: certificateUrl })}
    ${p('We are proud of your achievement and look forward to seeing you continue your wellness journey!', { muted: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    'Certificate Ready!',
    '',
    `Congratulations, ${data.name || 'Valued Student'}!`,
    `Your ${data.certificateName || 'Yoga Certificate'} certificate is now available for download.`,
    '',
    `Certificate: ${data.certificateName || 'Yoga Certificate'}`,
    `Issue Date: ${issueDate}`,
    '',
    `Download: ${certificateUrl}`,
    '',
    'We are proud of your achievement!',
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: 'Your certificate is ready!' }) };
}