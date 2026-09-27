import { STUDIO_NAME } from './engine/tokens.js';
import { button, p, heading, card, infoTable, alert, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function paymentReminder(notification) {
  const data = notification.templateData || {};
  const user = notification.user || {};

  const label       = data.label       || 'your payment';
  const amount      = data.amount      || '';
  const status      = data.status      || 'due';
  const payLink     = data.payLink     || notification.link || '';
  const name        = data.name || user.name || 'there';

  const subject = notification.subject || `Payment ${status}: ${label}`;

  const rows = [
    { label: 'Item', value: `<strong>${escapeHtml(label)}</strong>` },
  ];
  if (amount) rows.push({ label: 'Amount', value: `<strong>${escapeHtml(amount)}</strong>` });
  rows.push({ label: 'Status', value: escapeHtml(status) });

  const body = `
    ${heading(status === 'overdue' ? 'Payment Overdue' : 'Payment Reminder')}
    ${p(`Hi ${escapeHtml(name)},`)}
    ${p(status === 'overdue'
      ? `Your payment for <strong>${escapeHtml(label)}</strong> is <strong>overdue</strong>. Please complete it to secure your booking or membership.`
      : `Your payment for <strong>${escapeHtml(label)}</strong> is still <strong>pending</strong>. Please complete it soon — unpaid reservations may expire.`)}
    ${card({ title: 'Payment Details', content: infoTable(rows) })}
    ${status === 'overdue' ? alert({ type: 'warning', message: 'Complete your payment today to avoid losing your reservation.' }) : ''}
    ${payLink ? button({ label: 'Complete Payment', url: payLink }) : ''}
    ${p(`Asante for choosing ${STUDIO_NAME}!`, { muted: true })}
  `;

  const text = [
    `Payment ${status}: ${label}`,
    '',
    `Hi ${name},`,
    status === 'overdue'
      ? `Your payment for ${label} is overdue. Please complete it to secure your booking or membership.`
      : `Your payment for ${label} is still pending. Please complete it soon.`,
    ...(amount ? [`Amount: ${amount}`] : []),
    ...(payLink ? [`Pay here: ${payLink}`] : []),
    '',
    `Asante for choosing ${STUDIO_NAME}!`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `Payment ${status}: ${label}` }) };
}
