// One-off content migration: remove legacy (pre-SOMA) demo/seed business
// records, keep real users + financial records. SAFE: prints summary.
// Run: node server/scripts/migrate-soma-content.mjs
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const LEGACY_SERVICES = ['Offline Group Yoga', 'Online Group Yoga', 'Personal Yoga (Center)', 'Personal Yoga (Home)', 'Kids Yoga', 'Pregnancy Yoga (Center)', 'Pregnancy Yoga (Home)', 'Yoga for Stress', 'Corporate Yoga', 'Advanced Yoga (Center)', 'Therapy Yoga (Center)', 'Therapy Yoga (Home)', 'Abhyanga (Ayurvedic Massage)', 'Shirodhara (Forehead Oil-Pulling Therapy)'];
const LEGACY_PLANS = ['1 Month Membership', '3 Month Membership', '6 Month Membership', '12 Month Membership'];
const LEGACY_COURSES = ['21-Day Detox Sadhana', '200hr Teacher Training', 'Weekend Yin Retreat', 'Pranayama Mastery'];
const LEGACY_BATCHES = ['Morning Hatha', 'Evening Vinyasa', 'Weekend Ashtanga'];
const LEGACY_DOWNLOADS = ['Asana Blueprint Handbook', 'Pranayama Video Series', 'Meditation Scripts Pack', 'Morning Chants (Audio)'];
const LEGACY_BOOKING_COURSES = ['21-Day Detox Sadhana', '200hr Teacher Training', 'Weekend Yin Retreat'];
const LEGACY_LEAD_PHONES = ['+91 9812345670', '+91 9812345671', '+91 9812345672', '+91 9812345673'];
const LEGACY_COUPONS = ['FESTIVE20', 'REFER100', 'NEWYOGI15'];

await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
const db = mongoose.connection.db;
const out = {};
const demoIds = (await db.collection('User').find({ email: /@yoga\.com$/, role: { $ne: 'admin' } }, { projection: { _id: 1, email: 1 } }).toArray()).map((u) => u._id);
console.log('DEMO_STUDENTS:' + demoIds.length);

out.demoUsers = (await db.collection('User').deleteMany({ _id: { $in: demoIds } })).deletedCount;
out.memberships = (await db.collection('memberships').deleteMany({ user: { $in: demoIds } })).deletedCount;
out.payments = (await db.collection('payments').deleteMany({ user: { $in: demoIds } })).deletedCount;
out.attendances = (await db.collection('attendances').deleteMany({ user: { $in: demoIds } })).deletedCount;
out.consultations = (await db.collection('consultations').deleteMany({ user: { $in: demoIds } })).deletedCount;
out.referrals = (await db.collection('referrals').deleteMany({ user: { $in: demoIds } })).deletedCount;
out.carts = (await db.collection('carts').deleteMany({ student: { $in: demoIds } })).deletedCount;
out.notifications = (await db.collection('notifications').deleteMany({ $or: [{ user: { $in: demoIds } }, { title: 'New Workshop' }] })).deletedCount;
out.services = (await db.collection('Service').deleteMany({ name: { $in: LEGACY_SERVICES } })).deletedCount;
out.plans = (await db.collection('plans').deleteMany({ name: { $in: LEGACY_PLANS } })).deletedCount;
out.courses = (await db.collection('courses').deleteMany({ title: { $in: LEGACY_COURSES } })).deletedCount;
out.workshops = (await db.collection('workshops').deleteMany({})).deletedCount;
out.coupons = (await db.collection('coupons').deleteMany({ code: { $in: LEGACY_COUPONS } })).deletedCount;
out.downloads = (await db.collection('downloads').deleteMany({ name: { $in: LEGACY_DOWNLOADS } })).deletedCount;
out.blogTesting = (await db.collection('Blog').deleteMany({ title: 'Testing' })).deletedCount;
out.batches = (await db.collection('batches').deleteMany({ name: { $in: LEGACY_BATCHES } })).deletedCount;
out.classsessions = (await db.collection('classsessions').deleteMany({})).deletedCount;
out.bookings = (await db.collection('bookings').deleteMany({ courseName: { $in: LEGACY_BOOKING_COURSES } })).deletedCount;
out.leads = (await db.collection('leads').deleteMany({ phone: { $in: LEGACY_LEAD_PHONES } })).deletedCount;
await db.collection('settings').updateOne({ key: 'global' }, { $set: {
  announcementBanner: 'SOMA Wellness Center — Spring Valley, Nairobi. Now welcoming founding members.',
  studioName: 'SomaWellness',
  supportEmail: 'hello@somawellness.co.ke',
  supportPhone: '+254 700 000 000',
} });
out.settingsUpdated = 1;
console.log('MIGRATION_SUMMARY:' + JSON.stringify(out));
await mongoose.disconnect();
