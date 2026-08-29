// ============================================================
// paymentExpiryService.js — Auto-expires stale pending payments
// Runs periodically to clean up initiated payments that were
// never completed (e.g. user abandoned STK Push)
// ============================================================
import { PaymentRepository } from '../payment/repository/PaymentRepository.js';
import logger from '../notification/logger.js';

const MODULE = "PaymentExpiry";
const EXPIRY_MINUTES = parseInt(process.env.PAYMENT_EXPIRY_MINUTES || '30', 10);

class PaymentExpiryService {
  constructor() {
    this.paymentRepo = new PaymentRepository();
    this.intervalId = null;
  }

  /** Start the periodic expiry check (default: every 5 minutes) */
  start(intervalMs = 5 * 60 * 1000) {
    if (this.intervalId) return;
    logger.info(MODULE, `Starting payment expiry checker (every ${intervalMs / 1000}s, expiry: ${EXPIRY_MINUTES}m)`);
    this.intervalId = setInterval(() => this.check(), intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** Expire payments that have been in 'initiated' status too long */
  async check() {
    try {
      const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000);
      const result = await this.paymentRepo.expireStalePayments(cutoff);
      if (result.modifiedCount > 0) {
        logger.info(MODULE, `Expired ${result.modifiedCount} stale payments older than ${EXPIRY_MINUTES}m`);
      }
    } catch (err) {
      logger.error(MODULE, 'Payment expiry check failed', { error: err.message });
    }
  }
}

export default new PaymentExpiryService();
