// ============================================================
// MpesaCallbackService.js — Handles Daraja STK Push callbacks
// Parses callback payloads and updates payment records
// ============================================================
import logger from "../../../notification/logger.js";
import { PaymentRepository } from "../../repository/PaymentRepository.js";

const MODULE = "MpesaCallback";

class MpesaCallbackService {
  constructor() {
    this.paymentRepo = new PaymentRepository();
  }

  /**
   * Process an STK Push callback from Daraja.
   * @param {Object} callback — The full callback body from Safaricom
   * @returns {Object} Parsed result
   */
  async handleStkCallback(callback) {
    const stkCallback = callback?.Body?.stkCallback;
    if (!stkCallback) {
      logger.warn(MODULE, "Invalid callback payload", { payload: callback });
      return { success: false, error: "Invalid callback structure" };
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

    logger.info(MODULE, "STK callback received", {
      merchantRequestId: MerchantRequestID,
      checkoutRequestId: CheckoutRequestID,
      resultCode: ResultCode,
    });

    if (ResultCode === 0) {
      // Successful payment — extract metadata
      const metadata = this._extractMetadata(stkCallback.CallbackMetadata);
      return {
        success: true,
        merchantRequestId: MerchantRequestID,
        checkoutRequestId: CheckoutRequestID,
        amount: metadata.Amount,
        mpesaReceiptNumber: metadata.MpesaReceiptNumber,
        transactionDate: metadata.TransactionDate,
        phoneNumber: metadata.PhoneNumber,
      };
    }

    // Payment failed or cancelled
    const reason = this._interpretResultCode(ResultCode);
    logger.warn(MODULE, "STK payment failed", {
      checkoutRequestId: CheckoutRequestID,
      resultCode: ResultCode,
      reason,
    });

    return {
      success: false,
      merchantRequestId: MerchantRequestID,
      checkoutRequestId: CheckoutRequestID,
      resultCode: ResultCode,
      reason,
      rawDesc: ResultDesc,
    };
  }

  /**
   * Match a callback to a pending payment and update it.
   * @param {Object} parsedResult — From handleStkCallback
   * @param {string} paymentId — The Payment document _id
   */
  async reconcilePayment(parsedResult, paymentId) {
    if (!parsedResult.success) {
      await this.paymentRepo.updatePaymentStatus(paymentId, "failed", "initiated");
      await this.paymentRepo.addAuditEntry(paymentId, {
        action: "mpesa_stk_failed",
        resultCode: parsedResult.resultCode,
        reason: parsedResult.reason,
      });
      return { reconciled: false };
    }

    // Update payment with MPESA receipt
    const payment = await this.paymentRepo.markMpesaPaymentSuccess(paymentId, {
      mpesaReceiptNumber: parsedResult.mpesaReceiptNumber,
      transactionDate: parsedResult.transactionDate,
      phoneNumber: parsedResult.phoneNumber,
      amount: parsedResult.amount,
    });

    return { reconciled: true, payment };
  }

  /** Extract fields from CallbackMetadata.Item[] */
  _extractMetadata(callbackMetadata) {
    const items = callbackMetadata?.Item || [];
    const result = {};
    for (const item of items) {
      result[item.Name] = item.Value;
    }
    return result;
  }

  /** Human-readable result code interpretation */
  _interpretResultCode(code) {
    const codes = {
      1: "Insufficient balance in the M-PESA account",
      1032: "Request cancelled by the user",
      1037: "DS timeout — user did not respond in time",
      2001: "Invalid credentials / wrong PIN",
      2026: "Transaction amount exceeds M-PESA limit",
      9999: "System busy — try again later",
    };
    return codes[code] || `Error code ${code}`;
  }
}

export default new MpesaCallbackService();
