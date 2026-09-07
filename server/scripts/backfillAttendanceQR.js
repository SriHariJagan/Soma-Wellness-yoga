// ============================================================
// scripts/backfillAttendanceQR.js
// Backfill attendanceQrToken for all existing users
// who don't have one yet. Safe to run multiple times.
// ============================================================

import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import crypto from 'crypto';

const QR_TOKEN_PREFIX = 'SW-ATT-';

async function backfill() {
  await connectDB(process.env.MONGO_URI);

  console.log('Starting QR token backfill...');

  const usersWithoutToken = await User.find({ attendanceQrToken: { $exists: false } });
  console.log(`Found ${usersWithoutToken.length} users without QR tokens`);

  let updated = 0;
  for (const user of usersWithoutToken) {
    user.attendanceQrToken = `${QR_TOKEN_PREFIX}${crypto.randomUUID()}`;
    await user.save();
    updated++;
  }

  console.log(`Backfill complete. ${updated} users updated.`);

  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
