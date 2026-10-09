import { STUDIO_NAME } from '../../../notification/templates/engine/tokens.js';
import { button, p, card, infoTable, escapeHtml } from '../../../notification/templates/engine/components.js';
import layout from '../../../notification/templates/engine/layout.js';

export default function render(data = {}) {
  const rawName = data.name || 'Valued Guest';
  const name = escapeHtml(rawName);
  const invoiceNumber = escapeHtml(data.invoiceNumber || '');
  // Same canonical Order ID (ORD-*) as the UI invoice. Legacy `orderId` fallback.
  const orderNumber = escapeHtml(data.orderNumber || data.orderId || '');
  const transactionId = escapeHtml(data.transactionId || '');
  const merchantReference = escapeHtml(data.merchantReference || '');
  const amount = data.amount || '';
  const amountPlain = typeof data.amount === 'string' ? data.amount : '';
  const description = escapeHtml(data.description || 'Wellness experience');
  const invoiceDate = data.invoiceDate || new Date().toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' });
  const paymentMethod = escapeHtml(data.paymentMethod || 'Pesapal · Online Payment');
  const invoiceLink = data.invoiceLink || '';
  const dashboardUrl = data.dashboardUrl || 'https://somawellness.co.ke/dashboard';

  const subject = `Tax Invoice${invoiceNumber ? ` #${invoiceNumber}` : ''} — ${STUDIO_NAME}`;

  const rows = [];
  if (invoiceNumber) rows.push({ label: 'Invoice No', value: `<strong style="color:#1A0F0A;">#${invoiceNumber}</strong>` });
  if (orderNumber) rows.push({ label: 'Order ID', value: orderNumber });
  if (transactionId) rows.push({ label: 'Transaction ID', value: `<span style="font-family:'JetBrains Mono',monospace;font-size:13px;">${transactionId}</span>` });
  if (merchantReference && merchantReference !== orderNumber) rows.push({ label: 'Payment Ref', value: `<span style="font-family:'JetBrains Mono',monospace;font-size:13px;">${merchantReference}</span>` });
  if (description) rows.push({ label: 'Description', value: description });
  if (invoiceDate) rows.push({ label: 'Invoice Date', value: escapeHtml(invoiceDate) });
  if (paymentMethod) rows.push({ label: 'Paid Via', value: paymentMethod });

  const totalRow = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:2px solid #C8956C;margin-top:10px;"><tr><td style="padding:12px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#8C7B6B;font-weight:700;">Total Paid</td><td style="padding:12px;font-size:22px;font-family:'Playfair Display',Georgia,serif;color:#1A0F0A;font-weight:700;text-align:right;">${escapeHtml(amountPlain)}</td></tr></table>`;

  const hero = `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;">
    <tr>
      <td style="border:1px solid rgba(200,149,108,0.30);border-radius:16px;padding:24px;background:linear-gradient(180deg, #FFFFFF 0%, #FAF5EE 100%);">
        <div style="font-family:'Manrope','Segoe UI',Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C8956C;font-weight:700;margin-bottom:6px;">✦ &nbsp;Tax Invoice&nbsp; ✦</div>
        <div style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;color:#1A0F0A;letter-spacing:-0.4px;">${invoiceNumber ? `#${invoiceNumber}` : 'Your Invoice'}</div>
        <div style="margin-top:6px;font-family:'Manrope','Segoe UI',Arial,sans-serif;font-size:13px;color:#6B5A4E;">Billed to <strong style="color:#1A0F0A;">${name}</strong> · ${escapeHtml(invoiceDate)}</div>
        <div style="margin:14px auto 0;width:100%;height:1px;background:linear-gradient(90deg, transparent, rgba(200,149,108,0.55), transparent);"></div>
      </td>
    </tr>
  </table>`;

  const vatNote = `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:4px 0 20px;background:#1A0F0A;border-radius:12px;">
    <tr>
      <td style="padding:14px 18px;font-family:'Manrope','Segoe UI',Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#E8DCCF;">
        All prices are <strong style="color:#FFFFFF;">VAT inclusive</strong>. This is a computer-generated tax invoice — no signature is required. Please quote your Invoice No. in all correspondence.
      </td>
    </tr>
  </table>`;

  const body = `
    <p style="margin:0 0 14px;font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;color:#1A0F0A;">Namaste, ${name}</p>
    <p style="margin:0 0 18px;font-family:'Manrope','Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.75;color:#6B5A4E;">Thank you for choosing <strong style="color:#1A0F0A;">${STUDIO_NAME}</strong>. Your sanctuary experience is confirmed — your receipt and tax invoice details follow in couture clarity below.</p>
    ${hero}
    ${card({ title: 'Invoice Summary', content: infoTable(rows) + totalRow })}
    ${vatNote}
    ${invoiceLink ? button({ label: 'View & Print Invoice', url: invoiceLink }) : ''}
    ${button({ label: 'Go to Dashboard', url: dashboardUrl })}
    ${p('Questions about this invoice? Simply reply to this email — our atelier concierge will assist you personally.', { muted: true, small: true })}
    ${p(`With gratitude,<br /><strong style="color:#3D2E24;">The ${STUDIO_NAME} Atelier</strong><br /><span style="font-size:12px;">Spring Valley · Nairobi · Kenya</span>`, { muted: true })}
  `;

  const text = [
    `Tax Invoice${invoiceNumber ? ` #${invoiceNumber}` : ''} — ${STUDIO_NAME}`,
    '',
    `Namaste, ${rawName}!`,
    '',
    ...(invoiceNumber ? [`Invoice: #${invoiceNumber}`] : []),
    ...(orderNumber ? [`Order ID: ${orderNumber}`] : []),
    ...(transactionId ? [`Transaction ID: ${transactionId}`] : []),
    ...(description ? [`Description: ${description}`] : []),
    ...(invoiceDate ? [`Date: ${invoiceDate}`] : []),
    ...(paymentMethod ? [`Paid Via: ${paymentMethod}`] : []),
    '',
    `Total Paid: ${amountPlain}`,
    '',
    'All prices VAT inclusive. Computer-generated invoice — no signature required.',
    '',
    ...(invoiceLink ? [`View invoice: ${invoiceLink}`] : []),
    `Dashboard: ${dashboardUrl}`,
    '',
    `— The ${STUDIO_NAME} Atelier`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `Tax invoice${invoiceNumber ? ` #${invoiceNumber}` : ''} · ${amountPlain}` }) };
}
