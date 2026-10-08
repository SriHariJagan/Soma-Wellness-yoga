// ============================================================
// routes/paymentWebhookRoutes.js — Legacy Razorpay webhook (REMOVED).
// Razorpay is no longer supported. This endpoint now returns 410 Gone
// so any stale provider retries fail visibly instead of silently.
// Pesapal IPN lives at GET|POST /api/pesapal/ipn.
// ============================================================
import express from 'express';
import logger from '../notification/logger.js';

const MODULE = 'LegacyWebhook';
const router = express.Router();

router.use((req, res) => {
  logger.warn(MODULE, 'Legacy Razorpay webhook hit – gone', {
    method: req.method,
    ip: req.ip,
  });
  return res.status(410).json({
    status: 'error',
    message: 'Razorpay webhook removed. Active gateway is Pesapal (see /api/pesapal/ipn).',
  });
});

export default router;
