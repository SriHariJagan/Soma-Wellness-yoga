// ============================================================
// seed.js — Populate MongoDB with realistic demo data.
// Run:  node seed.js          (default — wipes & reseeds)
//       node seed.js --keep   (skip wiping existing data)
// ============================================================
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { connectDB } from './config/db.js';
import User from './models/User.js';
import Membership from './models/Membership.js';
import Attendance from './models/Attendance.js';
import Payment from './payment/models/Payment.js';
import ClassSession from './models/ClassSession.js';
import Workshop from './models/Workshop.js';
import Download from './models/Download.js';
import Consultation from './models/Consultation.js';
import Notification from './models/Notification.js';
import NotificationRecipient from './models/NotificationRecipient.js';
import Referral from './models/Referral.js';
import Lead from './models/Lead.js';
import Booking from './models/Booking.js';
import Batch from './models/Batch.js';
import Coupon from './models/Coupon.js';
import Course from './models/Course.js';
import Plan from './models/Plan.js';
import Settings from './models/Settings.js';
import ActivityLog from './models/ActivityLog.js';
import Service from './models/Service.js';
import { generateUniqueCode } from './services/referralService.js';

dotenv.config();

const DAY = 86400000;
const now = new Date();
const daysAgo = (n) => new Date(now.getTime() - n * DAY);
const daysAhead = (n) => new Date(now.getTime() + n * DAY);

async function hash(pw) {
  return bcrypt.hash(pw, await bcrypt.genSalt(12));
}

// ── Deterministic payment data ──────────────────────────────
function createPayment(user, { label, amount, gateway = 'mpesa', paymentStatus = 'captured', source = 'student', items = [] }) {
  return {
    user: user._id,
    label,
    amount,
    currency: 'KES',
    gateway,
    source,
    paymentStatus,
    fulfillmentStatus: paymentStatus === 'captured' ? 'completed' : 'pending',
    initiatedAt: daysAgo(rint(5, 30)),
    capturedAt: paymentStatus === 'captured' ? daysAgo(rint(1, 4)) : undefined,
    items,
    attempts: [{ attempt: 1, action: 'checkout', gatewayResponse: {}, timestamp: daysAgo(rint(5, 30)) }],
    auditTrail: [{ action: 'checkout_initiate', from: 'initiated', to: paymentStatus, timestamp: daysAgo(rint(5, 30)) }],
  };
}

const rint = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function run() {
  await connectDB(process.env.MONGO_URI);
  const keep = process.argv.includes('--keep');

  if (!keep) {
    console.log('🧹 Clearing existing collections…');
    await Promise.all([
      User.deleteMany({}), Membership.deleteMany({}), Attendance.deleteMany({}),
      Payment.deleteMany({}), ClassSession.deleteMany({}), Workshop.deleteMany({}),
      Download.deleteMany({}), Consultation.deleteMany({}), Notification.deleteMany({}),
      NotificationRecipient.deleteMany({}), Referral.deleteMany({}), Lead.deleteMany({}),
      Booking.deleteMany({}), Batch.deleteMany({}), Coupon.deleteMany({}),
      Course.deleteMany({}), Plan.deleteMany({}), Settings.deleteMany({}),
      ActivityLog.deleteMany({}), Service.deleteMany({}),
    ]);
  }

  // ── Settings ──
  await Settings.findOneAndUpdate(
    { key: 'global' },
    {
      $set: {
        announcementBanner: 'SOMA Wellness Center — Spring Valley, Nairobi. Now welcoming founding members.',
        studioName: 'SomaWellness',
        supportEmail: 'hello@somawellness.co.ke',
        supportPhone: '+254 700 000 000',
        integrations: { paymentGateway: true, zoom: true, whatsapp: true, emailSmtp: true },
      },
    },
    { upsert: true }
  );

  // ── Plans (SOMA tiers) ──
  await Plan.deleteMany({});
  const plans = await Plan.create([
    { name: 'SOMA JUA', description: 'Move · Energise · Shine. 8 group yoga classes/month + member rates.', price: 12000, durationMonths: 1, pauseDays: 0, displayOrder: 1, benefits: ['8 group yoga classes per month', 'Member rates on everything else'], badge: '', isPopular: false, isRecommended: false },
    { name: 'SOMA AMANI', description: 'Move into balance. Unlimited group yoga, meditation & breathwork, SOMA DAILY.', price: 18500, durationMonths: 1, pauseDays: 0, displayOrder: 2, benefits: ['Unlimited group yoga', 'Meditation and breathwork', 'SOMA DAILY included', 'Member rates on everything else'], badge: '', isPopular: false, isRecommended: true },
    { name: 'SOMA UZIMA', description: 'Yoga and recovery, complete.', price: 28500, durationMonths: 1, pauseDays: 0, displayOrder: 3, benefits: ['Unlimited yoga and meditation', 'SOMA DAILY included', '2 sixty-minute massages', '1 private yoga or therapy session', 'Priority booking · 2 guest passes', '15% off everything else'], badge: 'BEST VALUE', isPopular: true, isRecommended: false },
    { name: 'SOMA FAMILY', description: 'One household, one plan.', price: 35000, durationMonths: 1, pauseDays: 0, displayOrder: 4, benefits: ['2 adults, unlimited yoga', "1 children's or teen programme", 'Meditation and breathwork', 'SOMA DAILY included', '10% off everything else'], badge: '', isPopular: false, isRecommended: false },
  ]);
  const planByTier = Object.fromEntries(plans.map((p) => [p.name, p]));

  // ── Courses (SOMA Academy) ──
  const courses = await Course.create([
    { title: 'Yoga Foundations', duration: '25 Hours', mode: 'Hybrid', price: 30000, description: '25-hour foundation course.' },
    { title: 'SOMA 100 — Foundation Teacher Course', duration: '100 Hours', mode: 'Hybrid', price: 85000, description: '100-hour foundation teacher course.' },
    { title: 'SOMA 200 — Yoga Teacher Training', duration: '200 Hours', mode: 'Hybrid', price: 165000, description: '200-hour yoga teacher training. Early enrolment KES 145,000.' },
  ]);

  // ── Coupons ──
  await Coupon.create([
    { code: 'WELCOME10', discountType: 'Percentage', discountValue: 10, isReferral: false, active: true },
    { code: 'REFER500', discountType: 'Flat', discountValue: 500, isReferral: true, active: true },
  ]);

  // ── Batches ──
  const batches = await Batch.create([
    { name: 'Morning Flow', timing: '7:00 AM - 8:00 AM', trainer: 'Kapil Kesari', zoomLink: 'https://zoom.us/j/morning-flow', status: 'Active' },
    { name: 'Evening Restore', timing: '5:30 PM - 6:30 PM', trainer: 'SOMA Wellness Team', zoomLink: 'https://zoom.us/j/evening-restore', status: 'Active' },
    { name: 'Weekend Movement', timing: 'Sat-Sun 8:30 AM', trainer: 'SOMA Wellness Team', zoomLink: '', status: 'Upcoming' },
  ]);

  // ── Workshops (demo fixtures) ──
  const workshops = await Workshop.create([
    { name: 'Breathwork Basics (Demo)', date: daysAhead(10), duration: '2 hours', price: 1500, instructor: 'SOMA Wellness Team', status: 'available', description: 'Introductory breathwork session.' },
    { name: 'Deep Rest Workshop (Demo)', date: daysAhead(18), duration: '2 hours', price: 2500, instructor: 'SOMA Wellness Team', status: 'available', description: 'Guided rest and relaxation.' },
  ]);

  // ══════════════════════════════════════════════════════════
  //  ADMIN
  // ══════════════════════════════════════════════════════════
  const admin = await User.create({
    name: 'Kapil Kesari',
    email: 'admin@yoga.com',
    password: await hash('Admin@123'),
    role: 'admin',
    status: 'active',
    phone: '+91 9675547597',
    city: 'Nairobi',
    style: 'Hatha',
    level: 'Master',
  });

  // ══════════════════════════════════════════════════════════
  //  TEST STUDENTS — each gets 3 purchases:
  //    1. Membership (plan)
  //    2. Course enrollment
  //    3. Workshop booking
  // ══════════════════════════════════════════════════════════
  const testStudents = [
    {
      name: 'Amina Odhiambo',
      email: 'amina.demo@example.com',
      city: 'Nairobi',
      style: 'Hatha',
      level: 'Intermediate',
      tier: 'SOMA AMANI',
      planMonths: 1,
      purchases: [
        { type: 'membership', label: 'SOMA AMANI', amount: 18500, planMonths: 1 },
        { type: 'course', label: 'Yoga Foundations', amount: 30000, courseIndex: 0 },
        { type: 'workshop', label: 'Breathwork Basics (Demo)', amount: 1500, workshopIndex: 0 },
      ],
    },
    {
      name: 'Brian Kiprop',
      email: 'brian.demo@example.com',
      city: 'Nairobi',
      style: 'Hatha',
      level: 'Advanced',
      tier: 'SOMA UZIMA',
      planMonths: 1,
      purchases: [
        { type: 'membership', label: 'SOMA UZIMA', amount: 28500, planMonths: 1 },
        { type: 'course', label: 'SOMA 100 — Foundation Teacher Course', amount: 85000, courseIndex: 1 },
        { type: 'workshop', label: 'Deep Rest Workshop (Demo)', amount: 2500, workshopIndex: 1 },
      ],
    },
    {
      name: 'Wanjiku Mwangi',
      email: 'wanjiku.demo@example.com',
      city: 'Nairobi',
      style: 'Hatha',
      level: 'Beginner',
      tier: 'SOMA JUA',
      planMonths: 1,
      purchases: [
        { type: 'membership', label: 'SOMA JUA', amount: 12000, planMonths: 1 },
        { type: 'course', label: 'Yoga Foundations', amount: 30000, courseIndex: 0 },
        { type: 'workshop', label: 'Breathwork Basics (Demo)', amount: 1500, workshopIndex: 0 },
      ],
    },
  ];

  const consultationTopics = ['Posture alignment', 'Stress management', 'Breathing technique', 'Recovery support', 'Mobility goals'];
  const doctors = ['SOMA Wellness Team'];

  const students = [];

  for (const s of testStudents) {
    const student = await User.create({
      name: s.name,
      email: s.email,
      password: await hash('Student@123'),
      role: 'student',
      status: 'active',
      phone: `+254 7${rint(10000000, 99999999)}`,
      city: s.city,
      style: s.style,
      level: s.level,
      planMonths: s.planMonths,
      progress: { flexibility: rint(40, 95), strength: rint(40, 95), breathing: rint(40, 95), meditation: rint(40, 95) },
      badges: ['Early Bird', 'Consistent'],
      lastLogin: daysAgo(rint(0, 3)),
    });
    students.push({ doc: student, seed: s });

    // ── Membership (Purchase #1) ──
    if (s.planMonths > 0) {
      const plan = planByTier[s.tier];
      const start = daysAgo(15);
      const expiry = new Date(start.getTime() + s.planMonths * 30 * DAY);
      await Membership.create({
        user: student._id,
        planType: plan.name,
        planMonths: s.planMonths,
        price: plan.price,
        status: expiry > now ? 'active' : 'expired',
        startDate: start,
        expiryDate: expiry,
        zoomAccess: expiry > now,
        benefits: plan.benefits,
        pauseDaysAllowed: 0,
        history: [{ action: 'created', planMonths: s.planMonths, at: start }],
      });
      await Payment.create(createPayment(student, {
        label: plan.name,
        amount: plan.price,
        paymentStatus: 'captured',
        items: [{ itemType: 'plan', itemId: String(plan._id), name: plan.name, quantity: 1, unitPrice: plan.price, totalPrice: plan.price }],
      }));
    }

    // ── Course (Purchase #2) ──
    const course = courses[s.purchases[1].courseIndex];
    await Payment.create(createPayment(student, {
      label: course.title,
      amount: course.price,
      paymentStatus: 'captured',
      items: [{ itemType: 'course', itemId: String(course._id), name: course.title, quantity: 1, unitPrice: course.price, totalPrice: course.price }],
    }));

    // ── Workshop (Purchase #3) ──
    const workshop = workshops[s.purchases[2].workshopIndex] || workshops[0];
    await Payment.create(createPayment(student, {
      label: workshop.name,
      amount: workshop.price,
      paymentStatus: 'captured',
      items: [{ itemType: 'workshop', itemId: String(workshop._id), name: workshop.name, quantity: 1, unitPrice: workshop.price, totalPrice: workshop.price }],
    }));

    // ── Attendance (last ~28 days) ──
    const attendance = [];
    for (let d = 28; d >= 1; d--) {
      const day = daysAgo(d);
      if (day.getDay() === 0) continue;
      const roll = Math.random();
      let status;
      if (roll < 0.6) status = 'present';
      else if (roll < 0.8) status = 'zoom';
      else if (roll < 0.92) status = 'absent';
      else continue;
      day.setHours(0, 0, 0, 0);
      attendance.push({
        user: student._id, date: day, status,
        mode: status === 'zoom' ? 'online' : 'offline',
        classType: ['Movement', 'Breathwork', 'Rest', 'Mindfulness'][Math.floor(Math.random() * 4)],
      });
    }
    if (attendance.length) await Attendance.insertMany(attendance);

    // ── Consultation ──
    await Consultation.create({
      user: student._id, date: daysAhead(rint(2, 14)), doctor: doctors[Math.floor(Math.random() * doctors.length)],
      topic: consultationTopics[Math.floor(Math.random() * consultationTopics.length)], status: 'upcoming',
      meetingLink: `https://zoom.us/j/consult-${rint(1000, 9999)}`,
    });

    // ── Notifications ──
    const notifDocs = await Notification.create([
      { email: student.email, user: student._id, title: 'Class reminder', message: 'Your <strong>Morning Flow</strong> class starts at 7 AM tomorrow.', type: 'reminder', read: false, channels: ['whatsapp', 'email'] },
      { email: student.email, user: student._id, title: 'Payment received', message: 'We received your membership payment. Thank you!', type: 'success', read: true, channels: ['email'] },
    ]);
    await NotificationRecipient.insertMany(notifDocs.map((n) => ({
      notification: n._id, student: student._id, isRead: n.read,
      readAt: n.read ? new Date() : null, deliveredAt: n.createdAt || new Date(),
    })));

    // ── Referral ──
    const code = await generateUniqueCode(s.name);
    const joinedCount = rint(1, 3);
    await Referral.create({
      user: student._id, code, earned: joinedCount * 500,
      invited: Array.from({ length: rint(1, 3) }, (_, i) => ({ name: `Friend ${i + 1}`, email: `friend${i}_${code}@mail.com` })),
      joined: Array.from({ length: joinedCount }, (_, i) => ({ name: `Joined ${i + 1}`, reward: 500 })),
    });

    const unreadNotifCount = notifDocs.filter((n) => !n.read).length;
    await User.findByIdAndUpdate(student._id, {
      referralCount: joinedCount,
      unreadNotifications: unreadNotifCount,
      'stats.classes': attendance.filter((a) => a.status !== 'absent').length,
      'stats.attendancePct': attendance.length
        ? Math.round((attendance.filter((a) => a.status !== 'absent').length / attendance.length) * 100)
        : 0,
    });
  }

  // ── Class sessions (upcoming + completed-with-recordings) ──
  const classNames = ['Morning Flow', 'Evening Restore', 'Gentle Movement', 'Breathwork & Rest', 'Sunset Mindfulness', 'Core & Balance'];
  const upcoming = [];
  for (let i = 1; i <= 6; i++) {
    const mode = Math.random() > 0.5 ? 'online' : 'offline';
    upcoming.push({
      name: classNames[Math.floor(Math.random() * classNames.length)],
      time: ['6:00 AM', '7:30 AM', '5:30 PM', '6:30 PM'][Math.floor(Math.random() * 4)],
      date: daysAhead(i), mode,
      trainer: ['Kapil Kesari', 'SOMA Wellness Team', 'SOMA Wellness Team'][Math.floor(Math.random() * 3)],
      zoomUrl: mode === 'online' ? `https://zoom.us/j/class-${rint(1000, 9999)}` : '',
      batch: batches[Math.floor(Math.random() * batches.length)]._id, status: 'upcoming',
      enrolledUsers: students.filter(() => Math.random() > 0.5).map((s) => s.doc._id),
    });
  }
  await ClassSession.insertMany(upcoming);

  const recordings = [];
  for (let i = 1; i <= 8; i++) {
    recordings.push({
      name: classNames[Math.floor(Math.random() * classNames.length)],
      time: '6:00 AM', date: daysAgo(i * 2), mode: 'online',
      trainer: ['Kapil Kesari', 'SOMA Wellness Team'][Math.floor(Math.random() * 2)],
      status: 'completed', recordingUrl: `https://recordings.somawellness.co.ke/session-${rint(1000, 9999)}.mp4`,
    });
  }
  await ClassSession.insertMany(recordings);

  // ── Workshop registrations ──
  if (workshops.length > 0 && students.length >= 2) {
    workshops[0].registrations.push(
      { user: students[0].doc._id, paid: true },
      { user: students[1].doc._id, paid: true },
    );
    await workshops[0].save();
  }

  // ── Downloads ──
  await Download.create([
    { name: 'SOMA Practice Guide', type: 'pdf', size: '4.2 MB', url: 'https://files.somawellness.co.ke/practice-guide.pdf', category: 'Guides', visibility: 'all', downloadCount: 150 },
    { name: 'Breathwork Audio Series', type: 'video', size: '320 MB', url: 'https://files.somawellness.co.ke/breathwork-series.mp4', category: 'Video', visibility: 'all', downloadCount: 89 },
    { name: 'Mindfulness Scripts Pack', type: 'guide', size: '1.1 MB', url: 'https://files.somawellness.co.ke/mindfulness-scripts.pdf', category: 'Guides', visibility: 'all', downloadCount: 200 },
    { name: 'Morning Reflections (Audio)', type: 'audio', size: '48 MB', url: 'https://files.somawellness.co.ke/morning-reflections.mp3', category: 'Audio', visibility: 'plan', allowedPlans: ['SOMA DAILY — Annual'], downloadCount: 45 },
  ]);

  // ── Global broadcast notification ──
  await Notification.create({
    email: 'system', user: null, title: 'Welcome to SomaWellness',
    message: 'SOMA Wellness Center — Spring Valley, Nairobi. Explore memberships, private sessions and signature experiences.',
    type: 'announcement', channels: ['email', 'whatsapp'],
  });

  // ── Leads (demo fixtures) ──
  await Lead.create([
    { name: 'Demo Lead One', phone: '+254 700 000 001', email: 'lead1@example.com', interestType: 'SOMA AMANI', stage: 'New', notes: 'Demo fixture.' },
    { name: 'Demo Lead Two', phone: '+254 700 000 002', email: 'lead2@example.com', interestType: 'SOMA 200', stage: 'Follow up', notes: 'Demo fixture.' },
  ]);

  // ── Bookings ──
  await Booking.create([
    { name: 'Amina Odhiambo', email: 'amina.demo@example.com', phone: '+254 700 000 011', city: 'Nairobi', courseName: 'Yoga Foundations', coursePrice: '30000', courseTime: '6:00 AM', paymentMethod: 'Card', transactionId: 'TXN' + rint(100000, 999999), status: 'Confirmed' },
    { name: 'New Enquirer', email: 'enquirer@example.com', phone: '+254 700 000 012', city: 'Nairobi', courseName: 'SOMA 200 — Yoga Teacher Training', coursePrice: '165000', courseTime: 'Flexible', paymentMethod: 'Bank Transfer', transactionId: '', status: 'Pending' },
  ]);

  // ── Activity logs ──
  await ActivityLog.create([
    { action: 'Seeded database', performedBy: admin._id },
    { action: `Created ${students.length} students`, performedBy: admin._id },
  ]);

  // ── Summary ──
  const totalPayments = await Payment.countDocuments();
  const capturedPayments = await Payment.countDocuments({ paymentStatus: 'captured' });

  console.log('');
  console.log('✅ Seed complete.');
  console.log('══════════════════════════════════════════════════════════');
  console.log('');
  console.log('  ADMIN LOGIN');
  console.log(`  Email:    ${admin.email}`);
  console.log('  Password: Admin@123');
  console.log('');
  console.log('  TEST STUDENTS');
  console.log('  ──────────────────────────────────────────────────────');
  for (const s of students) {
    console.log(`  ${s.seed.name}`);
    console.log(`    Email:    ${s.seed.email}`);
    console.log(`    Password: Student@123`);
    console.log(`    Plan:     ${s.seed.purchases[0].label} (KES ${s.seed.purchases[0].amount.toLocaleString()})`);
    console.log(`    Course:   ${s.seed.purchases[1].label} (KES ${s.seed.purchases[1].amount.toLocaleString()})`);
    console.log(`    Workshop: ${s.seed.purchases[2].label} (KES ${s.seed.purchases[2].amount.toLocaleString()})`);
    console.log('');
  }
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Payments: ${totalPayments} total (${capturedPayments} captured)`);
  console.log('');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌ Seed failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
