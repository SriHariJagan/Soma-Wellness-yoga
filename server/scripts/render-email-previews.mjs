#!/usr/bin/env node
/**
 * Render all email templates to HTML files for local preview.
 * Usage: node scripts/render-email-previews.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'email-previews');

import mpesaTemplate from '../services/email/templates/mpesaPaymentSuccess.js';
import welcomeTemplate from '../services/email/templates/welcome.js';
import resetPasswordTemplate from '../services/email/templates/resetPassword.js';
import otpTemplate from '../services/email/templates/otp.js';
import paymentSuccessTemplate from '../services/email/templates/paymentSuccess.js';
import paymentFailedTemplate from '../services/email/templates/paymentFailed.js';
import invoiceTemplate from '../services/email/templates/invoice.js';
import certificateTemplate from '../services/email/templates/certificate.js';
import registrationTemplate from '../services/email/templates/registration.js';
import enquiryTemplate from '../services/email/templates/enquiry.js';
import enquiryAdminTemplate from '../services/email/templates/enquiryAdmin.js';

import layout from '../notification/templates/engine/layout.js';
import { heading, p, card, infoTable } from '../notification/templates/engine/components.js';

const FRONTEND = 'https://somawellness.co.ke';
const TO = 'srihariajagan04@gmail.com';

const shared = {
  name: 'Srihari',
  email: TO,
  phone: '+254 700 000 000',
  dashboardUrl: `${FRONTEND}/dashboard`,
  resetLink: `${FRONTEND}/reset-password?token=test123`,
  invoiceLink: `${FRONTEND}/invoices/INV-001`,
  certificateUrl: `${FRONTEND}/certificates/cert-001`,
  certificateName: '200-Hour Wellness Teacher Training',
  invoiceNumber: 'INV-001',
  amount: 'KES 12,500',
  description: 'Monthly Membership — Premium',
  paymentDate: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
  transactionId: 'TXN-TEST-001',
  orderId: 'ORD-001',
  mpesaReceipt: 'QHK7B3A4RT',
  failureReason: 'Insufficient funds',
  otp: '847291',
  expiryMinutes: 10,
  studentName: 'Srihari',
  registrationDate: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
  submissionDate: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
  ip: '192.168.1.1',
  subject: 'General Enquiry',
  message: 'I would like to know more about your wellness programs and pricing.',
  issueDate: new Date().toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' }),
  customerName: 'Srihari',
  customerEmail: TO,
  order: 'ORD-TEST-001',
  paymentId: 'PAY-TEST-001',
  razorpayOrderId: 'order_test_123',
};

const templates = [
  { file: '01-welcome.html',             html: welcomeTemplate(shared).html },
  { file: '02-reset-password.html',      html: resetPasswordTemplate(shared).html },
  { file: '03-otp.html',                 html: otpTemplate(shared).html },
  { file: '04-payment-success.html',     html: paymentSuccessTemplate(shared).html },
  { file: '05-payment-failed.html',      html: paymentFailedTemplate(shared).html },
  { file: '06-mpesa-success.html',       html: mpesaTemplate(shared).html },
  { file: '07-invoice.html',             html: invoiceTemplate(shared).html },
  { file: '08-certificate.html',         html: certificateTemplate(shared).html },
  { file: '09-registration-admin.html',  html: registrationTemplate(shared).html },
  { file: '10-enquiry-customer.html',    html: enquiryTemplate(shared).html },
  { file: '11-enquiry-admin.html',       html: enquiryAdminTemplate(shared).html },
  { file: '12-payment-received-admin.html', html: layout({ body: `
    ${heading('Payment Received')}
    ${p('A payment has been successfully received. Details below.')}
    ${card({ title: 'Payment Details', content: infoTable([
      { label: 'Customer', value: shared.customerName },
      { label: 'Email', value: shared.customerEmail },
      { label: 'Order', value: shared.order },
      { label: 'Amount', value: `<strong>${shared.amount}</strong>` },
      { label: 'Payment ID', value: shared.paymentId },
    ]) })}
    ${p('— SomaWellness System', { muted: true, small: true })}
  `, previewText: 'Payment received' }) },
  { file: '13-payment-failed-admin.html', html: layout({ body: `
    ${heading('Payment Failed')}
    ${p('A payment could not be processed. Details below.')}
    ${card({ title: 'Failure Details', content: infoTable([
      { label: 'Customer', value: shared.customerName },
      { label: 'Email', value: shared.customerEmail },
      { label: 'Amount', value: shared.amount },
      { label: 'Reason', value: shared.failureReason },
    ]) })}
    ${p('— SomaWellness System', { muted: true, small: true })}
  `, previewText: 'Payment failed' }) },
  { file: '14-new-purchase-admin.html', html: layout({ body: `
    ${heading('New Purchase')}
    ${p('A new purchase has been made. Details below.')}
    ${card({ title: 'Purchase Details', content: infoTable([
      { label: 'Customer', value: shared.customerName },
      { label: 'Email', value: shared.customerEmail },
      { label: 'Item', value: shared.description },
      { label: 'Amount', value: `<strong>${shared.amount}</strong>` },
    ]) })}
    ${p('— SomaWellness System', { muted: true, small: true })}
  `, previewText: 'New purchase' }) },
];

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const t of templates) {
  fs.writeFileSync(path.join(outDir, t.file), t.html, 'utf-8');
  console.log(`  ✓ ${t.file}`);
}

console.log(`\n${templates.length} templates rendered to: ${outDir}\n`);
