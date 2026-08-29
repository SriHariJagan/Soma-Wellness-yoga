// ============================================================
// seed.js — Populate MongoDB with realistic demo data.
// Run:  node seed.js          (default — wipes & reseeds)
//       node seed.js --keep   (skip wiping existing data)
// ============================================================
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

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
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rint = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const PAUSE_RULES = { 1: 0, 3: 15, 6: 30, 12: 60 };

async function hash(pw) {
  return bcrypt.hash(pw, await bcrypt.genSalt(12));
}

async function run() {
  await connectDB(process.env.MONGO_URI);
  const keep = process.argv.includes('--keep');

  if (!keep) {
    console.log('🧹 Clearing existing collections…');
    await Promise.all([
      User.deleteMany({}), Membership.deleteMany({}), Attendance.deleteMany({}),
      Payment.deleteMany({}), ClassSession.deleteMany({}), Workshop.deleteMany({}),
      Download.deleteMany({}), Consultation.deleteMany({}), Notification.deleteMany({}),
      NotificationRecipient.deleteMany({}), Referral.deleteMany({}), Lead.deleteMany({}), Booking.deleteMany({}),
      Batch.deleteMany({}), Coupon.deleteMany({}), Course.deleteMany({}),
      Plan.deleteMany({}), Settings.deleteMany({}), ActivityLog.deleteMany({}),
      Service.deleteMany({}),
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

  // ── Plans (official membership offerings — single source of truth) ──
  const OLD_DEMO_NAMES = ['Monthly Pass', 'Quarterly Pass', 'Half-Yearly Pass', 'Annual Pass', '2-Year Pass'];
  await Plan.deleteMany({ name: { $in: OLD_DEMO_NAMES } });

  const OFFICIAL_PLANS = [
    { name: '1 Month Membership', description: 'Perfect for beginners to start their yoga journey with essential studio access.', price: 1500, durationMonths: 1, pauseDays: 0, displayOrder: 1, benefits: ['Unlimited Yoga Classes', 'Community Support'], badge: '', isPopular: false, isRecommended: false },
    { name: '3 Month Membership', description: 'Build a consistent practice with added flexibility to pause when needed.', price: 4000, durationMonths: 3, pauseDays: 15, displayOrder: 2, benefits: ['Unlimited Yoga Classes', 'Community Support', 'Membership Pause up to 15 Days'], badge: 'Recommended', isPopular: false, isRecommended: true },
    { name: '6 Month Membership', description: 'Our most popular plan with premium content access and a free personal consultation.', price: 7000, durationMonths: 6, pauseDays: 30, displayOrder: 3, benefits: ['Unlimited Yoga Classes', 'Premium Content Access', 'Free 1 Personal Consultation', 'Membership Pause up to 30 Days'], badge: 'Most Popular', isPopular: true, isRecommended: false },
    { name: '12 Month Membership', description: 'The ultimate commitment to your wellness journey with maximum benefits.', price: 12000, durationMonths: 12, pauseDays: 60, displayOrder: 4, benefits: ['Unlimited Yoga Classes', 'Premium Content Access', 'Workshops Included', 'Free Personal Consultation', 'Free Diet Consultation', 'Membership Pause up to 60 Days'], badge: 'Best Value', isPopular: false, isRecommended: false },
  ];
  const plans = await Plan.create(OFFICIAL_PLANS);
  const planByMonths = Object.fromEntries(plans.map((p) => [p.durationMonths, p]));

  // ── Courses ──
  await Course.create([
    { title: '21-Day Detox Sadhana', duration: '3 Weeks', mode: 'Online', price: 4500, description: 'Cleanse and reset with guided daily practice.' },
    { title: '200hr Teacher Training', duration: '3 Months', mode: 'Hybrid', price: 42000, description: 'Yoga Alliance certified foundational TTC.' },
    { title: 'Weekend Yin Retreat', duration: '2 Days', mode: 'Studio', price: 3200, description: 'Deep restorative weekend immersion.' },
    { title: 'Pranayama Mastery', duration: '4 Weeks', mode: 'Online', price: 3800, description: 'Breath-work for energy and calm.' },
  ]);

  // ── Services (yoga class catalog) — these are overridden by seedDefaultServices() in server.js ──
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

  // ── Admin ──
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

  // ── Students ──
  const studentSeeds = [
    { name: 'Priya Sharma', email: 'priya@yoga.com', city: 'Jaipur', style: 'Vinyasa', level: 'Intermediate', months: 6 },
    { name: 'Rahul Verma', email: 'rahul@yoga.com', city: 'Delhi', style: 'Ashtanga', level: 'Advanced', months: 12 },
    { name: 'Anjali Mehta', email: 'anjali@yoga.com', city: 'Mumbai', style: 'Hatha', level: 'Beginner', months: 3 },
    { name: 'Vikram Singh', email: 'vikram@yoga.com', city: 'Pune', style: 'Yin', level: 'Intermediate', months: 1 },
    { name: 'Sneha Patel', email: 'sneha@yoga.com', city: 'Ahmedabad', style: 'Vinyasa', level: 'Beginner', months: 6 },
    { name: 'Arjun Nair', email: 'arjun@yoga.com', city: 'Bangalore', style: 'Power', level: 'Advanced', months: 0 },
  ];

  const consultationTopics = ['Posture alignment', 'Diet & nutrition', 'Injury recovery', 'Stress management', 'Breathing technique'];
  const doctors = ['Dr. Meera Iyer', 'Dr. Sanjay Gupta', 'Anita Rao (Senior Instructor)'];

  const students = [];
  for (const s of studentSeeds) {
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
      planMonths: s.months,
      progress: {
        flexibility: rint(40, 95), strength: rint(40, 95),
        breathing: rint(40, 95), meditation: rint(40, 95),
      },
      badges: ['Early Bird', 'Consistent'].slice(0, rint(0, 2)),
      lastLogin: daysAgo(rint(0, 5)),
    });
    students.push({ doc: student, seed: s });

    // ── Membership ──
    if (s.months > 0) {
      const plan = planByMonths[s.months] || planByMonths[1];
      const start = daysAgo(rint(10, 40));
      const expiry = new Date(start.getTime() + s.months * 30 * DAY);
      await Membership.create({
        user: student._id,
        planType: plan.name,
        planMonths: s.months,
        price: plan.price,
        status: expiry > now ? 'active' : 'expired',
        startDate: start,
        expiryDate: expiry,
        zoomAccess: expiry > now,
        benefits: plan.benefits,
        pauseDaysAllowed: PAUSE_RULES[s.months] ?? 0,
        history: [{ action: 'created', planMonths: s.months, at: start }],
      });
      await Payment.create({
        user: student._id, label: `${plan.name}`, amount: plan.price,
        status: 'paid', method: pick(['UPI', 'Card', 'Bank Transfer']), date: start,
      });
    }

    // ── Extra payments ──
    if (Math.random() > 0.5) {
      await Payment.create({
        user: student._id, label: 'Workshop: Sound Healing', amount: 1500,
        status: pick(['paid', 'pending']), method: 'UPI', date: daysAgo(rint(1, 20)),
      });
    }

    // ── Attendance (last ~28 days) ──
    const attendance = [];
    for (let d = 28; d >= 1; d--) {
      const day = daysAgo(d);
      if (day.getDay() === 0) continue; // studio closed Sundays
      const roll = Math.random();
      let status;
      if (roll < 0.6) status = 'present';
      else if (roll < 0.8) status = 'zoom';
      else if (roll < 0.92) status = 'absent';
      else continue; // no class logged
      day.setHours(0, 0, 0, 0);
      attendance.push({
        user: student._id, date: day, status,
        mode: status === 'zoom' ? 'online' : 'offline',
        classType: pick(['Hatha', 'Vinyasa', 'Pranayama', 'Meditation']),
      });
    }
    if (attendance.length) await Attendance.insertMany(attendance);

    // ── Consultations ──
    await Consultation.create({
      user: student._id, date: daysAhead(rint(2, 14)), doctor: pick(doctors),
      topic: pick(consultationTopics), status: 'upcoming', meetingLink: 'https://zoom.us/j/consult-' + rint(1000, 9999),
    });
    if (Math.random() > 0.4) {
      await Consultation.create({
        user: student._id, date: daysAgo(rint(5, 25)), doctor: pick(doctors),
        topic: pick(consultationTopics), status: 'completed', notes: 'Follow-up recommended in 3 weeks.',
      });
    }

    // ── Notifications ──
    const notifDocs = await Notification.create([
      { email: student.email || 'system', user: student._id, title: 'Class reminder', message: 'Your <strong>Morning Hatha</strong> class starts at 6 AM tomorrow.', type: 'reminder', read: false, channels: ['whatsapp', 'email'] },
      { email: student.email || 'system', user: student._id, title: 'Payment received', message: 'We received your membership payment. Thank you!', type: 'success', read: true, channels: ['email'] },
    ]);

    // Create NotificationRecipient for each notification so students see them in the dashboard
    await NotificationRecipient.insertMany(notifDocs.map((n) => ({
      notification: n._id,
      student: student._id,
      isRead: n.read,
      readAt: n.read ? new Date() : null,
      deliveredAt: n.createdAt || new Date(),
    })));

    // ── Referral ──
    const code = await generateUniqueCode(s.name);
    const joinedCount = rint(0, 3);
    await Referral.create({
      user: student._id,
      code,
      earned: joinedCount * 500,
      invited: Array.from({ length: rint(0, 4) }, (_, i) => ({ name: `Friend ${i + 1}`, email: `friend${i}_${code}@mail.com` })),
      joined: Array.from({ length: joinedCount }, (_, i) => ({ name: `Joined ${i + 1}`, reward: 500 })),
    });
    // Count actual unread recipients for accurate badge
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
    const date = daysAhead(i);
    upcoming.push({
      name: pick(classNames),
      time: `${pick(['6:00 AM', '7:30 AM', '5:30 PM', '6:30 PM'])}`,
      date, mode, trainer: pick(['Kapil Kesari', 'Anita Rao', 'Rohit Sen']),
      zoomUrl: mode === 'online' ? `https://zoom.us/j/class-${rint(1000, 9999)}` : '',
      batch: pick(batches)._id, status: 'upcoming',
      enrolledUsers: students.filter(() => Math.random() > 0.5).map((s) => s.doc._id),
    });
  }
  await ClassSession.insertMany(upcoming);

  const recordings = [];
  for (let i = 1; i <= 8; i++) {
    recordings.push({
      name: pick(classNames),
      time: '6:00 AM', date: daysAgo(i * 2), mode: 'online',
      trainer: pick(['Kapil Kesari', 'Anita Rao']),
      status: 'completed', recordingUrl: `https://recordings.somawellness.in/session-${rint(1000, 9999)}.mp4`,
    });
  }
  await ClassSession.insertMany(recordings);

  // ── Workshops ──
  const workshops = await Workshop.create([
    { name: 'Sound Healing Immersion', date: daysAhead(10), duration: '2 hours', price: 1500, instructor: 'Anita Rao', status: 'available', description: 'Tibetan bowls & deep relaxation.' },
    { name: 'Advanced Inversions', date: daysAhead(18), duration: '3 hours', price: 2500, instructor: 'Rohit Sen', status: 'available', description: 'Headstands, handstands & forearm balances.' },
    { name: 'Ayurveda for Daily Life', date: daysAhead(25), duration: '4 hours', price: 2000, instructor: 'Dr. Meera Iyer', status: 'available', description: 'Practical dosha-based routines.' },
    { name: 'Full Moon Meditation', date: daysAgo(8), duration: '90 min', price: 800, instructor: 'Kapil Kesari', status: 'completed' },
  ]);
  // Register a couple of students into the first workshop.
  workshops[0].registrations.push({ user: students[0].doc._id, paid: true }, { user: students[1].doc._id, paid: true });
  await workshops[0].save();

  // ── Downloads ──
  await Download.create([
    { name: 'Asana Blueprint Handbook', type: 'pdf', size: '4.2 MB', url: 'https://files.somawellness.in/asana-handbook.pdf', category: 'Guides', visibility: 'all', downloadCount: rint(20, 200) },
    { name: 'Pranayama Video Series', type: 'video', size: '320 MB', url: 'https://files.somawellness.in/pranayama-series.mp4', category: 'Video', visibility: 'all', downloadCount: rint(20, 200) },
    { name: 'Meditation Scripts Pack', type: 'guide', size: '1.1 MB', url: 'https://files.somawellness.in/meditation-scripts.pdf', category: 'Guides', visibility: 'all', downloadCount: rint(20, 200) },
    { name: 'Morning Chants (Audio)', type: 'audio', size: '48 MB', url: 'https://files.somawellness.in/morning-chants.mp3', category: 'Audio', visibility: 'plan', allowedPlans: ['Annual Pass'], downloadCount: rint(5, 60) },
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
    { name: 'Priya Sharma', email: 'priya@yoga.com', phone: '+91 9811111111', city: 'Jaipur', courseName: '21-Day Detox Sadhana', coursePrice: '4500', courseTime: '6:00 AM', paymentMethod: 'UPI', transactionId: 'TXN' + rint(100000, 999999), status: 'Confirmed' },
    { name: 'New Enquirer', email: 'enquirer@mail.com', phone: '+91 9822222222', city: 'Delhi', courseName: '200hr Teacher Training', coursePrice: '42000', courseTime: 'Flexible', paymentMethod: 'Bank Transfer', transactionId: '', status: 'Pending' },
    { name: 'Sneha Patel', email: 'sneha@yoga.com', phone: '+91 9833333333', city: 'Ahmedabad', courseName: 'Weekend Yin Retreat', coursePrice: '3200', courseTime: 'Sat-Sun', paymentMethod: 'Card', transactionId: 'TXN' + rint(100000, 999999), status: 'Confirmed' },
  ]);

  // ── Activity logs ──
  await ActivityLog.create([
    { action: 'Seeded database', performedBy: admin._id },
    { action: `Created ${students.length} students`, performedBy: admin._id },
  ]);

  console.log('✅ Seed complete.');
  console.log('────────────────────────────────────────');
  console.log('Admin login:    admin@yoga.com / Admin@123');
  console.log('Student login:  priya@yoga.com / Student@123 (and others)');
  console.log('Students:', students.map((s) => s.seed.email).join(', '));
  console.log('────────────────────────────────────────');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌ Seed failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
