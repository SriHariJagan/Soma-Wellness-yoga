#!/usr/bin/env node
/**
 * Send all email templates to a test address for review.
 * Usage: node scripts/send-test-emails.mjs [email]
 * Requires SMTP_* env vars to be set in .env
 */
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

// Load .env from project root
import fs from 'fs';
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

import emailService from '../services/email/email.service.js';
import mpesaTemplate from '../services/email/templates/mpesaPaymentSuccess.js';

const TO = process.argv[2] || 'srihariajagan04@gmail.com';
const FRONTEND = process.env.FRONTEND_URL || 'https://somawellness.co.ke';

const sharedData = {
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

function sendMpesa() {
  const { subject, text, html } = mpesaTemplate(sharedData);
  return emailService.sendMail(TO, subject, html, text);
}

const templates = [
  { name: 'Welcome',                   fn: () => emailService.sendWelcome({ ...sharedData, email: TO }) },
  { name: 'Reset Password',            fn: () => emailService.sendResetPassword({ ...sharedData, email: TO }) },
  { name: 'OTP',                       fn: () => emailService.sendOTP({ ...sharedData, email: TO }) },
  { name: 'Payment Success',           fn: () => emailService.sendPaymentSuccess({ ...sharedData, email: TO }) },
  { name: 'Payment Failed',            fn: () => emailService.sendPaymentFailed({ ...sharedData, email: TO }) },
  { name: 'M-Pesa Payment Success',    fn: sendMpesa },
  { name: 'Invoice',                   fn: () => emailService.sendInvoice({ ...sharedData, email: TO }) },
  { name: 'Certificate',               fn: () => emailService.sendCertificate({ ...sharedData, email: TO }) },
  { name: 'Registration (Admin)',      fn: () => emailService.sendRegistration(sharedData) },
  { name: 'Enquiry (Customer)',        fn: () => emailService.sendEnquiry({ ...sharedData, email: TO }) },
  { name: 'Enquiry (Admin)',           fn: () => emailService.sendEnquiryAdmin(sharedData) },
  { name: 'Payment Received (Admin)',  fn: () => emailService.sendPaymentReceivedAdmin(sharedData) },
  { name: 'Payment Failed (Admin)',    fn: () => emailService.sendPaymentFailedAdmin(sharedData) },
  { name: 'New Purchase (Admin)',      fn: () => emailService.sendNewPurchaseAdmin(sharedData) },
];

console.log(`\nSending ${templates.length} test emails to: ${TO}\n`);

let sent = 0;
let failed = 0;

for (const tmpl of templates) {
  try {
    const result = await tmpl.fn();
    if (result.success) {
      console.log(`  ✓ ${tmpl.name}`);
      sent++;
    } else {
      console.log(`  ✗ ${tmpl.name} — ${result.error || 'unknown error'}`);
      failed++;
    }
  } catch (err) {
    console.log(`  ✗ ${tmpl.name} — ${err.message}`);
    failed++;
  }
}

console.log(`\nDone: ${sent} sent, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
