import { STUDIO_NAME } from './engine/tokens.js';
import { p, heading, divider, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function newsletter(notification) {
  const subject = notification.subject || `${STUDIO_NAME} Newsletter`;

  const content = notification.message || '';
  const displayTitle = notification.title || STUDIO_NAME;

  const body = `
    ${heading(displayTitle, 1)}
    <div style="font-size:15px;line-height:1.7;color:#3B1D0D;">
      ${content}
    </div>
    ${divider()}
    ${p('Stay connected with us on social media for daily inspiration, tips, and updates.', { muted: true, small: true })}
    ${p(`Namaste — ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    displayTitle,
    '',
    notification.message ? notification.message.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '') : '',
    '',
    'Stay connected with us on social media for daily inspiration, tips, and updates.',
    '',
    `Namaste — ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: subject }) };
}
