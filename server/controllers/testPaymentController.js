// ============================================================
// controllers/testPaymentController.js — TEST MODE ONLY endpoints
// Backend (PAYMENT_MODE env) is the source of truth for the mode.
// The simulate endpoint is unreachable in live mode (403).
// ============================================================
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { getPaymentMode, isTestPaymentMode } from '../config/paymentMode.js';
import { TEST_SCENARIOS } from '../payment/gateways/test/TestPaymentService.js';
import logger from '../notification/logger.js';

const MODULE = 'TestPaymentCtrl';

// ── GET /api/mpesa/mode  (also aliased at /api/payment/mode) ──
// Public: the frontend must ask the backend which mode is active.
// Never expose secrets here — only the mode flag.
export const getPaymentModeStatus = asyncHandler(async (req, res) => {
  const mode = getPaymentMode();
  res.json({
    success: true,
    mode,
    testMode: mode === 'test',
  });
});

// ── POST /api/mpesa/test  (also aliased at /api/payment/test) ──
// Body: { paymentId?, checkoutRequestId?, orderId?, status|scenario }
// Auth required. Mode comes ONLY from server env — never from the body.
export const simulateTestPayment = asyncHandler(async (req, res) => {
  if (!isTestPaymentMode()) {
    logger.warn(MODULE, 'Test payment endpoint hit while live mode is active');
    throw ApiError.forbidden('Test payment mode is disabled');
  }

  const { paymentId, checkoutRequestId, orderId, status, scenario } = req.body || {};
  const requested = status || scenario;
  if (!requested) {
    throw ApiError.badRequest(
      `status is required. Supported values: ${TEST_SCENARIOS.join(', ')}`,
    );
  }
  if (!paymentId && !checkoutRequestId && !orderId) {
    throw ApiError.badRequest('paymentId, checkoutRequestId, or orderId is required');
  }

  const { TestPaymentService, normalizeScenario } = await import(
    '../payment/gateways/test/TestPaymentService.js'
  );
  const service = new TestPaymentService();

  // normalizeScenario throws 400 on invalid values (tested checklist item).
  const normalized = normalizeScenario(requested);

  const result = await service.simulate({
    paymentId,
    checkoutRequestId,
    orderId,
    scenario: normalized,
    userId: req.user?._id || req.userId || null,
  });

  const payment = result.payment;
  res.json({
    success: normalized === 'success',
    scenario: result.scenario,
    status: result.status,
    idempotent: Boolean(result.idempotent),
    message: result.message,
    paymentId: payment?._id || paymentId,
    paymentStatus: payment?.paymentStatus || result.status,
    mpesaOrderId: payment?.mpesaOrderId || payment?.razorpayOrderId,
    amount: payment?.amount,
    currency: payment?.currency || 'KES',
    invoiceNo: result.invoiceNo || payment?.invoiceNo,
    mpesaReceiptNumber: result.mpesaReceiptNumber,
  });
});

export default { getPaymentModeStatus, simulateTestPayment };
