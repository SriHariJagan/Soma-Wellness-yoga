// ============================================================
// controllers/mpesaController.js — MPESA STK Push endpoints
// Handles initiating payments and receiving callbacks
// ============================================================
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { mpesaClient, mpesaCallbackService } from "../payment/gateways/mpesa/index.js";
import { PaymentRepository } from "../payment/repository/PaymentRepository.js";
import logger from "../notification/logger.js";

const MODULE = "MpesaCtrl";
const paymentRepo = new PaymentRepository();

// ── POST /api/mpesa/stkpush ──────────────────────────────────
/** Initiate STK Push for a membership/service payment */
export const initiateStkPush = asyncHandler(async (req, res) => {
  const { phone, amount, accountRef, description, itemType, itemId } = req.body;

  if (!phone || !amount) {
    throw ApiError.badRequest("phone and amount are required");
  }
  if (Number(amount) < 1) {
    throw ApiError.badRequest("Amount must be at least KES 1");
  }

  if (!mpesaClient.isConfigured) {
    throw ApiError.serviceUnavailable("MPESA payment gateway is not configured");
  }

  // Create a pending payment record first
  const payment = await paymentRepo.createManualPayment({
    user: req.user?._id || null,
    label: description || "MPESA STK Push Payment",
    amount: Math.round(Number(amount) * 100), // Store in cents
    description: `MPESA STK: ${description || "Payment"}`,
    adminId: null,
    gateway: "mpesa",
  });

  try {
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
          await paymentRepo.markMpesaPaymentSuccess(payment._id, {
            mpesaReceiptNumber: result.mpesaReceiptNumber,
            transactionDate: result.transactionDate,
            phoneNumber: result.phoneNumber,
            amount: result.amount,
          });
          logger.info(MODULE, "MPESA payment reconciled", {
            paymentId: payment._id,
            receipt: result.mpesaReceiptNumber,
          });
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

  if (!mpesaClient.isConfigured) {
    throw ApiError.serviceUnavailable("MPESA payment gateway is not configured");
  }

  const result = await mpesaClient.queryStatus(checkoutRequestId);
  res.json(result);
});
