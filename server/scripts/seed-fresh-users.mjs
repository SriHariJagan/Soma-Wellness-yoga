// seed-fresh-users.mjs — Wipe users collection & seed 1 admin + 3 students + 3 receptions
// Run: node scripts/seed-fresh-users.mjs
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDB } from '../config/db.js';
import User from '../models/User.js';

async function hash(pw) {
  return bcrypt.hash(pw, await bcrypt.genSalt(12));
}

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI missing in .env');
  await connectDB(uri);

  console.log('🧹 Removing ALL existing users...');
  const del = await User.deleteMany({});
  console.log(`   Deleted ${del.deletedCount} user(s).`);

  const usersToCreate = [
    // ── ADMIN ──
    {
      name: 'Admin',
      email: 'admin@yoga.com',
      plainPassword: 'Admin@123',
      role: 'admin',
      status: 'active',
      phone: '+91 9000000001',
      city: 'Nairobi',
      style: 'Hatha',
      level: 'Master',
      permissions: [],
    },
    // ── STUDENTS / USERS ──
    {
      name: 'Ananya Sharma',
      email: 'user1@yoga.com',
      plainPassword: 'User@123',
      role: 'student',
      status: 'active',
      phone: '+91 9000000011',
      city: 'Nairobi',
      style: 'Hatha',
      level: 'Beginner',
      permissions: [],
    },
    {
      name: 'Rohan Mehta',
      email: 'user2@yoga.com',
      plainPassword: 'User@123',
      role: 'student',
      status: 'active',
      phone: '+91 9000000012',
      city: 'Nairobi',
      style: 'Vinyasa',
      level: 'Intermediate',
      permissions: [],
    },
    {
      name: 'Priya Nair',
      email: 'user3@yoga.com',
      plainPassword: 'User@123',
      role: 'student',
      status: 'active',
      phone: '+91 9000000013',
      city: 'Nairobi',
      style: 'Ashtanga',
      level: 'Advanced',
      permissions: [],
    },
    // ── RECEPTION 1: Bookings & Front-desk ──
    {
      name: 'Reception Bookings',
      email: 'reception1@yoga.com',
      plainPassword: 'Reception@123',
      role: 'reception',
      status: 'active',
      phone: '+91 9000000021',
      city: 'Nairobi',
      style: 'Hatha',
      level: 'Beginner',
      permissions: [
        'bookings.view',
        'bookings.create',
        'bookings.edit',
        'bookings.cancel',
        'customers.view',
        'customers.create',
      ],
    },
    // ── RECEPTION 2: Classes & Attendance ──
    {
      name: 'Reception Attendance',
      email: 'reception2@yoga.com',
      plainPassword: 'Reception@123',
      role: 'reception',
      status: 'active',
      phone: '+91 9000000022',
      city: 'Nairobi',
      style: 'Hatha',
      level: 'Beginner',
      permissions: [
        'classes.view',
        'classes.attendance',
        'classes.attendance.create',
        'classes.attendance.edit',
        'attendance.view',
        'attendance.create',
        'attendance.edit',
      ],
    },
    // ── RECEPTION 3: Customers & Courses ──
    {
      name: 'Reception Support',
      email: 'reception3@yoga.com',
      plainPassword: 'Reception@123',
      role: 'reception',
      status: 'active',
      phone: '+91 9000000023',
      city: 'Nairobi',
      style: 'Hatha',
      level: 'Beginner',
      permissions: [
        'customers.view',
        'customers.edit',
        'users.view',
        'courses.view',
        'courses.registration',
        'courses.booking',
        'sections.view',
        'sections.booking',
      ],
    },
  ];

  const created = [];
  for (const u of usersToCreate) {
    const doc = await User.create({
      name: u.name,
      email: u.email.toLowerCase(),
      password: await hash(u.plainPassword),
      role: u.role,
      status: u.status,
      phone: u.phone,
      city: u.city,
      style: u.style,
      level: u.level,
      permissions: u.permissions,
      emailVerified: true,
    });
    created.push({ ...u, _id: doc._id });
    console.log(`✅ Created [${u.role}] ${u.email} with ${u.permissions.length} permission(s)`);
  }

  console.log('');
  console.log('════════ SEED COMPLETE ════════');
  for (const c of created) {
    console.log(`${c.role.toUpperCase()} | ${c.email} | ${c.plainPassword} | perms: [${c.permissions.join(', ') || '—'}]`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌ Seed failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
