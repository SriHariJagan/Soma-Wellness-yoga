import { STUDIO_NAME, STUDIO_TAGLINE, BRAND, FONT } from './engine/tokens.js';
import { escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export { STUDIO_NAME, STUDIO_TAGLINE, escapeHtml };

function fromNotification(notification) {
  const title = notification.title || '';
  const message = notification.message || '';
  const subject = notification.subject || title;

  let body = '';
  let text = '';
  if (message) {
    body = `<h2 style="margin:0 0 16px;font-family:'Playfair Display','Georgia',serif;font-size:22px;color:${BRAND.text};">${escapeHtml(title)}</h2><div style="font-family:${FONT.body};font-size:15px;line-height:1.7;color:${BRAND.textSecondary};white-space:pre-wrap;">${message}</div>`;
    text = `${title}\n\n${message.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')}`;
  }

  return { subject, text, html: layout({ body }) };
}

export default fromNotification;
