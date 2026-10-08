// ============================================================
// routes/paymentAdminRoutes.js — Admin payment ops (Pesapal).
// ============================================================
import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { RefundService } from '../payment/services/RefundService.js';
import { ReconciliationService } from '../payment/services/ReconciliationService.js';
import { PaymentRepository } from '../payment/repository/PaymentRepository.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../notification/logger.js';

const MODULE = 'PaymentAdminRoutes';
const router = express.Router();
router.use(requireAuth, requireAdmin);

const refundService = new RefundService();
const reconcileService = new ReconciliationService();
const paymentRepo = new PaymentRepository();

const refundLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'Too many refund attempts, please try again later.' });
const reconcileLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: 'Too many reconciliation runs.' });

// ── POST /api/admin/payments/:id/refund ─────────────────────────
router.post('/:id/refund', refundLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    let { amount, reason, idempotencyKey, manual } = req.body || {};

    if (!id) {
      throw ApiError.badRequest('Payment ID is required');
    }

    if (amount != null) {
      amount = Math.round(Number(amount) * 100);
      if (!Number.isFinite(amount) || amount < 100) {
        throw ApiError.badRequest('Minimum refund amount is KES 1.00');
      }
    }

    const result = await refundService.processRefund({
      paymentId: id,
      adminUserId: req.userId,
      amount,
      reason: reason || '',
      idempotencyKey,
      manual: manual === true,
    });

    logger.info(MODULE, 'Refund processed by admin', {
      paymentId: id,
      adminId: String(req.userId),
      amount: result.refund.amount,
      idempotent: result.idempotent,
    });

    res.json({
      success: true,
      message: result.idempotent ? 'Refund already processed' : result.refund.message || 'Refund initiated successfully',
      refund: result.refund,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/payments/:id/refund/confirm ─────────────────
router.post('/:id/refund/confirm', refundLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { refundId } = req.body || {};
    if (!refundId) throw ApiError.badRequest('refundId is required');
    const result = await refundService.confirmRefundSettled({
      paymentId: id,
      adminUserId: req.userId,
      refundId,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/payments/:id ─────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const payment = await paymentRepo.findById(req.params.id);
    if (!payment) throw ApiError.notFound('Payment not found');
    res.json({ success: true, payment });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/payments/reconcile ──────────────────────────
router.post('/reconcile', reconcileLimiter, async (req, res, next) => {
  try {
    const { paymentId, limit } = req.body || {};
    if (paymentId) {
      const r = await reconcileService.reconcileOne(paymentId);
      return res.json({ success: true, result: r });
    }
    const summary = await reconcileService.reconcileStale({ limit: Math.min(Number(limit) || 100, 500) });
    res.json({ success: true, summary });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/payments/reconcile/report ────────────────────
router.get('/reconcile/report', async (req, res, next) => {
  try {
    const report = await reconcileService.report({});
    res.json({ success: true, report });
  } catch (err) {
    next(err);
  }
});

export default router;
