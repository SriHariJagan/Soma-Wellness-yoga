// fix-seeded-user-contacts.mjs — repair test accounts created by the OLD
// seed-fresh-users.mjs (which used +91 India numbers and set no country).
//
// Scope is deliberately narrow so real users are NEVER touched:
// - Only users with @yoga.com emails (the known fixture accounts), AND
// - Only where the phone matches the old fixture pattern (+91 / 90000000xx).
// - Country is only filled in when missing/empty — an explicitly set code
//   is never overwritten.
//
// The phone mapping preserves each account's unique suffix:
//   +91 9000000001 → +254700000001  (admin)
//   +91 9000000011 → +254700000011  (user1) …etc.
//
// Usage:
//   node scripts/fix-seeded-user-contacts.mjs            # dry-run (default)
//   node scripts/fix-seeded-user-contacts.mjs --apply    # write changes
import '../loadEnv.js';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');

// Old fixture pattern: optional +91 prefix followed by 90000000 + 2 digits.
const FIXTURE_RE = /^(?:\+?91[\s-]*)?90000000(\d{2})$/;

function kenyaReplacement(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  const m = digits.match(/90000000(\d{2})$/);
  if (!m) return null;
  return `+2547000000${m[1]}`;
}

await connectDB();

const candidates = await User.find({ email: /@yoga\.com$/i })
  .select('_id email phone city country countryCode')
  .lean();
console.log(`@yoga.com accounts found: ${candidates.length}`);

const plan = [];
const seenPhones = new Set(
  (await User.find({}).select('phone').lean()).map((u) => String(u.phone || '')),
);

for (const u of candidates) {
  const newPhone = kenyaReplacement(u.phone);
  if (!newPhone) continue; // not an old fixture number — leave alone
  if (seenPhones.has(newPhone)) {
    console.log(`SKIP ${u.email}: target ${newPhone} already in use`);
    continue;
  }
  const set = { phone: newPhone };
  if (!u.countryCode) {
    set.country = u.country || 'Kenya';
    set.countryCode = 'KE';
  }
  plan.push({ email: u.email, from: u.phone, to: newPhone, set });
  seenPhones.add(newPhone);
  seenPhones.delete(String(u.phone || ''));
}

if (plan.length === 0) {
  console.log('Nothing to fix — no old fixture (+91) test accounts found.');
} else {
  for (const p of plan) {
    console.log(`${apply ? '[apply]' : '[dry-run]'} ${p.email}: ${p.from} → ${p.to}${p.set.countryCode ? ' + country KE' : ''}`);
  }
  if (apply) {
    for (const p of plan) {
      await User.updateOne({ email: p.email }, { $set: p.set });
    }
    console.log(`Updated ${plan.length} account(s).`);
  } else {
    console.log(`Dry-run only — re-run with --apply to write ${plan.length} change(s).`);
  }
}

await mongoose.disconnect();
process.exit(0);
