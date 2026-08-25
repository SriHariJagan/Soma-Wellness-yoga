import { STUDIO_NAME } from '../../../notification/templates/engine/tokens.js';
import { button, p, heading, card, infoTable, escapeHtml } from '../../../notification/templates/engine/components.js';
import layout from '../../../notification/templates/engine/layout.js';

export default function render(data = {}) {
  const name = escapeHtml(data.name || 'Valued Customer');
  const invoiceNumber = escapeHtml(data.invoiceNumber || '');
  const amount = data.amount || '';
  const description = escapeHtml(data.description || 'Purchase');
  const invoiceDate = data.invoiceDate || new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  const paymentMethod = escapeHtml(data.paymentMethod || 'Online Payment');
  const invoiceLink = data.invoiceLink || '';
  const dashboardUrl = data.dashboardUrl || 'https://pragyayoga.com/dashboard';

  const subject = `Invoice${invoiceNumber ? ` #${invoiceNumber}` : ''} from ${STUDIO_NAME}`;

  const rows = [];
  if (invoiceNumber) rows.push({ label: 'Invoice', value: `<strong>#${invoiceNumber}</strong>` });
  if (description) rows.push({ label: 'Description', value: description });
  if (invoiceDate) rows.push({ label: 'Date', value: invoiceDate });
  if (paymentMethod) rows.push({ label: 'Payment Method', value: paymentMethod });

  const totalRow = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:2px solid #F3EBDD;margin-top:8px;"><tr><td style="padding:8px 12px;font-size:14px;color:#7C6A58;">Total</td><td style="padding:8px 12px;font-size:16px;color:#2D1406;font-weight:700;text-align:right;">${amount}</td></tr></table>`;

  const body = `
    ${heading('Invoice')}
    ${p(`Thank you for your purchase, ${name}!`)}
    ${card({ title: 'Invoice Summary', content: infoTable(rows) + totalRow })}
    ${invoiceLink ? button({ label: 'View Invoice', url: invoiceLink }) : ''}
    ${button({ label: 'Go to Dashboard', url: dashboardUrl })}
    ${p('If you have any questions regarding this invoice, please reply to this email.', { muted: true, small: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;

  const text = [
    `Invoice${invoiceNumber ? ` #${invoiceNumber}` : ''} from ${STUDIO_NAME}`,
    '',
    `Thank you for your purchase, ${name}!`,
    '',
    ...(invoiceNumber ? [`Invoice: #${invoiceNumber}`] : []),
    ...(description ? [`Description: ${description}`] : []),
    ...(invoiceDate ? [`Date: ${invoiceDate}`] : []),
    ...(paymentMethod ? [`Payment Method: ${paymentMethod}`] : []),
    '',
    `Total: ${amount}`,
    '',
    ...(invoiceLink ? [`View invoice: ${invoiceLink}`] : []),
    `Dashboard: ${dashboardUrl}`,
    '',
    `— ${STUDIO_NAME} Team`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `Invoice${invoiceNumber ? ` #${invoiceNumber}` : ''}` }) };
}