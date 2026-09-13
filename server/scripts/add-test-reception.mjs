#!/usr/bin/env node
/**
 * Add a test reception staff user to MongoDB.
 * Usage: node scripts/add-test-reception.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const envPath = path.join(root, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  const v = t.slice(eq + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }

await mongoose.connect(MONGO_URI);
console.log('Connected to MongoDB');

const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  password: String,
  role: String,
  status: String,
  permissions: [String],
}, { timestamps: true, collection: 'users' }));

const email = 'reception@somawellness.co.ke';
const existing = await User.findOne({ email });
if (existing) {
  console.log(`User ${email} already exists (role: ${existing.role}, status: ${existing.status})`);
  await mongoose.disconnect();
  process.exit(0);
}

const rawPassword = 'Reception123!';
const hashed = await bcrypt.hash(rawPassword, 12);

const user = await User.create({
  name: 'Test Reception',
  email,
  phone: '+254 700 000 001',
  password: hashed,
  role: 'reception',
  status: 'active',
  permissions: [
    'customers.view', 'customers.create', 'customers.edit',
    'bookings.view', 'bookings.create',
    'attendance.view', 'attendance.create',
    'classes.view', 'classes.attendance',
    'sections.view',
  ],
});

console.log(`\nTest reception user created:`);
console.log(`  Email:    ${email}`);
console.log(`  Password: ${rawPassword}`);
console.log(`  Role:     reception`);
console.log(`  Status:   active`);
console.log(`  Perms:    ${user.permissions.length} permissions`);

await mongoose.disconnect();
console.log('\nDone.');
