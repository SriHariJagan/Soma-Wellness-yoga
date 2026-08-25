import { STUDIO_NAME } from './engine/tokens.js';
import { button, p, heading, card, alert, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function membershipReminder(notification) {
  const data = notification.templateData || {};
  const user = notification.user || {};

  const planName      = data.planName      || 'your membership';
  const expiryDate    = data.expiryDate    || '';
  const renewLink     = data.renewLink     || notification.link || '';
  const daysRemaining = data.daysRemaining || '';
  const name          = data.name || user.name || 'there';

  const subject = notification.subject || `${escapeHtml(planName)} Membership Renewal Reminder`;

  const body = `
    ${heading('Membership Renewal Reminder')}
    ${p(`Hi ${escapeHtml(name)},`)}
    ${p(`Your <strong>${escapeHtml(planName)}</strong> membership ${daysRemaining ? `expires in <strong>${escapeHtml(String(daysRemaining))} days</strong>` : 'is expiring soon'}.`)}
    ${expiryDate ? p(`Expiry date: <strong>${escapeHtml(expiryDate)}</strong>`) : ''}
    ${p('Renew now to continue enjoying unlimited access to classes, workshops, and exclusive content.')}
    ${daysRemaining && Number(daysRemaining) <= 3 ? alert({ type: 'warning', message: `Your membership expires in ${escapeHtml(String(daysRemaining))} day${Number(daysRemaining) === 1 ? '' : 's'}. Renew today to avoid interruption.` }) : ''}
    ${renewLink ? button({ label: 'Renew Membership', url: renewLink }) : ''}
    ${p(`Thank you for being part of ${STUDIO_NAME}!`, { muted: true })}
  `;

  const text = [
    `${planName} Membership Renewal Reminder`,
    '',
    `Hi ${name},`,
    `Your ${planName} membership ${daysRemaining ? `expires in ${daysRemaining} days` : 'is expiring soon'}.`,
    ...(expiryDate ? [`Expiry date: ${expiryDate}`] : []),
    '',
    'Renew now to continue enjoying unlimited access to classes, workshops, and exclusive content.',
    ...(renewLink ? [`Renew here: ${renewLink}`] : []),
    '',
    `Thank you for being part of ${STUDIO_NAME}!`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `${escapeHtml(planName)} renewal reminder` }) };
}
