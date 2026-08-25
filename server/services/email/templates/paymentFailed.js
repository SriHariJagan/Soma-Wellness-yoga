import { STUDIO_NAME } from '../../../notification/templates/engine/tokens.js';
import { p, heading, card, infoTable, alert, escapeHtml } from '../../../notification/templates/engine/components.js';
import layout from '../../../notification/templates/engine/layout.js';

export default function render(data = {}) {
  const name = escapeHtml(data.name || 'Valued Customer');
  const amount = data.amount || '';
  const transactionId = escapeHtml(data.transactionId || '');
  const failureReason = escapeHtml(data.failureReason || 'Unknown error');
  const paymentDate = data.paymentDate || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const dashboardUrl = data.dashboardUrl || 'https://pragyayoga.com/dashboard';

  const subject = `Payment Failed — ${STUDIO_NAME}`;

  const rows = [
    { label: 'Transaction ID', value: transactionId || 'N/A' },
    { label: 'Amount', value: amount },
    { label: 'Date', value: paymentDate },
  ];

  const body = `
    ${heading('Payment Failed')}
    ${p(`Hi ${name},`)}
    ${p('Unfortunately, your payment could not be processed. Please review the details below and try again.')}
    ${alert({ type: 'error', title: 'Reason', message: failureReason })}
    ${card({ title: 'Transaction Details', content: infoTable(rows) })}
    ${p('You can retry the payment from your dashboard or contact us if you need assistance.', { muted: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    'Payment Failed',
    '',
    `Hi ${data.name || 'Valued Customer'},`,
    'Unfortunately, your payment could not be processed.',
    '',
    `Reason: ${data.failureReason || 'Unknown error'}`,
    `Transaction ID: ${data.transactionId || 'N/A'}`,
    `Amount: ${data.amount || ''}`,
    `Date: ${paymentDate}`,
    '',
    'You can retry the payment from your dashboard or contact us if you need assistance.',
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: 'Payment failed' }) };
}