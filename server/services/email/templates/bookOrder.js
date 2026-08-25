import { STUDIO_NAME } from '../../../notification/templates/engine/tokens.js';
import { button, p, heading, card, infoTable, escapeHtml } from '../../../notification/templates/engine/components.js';
import layout from '../../../notification/templates/engine/layout.js';

// ─────────────────────────────────────────────────────────────
// Book store transactional email templates.
// All customer-facing emails include the order tracking link;
// admin emails are plain summaries.
// ─────────────────────────────────────────────────────────────

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://pragyayoga.com';

function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function itemsTable(items = []) {
  const rows = items.map((i) => (
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #EFE6DC;color:#3B1D0D;">${escapeHtml(i.name || '')}${i.quantity > 1 ? ` × ${i.quantity}` : ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #EFE6DC;color:#3B1D0D;text-align:right;white-space:nowrap;">${inr(i.finalPrice ?? i.price)}</td>
    </tr>`
  )).join('');
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>`;
}

function summaryRows(data) {
  const rows = [
    { label: 'Order number', value: data.orderNumber },
    { label: 'Items', value: `${data.items?.length || 0} title(s)` },
    { label: 'Subtotal', value: inr(data.subtotal) },
  ];
  if (data.discount > 0) rows.push({ label: 'Discount', value: `− ${inr(data.discount)}` });
  rows.push({ label: 'Shipping', value: data.shippingCharge > 0 ? inr(data.shippingCharge) : 'Free' });
  rows.push({ label: 'Total', value: inr(data.total) });
  return rows;
}

function addressBlock(data) {
  const a = data.address || {};
  const parts = [a.fullName, a.line1, a.line2, a.city, a.state, a.pincode, a.country].filter(Boolean);
  return parts.length ? parts.join(', ') : '';
}

function trackingUrl(orderNumber) {
  return `${FRONTEND_URL}/order-tracking/${encodeURIComponent(orderNumber)}`;
}

function trackingButton(orderNumber) {
  return button({ label: 'Track your order', url: trackingUrl(orderNumber) });
}

// ── Customer emails ──────────────────────────────────────────

export function orderPlaced(data = {}) {
  const subject = `Order ${data.orderNumber} placed — ${STUDIO_NAME}`;
  const body = `
    ${heading('Thank you! Your order is placed')}
    ${p(`Hi ${escapeHtml(data.customerName || 'there')}, we received your book order and are holding your copies. Complete the payment to confirm it.`)}
    ${card({ title: `Order ${data.orderNumber}`, content: itemsTable(data.items) + infoTable(summaryRows(data)) })}
    ${card({ title: 'Deliver to', content: `<p style="margin:0;color:#3B1D0D;">${escapeHtml(addressBlock(data))}</p><p style="margin:8px 0 0;color:#7C6A58;font-size:13px;">Estimated delivery: ${data.estimatedDelivery?.minDays || 3}–${data.estimatedDelivery?.maxDays || 5} days</p>` })}
    ${trackingButton(data.orderNumber)}
    ${p(`If you have any questions, reply to this email. — ${STUDIO_NAME} Team`, { muted: true, small: true })}
  `;
  const text = [
    `Order ${data.orderNumber} placed — ${STUDIO_NAME}`,
    '',
    `Hi ${data.customerName || 'there'}, we received your book order. Complete the payment to confirm it.`,
    '',
    ...(data.items || []).map((i) => `• ${i.name} × ${i.quantity} — ${inr(i.finalPrice ?? i.price)}`),
    '',
    `Subtotal: ${inr(data.subtotal)}`,
    data.discount > 0 ? `Discount: − ${inr(data.discount)}` : '',
    `Shipping: ${data.shippingCharge > 0 ? inr(data.shippingCharge) : 'Free'}`,
    `Total: ${inr(data.total)}`,
    '',
    `Deliver to: ${addressBlock(data)}`,
    `Estimated delivery: ${data.estimatedDelivery?.minDays || 3}–${data.estimatedDelivery?.maxDays || 5} days`,
    '',
    `Track your order: ${trackingUrl(data.orderNumber)}`,
  ].filter(Boolean).join('\n');
  return { subject, text, html: layout({ body, previewText: `Order ${data.orderNumber} placed` }) };
}

export function paymentConfirmed(data = {}) {
  const subject = `Payment received — order ${data.orderNumber} confirmed`;
  const body = `
    ${heading('Payment received!')}
    ${p(`Hi ${escapeHtml(data.customerName || 'there')}, your payment of ${inr(data.total)} for order ${data.orderNumber} was successful. We will pack and dispatch your books soon.`)}
    ${card({ title: `Order ${data.orderNumber}`, content: itemsTable(data.items) + infoTable(summaryRows(data)) })}
    ${trackingButton(data.orderNumber)}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;
  const text = [
    'Payment received — order confirmed',
    '',
    `Hi ${data.customerName || 'there'}, your payment of ${inr(data.total)} for order ${data.orderNumber} was successful.`,
    '',
    `Track your order: ${trackingUrl(data.orderNumber)}`,
  ].join('\n');
  return { subject, text, html: layout({ body, previewText: 'Payment received!' }) };
}

export function paymentFailed(data = {}) {
  const subject = `Payment not completed — order ${data.orderNumber}`;
  const body = `
    ${heading('Payment not completed')}
    ${p(`Hi ${escapeHtml(data.customerName || 'there')}, your payment for order ${data.orderNumber} could not be completed. No amount was deducted from your account.`)}
    ${card({ title: `Order ${data.orderNumber}`, content: infoTable(summaryRows(data)) })}
    ${button({ label: 'Retry payment', url: `${FRONTEND_URL}/dashboard` })}
    ${p(`Your order stays saved for 1 hour so you can retry. If the payment is not completed within 1 hour, the order is automatically cancelled and the reserved copies are released back to the store. — ${STUDIO_NAME} Team`, { muted: true, small: true })}
  `;
  const text = [
    'Payment not completed',
    '',
    `Hi ${data.customerName || 'there'}, your payment for order ${data.orderNumber} could not be completed.`,
    'No amount was deducted from your account.',
    `Retry from your dashboard: ${FRONTEND_URL}/dashboard`,
    '',
    'Your order stays saved for 1 hour. If payment is not completed within 1 hour, the order is automatically cancelled.',
  ].join('\n');
  return { subject, text, html: layout({ body, previewText: 'Payment not completed' }) };
}

export function paymentCancelled(data = {}) {
  const subject = `Payment cancelled — order ${data.orderNumber}`;
  const body = `
    ${heading('Payment cancelled')}
    ${p(`Hi ${escapeHtml(data.customerName || 'there')}, your payment for order ${data.orderNumber} was cancelled or could not be completed within the reservation window.`)}
    ${p('No amount was deducted from your account. The copies you had reserved have been released back to the store.', { muted: true })}
    ${card({ title: `Order ${data.orderNumber}`, content: infoTable(summaryRows(data)) })}
    ${button({ label: 'Place your order again', url: `${FRONTEND_URL}/books` })}
    ${p(`You are welcome to place a new order anytime — simply add the books to your cart and check out again. If you have any questions, reply to this email. — ${STUDIO_NAME} Team`, { muted: true, small: true })}
  `;
  const text = [
    'Payment cancelled',
    '',
    `Hi ${data.customerName || 'there'}, your payment for order ${data.orderNumber} was cancelled or could not be completed.`,
    'No amount was deducted. The reserved copies have been released back to the store.',
    `Place a new order: ${FRONTEND_URL}/books`,
    '',
    'If you have any questions, reply to this email.',
  ].join('\n');
  return { subject, text, html: layout({ body, previewText: 'Payment cancelled' }) };
}

export function orderDeletionNotice(data = {}) {
  const subject = `Order ${data.orderNumber} — payment incomplete, order deleted`;
  const body = `
    ${heading('Your order has been cancelled')}
    ${p(`Hi ${escapeHtml(data.customerName || 'there')}, we did not receive payment for order ${data.orderNumber}. Since your payment was incomplete, we have cancelled the order and deleted it from our system.`)}
    ${p('No amount was deducted from your account. All reserved copies have been released back to the store.', { muted: true })}
    ${card({ title: `Order ${data.orderNumber}`, content: infoTable(summaryRows(data)) })}
    ${button({ label: 'Browse the bookstore', url: `${FRONTEND_URL}/books` })}
    ${p(`If you still wish to purchase these books, you can place a new order anytime. We would love to have you as a customer — reply to this email if you need any help. — ${STUDIO_NAME} Team`, { muted: true, small: true })}
  `;
  const text = [
    'Order cancelled — payment incomplete',
    '',
    `Hi ${data.customerName || 'there'}, we did not receive payment for order ${data.orderNumber}.`,
    'Your order has been cancelled and deleted from our system. No amount was deducted.',
    `Browse the bookstore: ${FRONTEND_URL}/books`,
    '',
    'You can place a new order anytime. Reply to this email if you need any help.',
  ].join('\n');
  return { subject, text, html: layout({ body, previewText: 'Order cancelled — payment incomplete' }) };
}

export function orderPacked(data = {}) {
  const subject = `Order ${data.orderNumber} is packed`;
  const body = `
    ${heading('Your order is packed!')}
    ${p(`Hi ${escapeHtml(data.customerName || 'there')}, all your books have been quality-checked and packed. We will hand them to the courier shortly.`)}
    ${card({ title: `Order ${data.orderNumber}`, content: itemsTable(data.items) })}
    ${trackingButton(data.orderNumber)}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;
  const text = [
    `Order ${data.orderNumber} is packed`,
    '',
    `Hi ${data.customerName || 'there'}, your books have been packed and will be dispatched shortly.`,
    '',
    `Track your order: ${trackingUrl(data.orderNumber)}`,
  ].join('\n');
  return { subject, text, html: layout({ body, previewText: 'Your order is packed!' }) };
}

export function orderDispatched(data = {}) {
  const courier = data.courier || 'our logistics partner';
  const awb = data.trackingNumber ? `Tracking number: <strong>${escapeHtml(data.trackingNumber)}</strong>` : '';
  const expected = data.expectedDelivery
    ? new Date(data.expectedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : `within ${data.estimatedDelivery?.maxDays || 5} days`;
  const subject = `Order ${data.orderNumber} dispatched`;
  const body = `
    ${heading('Your order is on the way!')}
    ${p(`Hi ${escapeHtml(data.customerName || 'there')}, your order ${data.orderNumber} has been dispatched via ${escapeHtml(courier)}.`)}
    ${card({ title: 'Dispatch details', content: infoTable([
      { label: 'Courier', value: courier },
      { label: 'Tracking number', value: data.trackingNumber || '—' },
      { label: 'Dispatched on', value: data.dispatchDate ? new Date(data.dispatchDate).toLocaleDateString('en-IN') : '—' },
      { label: 'Expected delivery', value: expected },
    ]) })}
    ${trackingButton(data.orderNumber)}
    ${p(`Delivery dates are estimates. — ${STUDIO_NAME} Team`, { muted: true, small: true })}
  `;
  const text = [
    'Your order is on the way!',
    '',
    `Hi ${data.customerName || 'there'}, order ${data.orderNumber} has been dispatched via ${courier}.`,
    `Tracking number: ${data.trackingNumber || '—'}`,
    `Expected delivery: ${expected}`,
    '',
    `Track your order: ${trackingUrl(data.orderNumber)}`,
  ].join('\n');
  return { subject, text, html: layout({ body, previewText: 'Your order is on the way!' }) };
}

export function orderDelivered(data = {}) {
  const subject = `Order ${data.orderNumber} delivered`;
  const body = `
    ${heading('Delivered!')}
    ${p(`Hi ${escapeHtml(data.customerName || 'there')}, order ${data.orderNumber} has been delivered. We hope you enjoy your books.`)}
    ${card({ title: `Order ${data.orderNumber}`, content: itemsTable(data.items) })}
    ${p('If anything is missing or damaged, reply to this email and we will make it right.', { muted: true, small: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;
  const text = [
    'Order delivered!',
    '',
    `Hi ${data.customerName || 'there'}, order ${data.orderNumber} has been delivered. We hope you enjoy your books.`,
    '',
    'If anything is missing or damaged, reply to this email.',
  ].join('\n');
  return { subject, text, html: layout({ body, previewText: 'Order delivered!' }) };
}

export function orderCancelled(data = {}) {
  const subject = `Order ${data.orderNumber} cancelled`;
  const body = `
    ${heading('Order cancelled')}
    ${p(`Hi ${escapeHtml(data.customerName || 'there')}, order ${data.orderNumber} has been cancelled.`)}
    ${card({ title: `Order ${data.orderNumber}`, content: infoTable(summaryRows(data)) })}
    ${p('If a payment was deducted, the refund will be processed to your original payment method within 5–7 business days.', { muted: true, small: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;
  const text = [
    'Order cancelled',
    '',
    `Hi ${data.customerName || 'there'}, order ${data.orderNumber} has been cancelled.`,
    'Refunds, if applicable, are processed within 5–7 business days.',
  ].join('\n');
  return { subject, text, html: layout({ body, previewText: 'Order cancelled' }) };
}

// ── Admin emails ─────────────────────────────────────────────

export function newOrderAdmin(data = {}) {
  const subject = `New book order ${data.orderNumber} — ${inr(data.total)}`;
  const body = `
    <h2 style="color:#2D1406;">New Book Order</h2>
    ${itemsTable(data.items)}
    ${infoTable([
      { label: 'Order', value: data.orderNumber },
      { label: 'Customer', value: `${data.customerName || ''} (${data.email || ''})` },
      { label: 'Phone', value: data.address?.phone || '' },
      { label: 'Deliver to', value: addressBlock(data) },
      { label: 'Pincode', value: data.address?.pincode || '' },
      { label: 'Shipping', value: data.shippingCharge > 0 ? inr(data.shippingCharge) : 'Free' },
      { label: 'Total', value: inr(data.total) },
    ])}
    <p style="color:#7C6A58;font-size:12px;">— ${STUDIO_NAME} Book Store</p>
  `;
  const text = [
    `New book order ${data.orderNumber} — ${inr(data.total)}`,
    '',
    ...(data.items || []).map((i) => `• ${i.name} × ${i.quantity} — ${inr(i.finalPrice ?? i.price)}`),
    '',
    `Customer: ${data.customerName || ''} (${data.email || ''})`,
    `Deliver to: ${addressBlock(data)}`,
    `Total: ${inr(data.total)}`,
  ].join('\n');
  return { subject, text, html: layout({ body, previewText: `New order ${data.orderNumber}` }) };
}

export function lowStockAdmin(data = {}) {
  const subject = `Low stock alert — ${data.sku || data.bookTitle || 'Book'}`;
  const body = `
    <h2 style="color:#2D1406;">Low Stock Alert</h2>
    ${infoTable([
      { label: 'Book', value: data.bookTitle || '' },
      { label: 'SKU', value: data.sku || '' },
      { label: 'Available', value: String(data.available ?? 0) },
      { label: 'Threshold', value: String(data.threshold ?? 0) },
    ])}
    <p style="color:#7C6A58;font-size:12px;">— ${STUDIO_NAME} Book Store</p>
  `;
  const text = [
    'Low stock alert',
    `Book: ${data.bookTitle || ''}`,
    `SKU: ${data.sku || ''}`,
    `Available: ${data.available ?? 0}`,
    `Threshold: ${data.threshold ?? 0}`,
  ].join('\n');
  return { subject, text, html: layout({ body, previewText: 'Low stock alert' }) };
}

export function bulkEnquiryAdmin(data = {}) {
  const subject = `Bulk enquiry ${data.organisationName || ''} — ${data.quantity || 0} copies`;
  const body = `
    <h2 style="color:#2D1406;">Bulk Book Enquiry</h2>
    ${infoTable([
      { label: 'Organisation', value: data.organisationName || '' },
      { label: 'Contact', value: `${data.contactPerson || ''} (${data.email || ''})` },
      { label: 'Phone', value: data.phone || '' },
      { label: 'Book', value: data.bookTitle || '' },
      { label: 'Quantity', value: `${data.quantity || 0} copies` },
      { label: 'State', value: data.state || '' },
      { label: 'Pincode', value: data.pincode || '' },
    ])}
    ${data.message ? `<p style="color:#3B1D0D;background:#F8F2EA;padding:12px;border-radius:8px;">${escapeHtml(data.message)}</p>` : ''}
    <p style="color:#7C6A58;font-size:12px;">— ${STUDIO_NAME} Book Store</p>
  `;
  const text = [
    'Bulk book enquiry',
    `Organisation: ${data.organisationName || ''}`,
    `Contact: ${data.contactPerson || ''} (${data.email || ''})`,
    `Phone: ${data.phone || ''}`,
    `Book: ${data.bookTitle || ''}`,
    `Quantity: ${data.quantity || 0} copies`,
    data.message || '',
  ].filter(Boolean).join('\n');
  return { subject, text, html: layout({ body, previewText: 'Bulk book enquiry' }) };
}

export function bulkEnquiryConfirmation(data = {}) {
  const subject = `We received your bulk enquiry — ${STUDIO_NAME}`;
  const body = `
    ${heading('Thank you for your enquiry')}
    ${p(`Hi ${escapeHtml(data.contactPerson || 'there')}, we received your bulk enquiry${data.bookTitle ? ` for <strong>${escapeHtml(data.bookTitle)}</strong>` : ''} (${data.quantity || 0} copies).`)}
    ${p('Our team will contact you within 2 business days with pricing and dispatch options.', { muted: true })}
    ${p(`— ${STUDIO_NAME} Team`, { muted: true })}
  `;
  const text = [
    'We received your bulk enquiry',
    '',
    `Hi ${data.contactPerson || 'there'}, we received your bulk enquiry for ${data.bookTitle || 'books'} (${data.quantity || 0} copies).`,
    'Our team will contact you within 2 business days.',
  ].join('\n');
  return { subject, text, html: layout({ body, previewText: 'Bulk enquiry received' }) };
}

export default { orderPlaced, paymentConfirmed, paymentFailed, paymentCancelled, orderDeletionNotice, orderPacked, orderDispatched, orderDelivered, orderCancelled, newOrderAdmin, lowStockAdmin, bulkEnquiryAdmin, bulkEnquiryConfirmation };