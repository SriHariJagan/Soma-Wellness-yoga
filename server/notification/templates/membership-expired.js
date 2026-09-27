import { STUDIO_NAME } from './engine/tokens.js';
import { button, p, heading, alert, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function membershipExpired(notification) {
  const data = notification.templateData || {};
  const user = notification.user || {};

  const planName   = data.planName   || 'your membership';
  const expiryDate = data.expiryDate || '';
  const renewLink  = data.renewLink  || notification.link || '';
  const name       = data.name || user.name || 'there';

  const subject = notification.subject || `Your ${planName} membership has expired`;

  const body = `
    ${heading('Membership Expired')}
    ${p(`Hi ${escapeHtml(name)},`)}
    ${p(`Your <strong>${escapeHtml(planName)}</strong> membership has <strong>expired</strong>${expiryDate ? ` on <strong>${escapeHtml(expiryDate)}</strong>` : ''}.`)}
    ${alert({ type: 'warning', message: 'Renew today to restore member savings, priority booking and premium content.' })}
    ${p('We would love to welcome you back for another year of wellness.')}
    ${renewLink ? button({ label: 'Renew Membership', url: renewLink }) : ''}
    ${p(`Karibu back to ${STUDIO_NAME}!`, { muted: true })}
  `;

  const text = [
    `Your ${planName} membership has expired`,
    '',
    `Hi ${name},`,
    `Your ${planName} membership has expired${expiryDate ? ` on ${expiryDate}` : ''}.`,
    '',
    'Renew today to restore member savings, priority booking and premium content.',
    ...(renewLink ? [`Renew here: ${renewLink}`] : []),
    '',
    `Karibu back to ${STUDIO_NAME}!`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `${planName} expired` }) };
}
