import { STUDIO_NAME } from '../../../notification/templates/engine/tokens.js';
import { button, p, card, infoTable, escapeHtml } from '../../../notification/templates/engine/components.js';
import layout from '../../../notification/templates/engine/layout.js';

export default function render(data = {}) {
  const rawName = data.name || 'Valued Guest';
  const name = escapeHtml(rawName);
  const amount = data.amount || '';
  const amountPlain = typeof data.amount === 'string' ? data.amount : '';
  const transactionId = escapeHtml(data.transactionId || '');
  // Canonical shop order id (ORD-*) — legacy `orderId` kept as fallback.
  const orderNumber = escapeHtml(data.orderNumber || data.orderId || '');
  const invoiceNumber = escapeHtml(data.invoiceNumber || '');
  const merchantReference = escapeHtml(data.merchantReference || '');
  const paymentDate = data.paymentDate || new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
  const description = escapeHtml(data.description || 'Wellness experience');
  const dashboardUrl = data.dashboardUrl || 'https://somawellness.co.ke/dashboard';
  const invoiceLink = data.invoiceLink || '';

  const subject = `Payment Confirmed — ${invoiceNumber ? `#${invoiceNumber} · ` : ''}${STUDIO_NAME}`;

  const rows = [
    ...(invoiceNumber ? [{ label: 'Invoice', value: `<strong style="color:#1A0F0A;">#${invoiceNumber}</strong>` }] : []),
    ...(orderNumber ? [{ label: 'Order ID', value: orderNumber }] : []),
    ...(transactionId ? [{ label: 'Transaction ID', value: `<span style="font-family:'JetBrains Mono',monospace;font-size:13px;">${transactionId}</span>` }] : []),
    ...(merchantReference && merchantReference !== orderNumber
      ? [{ label: 'Payment Ref', value: `<span style="font-family:'JetBrains Mono',monospace;font-size:13px;">${merchantReference}</span>` }]
      : []),
    { label: 'Description', value: description },
    { label: 'Date', value: escapeHtml(paymentDate) },
  ];

  const heroAmount = `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;">
    <tr>
      <td align="center" style="background:linear-gradient(135deg, #1A0F0A 0%, #3D2518 60%, #5A3A22 100%);border-radius:16px;padding:28px 24px;">
        <div style="font-family:'Manrope','Segoe UI',Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C8956C;margin-bottom:8px;">Amount Received</div>
        <div style="font-family:'Playfair Display',Georgia,serif;font-size:34px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;line-height:1.1;">${escapeHtml(amountPlain)}</div>
        <div style="margin:12px auto 0;width:48px;height:2px;background:linear-gradient(90deg, transparent, #C8956C, transparent);"></div>
        <div style="margin-top:12px;font-family:'Manrope','Segoe UI',Arial,sans-serif;font-size:13px;color:#E8DCCF;">${description}${invoiceNumber ? ` &nbsp;·&nbsp; #${invoiceNumber}` : ''}</div>
      </td>
    </tr>
  </table>`;

  const greeting = `
    <p style="margin:0 0 6px;font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:700;color:#1A0F0A;letter-spacing:-0.3px;">Namaste, ${name}</p>
    <p style="margin:0 0 18px;font-family:'Manrope','Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.75;color:#6B5A4E;">Your payment is confirmed with gratitude. A formal tax invoice follows this receipt in a separate email — please keep both for your records.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
      <tr>
        <td style="background:rgba(61,139,94,0.10);border:1px solid rgba(61,139,94,0.25);border-radius:999px;padding:7px 14px;font-family:'Manrope','Segoe UI',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#276749;">✓ &nbsp;Payment Successful</td>
      </tr>
    </table>`;

  const assurance = `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:4px 0 20px;background:#FAF7F2;border:1px solid rgba(200,149,108,0.18);border-radius:12px;">
    <tr>
      <td style="padding:14px 18px;font-family:'Manrope','Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.7;color:#6B5A4E;">
        <span style="color:#C8956C;font-weight:700;letter-spacing:1px;font-size:11px;text-transform:uppercase;">The Soma Promise</span><br />
        Securely processed via Pesapal. Your enrollment is now active — visit your dashboard to reserve sessions, view receipts and manage your journey.
      </td>
    </tr>
  </table>`;

  const body = `
    ${greeting}
    ${heroAmount}
    ${card({ title: 'Receipt Details', content: infoTable(rows) })}
    ${invoiceLink ? button({ label: 'View Tax Invoice', url: invoiceLink }) : ''}
    ${button({ label: 'Open Your Sanctuary Dashboard', url: dashboardUrl })}
    ${assurance}
    ${p('A detailed tax invoice has been sent to this same email address. If anything looks unfamiliar, simply reply — our concierge team responds with care.', { muted: true, small: true })}
    ${p(`With warmth,<br /><strong style="color:#3D2E24;">The ${STUDIO_NAME} Atelier</strong><br /><span style="font-size:12px;">Spring Valley · Nairobi</span>`, { muted: true })}
  `;

  const text = [
    `Payment Confirmed — ${STUDIO_NAME}`,
    '',
    `Namaste, ${rawName}!`,
    '',
    `Amount Received: ${amountPlain}`,
    ...(invoiceNumber ? [`Invoice: #${data.invoiceNumber}`] : []),
    ...(orderNumber ? [`Order ID: ${data.orderNumber || data.orderId}`] : []),
    `Transaction ID: ${data.transactionId || ''}`,
    ...(merchantReference && merchantReference !== (data.orderNumber || data.orderId)
      ? [`Payment Ref: ${data.merchantReference}`]
      : []),
    `Description: ${data.description || 'Wellness experience'}`,
    `Date: ${paymentDate}`,
    '',
    ...(invoiceLink ? [`View tax invoice: ${invoiceLink}`] : []),
    `Dashboard: ${dashboardUrl}`,
    '',
    'A detailed tax invoice has been sent to this same email address.',
    '',
    `— The ${STUDIO_NAME} Atelier`,
  ].join('\n');

  return { subject, text, html: layout({ body, previewText: `Payment confirmed ${invoiceNumber ? `#${invoiceNumber} · ` : ''}${amountPlain}` }) };
}
