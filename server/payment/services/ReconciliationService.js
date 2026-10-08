// ============================================================
// services/ReconciliationService.js — Safe, idempotent reconciliation.
// For pending/initiated payments: call GetTransactionStatus,
// capture / fail / keep-pending. Never expires blindly.
// ============================================================
import Payment from '../models/Payment.js';
import logger from '../../notification/logger.js';

const MODULE = 'Reconciliation';

export class ReconciliationService {
  constructor({ paymentService } = {}) {
    this.paymentService = paymentService || null;
  }

  _service() {
    if (this.paymentService) return this.paymentService;
    // Lazy to avoid circular imports at module load.
    return null;
  }

  async _getService() {
    if (this.paymentService) return this.paymentService;
    const { PaymentService } = await import('../PaymentService.js');
    this.paymentService = new PaymentService();
    return this.paymentService;
  }

  /**
   * Reconcile a single payment by id. Returns { action }.
   * Actions: captured | already_captured | marked_failed | still_pending |
   *          no_tracking_id | skipped_status | error
   */
  async reconcileOne(paymentId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) return { action: 'not_found' };
    if (payment.paymentStatus === 'captured') return { action: 'already_captured' };
    if (!['pending', 'initiated'].includes(payment.paymentStatus)) {
      return { action: 'skipped_status', status: payment.paymentStatus };
    }
    // Historical non-Pesapal payments cannot be reconciled via Pesapal.
    if (payment.payment_provider && !['pesapal'].includes(payment.payment_provider)) {
      return { action: 'skipped_status', status: payment.paymentStatus, reason: `provider ${payment.payment_provider} not reconcilable via Pesapal` };
    }
    const trackingId = payment.provider_checkout_id || payment.provider_order_id;
    if (!trackingId) return { action: 'no_tracking_id' };
    const svc = await this._getService();
    try {
      const result = await svc.verifyAndCapture({
        merchantReference: payment.merchant_reference,
        checkoutId: trackingId,
      });
      return { action: result.idempotent ? 'already_captured' : 'captured', invoiceNo: result.invoiceNo };
    } catch (err) {
      if (err.code === 'PROVIDER_PENDING') return { action: 'still_pending' };
      if (err.code === 'PROVIDER_FAILED' || err.code === 'PROVIDER_NOT_COMPLETED') {
        return { action: 'marked_failed', reason: err.message };
      }
      logger.error(MODULE, 'Reconcile error', { paymentId: String(paymentId), error: err.message });
      return { action: 'error', error: err.message };
    }
  }

  /**
   * Reconcile stale pending/initiated Pesapal payments older than minAgeMs.
   * Expires payments still pending beyond expiryMs (after provider check).
   */
  async reconcileStale({ minAgeMs = 5 * 60 * 1000, expiryMs = 60 * 60 * 1000, limit = 100 } = {}) {
    const cutoff = new Date(Date.now() - minAgeMs);
    const docs = await Payment.find({
      payment_provider: 'pesapal',
      paymentStatus: { $in: ['pending', 'initiated'] },
      createdAt: { $lt: cutoff },
    }).sort({ createdAt: 1 }).limit(limit).select('_id createdAt paymentStatus').lean();
    const summary = { checked: 0, captured: 0, failed: 0, pending: 0, expired: 0, errors: 0 };
    for (const d of docs) {
      summary.checked += 1;
      const ageMs = Date.now() - new Date(d.createdAt).getTime();
      const r = await this.reconcileOne(d._id);
      if (r.action === 'captured' || r.action === 'already_captured') summary.captured += 1;
      else if (r.action === 'marked_failed') summary.failed += 1;
      else if (r.action === 'still_pending') {
        summary.pending += 1;
        if (ageMs > expiryMs) {
          // Expire only AFTER provider confirmed still-pending.
          await Payment.findOneAndUpdate(
            { _id: d._id, paymentStatus: { $in: ['pending', 'initiated'] } },
            {
              $set: { paymentStatus: 'expired', expiredAt: new Date(), failure_reason: 'Payment window expired with no provider completion' },
              $push: { auditTrail: { action: 'auto_expired', to: 'expired', timestamp: new Date(), reason: 'Reconciliation expiry after provider still-pending' } },
            },
          );
          summary.expired += 1;
        }
      } else if (r.action === 'error') summary.errors += 1;
    }
    if (summary.checked > 0) {
      logger.info(MODULE, 'Reconciliation pass complete', summary);
    }
    return summary;
  }

  /** Admin report: mismatches + stale counts without mutating. */
  async report({ limit = 50 } = {}) {
    const [stalePending, missingTracking, mismatchCandidates] = await Promise.all([
      Payment.countDocuments({ payment_provider: 'pesapal', paymentStatus: { $in: ['pending', 'initiated'] } }),
      Payment.countDocuments({
        payment_provider: 'pesapal',
        paymentStatus: { $in: ['pending', 'initiated'] },
        provider_checkout_id: { $in: [null, ''] },
      }),
      Payment.find({
        paymentStatus: 'captured',
        provider_transaction_id: { $in: [null, ''] },
        payment_provider: 'pesapal',
      }).limit(limit).select('_id merchant_reference amount createdAt').lean(),
    ]);
    return {
      stalePending,
      missingTracking,
      capturedWithoutTransactionId: mismatchCandidates,
      generatedAt: new Date().toISOString(),
    };
  }
}

export default ReconciliationService;
