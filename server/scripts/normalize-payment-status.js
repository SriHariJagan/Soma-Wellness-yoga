// ============================================================
// scripts/normalize-payment-status.js
//
// DEF-005: a small number of legacy Payment rows were written before
// `paymentStatus` became a required enum, so they hold null. Application
// reads already normalize these in memory (normalizePaymentStatus in
// payment/PaymentService.js), which is the safe, backward-compatible fix.
//
// This script is the OPTIONAL, APPROVED path for persisting that same
// derivation. It is deliberately conservative:
//
//   * dry-run by DEFAULT - nothing is written unless --apply is passed;
//   * idempotent - only rows whose current status is null/missing are touched,
//     so re-running is a no-op;
//   * derives the status ONLY from fields that history actually populated
//     (never guesses from the label or amount);
//   * every candidate is printed with the evidence used, so a human can
//     review before applying.
//
// Usage (review first):
//   node scripts/normalize-payment-status.js
//   node scripts/normalize-payment-status.js --apply
//   node scripts/normalize-payment-status.js --apply --json
//   node scripts/normalize-payment-status.js --id <paymentId> --apply
//
// Requires explicit operator authorization before --apply.
// ============================================================
import '../loadEnv.js';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Payment from '../payment/models/Payment.js';
import { normalizePaymentStatus } from '../payment/PaymentService.js';
import logger from '../notification/logger.js';

const APPLY = process.argv.includes('--apply');
const AS_JSON = process.argv.includes('--json');
const idIndex = process.argv.indexOf('--id');
const ONLY_ID = idIndex !== -1 ? process.argv[idIndex + 1] : null;

function evidenceFor(payment) {
  const ev = [];
  if (payment.refundedAt) ev.push(`refundedAt=${new Date(payment.refundedAt).toISOString()}`);
  if (payment.refunds?.some((r) => r?.status === 'processed')) ev.push('processed refund entry');
  if (payment.capturedAt) ev.push(`capturedAt=${new Date(payment.capturedAt).toISOString()}`);
  if (payment.invoiceNo) ev.push(`invoiceNo=${payment.invoiceNo}`);
  if (payment.expiredAt) ev.push(`expiredAt=${new Date(payment.expiredAt).toISOString()}`);
  if (payment.failedAt) ev.push(`failedAt=${new Date(payment.failedAt).toISOString()}`);
  if (payment.failure_reason) ev.push(`failure_reason="${payment.failure_reason}"`);
  if (payment.provider_checkout_id) ev.push(`provider_checkout_id=${payment.provider_checkout_id}`);
  if (payment.provider_order_id) ev.push(`provider_order_id=${payment.provider_order_id}`);
  if (ev.length === 0) ev.push('NO EVIDENCE -> defaults to "initiated" (no money movement implied)');
  return ev;
}

async function main() {
  await connectDB();

  const filter = { paymentStatus: null };
  if (ONLY_ID) filter._id = ONLY_ID;

  const candidates = await Payment.find(filter).lean();
  const log = (...a) => { if (!AS_JSON) console.log(...a); };

  log(`Found ${candidates.length} payment(s) with a null paymentStatus.`);
  log(`Mode: ${APPLY ? 'APPLY (writes)' : 'DRY RUN (no writes)'}\n`);

  const plan = [];
  for (const doc of candidates) {
    const derived = normalizePaymentStatus(doc);
    plan.push({
      paymentId: String(doc._id),
      merchantReference: doc.merchant_reference || null,
      amount: doc.amount,
      gateway: doc.gateway,
      user: doc.user ? String(doc.user) : null,
      createdAt: doc.createdAt,
      derivedStatus: derived,
      evidence: evidenceFor(doc),
    });
  }

  if (AS_JSON) {
    console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', plan }, null, 2));
  } else {
    for (const row of plan) {
      log(`─ ${row.paymentId}`);
      log(`   merchant_reference : ${row.merchantReference}`);
      log(`   amount / gateway   : ${row.amount} / ${row.gateway}`);
      log(`   derived status     : ${row.derivedStatus}`);
      log(`   evidence           : ${row.evidence.join('; ')}`);
      log('');
    }
  }

  if (!APPLY) {
    log('Dry run only. Re-run with --apply to persist these statuses.');
    return;
  }
  if (plan.some((r) => r.derivedStatus === 'initiated' && r.evidence[0].startsWith('NO EVIDENCE'))) {
    log('REFUSING to apply: at least one row has no evidence of money movement.');
    log('Review those manually, or run with --id <paymentId> to handle them individually.');
    process.exitCode = 2;
    return;
  }

  // Idempotent write: only null-status rows are matched again.
  let modified = 0;
  for (const row of plan) {
    const res = await Payment.updateOne(
      { _id: row.paymentId, paymentStatus: null },
      {
        $set: { paymentStatus: row.derivedStatus },
        $push: {
          auditTrail: {
            action: 'normalize_payment_status',
            from: null,
            to: row.derivedStatus,
            reason: 'DEF-005 legacy null paymentStatus backfill',
            timestamp: new Date(),
            metadata: { evidence: row.evidence },
          },
        },
      },
    );
    modified += res.modifiedCount || 0;
  }
  log(`Applied. ${modified} payment(s) updated.`);
}

main()
  .then(async () => { await mongoose.disconnect(); process.exit(process.exitCode || 0); })
  .catch(async (err) => {
    logger.error('normalize-payment-status', 'Script failed', { error: err.message });
    console.error(err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });