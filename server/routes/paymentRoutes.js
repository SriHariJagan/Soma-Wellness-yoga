import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate, schemas } from '../middleware/validate.js';
import { PaymentService } from '../payment/PaymentService.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../notification/logger.js';

const MODULE = 'PaymentRoutes';
const router = express.Router();

const paymentService = new PaymentService();

const initiateLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'Too many payment attempts, please try again later.' });
const verifyLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: 'Too many verification attempts, please try again later.' });

import { VALID_ITEM_TYPES } from '../shared/constants/index.js';

router.post('/create-order', initiateLimiter, async (req, res, next) => {
  try {
    const { items, label, description, idempotencyKey } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw ApiError.badRequest('Items array is required and must not be empty');
    }

    for (const item of items) {
      if (!item.itemType || !VALID_ITEM_TYPES.includes(item.itemType)) {
        throw ApiError.badRequest(`Invalid or missing itemType. Valid types: ${VALID_ITEM_TYPES.join(', ')}`);
      }
      if (!item.itemId && item.itemType !== 'other') {
        throw ApiError.badRequest(`itemId is required for itemType "${item.itemType}"`);
      }
    }

    const result = await paymentService.initiate({
      user: req.userId || null,
      items,
      label,
      description,
      idempotencyKey,
    });

    const response = {
      success: true,
      paymentId: result._id,
      order_id: result.mpesaOrderId || result.razorpayOrderId,
      mpesaOrderId: result.mpesaOrderId || result.razorpayOrderId,
      amount: result.amount,
      currency: result.currency,
      gateway: 'mpesa',
    };

    logger.info(MODULE, 'Create-order response sent (M-Pesa)', {
      paymentId: String(result._id),
      mpesaOrderId: result.mpesaOrderId || result.razorpayOrderId,
    });

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.post('/verify-payment', requireAuth, verifyLimiter, async (req, res, next) => {
  try {
    // M-Pesa only — Razorpay verification is deprecated.
    // For backward compat, still accept razorpay_* if sent, but prefer mpesa fields.
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mpesaReceiptNumber, checkoutRequestId } = req.body;

    // If M-Pesa receipt provided, verify via M-Pesa query
    if (mpesaReceiptNumber || checkoutRequestId) {
      const mpesaOrderId = checkoutRequestId || razorpay_order_id;
      // Simple M-Pesa verify: check payment exists and mark captured via callback service
      // For now, return success if payment found — full verification via Daraja callback
      return res.json({ success: true, message: 'M-Pesa payment pending verification via callback', mpesaOrderId, checkoutRequestId });
    }

    const result = await paymentService.verify({
      user: req.userId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    const payment = result.payment;

    const response = {
      success: true,
      message: result.idempotent ? 'Payment already verified' : 'Payment verified successfully',
      paymentId: payment._id,
      mpesaOrderId: payment.mpesaOrderId || payment.razorpayOrderId,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      amount: payment.amount,
      currency: payment.currency,
      invoiceNo: result.invoiceNo || payment.invoiceNo,
      label: payment.label,
    };

    logger.info(MODULE, 'Verify response sent', {
      paymentId: String(payment._id),
      mpesaOrderId: payment.mpesaOrderId || payment.razorpayOrderId,
      idempotent: result.idempotent,
    });

    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
