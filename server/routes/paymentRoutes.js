// ============================================================
// routes/paymentRoutes.js — Provider-neutral payment API (Pesapal).
// Canonical:
//   POST /api/payments/initiate            (server-priced → redirectUrl)
//   GET  /api/payments/:merchantReference/status
// Legacy compat (do not extend):
//   POST /api/create-order, POST /api/verify-payment
// ============================================================
import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate, schemas } from '../middleware/validate.js';
import { PaymentService } from '../payment/PaymentService.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../notification/logger.js';

const MODULE = 'PaymentRoutes';
const router = express.Router();

const paymentService = new PaymentService();

const initiateLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'Too many payment attempts, please try again later.' });
const statusLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Too many status checks, please try again later.' });

import { VALID_ITEM_TYPES } from '../shared/constants/index.js';

// ── Canonical initiate ─────────────────────────────────────────
router.post('/payments/initiate', optionalAuth, initiateLimiter, validate(schemas.pesapalInitiate), async (req, res, next) => {
  try {
    const { items, label, description, idempotencyKey, customer, paymentId, callbackUrl, cancellationUrl } = req.body;

    if (paymentId) {
      const result = await paymentService.createProviderOrder({
        paymentId,
        user: req.userId || null,
        customer: customer || {},
        callbackUrl,
        cancellationUrl,
      });
      return res.json({
        success: true,
        paymentId: result.payment._id,
        merchantReference: result.merchantReference,
        orderTrackingId: result.orderTrackingId,
        redirectUrl: result.redirectUrl,
        amount: result.payment.amount,
        currency: result.payment.currency,
        idempotent: !!result.idempotent,
      });
    }

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
      customer: customer || {},
      callbackUrl,
      cancellationUrl,
    });

    logger.info(MODULE, 'Initiate response sent (Pesapal)', {
      paymentId: String(result.payment._id),
      merchantReference: result.merchantReference,
    });

    res.json({
      success: true,
      paymentId: result.payment._id,
      merchantReference: result.merchantReference,
      orderTrackingId: result.orderTrackingId,
      redirectUrl: result.redirectUrl,
      amount: result.payment.amount,
      currency: result.payment.currency,
      idempotent: !!result.idempotent,
    });
  } catch (err) {
    next(err);
  }
});

// ── Canonical status (owner-scoped; opportunistically verifies) ──
router.get('/payments/:merchantReference/status', optionalAuth, statusLimiter, async (req, res, next) => {
  try {
    const { merchantReference } = req.params;
    const result = await paymentService.getStatus({
      merchantReference,
      user: req.userId || null,
    });
    const p = result.payment;
    res.json({
      success: true,
      paymentId: p._id,
      merchantReference: p.merchant_reference,
      orderTrackingId: p.provider_checkout_id || p.provider_order_id || null,
      paymentStatus: p.paymentStatus,
      providerStatus: p.provider_status || null,
      amount: p.amount,
      currency: p.currency,
      invoiceNo: p.invoiceNo || null,
      failureReason: p.failure_reason || null,
      refreshed: !!result.refreshed,
      pending: !!result.pending,
    });
  } catch (err) {
    next(err);
  }
});

// ── Legacy compat: POST /api/create-order → Pesapal initiate ────
router.post('/create-order', initiateLimiter, validate(schemas.mpesaCreateOrder), async (req, res, next) => {
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
      customer: {},
    });

    res.json({
      success: true,
      paymentId: result.payment._id,
      merchantReference: result.merchantReference,
      orderTrackingId: result.orderTrackingId,
      redirectUrl: result.redirectUrl,
      // legacy aliases
      order_id: result.orderTrackingId,
      amount: result.payment.amount,
      currency: result.payment.currency,
      gateway: 'pesapal',
    });
  } catch (err) {
    next(err);
  }
});

// ── Legacy compat: POST /api/verify-payment ─────────────────────
// M-Pesa/Razorpay verification removed. If a merchant reference or
// tracking id is supplied, verify server-to-server via Pesapal.
router.post('/verify-payment', requireAuth, statusLimiter, async (req, res, next) => {
  try {
    const {
      merchantReference, merchant_reference,
      orderTrackingId, order_tracking_id, OrderTrackingId,
      checkoutRequestId, mpesaReceiptNumber,
    } = req.body || {};
    const ref = merchantReference || merchant_reference || null;
    const track = orderTrackingId || order_tracking_id || OrderTrackingId || checkoutRequestId || null;
    if (mpesaReceiptNumber && !ref && !track) {
      throw ApiError.badRequest('Legacy M-Pesa verification is removed. Provide merchantReference or orderTrackingId.');
    }
    if (!ref && !track) {
      throw ApiError.badRequest('Provide merchantReference or orderTrackingId.');
    }
    const result = await paymentService.verifyAndCapture({
      merchantReference: ref,
      checkoutId: track,
      user: req.userId,
    });
    const payment = result.payment;
    res.json({
      success: true,
      message: result.idempotent ? 'Payment already verified' : 'Payment verified successfully',
      paymentId: payment._id,
      merchantReference: payment.merchant_reference,
      orderTrackingId: payment.provider_checkout_id || payment.provider_order_id,
      amount: payment.amount,
      currency: payment.currency,
      invoiceNo: result.invoiceNo || payment.invoiceNo,
      label: payment.label,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
