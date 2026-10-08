// ============================================================
// controllers/pesapalController.js — Pesapal redirect + IPN + status.
// NEVER trusts frontend/redirect/IPN alone: every capture goes
// through PaymentService.verifyAndCapture (server-to-server).
// ============================================================
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { PaymentService } from '../payment/PaymentService.js';
import pesapalProvider from '../payment/gateways/pesapal/PesapalProvider.js';
import { enqueueWebhookRetry } from '../payment/queue/WebhookQueue.js';
import logger from '../notification/logger.js';

const MODULE = 'PesapalCtrl';
const paymentService = new PaymentService();

// ── POST /api/pesapal/initiate ─────────────────────────────────
// Body: { items[], label?, description?, idempotencyKey?, customer?,
//         paymentId? (existing intent), callbackUrl?, cancellationUrl? }
// Server prices everything. Frontend amount is ignored.
export const initiatePesapal = asyncHandler(async (req, res) => {
  const { items, label, description, idempotencyKey, customer, paymentId, callbackUrl, cancellationUrl } = req.body || {};

  if (paymentId) {
    const result = await paymentService.createProviderOrder({
      paymentId,
      user: req.userId || req.user?._id || null,
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
  const result = await paymentService.initiate({
    user: req.userId || req.user?._id || null,
    items,
    label,
    description,
    idempotencyKey,
    customer: customer || {},
    callbackUrl,
    cancellationUrl,
  });
  logger.info(MODULE, 'Pesapal initiate ok', { merchantReference: result.merchantReference });
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
});

// ── GET /api/pesapal/status?merchantReference=&orderTrackingId= ──
export const pesapalStatus = asyncHandler(async (req, res) => {
  const merchantReference = req.query.merchantReference || req.query.ref || null;
  const checkoutId = req.query.orderTrackingId || req.query.OrderTrackingId || null;
  if (!merchantReference && !checkoutId) {
    throw ApiError.badRequest('merchantReference or orderTrackingId is required');
  }
  const result = await paymentService.getStatus({
    merchantReference,
    checkoutId,
    user: req.userId || req.user?._id || null,
  });
  const p = result.payment;
  return res.json({
    success: true,
    paymentId: p._id,
    merchantReference: p.merchant_reference,
    orderTrackingId: p.provider_checkout_id || p.provider_order_id || checkoutId || null,
    paymentStatus: p.paymentStatus,
    providerStatus: p.provider_status || null,
    amount: p.amount,
    currency: p.currency,
    invoiceNo: p.invoiceNo || null,
    failureReason: p.failure_reason || null,
    refreshed: !!result.refreshed,
    pending: !!result.pending,
  });
});

// ── GET|POST /api/pesapal/ipn (Pesapal IPNCHANGE) ───────────────
// Respond fast; verify server-to-server. IPN is never proof alone.
async function handleIpn(req, res) {
  const { trackingId, merchantReference, notificationType } = pesapalProvider.parseCallback(req);
  if (notificationType && notificationType !== 'IPNCHANGE') {
    logger.warn(MODULE, 'Unexpected notification type on IPN endpoint', { notificationType });
  }
  if (!trackingId && !merchantReference) {
    return res.status(400).json({
      orderNotificationType: 'IPNCHANGE',
      orderTrackingId: null,
      orderMerchantReference: null,
      status: 500,
    });
  }
  try {
    const result = await paymentService.handleIpn({ trackingId, merchantReference });
    const okRef = result.payment?.merchant_reference || merchantReference || null;
    const okTrack = result.payment?.provider_checkout_id || trackingId || null;
    return res.json({
      orderNotificationType: 'IPNCHANGE',
      orderTrackingId: okTrack,
      orderMerchantReference: okRef,
      status: 200,
    });
  } catch (err) {
    logger.error(MODULE, 'IPN processing failed', {
      trackingId,
      merchantReference,
      error: err.message,
    });
    try {
      await enqueueWebhookRetry(`pesapal:${trackingId || merchantReference}`, err.message);
    } catch {}
    const retryable = ['PROVIDER_PENDING', undefined].includes(err.code);
    return res.status(retryable ? 500 : 200).json({
      orderNotificationType: 'IPNCHANGE',
      orderTrackingId: trackingId || null,
      orderMerchantReference: merchantReference || null,
      status: 500,
    });
  }
}

export const pesapalIpnGet = asyncHandler(handleIpn);
export const pesapalIpnPost = asyncHandler(handleIpn);

// ── GET /api/pesapal/return (browser landing after Pesapal) ─────
// This endpoint is API-side; the SPA return page calls /status.
// Kept for non-SPA clients: verifies then redirects to frontend result.
export const pesapalReturn = asyncHandler(async (req, res) => {
  const { trackingId, merchantReference } = pesapalProvider.parseCallback(req);
  const frontend = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  if (!trackingId && !merchantReference) {
    if (frontend) return res.redirect(`${frontend}/payment/return?status=error`);
    throw ApiError.badRequest('OrderTrackingId or merchant reference is required');
  }
  try {
    await paymentService.verifyAndCapture({ merchantReference, checkoutId: trackingId });
    if (frontend) {
      const ref = merchantReference || '';
      return res.redirect(`${frontend}/payment/return?ref=${encodeURIComponent(ref)}&status=captured`);
    }
    return res.json({ success: true, merchantReference });
  } catch (err) {
    if (frontend) {
      const ref = merchantReference || '';
      const st = err.code === 'PROVIDER_PENDING' ? 'pending' : 'failed';
      return res.redirect(`${frontend}/payment/return?ref=${encodeURIComponent(ref)}&status=${st}`);
    }
    throw err;
  }
});

// ── GET /api/pesapal/config (public, non-secret) ────────────────
export const pesapalConfig = asyncHandler(async (req, res) => {
  const s = pesapalProvider.configurationStatus();
  return res.json({
    success: true,
    provider: 'pesapal',
    configured: s.configured,
    baseUrl: s.baseUrl,
    hasIpnId: s.hasIpnId,
    hasCallbackUrl: s.hasCallbackUrl,
  });
});

export default { initiatePesapal, pesapalStatus, pesapalIpnGet, pesapalIpnPost, pesapalReturn, pesapalConfig };
