// ============================================================
// paymentExpiryService.js — Provider-aware expiry + reconciliation.
// initiated without provider order → expire after threshold.
// pending/initiated with Pesapal tracking → reconcile via
// GetTransactionStatus FIRST; expire only if still pending.
// ============================================================
import { PaymentRepository } from '../payment/repository/PaymentRepository.js';
import logger from '../notification/logger.js';

const MODULE = 'PaymentExpiry';
const EXPIRY_MINUTES = parseInt(process.env.PAYMENT_EXPIRY_MINUTES || '30', 10);
const RECONCILE_INTERVAL_FALLBACK = parseInt(process.env.PAYMENT_RECONCILE_INTERVAL_MS || '300000', 10);

class PaymentExpiryService {
  constructor() {
    this.paymentRepo = new PaymentRepository();
    this.intervalId = null;
    this.reconcileId = null;
  }

  /** Start periodic checks (default: every 5 minutes). */
  start(intervalMs = 5 * 60 * 1000, reconcileMs = RECONCILE_INTERVAL_FALLBACK) {
    if (this.intervalId) return;
    logger.info(MODULE, `Starting payment expiry checker (every ${intervalMs / 1000}s, expiry: ${EXPIRY_MINUTES}m)`);
    // Immediate first pass on boot so stale pendings from before deploy
    // clear without waiting a full interval. Never blocks startup.
    this.check().catch(() => {});
    this.intervalId = setInterval(() => this.check(), intervalMs);
    // Reconciliation pass on a separate cadence (defaults to same 5 min).
    if (!this.reconcileId) {
      this.reconcileId = setInterval(() => this.reconcile(), reconcileMs);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.reconcileId) {
      clearInterval(this.reconcileId);
      this.reconcileId = null;
    }
  }

  /** Expire initiated intents that never reached the provider. */
  async check() {
    try {
      const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000);
      // Only intents WITHOUT a provider order can expire blindly.
      // Provider-submitted payments go through reconciliation instead.
      const result = await this.paymentRepo.expireUnsubmittedIntents(cutoff);
      if (result.modifiedCount > 0) {
        logger.info(MODULE, `Expired ${result.modifiedCount} stale initiated payments older than ${EXPIRY_MINUTES}m`);
      }
    } catch (err) {
      logger.error(MODULE, 'Payment expiry check failed', { error: err.message });
    }
    // Abandoned general checkouts: delete unpaid ORD-* pending >15 min,
    // heal paid-but-pending to completed. Runs on the same 5-min cadence.
    try {
      const { sweepExpiredGeneralOrders } = await import('./generalOrderCleanupService.js');
      const cleaned = await sweepExpiredGeneralOrders();
      const deleted = cleaned.filter((r) => r.deleted).length;
      const healed = cleaned.filter((r) => r.reason === 'paid_healed').length;
      if (deleted > 0 || healed > 0) {
        logger.info(MODULE, 'General order sweep finished', { deleted, healed, checked: cleaned.length });
      }
    } catch (err) {
      logger.error(MODULE, 'General order sweep failed', { error: err.message });
    }
  }

  /** Reconcile stale Pesapal pending payments via server-to-server status. */
  async reconcile() {
    try {
      const { ReconciliationService } = await import('../payment/services/ReconciliationService.js');
      const svc = new ReconciliationService();
      const summary = await svc.reconcileStale({});
      if (summary.checked > 0) {
        logger.info(MODULE, 'Reconciliation pass finished', summary);
      }
      return summary;
    } catch (err) {
      logger.error(MODULE, 'Reconciliation pass failed', { error: err.message });
      return { error: err.message };
    }
  }
}

export default new PaymentExpiryService();
