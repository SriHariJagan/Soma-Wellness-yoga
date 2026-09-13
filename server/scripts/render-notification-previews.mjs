#!/usr/bin/env node
/**
 * Render notification email templates to HTML files for local preview.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'email-previews', 'notifications');

import welcome from '../notification/templates/welcome.js';
import passwordReset from '../notification/templates/password-reset.js';
import classReminder from '../notification/templates/class-reminder.js';
import classEnrollment from '../notification/templates/class-enrollment.js';
import workshopReminder from '../notification/templates/workshop-reminder.js';
import workshopConfirmation from '../notification/templates/workshop-confirmation.js';
import eventReminder from '../notification/templates/event-reminder.js';
import membershipReminder from '../notification/templates/membership-reminder.js';
import invoice from '../notification/templates/invoice.js';
import newsletter from '../notification/templates/newsletter.js';
import birthday from '../notification/templates/birthday.js';
import consultationConfirmation from '../notification/templates/consultation-confirmation.js';
import serviceEnrollment from '../notification/templates/service-enrollment.js';
import bookingConfirmation from '../notification/templates/booking-confirmation.js';
import referralInvite from '../notification/templates/referral-invite.js';
import leadConfirmation from '../notification/templates/lead-confirmation.js';
import refund from '../notification/templates/refund.js';

function makeNotification(template, data) {
  return { template, templateData: data, title: '', message: '', subject: '' };
}

const base = {
  name: 'Srihari',
  dashboardUrl: 'https://somawellness.co.ke/dashboard',
  resetLink: 'https://somawellness.co.ke/reset-password?token=test123',
  className: 'Morning Flow Yoga',
  classTime: '7:00 AM — 8:30 AM',
  classDate: 'Saturday, 13 September 2025',
  instructor: 'Dr. Kapil',
  meetLink: 'https://meet.google.com/abc-defg-hij',
  workshopName: 'Pranayama Masterclass',
  workshopDate: 'Sunday, 14 September 2025',
  workshopTime: '10:00 AM — 1:00 PM',
  eventName: 'Full Moon Meditation',
  eventDate: 'Monday, 15 September 2025',
  eventTime: '7:00 PM — 9:00 PM',
  membershipType: 'Premium Monthly',
  renewalDate: '1 October 2025',
  invoiceNumber: 'INV-001',
  amount: 'KES 12,500',
  serviceName: '200-Hour Teacher Training',
  courseName: 'Yoga Teacher Training',
  batchStart: '1 October 2025',
  bookingId: 'BK-001',
  bookingDate: '12 September 2025',
  slot: 'Saturday 7:00 AM',
  inviteeName: 'Friend',
  senderName: 'Srihari',
  referralLink: 'https://somawellness.co.ke/register?ref=ABC123',
  interestType: 'wellness',
  doctor: 'Dr. Kapil',
  consultationDate: '12 September 2025',
  consultationTime: '11:00 AM',
  refundAmount: 'KES 5,000',
  refundReason: 'Schedule change',
  refundId: 'REF-001',
};

const templates = [
  { file: '01-welcome.html',           html: welcome(makeNotification('welcome', base)).html },
  { file: '02-password-reset.html',    html: passwordReset(makeNotification('password-reset', base)).html },
  { file: '03-class-reminder.html',    html: classReminder(makeNotification('class-reminder', base)).html },
  { file: '04-class-enrollment.html',  html: classEnrollment(makeNotification('class-enrollment', base)).html },
  { file: '05-workshop-reminder.html', html: workshopReminder(makeNotification('workshop-reminder', base)).html },
  { file: '06-workshop-confirm.html',  html: workshopConfirmation(makeNotification('workshop-confirmation', base)).html },
  { file: '07-event-reminder.html',    html: eventReminder(makeNotification('event-reminder', base)).html },
  { file: '08-membership-reminder.html', html: membershipReminder(makeNotification('membership-reminder', base)).html },
  { file: '09-invoice.html',           html: invoice(makeNotification('invoice', base)).html },
  { file: '10-newsletter.html',        html: newsletter(makeNotification('newsletter', { ...base, title: 'September Wellness Digest', content: 'This month we explore the art of mindful breathing and its transformative effects on daily life.' })).html },
  { file: '11-birthday.html',          html: birthday(makeNotification('birthday', base)).html },
  { file: '12-consultation-confirm.html', html: consultationConfirmation(makeNotification('consultation-confirmation', base)).html },
  { file: '13-service-enrollment.html', html: serviceEnrollment(makeNotification('service-enrollment', base)).html },
  { file: '14-booking-confirm.html',   html: bookingConfirmation(makeNotification('booking-confirmation', base)).html },
  { file: '15-referral-invite.html',   html: referralInvite(makeNotification('referral-invite', base)).html },
  { file: '16-lead-confirmation.html', html: leadConfirmation(makeNotification('lead-confirmation', base)).html },
  { file: '17-refund.html',            html: refund(makeNotification('refund', base)).html },
];

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const t of templates) {
  fs.writeFileSync(path.join(outDir, t.file), t.html, 'utf-8');
  console.log(`  ✓ ${t.file}`);
}

console.log(`\n${templates.length} notification templates rendered to: ${outDir}\n`);
