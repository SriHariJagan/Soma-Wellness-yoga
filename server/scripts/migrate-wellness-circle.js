// ============================================================
// scripts/migrate-wellness-circle.js
// COMPLETE cleanup migration: Bronze / Silver / Gold → SOMA Wellness Circle.
//
// What it does (idempotent, safe to re-run):
//  1. Upserts the single SOMA Wellness Circle plan (KES 36,500 / 12 mo).
//  2. EXPIRES (never deletes) any ACTIVE Bronze/Silver/Gold memberships,
//     so historical rows stay for audit but 0 remain active/selectable.
//  3. DELETES the Bronze/Silver/Gold Plan catalog documents, so no API,
//     admin list, cart, or checkout can ever select them again.
//     (Membership/Payment/Order history snapshots — planType, price, item
//     names — are preserved untouched.)
//  4. Removes abandoned cart items pointing at the deleted plans.
//  5. Removes coupon→plan links pointing at the deleted plans.
//  6. Pulls the retired names from Workshop/Download allowedPlans arrays.
//  7. Verifies: 0 such Plan docs, 0 active old memberships remain.
//
// Preserved by design: users, payments, orders, order items, bookings,
// services, inactive membership history, coupons themselves.
//
// Run:  node scripts/migrate-wellness-circle.js
// ============================================================
import '../loadEnv.js';
import mongoose from 'mongoose';
import '../models/Plan.js';
import '../models/Membership.js';
import '../models/CartItem.js';
import '../models/CouponProduct.js';
import '../models/Workshop.js';
import '../models/Download.js';
import { WELLNESS_CIRCLE } from '../config/wellnessCircle.js';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not set. Aborting.');
  process.exit(1);
}

const RETIRED_NAMES = ['Bronze', 'Silver', 'Gold'];
// Auxiliary catalog docs that must not exist as Plans (tiers/passes/DAILY
// live in the Services/Offerings catalog + somaCatalog.js config).
const AUXILIARY_NAMES = [
  'SOMA JUA', 'SOMA AMANI', 'SOMA UZIMA', 'SOMA FAMILY',
  '5-Class Pass', '10-Class Pass',
  'SOMA DAILY — Monthly', 'SOMA DAILY — Annual',
];
const REMOVE_NAMES = [...RETIRED_NAMES, ...AUXILIARY_NAMES];

async function run() {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');
  const Plan = mongoose.model('Plan');
  const Membership = mongoose.model('Membership');
  const CartItem = mongoose.model('CartItem');
  const CouponProduct = mongoose.model('CouponProduct');
  const Workshop = mongoose.model('Workshop');
  const Download = mongoose.model('Download');

  const before = await Plan.find({ name: { $in: REMOVE_NAMES } })
    .select('name price active visibility durationMonths').lean();
  console.log(`Legacy Plan docs before: ${before.length}`);
  for (const p of before) {
    console.log(`  - ${p.name} | KES ${p.price} | active=${p.active} | vis=${p.visibility} | ${p.durationMonths}mo | ${p._id}`);
  }
  const retiredIds = before.map((p) => p._id);
  const retiredIdStrings = retiredIds.map(String);

  const oldActiveCount = await Membership.countDocuments({
    $or: [{ planType: { $in: RETIRED_NAMES } }, { plan: { $in: retiredIds } }],
    status: 'active',
  });
  console.log(`Active legacy memberships before: ${oldActiveCount}`);

  // 1. Circle upsert (the one purchasable membership).
  const circle = await Plan.findOneAndUpdate(
    { name: WELLNESS_CIRCLE.NAME },
    {
      $set: {
        name: WELLNESS_CIRCLE.NAME,
        description: `${WELLNESS_CIRCLE.SUBTITLE} — ${WELLNESS_CIRCLE.TAGLINE}`,
        price: WELLNESS_CIRCLE.PRICE,
        currency: WELLNESS_CIRCLE.CURRENCY,
        durationMonths: WELLNESS_CIRCLE.DURATION_MONTHS,
        pauseDays: 0,
        displayOrder: 0,
        benefits: WELLNESS_CIRCLE.BENEFITS,
        badge: WELLNESS_CIRCLE.SUBTITLE,
        isPopular: true,
        isRecommended: true,
        active: true,
        visibility: 'public',
      },
    },
    { upsert: true, new: true },
  );
  console.log(`[UPSERT] ${circle.name} — KES ${circle.price} — ${circle.durationMonths}mo — ${circle._id}`);

  // 2. Expire active legacy memberships (rows preserved for audit).
  const expired = await Membership.updateMany(
    {
      $or: [{ planType: { $in: REMOVE_NAMES } }, { plan: { $in: retiredIds } }],
      status: 'active',
    },
    {
      $set: { status: 'expired', deactivated: true },
      $push: {
        history: {
          action: 'expired',
          note: 'Non-Circle plan retired — system cleanup to SOMA Wellness Circle',
          at: new Date(),
        },
      },
    },
  );
  console.log(`[EXPIRE] legacy memberships matched=${expired.matchedCount} modified=${expired.modifiedCount} (rows preserved)`);

  // 3. Delete the legacy Plan catalog docs (history lives in snapshots).
  const deleted = await Plan.deleteMany({ _id: { $in: retiredIds } });
  console.log(`[DELETE] legacy Plan docs deleted=${deleted.deletedCount}`);

  // 4. Abandoned cart items referencing deleted plans.
  const carts = await CartItem.deleteMany({ itemType: 'plan', itemId: { $in: retiredIdStrings } });
  console.log(`[CLEAN] abandoned cart items removed=${carts.deletedCount}`);

  // 5. Coupon→plan links referencing deleted plans (coupons themselves kept).
  const coupons = await CouponProduct.deleteMany({ productType: 'plan', productId: { $in: retiredIds } });
  console.log(`[CLEAN] coupon-plan links removed=${coupons.deletedCount}`);

  // 6. Workshop/Download access lists referencing removed plan names.
  const workshops = await Workshop.updateMany(
    { allowedPlans: { $in: REMOVE_NAMES } },
    { $pull: { allowedPlans: { $in: REMOVE_NAMES } } },
  );
  const downloads = await Download.updateMany(
    { allowedPlans: { $in: REMOVE_NAMES } },
    { $pull: { allowedPlans: { $in: REMOVE_NAMES } } },
  );
  console.log(`[CLEAN] workshops updated=${workshops.modifiedCount}, downloads updated=${downloads.modifiedCount}`);

  // 7. Verification.
  const planCheck = await Plan.countDocuments({ name: { $in: REMOVE_NAMES } });
  const activeCheck = await Membership.countDocuments({
    $or: [{ planType: { $in: REMOVE_NAMES } }, { plan: { $in: retiredIds } }],
    status: 'active',
  });
  const circleCheck = await Plan.findOne({ name: WELLNESS_CIRCLE.NAME, active: true }).lean();
  console.log(`VERIFY legacy Plan docs remaining: ${planCheck}`);
  console.log(`VERIFY active legacy memberships remaining: ${activeCheck}`);
  console.log(`VERIFY Circle live: ${circleCheck ? `yes — KES ${circleCheck.price}` : 'NO'}`);
  if (planCheck !== 0 || activeCheck !== 0 || !circleCheck || Number(circleCheck.price) !== WELLNESS_CIRCLE.PRICE) {
    throw new Error('Post-migration verification failed.');
  }
  console.log('Migration OK: legacy tiers fully removed from the active system; history preserved.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('Migration failed:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
