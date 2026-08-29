import { STUDIO_NAME } from '../../../notification/templates/engine/tokens.js';
import { button, p, heading, card, infoTable, escapeHtml } from '../../../notification/templates/engine/components.js';
import layout from '../../../notification/templates/engine/layout.js';

export default function render(data = {}) {
  const name = escapeHtml(data.name || 'Valued Customer');
  const amount = data.amount || '';
  const transactionId = escapeHtml(data.transactionId || '');
  const orderId = escapeHtml(data.orderId || '');
  const paymentDate = data.paymentDate || new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
  const description = escapeHtml(data.description || 'Purchase');
  const dashboardUrl = data.dashboardUrl || 'https://somawellness.in/dashboard';

  const subject = `Payment Successful — ${STUDIO_NAME}`;

  const rows = [
    { label: 'Transaction ID', value: transactionId },
    { label: 'Order ID', value: orderId },
    { label: 'Description', value: description },
    { label: 'Amount', value: amount },
    { label: 'Date', value: paymentDate },
  ];

  const body = `
    ${heading('Payment Successful!')}
    ${p(`Thank you for your purchase, ${name}! Your payment has been successfully processed.`)}
    ${card({ title: 'Receipt Details', content: infoTable(rows) })}
    ${button({ label: 'View Dashboard', url: dashboardUrl })}
    ${p('If you have any questions regarding this transaction, please reply to this email.', { muted: true, small: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    'Payment Successful!',
    '',
    `Thank you for your purchase, ${data.name || 'Valued Customer'}!`,
    '',
    `Transaction ID: ${data.transactionId || ''}`,
    `Order ID: ${data.orderId || ''}`,
    `Description: ${data.description || 'Purchase'}`,
    `Amount: ${data.amount || ''}`,
    `Date: ${paymentDate}`,
    '',
    `View your dashboard: ${dashboardUrl}`,
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: 'Payment successful!' }) };
}