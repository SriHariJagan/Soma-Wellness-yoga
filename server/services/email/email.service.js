import transporter from './transporter.js';
import logger from '../../notification/logger.js';
import { STUDIO_NAME } from '../../notification/templates/engine/tokens.js';
import { p, heading, card, infoTable } from '../../notification/templates/engine/components.js';
import layout from '../../notification/templates/engine/layout.js';

import welcomeTemplate from './templates/welcome.js';
import enquiryTemplate from './templates/enquiry.js';
import enquiryAdminTemplate from './templates/enquiryAdmin.js';
import paymentSuccessTemplate from './templates/paymentSuccess.js';
import paymentFailedTemplate from './templates/paymentFailed.js';
import otpTemplate from './templates/otp.js';
import resetPasswordTemplate from './templates/resetPassword.js';
import registrationTemplate from './templates/registration.js';
import certificateTemplate from './templates/certificate.js';
import invoiceTemplate from './templates/invoice.js';
import bookOrderTemplates from './templates/bookOrder.js';

const MODULE = 'EmailService';
function getAdminEmails() {
  const emails = process.env.ADMIN_EMAIL || 'dr.kesarikapil@gmail.com';
  return emails.split(',').map(e => e.trim()).filter(Boolean);
}

function getFrom() {
  const name = process.env.FROM_NAME || 'SomaWellness';
  const email = process.env.FROM_EMAIL || process.env.SMTP_USER || 'hello@somawellness.co.ke';
  return { name, email };
}

function buildMailOptions(to, subject, html, text) {
  const from = getFrom();
  const opts = {
    from: `"${from.name}" <${from.email}>`,
    to,
    subject,
    html,
    text,
  };
  if (process.env.REPLY_TO) {
    opts.replyTo = process.env.REPLY_TO;
  }
  return opts;
}

async function sendMail(to, subject, html, text) {
  const mailOpts = buildMailOptions(to, subject, html, text);
  logger.info(MODULE, 'Sending email', { to, subject });
  try {
    const result = await transporter.sendMail(mailOpts);
    logger.info(MODULE, 'Email sent successfully', { to, subject, messageId: result.providerMessageId });
    return { success: true, messageId: result.providerMessageId };
  } catch (err) {
    logger.error(MODULE, 'Email send failed', {
      to,
      subject,
      error: err.message,
      code: err.code,
      retryable: err.retryable,
    });
    return { success: false, error: err.message };
  }
}

async function sendEnquiry(data) {
  const { subject, text, html } = enquiryTemplate(data);
  return sendMail(data.email, subject, html, text);
}

async function sendEnquiryAdmin(data) {
  const { subject, text, html } = enquiryAdminTemplate(data);
  const adminEmails = getAdminEmails();
  const results = await Promise.all(adminEmails.map(email => sendMail(email, subject, html, text)));
  return results.every(r => r.success) ? { success: true } : { success: false, results };
}

async function sendPaymentSuccess(data) {
  const { subject, text, html } = paymentSuccessTemplate(data);
  return sendMail(data.email, subject, html, text);
}

async function sendPaymentFailed(data) {
  const { subject, text, html } = paymentFailedTemplate(data);
  return sendMail(data.email, subject, html, text);
}

async function sendOTP(data) {
  const { subject, text, html } = otpTemplate(data);
  return sendMail(data.email, subject, html, text);
}

async function sendResetPassword(data) {
  const { subject, text, html } = resetPasswordTemplate(data);
  return sendMail(data.email, subject, html, text);
}

async function sendWelcome(data) {
  const { subject, text, html } = welcomeTemplate(data);
  return sendMail(data.email, subject, html, text);
}

async function sendRegistration(data) {
  const { subject, text, html } = registrationTemplate(data);
  const adminEmails = getAdminEmails();
  const results = await Promise.all(adminEmails.map(email => sendMail(email, subject, html, text)));
  return results.every(r => r.success) ? { success: true } : { success: false, results };
}

async function sendCertificate(data) {
  const { subject, text, html } = certificateTemplate(data);
  return sendMail(data.email, subject, html, text);
}

async function sendInvoice(data) {
  const { subject, text, html } = invoiceTemplate(data);
  return sendMail(data.email, subject, html, text);
}

// ── Book store emails ────────────────────────────────────────

async function sendBookOrderPlaced(data) {
  const { subject, text, html } = bookOrderTemplates.orderPlaced(data);
  return sendMail(data.email, subject, html, text);
}

async function sendBookPaymentConfirmed(data) {
  const { subject, text, html } = bookOrderTemplates.paymentConfirmed(data);
  return sendMail(data.email, subject, html, text);
}

async function sendBookPaymentFailed(data) {
  const { subject, text, html } = bookOrderTemplates.paymentFailed(data);
  return sendMail(data.email, subject, html, text);
}

async function sendBookPaymentCancelled(data) {
  const { subject, text, html } = bookOrderTemplates.paymentCancelled(data);
  return sendMail(data.email, subject, html, text);
}

async function sendBookOrderDeletionNotice(data) {
  const { subject, text, html } = bookOrderTemplates.orderDeletionNotice(data);
  return sendMail(data.email, subject, html, text);
}

async function sendBookOrderPacked(data) {
  const { subject, text, html } = bookOrderTemplates.orderPacked(data);
  return sendMail(data.email, subject, html, text);
}

async function sendBookOrderDispatched(data) {
  const { subject, text, html } = bookOrderTemplates.orderDispatched(data);
  return sendMail(data.email, subject, html, text);
}

async function sendBookOrderDelivered(data) {
  const { subject, text, html } = bookOrderTemplates.orderDelivered(data);
  return sendMail(data.email, subject, html, text);
}

async function sendBookOrderCancelled(data) {
  const { subject, text, html } = bookOrderTemplates.orderCancelled(data);
  return sendMail(data.email, subject, html, text);
}

async function sendNewBookOrderAdmin(data) {
  const { subject, text, html } = bookOrderTemplates.newOrderAdmin(data);
  const adminEmails = getAdminEmails();
  const results = await Promise.all(adminEmails.map(email => sendMail(email, subject, html, text)));
  return results.every(r => r.success) ? { success: true } : { success: false, results };
}

async function sendLowStockAlertAdmin(data) {
  const { subject, text, html } = bookOrderTemplates.lowStockAdmin(data);
  const adminEmails = getAdminEmails();
  const results = await Promise.all(adminEmails.map(email => sendMail(email, subject, html, text)));
  return results.every(r => r.success) ? { success: true } : { success: false, results };
}

async function sendBulkEnquiryAdmin(data) {
  const { subject, text, html } = bookOrderTemplates.bulkEnquiryAdmin(data);
  const adminEmails = getAdminEmails();
  const results = await Promise.all(adminEmails.map(email => sendMail(email, subject, html, text)));
  return results.every(r => r.success) ? { success: true } : { success: false, results };
}

async function sendBulkEnquiryConfirmation(data) {
  const { subject, text, html } = bookOrderTemplates.bulkEnquiryConfirmation(data);
  return sendMail(data.email, subject, html, text);
}

async function sendPaymentReceivedAdmin(data) {
  const subject = `Payment Received — ${STUDIO_NAME}`;
  const rows = [
    data.customerName ? { label: 'Customer', value: data.customerName } : null,
    data.customerEmail ? { label: 'Email', value: data.customerEmail } : null,
    data.order ? { label: 'Order', value: data.order } : null,
    data.amount ? { label: 'Amount', value: `<strong>${data.amount}</strong>` } : null,
    data.paymentId ? { label: 'Payment ID', value: data.paymentId } : null,
    data.razorpayOrderId ? { label: 'Razorpay Order ID', value: data.razorpayOrderId } : null,
  ].filter(Boolean);
  const body = `
    ${heading('Payment Received')}
    ${p('A payment has been successfully received. Details below.')}
    ${card({ title: 'Payment Details', content: infoTable(rows) })}
    ${p(`— ${STUDIO_NAME} System`, { muted: true, small: true })}
  `;
  const html = layout({ body, previewText: 'Payment received' });
  const text = [
    'Payment Received',
    '',
    ...(rows.map(r => `${r.label}: ${r.value.replace(/<[^>]*>/g, '')}`)),
    '',
    `— ${STUDIO_NAME} System`,
  ].join('\n');
  const adminEmails = getAdminEmails();
  const results = await Promise.all(adminEmails.map(email => sendMail(email, subject, html, text)));
  return results.every(r => r.success) ? { success: true } : { success: false, results };
}

async function sendPaymentFailedAdmin(data) {
  const subject = `Payment Failed — ${STUDIO_NAME}`;
  const rows = [
    data.customerName ? { label: 'Customer', value: data.customerName } : null,
    data.customerEmail ? { label: 'Email', value: data.customerEmail } : null,
    data.amount ? { label: 'Amount', value: data.amount } : null,
    data.failureReason ? { label: 'Reason', value: data.failureReason } : null,
  ].filter(Boolean);
  const body = `
    ${heading('Payment Failed')}
    ${p('A payment could not be processed. Details below.')}
    ${card({ title: 'Failure Details', content: infoTable(rows) })}
    ${p(`— ${STUDIO_NAME} System`, { muted: true, small: true })}
  `;
  const html = layout({ body, previewText: 'Payment failed' });
  const text = [
    'Payment Failed',
    '',
    ...(rows.map(r => `${r.label}: ${r.value.replace(/<[^>]*>/g, '')}`)),
    '',
    `— ${STUDIO_NAME} System`,
  ].join('\n');
  const adminEmails = getAdminEmails();
  const results = await Promise.all(adminEmails.map(email => sendMail(email, subject, html, text)));
  return results.every(r => r.success) ? { success: true } : { success: false, results };
}

async function sendRegistrationAdmin(data) {
  return sendRegistration(data);
}

async function sendNewPurchaseAdmin(data) {
  const subject = `New Purchase — ${STUDIO_NAME}`;
  const rows = [
    data.customerName ? { label: 'Customer', value: data.customerName } : null,
    data.customerEmail ? { label: 'Email', value: data.customerEmail } : null,
    data.item ? { label: 'Item', value: data.item } : null,
    data.amount ? { label: 'Amount', value: `<strong>${data.amount}</strong>` } : null,
  ].filter(Boolean);
  const body = `
    ${heading('New Purchase')}
    ${p('A new purchase has been made. Details below.')}
    ${card({ title: 'Purchase Details', content: infoTable(rows) })}
    ${p(`— ${STUDIO_NAME} System`, { muted: true, small: true })}
  `;
  const html = layout({ body, previewText: 'New purchase' });
  const text = [
    'New Purchase',
    '',
    ...(rows.map(r => `${r.label}: ${r.value.replace(/<[^>]*>/g, '')}`)),
    '',
    `— ${STUDIO_NAME} System`,
  ].join('\n');
  const adminEmails = getAdminEmails();
  const results = await Promise.all(adminEmails.map(email => sendMail(email, subject, html, text)));
  return results.every(r => r.success) ? { success: true } : { success: false, results };
}

export default {
  sendEnquiry,
  sendEnquiryAdmin,
  sendPaymentSuccess,
  sendPaymentFailed,
  sendOTP,
  sendResetPassword,
  sendWelcome,
  sendRegistration,
  sendCertificate,
  sendInvoice,
  sendPaymentReceivedAdmin,
  sendPaymentFailedAdmin,
  sendRegistrationAdmin,
  sendNewPurchaseAdmin,
  sendBookOrderPlaced,
  sendBookPaymentConfirmed,
  sendBookPaymentFailed,
  sendBookPaymentCancelled,
  sendBookOrderDeletionNotice,
  sendBookOrderPacked,
  sendBookOrderDispatched,
  sendBookOrderDelivered,
  sendBookOrderCancelled,
  sendNewBookOrderAdmin,
  sendLowStockAlertAdmin,
  sendBulkEnquiryAdmin,
  sendBulkEnquiryConfirmation,
  sendMail,
};