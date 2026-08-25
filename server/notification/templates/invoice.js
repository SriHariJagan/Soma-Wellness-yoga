import { STUDIO_NAME } from './engine/tokens.js';
import { button, p, heading, infoTable, card, escapeHtml } from './engine/components.js';
import layout from './engine/layout.js';

export default function invoice(notification) {
  const data = notification.templateData || {};
  const user = notification.user || {};

  const invoiceNumber  = data.invoiceNumber  || '';
  const amount         = data.amount         || '';
  const planName       = data.planName       || '';
  const paymentMethod  = data.paymentMethod  || '';
  const invoiceDate    = data.invoiceDate    || '';
  const invoiceLink    = data.invoiceLink    || notification.link || '';
  const name           = data.name || user.name || 'valued member';

  const subject = notification.subject || `Invoice${invoiceNumber ? ` #${escapeHtml(invoiceNumber)}` : ''} from ${STUDIO_NAME}`;

  const rows = [];
  if (invoiceNumber) rows.push({ label: 'Invoice', value: `<strong>#${escapeHtml(invoiceNumber)}</strong>` });
  if (planName) rows.push({ label: 'Plan', value: escapeHtml(planName) });
  if (invoiceDate) rows.push({ label: 'Date', value: escapeHtml(invoiceDate) });
  if (paymentMethod) rows.push({ label: 'Payment', value: escapeHtml(paymentMethod) });

  const totalRow = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:2px solid #F3EBDD;margin-top:8px;"><tr><td style="padding:8px 12px;font-size:14px;color:#7C6A58;">Total</td><td style="padding:8px 12px;font-size:16px;color:#2D1406;font-weight:700;text-align:right;">${escapeHtml(amount)}</td></tr></table>`;

  const body = `
    ${heading('Payment Receipt')}
    ${p(`Thank you for your payment, ${escapeHtml(name)}!`)}
    ${card({ title: 'Invoice Summary', content: infoTable(rows) + totalRow })}
    ${invoiceLink ? button({ label: 'View Invoice', url: invoiceLink }) : ''}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    `Invoice${invoiceNumber ? ` #${invoiceNumber}` : ''} from ${STUDIO_NAME}`,
    '',
    `Thank you for your payment, ${name}!`,
    '',
    ...(invoiceNumber ? [`Invoice: #${invoiceNumber}`] : []),
    ...(planName ? [`Plan: ${planName}`] : []),
    ...(invoiceDate ? [`Date: ${invoiceDate}`] : []),
    ...(paymentMethod ? [`Payment: ${paymentMethod}`] : []),
    '',
    `Total: ${amount}`,
    '',
    ...(invoiceLink ? [`View invoice: ${invoiceLink}`] : []),
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `Invoice${invoiceNumber ? ` #${escapeHtml(invoiceNumber)}` : ''}` }) };
}
