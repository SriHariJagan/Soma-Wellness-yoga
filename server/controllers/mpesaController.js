// ============================================================
// controllers/mpesaController.js — MPESA STK Push endpoints
// Handles initiating payments and receiving callbacks
// ============================================================
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { mpesaClient, mpesaCallbackService } from "../payment/gateways/mpesa/index.js";
import { isTestPaymentMode } from "../config/paymentMode.js";
import { PaymentRepository } from "../payment/repository/PaymentRepository.js";
import { PaymentService } from "../payment/PaymentService.js";
import logger from "../notification/logger.js";

const MODULE = "MpesaCtrl";
const paymentRepo = new PaymentRepository();

// ── POST /api/mpesa/stkpush ──────────────────────────────────
/** Initiate STK Push for a membership/service payment */
export const initiateStkPush = asyncHandler(async (req, res) => {
  const { phone, amount, accountRef, description, itemType, itemId, paymentId, orderId } = req.body;

  if (!phone || !amount) {
    throw ApiError.badRequest("phone and amount are required");
  }
  if (Number(amount) < 1) {
    throw ApiError.badRequest("Amount must be at least KES 1");
  }

  // TEST MODE (PAYMENT_MODE=test): Daraja is never contacted. The live
  // M-Pesa path below is unchanged and runs only when PAYMENT_MODE=live.
  if (!mpesaClient.isConfigured && !isTestPaymentMode()) {
    throw ApiError.serviceUnavailable("MPESA payment gateway is not configured");
  }

  let payment;

  if (paymentId) {
    // Reuse existing payment record (from cart checkout or other flow)
    payment = await paymentRepo.findById(paymentId);
    if (!payment) {
      throw ApiError.badRequest("Payment not found");
    }
    // Link orderId if provided
    if (orderId) {
      await paymentRepo.addAuditEntry(payment._id, {
        action: "mpesa_stk_linked_order",
        orderId: orderId,
      });
    }
  } else {
    // Create a new pending payment record
    payment = await paymentRepo.createManualPayment({
      user: req.user?._id || null,
      label: description || "MPESA STK Push Payment",
      amount: Math.round(Number(amount) * 100),
      description: `MPESA STK: ${description || "Payment"}`,
      adminId: null,
      gateway: "mpesa",
    });
  }

  try {
    // ── TEST MODE: return synthetic STK ids, no Daraja call ──
    if (isTestPaymentMode()) {
      const { buildTestStkIds } = await import("../payment/gateways/test/TestPaymentService.js");
      const testIds = buildTestStkIds();
      await paymentRepo.addAuditEntry(payment._id, {
        action: "test_stk_initiated",
        checkoutRequestId: testIds.checkoutRequestId,
        merchantRequestId: testIds.merchantRequestId,
        phone: String(phone),
        amount: Number(amount),
        metadata: { source: "test_payment" },
      });
      logger.info(MODULE, "[TEST PAYMENT] STK push simulated (no Daraja call)", {
        paymentId: String(payment._id),
        checkoutRequestId: testIds.checkoutRequestId,
      });
      return res.json({
        success: true,
        testMode: true,
        paymentId: payment._id,
        checkoutRequestId: testIds.checkoutRequestId,
        merchantRequestId: testIds.merchantRequestId,
        message: "TEST MODE: no real STK Push sent. Use the test payment panel to simulate a result.",
      });
    }

    const stkResponse = await mpesaClient.stkPush({
      phone,
      amount: Number(amount),
      accountRef: accountRef || payment._id.toString().slice(-12),
      description: description || "Soma Wellness",
    });

    if (stkResponse.ResponseCode === "0") {
      // Store the CheckoutRequestID on the payment for callback matching
      await paymentRepo.addAuditEntry(payment._id, {
        action: "mpesa_stk_initiated",
        checkoutRequestId: stkResponse.CheckoutRequestID,
        merchantRequestId: stkResponse.MerchantRequestID,
        phone: mpesaClient._normalisePhone(phone),
        amount: Number(amount),
      });

      return res.json({
        success: true,
        paymentId: payment._id,
        checkoutRequestId: stkResponse.CheckoutRequestID,
        merchantRequestId: stkResponse.MerchantRequestID,
        message: "STK Push sent to your phone. Enter your PIN to complete payment.",
      });
    }

    // STK Push failed
    await paymentRepo.updatePaymentStatus(payment._id, "failed", "initiated");
    throw ApiError.badRequest(stkResponse.errorMessage || "STK Push failed. Please try again.");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error(MODULE, "STK Push error", { error: err.message, paymentId: payment._id });
    throw ApiError.badRequest("Failed to initiate STK Push. Please try again.");
  }
});

// ── POST /api/mpesa/callback ──────────────────────────────────
/** Daraja sends callback results here after STK Push completes */
export const stkCallback = asyncHandler(async (req, res) => {
  // Always respond 200 to Daraja to prevent retries
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });

  try {
    const result = await mpesaCallbackService.handleStkCallback(req.body);
    logger.info(MODULE, "STK callback processed", {
      success: result.success,
      checkoutRequestId: result.checkoutRequestId,
    });

    // Match checkoutRequestId to Payment record and reconcile
    if (result.checkoutRequestId) {
      const payment = await paymentRepo.findByMpesaCheckoutRequestId(result.checkoutRequestId);
      if (payment) {
        if (result.success) {
          // If payment has a user, use PaymentService.verify() which handles
          // both status update AND order fulfillment in one atomic operation
          if (payment.user) {
            try {
              const paymentService = new PaymentService();
              await paymentService.verify({
                user: payment.user,
                mpesaOrderId: payment.mpesaOrderId || payment.razorpayOrderId,
                mpesaReceiptNumber: result.mpesaReceiptNumber,
              });
              logger.info(MODULE, "MPESA payment verified and fulfilled", {
                paymentId: payment._id,
                receipt: result.mpesaReceiptNumber,
              });
            } catch (verifyErr) {
              // If verify fails (e.g. already captured), fall back to simple mark
              logger.warn(MODULE, "PaymentService.verify failed, falling back to markMpesaPaymentSuccess", {
                paymentId: payment._id,
                error: verifyErr.message,
              });
              await paymentRepo.markMpesaPaymentSuccess(payment._id, {
                mpesaReceiptNumber: result.mpesaReceiptNumber,
                transactionDate: result.transactionDate,
                phoneNumber: result.phoneNumber,
                amount: result.amount,
              });
            }
          } else {
            // No user linked — just mark payment as successful
            await paymentRepo.markMpesaPaymentSuccess(payment._id, {
              mpesaReceiptNumber: result.mpesaReceiptNumber,
              transactionDate: result.transactionDate,
              phoneNumber: result.phoneNumber,
              amount: result.amount,
            });
            logger.info(MODULE, "MPESA payment reconciled (no user)", {
              paymentId: payment._id,
              receipt: result.mpesaReceiptNumber,
            });
          }
        } else {
          await paymentRepo.updatePaymentStatus(payment._id, "failed", "initiated");
          logger.warn(MODULE, "MPESA payment marked failed", {
            paymentId: payment._id,
            resultCode: result.resultCode,
          });
        }
      } else {
        logger.warn(MODULE, "No payment found for checkoutRequestId", {
          checkoutRequestId: result.checkoutRequestId,
        });
      }
    }
  } catch (err) {
    logger.error(MODULE, "STK callback processing error", { error: err.message });
  }
});

// ── POST /api/mpesa/query ─────────────────────────────────────
/** Check status of an STK Push transaction */
export const queryTransaction = asyncHandler(async (req, res) => {
  const { checkoutRequestId } = req.body;
  if (!checkoutRequestId) {
    throw ApiError.badRequest("checkoutRequestId is required");
  }

  if (!mpesaClient.isConfigured && !isTestPaymentMode()) {
    throw ApiError.serviceUnavailable("MPESA payment gateway is not configured");
  }

  // ── TEST MODE: report the local payment status instead of Daraja ──
  if (isTestPaymentMode()) {
    const payment = await paymentRepo.findByMpesaCheckoutRequestId(checkoutRequestId);
    if (!payment) {
      return res.json({ ResultCode: 1037, ResultDesc: 'Test payment pending', testMode: true, checkoutRequestId });
    }
    if (payment.paymentStatus === 'captured') {
      return res.json({ ResultCode: 0, ResultDesc: 'Test payment successful', testMode: true, checkoutRequestId, paymentId: payment._id });
    }
    if (payment.paymentStatus === 'failed') {
      return res.json({ ResultCode: 1032, ResultDesc: 'Test payment failed/cancelled', testMode: true, checkoutRequestId, paymentId: payment._id });
    }
    if (payment.paymentStatus === 'expired') {
      return res.json({ ResultCode: 1037, ResultDesc: 'Test payment expired (timeout)', testMode: true, checkoutRequestId, paymentId: payment._id });
    }
    return res.json({ ResultCode: 1037, ResultDesc: 'Test payment pending', testMode: true, checkoutRequestId, paymentId: payment._id });
  }

  const result = await mpesaClient.queryStatus(checkoutRequestId);
  res.json(result);
});
