// Backfill country-of-residency fields WITHOUT overwriting historical data.
// - Only touches users where countryCode is missing/empty.
// - Never overwrites an existing value.
// - Optional inference: --infer-from-phone maps +254 → KE (opt-in, off by default).
// Usage:
//   node scripts/backfill-user-country.mjs [--infer-from-phone] [--dry-run]
import '../loadEnv.js';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const args = new Set(process.argv.slice(2));
const inferFromPhone = args.has('--infer-from-phone');
const dryRun = args.has('--dry-run');

function inferCountry(phone) {
  const p = String(phone || '').replace(/[\s\-()]/g, '');
  if (/^\+254|^254|^0[71]\d{8}$/.test(p)) return { country: 'Kenya', countryCode: 'KE' };
  return null;
}

await connectDB();
const missing = await User.find({ $or: [{ countryCode: '' }, { countryCode: null }, { countryCode: { $exists: false } }] }).select('_id email phone country countryCode').lean();
console.log(`Users missing countryCode: ${missing.length}`);

let inferred = 0;
let skipped = 0;
for (const u of missing) {
  const guess = inferFromPhone ? inferCountry(u.phone) : null;
  if (!guess) { skipped++; continue; }
  inferred++;
  if (dryRun) {
    console.log(`[dry-run] ${u.email} → ${guess.countryCode}`);
    continue;
  }
  await User.updateOne(
    { _id: u._id, $or: [{ countryCode: '' }, { countryCode: null }, { countryCode: { $exists: false } }] },
    { $set: { country: guess.country, countryCode: guess.countryCode } },
  );
}
console.log(JSON.stringify({ total: missing.length, inferred, skipped, dryRun }));
await mongoose.disconnect();
process.exit(0);
