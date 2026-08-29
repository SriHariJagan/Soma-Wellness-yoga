import { STUDIO_NAME } from '../../../notification/templates/engine/tokens.js';
import { p, heading, card, infoTable, escapeHtml } from '../../../notification/templates/engine/components.js';
import layout from '../../../notification/templates/engine/layout.js';

export default function render(data = {}) {
  const name = escapeHtml(data.name || 'there');
  const amount = data.amount || '0';
  const mpesaReceipt = escapeHtml(data.mpesaReceipt || '');
  const paymentDate = data.paymentDate || new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
  const description = escapeHtml(data.description || 'Payment');

  const subject = `Payment Confirmed — ${STUDIO_NAME}`;

  const rows = [
    { label: 'Amount', value: `KES ${Number(amount).toLocaleString()}` },
    { label: 'M-PESA Receipt', value: mpesaReceipt || 'N/A' },
    { label: 'Date', value: paymentDate },
    { label: 'Description', value: description },
  ];

  const body = `
    ${heading('Payment Confirmed')}
    ${p(`Hi ${escapeHtml(name)},`)}
    ${p('Your M-PESA payment has been received and confirmed. Here are the details:')}
    ${card(infoTable(rows))}
    ${p('Thank you for choosing Soma Wellness!', { muted: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    'Payment Confirmed',
    '',
    `Hi ${name},`,
    `Your M-PESA payment has been received and confirmed.`,
    '',
    `Amount: KES ${Number(amount).toLocaleString()}`,
    `M-PESA Receipt: ${mpesaReceipt || 'N/A'}`,
    `Date: ${paymentDate}`,
    `Description: ${description}`,
    '',
    'Thank you for choosing Soma Wellness!',
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return {
    subject,
    text,
    html: layout({ body, previewText: 'Payment confirmed' }),
  };
}
