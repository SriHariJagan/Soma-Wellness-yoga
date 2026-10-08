// ============================================================
// scripts/backfill-payments-provider.js — Idempotent provider-neutral
// backfill for the payments collection. Additive only: never deletes
// historical data, never rewrites amounts/invoices.
// Usage: node server/scripts/backfill-payments-provider.js [--dry-run]
// ============================================================
import '../loadEnv.js';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';

const DRY = process.argv.includes('--dry-run');

function providerFor(doc) {
  if (doc.payment_provider && doc.payment_provider !== 'pesapal') return null; // already classified (unless default)
  const g = String(doc.gateway || '');
  if (g === 'mpesa') return 'mpesa';
  if (g === 'razorpay') return 'razorpay';
  if (g === 'manual') return 'manual';
  if (g === 'offline') return 'offline';
  return null;
}

async function run() {
  await connectDB();
  const Payment = (await import('../payment/models/Payment.js')).default;
  const cursor = Payment.find({}).lean(false);
  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for await (const doc of cursor) {
    scanned += 1;
    try {
      const patch = {};
      // Classify historical provider once (do not overwrite explicit values
      // except the stale schema default 'pesapal' on legacy docs).
      const hasExplicitProvider = doc.payment_provider && !doc._isNew;
      const legacyGateway = String(doc.gateway || '');
      const looksLegacy = ['mpesa', 'razorpay', 'manual', 'offline'].includes(legacyGateway);
      if ((!doc.payment_provider || doc.payment_provider === 'pesapal') && looksLegacy) {
        // Only backfill when the doc predates provider fields (no merchant ref yet)
        if (!doc.merchant_reference) {
          patch.payment_provider = legacyGateway === 'razorpay' ? 'razorpay' : legacyGateway;
          if (!doc.payment_method) patch.payment_method = legacyGateway === 'offline' ? 'offline' : legacyGateway;
        }
      }
      if (!doc.merchant_reference) {
        // Historical merchant reference: stable, derived from _id.
        patch.merchant_reference = `PAY-LEGACY-${String(doc._id).slice(-12).toUpperCase()}`;
      }
      if (!doc.provider_order_id && doc.razorpayOrderId) {
        patch.provider_order_id = doc.razorpayOrderId;
      }
      if (!doc.provider_checkout_id) {
        const trail = Array.isArray(doc.auditTrail) ? doc.auditTrail : [];
        const init = trail.find((a) => a && a.checkoutRequestId);
        if (init?.checkoutRequestId) patch.provider_checkout_id = init.checkoutRequestId;
        else if (doc.razorpayOrderId) patch.provider_checkout_id = doc.razorpayOrderId;
      }
      if (!doc.provider_transaction_id) {
        if (doc.razorpayPaymentId) patch.provider_transaction_id = String(doc.razorpayPaymentId);
        else if (doc.mpesaReceiptNumber) patch.provider_transaction_id = String(doc.mpesaReceiptNumber);
      }
      if (Object.keys(patch).length === 0) {
        skipped += 1;
        continue;
      }
      if (DRY) {
        updated += 1;
        continue;
      }
      await Payment.updateOne({ _id: doc._id }, { $set: patch });
      updated += 1;
    } catch (err) {
      // Unique collisions (e.g. duplicate legacy refs) are recorded, not fatal.
      errors.push({ id: String(doc._id), error: err.message });
    }
  }

  console.log(JSON.stringify({ scanned, updated, skipped, errorCount: errors.length, dryRun: DRY }));
  if (errors.length > 0) {
    console.log(JSON.stringify({ errors: errors.slice(0, 20) }));
  }
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(`Backfill failed: ${err.message}`);
  process.exit(1);
});
