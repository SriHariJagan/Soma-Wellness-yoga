import transporter from './transporter.js';
import logger from '../../notification/logger.js';

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
  const name = process.env.FROM_NAME || 'Soma Wellness';
  const email = process.env.FROM_EMAIL || process.env.SMTP_USER || 'hello@somawellness.in';
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
  const subject = 'Payment Received';
  const html = `
    <h2 style="color:#2D1406;">Payment Received</h2>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${data.customerName ? `<tr><td style="padding:6px 12px;color:#7C6A58;">Customer</td><td style="padding:6px 12px;color:#3B1D0D;">${data.customerName}</td></tr>` : ''}
      ${data.customerEmail ? `<tr><td style="padding:6px 12px;color:#7C6A58;">Email</td><td style="padding:6px 12px;color:#3B1D0D;">${data.customerEmail}</td></tr>` : ''}
      ${data.order ? `<tr><td style="padding:6px 12px;color:#7C6A58;">Order</td><td style="padding:6px 12px;color:#3B1D0D;">${data.order}</td></tr>` : ''}
      ${data.amount ? `<tr><td style="padding:6px 12px;color:#7C6A58;">Amount</td><td style="padding:6px 12px;color:#3B1D0D;font-weight:700;">${data.amount}</td></tr>` : ''}
      ${data.paymentId ? `<tr><td style="padding:6px 12px;color:#7C6A58;">Payment ID</td><td style="padding:6px 12px;color:#3B1D0D;">${data.paymentId}</td></tr>` : ''}
      ${data.razorpayOrderId ? `<tr><td style="padding:6px 12px;color:#7C6A58;">Razorpay Order ID</td><td style="padding:6px 12px;color:#3B1D0D;">${data.razorpayOrderId}</td></tr>` : ''}
    </table>
    <p style="color:#7C6A58;font-size:12px;">— Soma Wellness System</p>
  `;
  const text = [
    'Payment Received',
    '',
    data.customerName ? `Customer: ${data.customerName}` : '',
    data.customerEmail ? `Email: ${data.customerEmail}` : '',
    data.order ? `Order: ${data.order}` : '',
    data.amount ? `Amount: ${data.amount}` : '',
    data.paymentId ? `Payment ID: ${data.paymentId}` : '',
    data.razorpayOrderId ? `Razorpay Order ID: ${data.razorpayOrderId}` : '',
    '',
    '— Soma Wellness System',
  ].filter(Boolean).join('\n');
  const adminEmails = getAdminEmails();
  const results = await Promise.all(adminEmails.map(email => sendMail(email, subject, html, text)));
  return results.every(r => r.success) ? { success: true } : { success: false, results };
}

async function sendPaymentFailedAdmin(data) {
  const subject = 'Payment Failed';
  const html = `
    <h2 style="color:#2D1406;">Payment Failed</h2>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${data.customerName ? `<tr><td style="padding:6px 12px;color:#7C6A58;">Customer</td><td style="padding:6px 12px;color:#3B1D0D;">${data.customerName}</td></tr>` : ''}
      ${data.customerEmail ? `<tr><td style="padding:6px 12px;color:#7C6A58;">Email</td><td style="padding:6px 12px;color:#3B1D0D;">${data.customerEmail}</td></tr>` : ''}
      ${data.amount ? `<tr><td style="padding:6px 12px;color:#7C6A58;">Amount</td><td style="padding:6px 12px;color:#DC2626;">${data.amount}</td></tr>` : ''}
      ${data.failureReason ? `<tr><td style="padding:6px 12px;color:#7C6A58;">Reason</td><td style="padding:6px 12px;color:#DC2626;">${data.failureReason}</td></tr>` : ''}
    </table>
    <p style="color:#7C6A58;font-size:12px;">— Soma Wellness System</p>
  `;
  const text = [
    'Payment Failed',
    '',
    data.customerName ? `Customer: ${data.customerName}` : '',
    data.customerEmail ? `Email: ${data.customerEmail}` : '',
    data.amount ? `Amount: ${data.amount}` : '',
    data.failureReason ? `Reason: ${data.failureReason}` : '',
    '',
    '— Soma Wellness System',
  ].filter(Boolean).join('\n');
  const adminEmails = getAdminEmails();
  const results = await Promise.all(adminEmails.map(email => sendMail(email, subject, html, text)));
  return results.every(r => r.success) ? { success: true } : { success: false, results };
}

async function sendRegistrationAdmin(data) {
  return sendRegistration(data);
}

async function sendNewPurchaseAdmin(data) {
  const subject = 'New Purchase Notification';
  const html = `
    <h2 style="color:#2D1406;">New Purchase</h2>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${data.customerName ? `<tr><td style="padding:6px 12px;color:#7C6A58;">Customer</td><td style="padding:6px 12px;color:#3B1D0D;">${data.customerName}</td></tr>` : ''}
      ${data.customerEmail ? `<tr><td style="padding:6px 12px;color:#7C6A58;">Email</td><td style="padding:6px 12px;color:#3B1D0D;">${data.customerEmail}</td></tr>` : ''}
      ${data.item ? `<tr><td style="padding:6px 12px;color:#7C6A58;">Item</td><td style="padding:6px 12px;color:#3B1D0D;">${data.item}</td></tr>` : ''}
      ${data.amount ? `<tr><td style="padding:6px 12px;color:#7C6A58;">Amount</td><td style="padding:6px 12px;color:#3B1D0D;font-weight:700;">${data.amount}</td></tr>` : ''}
    </table>
    <p style="color:#7C6A58;font-size:12px;">— Soma Wellness System</p>
  `;
  const text = [
    'New Purchase Notification',
    '',
    data.customerName ? `Customer: ${data.customerName}` : '',
    data.customerEmail ? `Email: ${data.customerEmail}` : '',
    data.item ? `Item: ${data.item}` : '',
    data.amount ? `Amount: ${data.amount}` : '',
    '',
    '— Soma Wellness System',
  ].filter(Boolean).join('\n');
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