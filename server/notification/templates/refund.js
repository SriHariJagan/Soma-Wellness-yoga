import { STUDIO_NAME } from './engine/tokens.js';
import { p, heading, infoTable, card, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function refund(notification) {
  const data = notification.templateData || {};
  const user = notification.user || {};

  const amount = data.amount || '';
  const refundReceipt = data.refundReceipt || '';
  const reason = data.reason || '';
  const label = data.label || '';
  const name = data.name || user.name || 'valued member';

  const subject = notification.subject || `Refund Receipt${refundReceipt ? ` - ${escapeHtml(refundReceipt)}` : ''} from ${STUDIO_NAME}`;

  const rows = [
    { label: 'Item', value: escapeHtml(label || 'Purchase') },
  ];
  if (amount) rows.push({ label: 'Refund Amount', value: `₹${escapeHtml(amount)}` });
  if (refundReceipt) rows.push({ label: 'Refund Receipt', value: escapeHtml(refundReceipt) });
  if (reason) rows.push({ label: 'Reason', value: escapeHtml(reason) });

  const body = `
    ${heading('Refund Processed')}
    ${p(`Hi ${escapeHtml(name)},`)}
    ${p('A refund has been processed for your recent transaction.')}
    ${card({ title: 'Refund Details', content: infoTable(rows) })}
    ${p('The amount will be credited to your original payment method within 5-7 business days.', { muted: true, small: true })}
    ${p('If you have any questions, please reply to this email or contact our support team.', { muted: true, small: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    `Refund Receipt${refundReceipt ? ` - ${refundReceipt}` : ''} from ${STUDIO_NAME}`,
    '',
    `Hi ${name},`,
    'A refund has been processed for your recent transaction.',
    '',
    ...(label ? [`Item: ${label}`] : []),
    ...(amount ? [`Refund Amount: ₹${amount}`] : []),
    ...(refundReceipt ? [`Refund Receipt: ${refundReceipt}`] : []),
    ...(reason ? [`Reason: ${reason}`] : []),
    '',
    'The amount will be credited to your original payment method within 5-7 business days.',
    'If you have any questions, please reply to this email or contact our support team.',
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: 'Refund processed' }) };
}
