import { STUDIO_NAME, STUDIO_TAGLINE } from './engine/tokens.js';
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
    body = `<h2 style="margin:0 0 16px;font-family:'Outfit','Segoe UI',sans-serif;font-size:20px;color:#2D1406;">${escapeHtml(title)}</h2><div style="font-size:15px;line-height:1.7;color:#3B1D0D;white-space:pre-wrap;">${message}</div>`;
    text = `${title}\n\n${message.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')}`;
  }

  return { subject, text, html: layout({ body }) };
}

export default fromNotification;
