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
        announcementBanner: 'Grand Ashram Intensive Starts Next Week! Enroll now.',
        studioName: 'Soma Wellness',
        supportEmail: 'hello@somawellness.in',
        supportPhone: '+91 9675547597',
        integrations: { paymentGateway: true, zoom: true, whatsapp: true, emailSmtp: true },
      },
    },
    { upsert: true }
  );

  // ── Plans ──
  await Plan.deleteMany({});
  const plans = await Plan.create([
    { name: '1 Month Membership', description: 'Perfect for beginners to start their yoga journey with essential studio access.', price: 1500, durationMonths: 1, pauseDays: 0, displayOrder: 1, benefits: ['Unlimited Yoga Classes', 'Community Support'], badge: '', isPopular: false, isRecommended: false },
    { name: '3 Month Membership', description: 'Build a consistent practice with added flexibility to pause when needed.', price: 4000, durationMonths: 3, pauseDays: 15, displayOrder: 2, benefits: ['Unlimited Yoga Classes', 'Community Support', 'Membership Pause up to 15 Days'], badge: 'Recommended', isPopular: false, isRecommended: true },
    { name: '6 Month Membership', description: 'Our most popular plan with premium content access and a free personal consultation.', price: 7000, durationMonths: 6, pauseDays: 30, displayOrder: 3, benefits: ['Unlimited Yoga Classes', 'Premium Content Access', 'Free 1 Personal Consultation', 'Membership Pause up to 30 Days'], badge: 'Most Popular', isPopular: true, isRecommended: false },
    { name: '12 Month Membership', description: 'The ultimate commitment to your wellness journey with maximum benefits.', price: 12000, durationMonths: 12, pauseDays: 60, displayOrder: 4, benefits: ['Unlimited Yoga Classes', 'Premium Content Access', 'Workshops Included', 'Free Personal Consultation', 'Free Diet Consultation', 'Membership Pause up to 60 Days'], badge: 'Best Value', isPopular: false, isRecommended: false },
  ]);
  const planByMonths = Object.fromEntries(plans.map((p) => [p.durationMonths, p]));

  // ── Courses ──
  const courses = await Course.create([
    { title: '21-Day Detox Sadhana', duration: '3 Weeks', mode: 'Online', price: 4500, description: 'Cleanse and reset with guided daily practice.' },
    { title: '200hr Teacher Training', duration: '3 Months', mode: 'Hybrid', price: 42000, description: 'Yoga Alliance certified foundational TTC.' },
    { title: 'Weekend Yin Retreat', duration: '2 Days', mode: 'Studio', price: 3200, description: 'Deep restorative weekend immersion.' },
    { title: 'Pranayama Mastery', duration: '4 Weeks', mode: 'Online', price: 3800, description: 'Breath-work for energy and calm.' },
  ]);

  // ── Services ──
  await Service.create([
    { name: 'Offline Group Yoga', description: 'Community sessions in studio to enhance motivation.', mode: 'center', category: 'Group', type: 'Hatha', price: 2500, pricingModel: 'monthly', totalSessions: 0, sessionDuration: 60, scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], scheduleTime: '7:00 AM – 8:00 AM, 8:00 AM – 9:00 AM, 5:00 PM – 6:00 PM', active: true, isPopular: true, displayOrder: 1 },
    { name: 'Online Group Yoga', description: 'Holistic online practice for fitness & clarity.', mode: 'online', category: 'Group', type: 'Vinyasa', price: 1500, pricingModel: 'monthly', totalSessions: 0, sessionDuration: 60, scheduleDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], scheduleTime: '9:00 AM – 10:00 AM, 11:30 AM – 12:30 PM IST', active: true, isPopular: true, displayOrder: 2 },
  ]);

  // ── Coupons ──
  await Coupon.create([
    { code: 'FESTIVE20', discountType: 'Percentage', discountValue: 20, isReferral: false, active: true },
    { code: 'REFER100', discountType: 'Flat', discountValue: 100, isReferral: true, active: true },
    { code: 'NEWYOGI15', discountType: 'Percentage', discountValue: 15, isReferral: false, active: true },
  ]);

  // ── Batches ──
  const batches = await Batch.create([
    { name: 'Morning Hatha', timing: '6:00 AM - 7:00 AM', trainer: 'Kapil Kesari', zoomLink: 'https://zoom.us/j/morning-hatha', status: 'Active' },
    { name: 'Evening Vinyasa', timing: '6:30 PM - 7:30 PM', trainer: 'Anita Rao', zoomLink: 'https://zoom.us/j/evening-vinyasa', status: 'Active' },
    { name: 'Weekend Ashtanga', timing: 'Sat-Sun 7:00 AM', trainer: 'Rohit Sen', zoomLink: '', status: 'Upcoming' },
  ]);

  // ── Workshops ──
  const workshops = await Workshop.create([
    { name: 'Sound Healing Immersion', date: daysAhead(10), duration: '2 hours', price: 1500, instructor: 'Anita Rao', status: 'available', description: 'Tibetan bowls & deep relaxation.' },
    { name: 'Advanced Inversions', date: daysAhead(18), duration: '3 hours', price: 2500, instructor: 'Rohit Sen', status: 'available', description: 'Headstands, handstands & forearm balances.' },
    { name: 'Ayurveda for Daily Life', date: daysAhead(25), duration: '4 hours', price: 2000, instructor: 'Dr. Meera Iyer', status: 'available', description: 'Practical dosha-based routines.' },
    { name: 'Full Moon Meditation', date: daysAgo(8), duration: '90 min', price: 800, instructor: 'Kapil Kesari', status: 'completed' },
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
    city: 'Jaipur',
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
      name: 'Priya Sharma',
      email: 'priya@yoga.com',
      city: 'Jaipur',
      style: 'Vinyasa',
      level: 'Intermediate',
      planMonths: 6,
      purchases: [
        { type: 'membership', label: '6 Month Membership', amount: 7000, planMonths: 6 },
        { type: 'course', label: '21-Day Detox Sadhana', amount: 4500, courseIndex: 0 },
        { type: 'workshop', label: 'Sound Healing Immersion', amount: 1500, workshopIndex: 0 },
      ],
    },
    {
      name: 'Rahul Verma',
      email: 'rahul@yoga.com',
      city: 'Delhi',
      style: 'Ashtanga',
      level: 'Advanced',
      planMonths: 12,
      purchases: [
        { type: 'membership', label: '12 Month Membership', amount: 12000, planMonths: 12 },
        { type: 'course', label: '200hr Teacher Training', amount: 42000, courseIndex: 1 },
        { type: 'workshop', label: 'Advanced Inversions', amount: 2500, workshopIndex: 1 },
      ],
    },
    {
      name: 'Anjali Mehta',
      email: 'anjali@yoga.com',
      city: 'Mumbai',
      style: 'Hatha',
      level: 'Beginner',
      planMonths: 3,
      purchases: [
        { type: 'membership', label: '3 Month Membership', amount: 4000, planMonths: 3 },
        { type: 'course', label: 'Pranayama Mastery', amount: 3800, courseIndex: 3 },
        { type: 'workshop', label: 'Ayurveda for Daily Life', amount: 2000, workshopIndex: 2 },
      ],
    },
  ];

  const consultationTopics = ['Posture alignment', 'Diet & nutrition', 'Injury recovery', 'Stress management', 'Breathing technique'];
  const doctors = ['Dr. Meera Iyer', 'Dr. Sanjay Gupta', 'Anita Rao (Senior Instructor)'];

  const students = [];

  for (const s of testStudents) {
    const student = await User.create({
      name: s.name,
      email: s.email,
      password: await hash('Student@123'),
      role: 'student',
      status: 'active',
      phone: `+91 9${rint(100000000, 999999999)}`,
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
      const plan = planByMonths[s.planMonths];
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
        pauseDaysAllowed: { 1: 0, 3: 15, 6: 30, 12: 60 }[s.planMonths] ?? 0,
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
        classType: ['Hatha', 'Vinyasa', 'Pranayama', 'Meditation'][Math.floor(Math.random() * 4)],
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
      { email: student.email, user: student._id, title: 'Class reminder', message: 'Your <strong>Morning Hatha</strong> class starts at 6 AM tomorrow.', type: 'reminder', read: false, channels: ['whatsapp', 'email'] },
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
  const classNames = ['Morning Hatha Flow', 'Power Vinyasa', 'Gentle Yin', 'Pranayama & Breath', 'Sunset Meditation', 'Core & Balance'];
  const upcoming = [];
  for (let i = 1; i <= 6; i++) {
    const mode = Math.random() > 0.5 ? 'online' : 'offline';
    upcoming.push({
      name: classNames[Math.floor(Math.random() * classNames.length)],
      time: ['6:00 AM', '7:30 AM', '5:30 PM', '6:30 PM'][Math.floor(Math.random() * 4)],
      date: daysAhead(i), mode,
      trainer: ['Kapil Kesari', 'Anita Rao', 'Rohit Sen'][Math.floor(Math.random() * 3)],
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
      trainer: ['Kapil Kesari', 'Anita Rao'][Math.floor(Math.random() * 2)],
      status: 'completed', recordingUrl: `https://recordings.somawellness.in/session-${rint(1000, 9999)}.mp4`,
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
    { name: 'Asana Blueprint Handbook', type: 'pdf', size: '4.2 MB', url: 'https://files.somawellness.in/asana-handbook.pdf', category: 'Guides', visibility: 'all', downloadCount: 150 },
    { name: 'Pranayama Video Series', type: 'video', size: '320 MB', url: 'https://files.somawellness.in/pranayama-series.mp4', category: 'Video', visibility: 'all', downloadCount: 89 },
    { name: 'Meditation Scripts Pack', type: 'guide', size: '1.1 MB', url: 'https://files.somawellness.in/meditation-scripts.pdf', category: 'Guides', visibility: 'all', downloadCount: 200 },
    { name: 'Morning Chants (Audio)', type: 'audio', size: '48 MB', url: 'https://files.somawellness.in/morning-chants.mp3', category: 'Audio', visibility: 'plan', allowedPlans: ['Annual Pass'], downloadCount: 45 },
  ]);

  // ── Global broadcast notification ──
  await Notification.create({
    email: 'system', user: null, title: 'New Workshop',
    message: 'Registrations open for <strong>Sound Healing Immersion</strong> — limited seats!',
    type: 'workshop_update', channels: ['email', 'whatsapp'],
  });

  // ── Leads ──
  await Lead.create([
    { name: 'Karan Malhotra', phone: '+91 9812345670', email: 'karan@mail.com', interestType: '200hr TTC', stage: 'New', notes: 'Enquired via Instagram.' },
    { name: 'Divya Reddy', phone: '+91 9812345671', email: 'divya@mail.com', interestType: 'Monthly membership', stage: 'Follow up', notes: 'Wants a trial class.' },
    { name: 'Imran Khan', phone: '+91 9812345672', email: 'imran@mail.com', interestType: 'Weekend retreat', stage: 'Converted', notes: 'Paid for Yin retreat.' },
    { name: 'Lakshmi Menon', phone: '+91 9812345673', email: 'lakshmi@mail.com', interestType: 'Pranayama course', stage: 'Cold', notes: 'No response in 2 weeks.' },
  ]);

  // ── Bookings ──
  await Booking.create([
    { name: 'Priya Sharma', email: 'priya@yoga.com', phone: '+91 9811111111', city: 'Jaipur', courseName: '21-Day Detox Sadhana', coursePrice: '4500', courseTime: '6:00 AM', paymentMethod: 'Card', transactionId: 'TXN' + rint(100000, 999999), status: 'Confirmed' },
    { name: 'New Enquirer', email: 'enquirer@mail.com', phone: '+91 9822222222', city: 'Delhi', courseName: '200hr Teacher Training', coursePrice: '42000', courseTime: 'Flexible', paymentMethod: 'Bank Transfer', transactionId: '', status: 'Pending' },
    { name: 'Sneha Patel', email: 'sneha@yoga.com', phone: '+91 9833333333', city: 'Ahmedabad', courseName: 'Weekend Yin Retreat', coursePrice: '3200', courseTime: 'Sat-Sun', paymentMethod: 'UPI', transactionId: 'TXN' + rint(100000, 999999), status: 'Confirmed' },
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
  console.log('  Email:    admin@yoga.com');
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
