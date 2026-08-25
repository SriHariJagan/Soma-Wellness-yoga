import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { RefundService } from '../payment/services/RefundService.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../notification/logger.js';

const MODULE = 'PaymentAdminRoutes';
const router = express.Router();
router.use(requireAuth, requireAdmin);

const refundService = new RefundService();

const refundLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'Too many refund attempts, please try again later.' });

router.post('/:id/refund', refundLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    let { amount, reason, idempotencyKey } = req.body;

    if (!id) {
      throw ApiError.badRequest('Payment ID is required');
    }

    if (amount != null) {
      amount = Math.round(amount * 100);
      if (amount < 100) {
        throw ApiError.badRequest('Minimum refund amount is ₹1 (100 paise)');
      }
    }

    const result = await refundService.processRefund({
      paymentId: id,
      adminUserId: req.userId,
      amount,
      reason: reason || '',
      idempotencyKey,
    });

    logger.info(MODULE, 'Refund processed by admin', {
      paymentId: id,
      adminId: String(req.userId),
      amount: result.refund.amount,
      idempotent: result.idempotent,
    });

    res.json({
      success: true,
      message: result.idempotent ? 'Refund already processed' : 'Refund initiated successfully',
      refund: result.refund,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
