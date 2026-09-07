// ============================================================
// TestPaymentService.js — TEST MODE ONLY (PAYMENT_MODE=test)
// Isolated simulated M-Pesa gateway for the testing-code branch.
//
// Strategy (production M-Pesa code is untouched):
//   Payment Request → PaymentService → PAYMENT_MODE=test → this service
//                                    → PAYMENT_MODE=live → M-Pesa/Daraja
//
// Every scenario flows through the SAME downstream application logic
// as a real payment:
//   success   → PaymentService.verify() (capture + invoice +
//               fulfillment + ActivityLog + notifications + book emails)
//   failure   → atomic pending→failed (no fulfillment, no success mail)
//   pending   → no state change (stays pending, retry-safe)
//   cancelled → atomic →failed with user-cancelled audit (ResultCode 1032)
//   timeout   → atomic pending→expired (ResultCode 1037 analog)
//
// Duplicate protection: success on an already-captured payment returns
// { idempotent: true } without re-running fulfillment (verify() +
// atomic guards enforce this at the DB layer).
// ============================================================
import { PaymentRepository } from '../../repository/PaymentRepository.js';
import ApiError from '../../../utils/ApiError.js';
import {
  PaymentInitiationError,
  PaymentNotFoundError,
  PaymentStateError,
} from '../../errors/PaymentErrors.js';
import logger from '../../../notification/logger.js';

const MODULE = 'TestPayment';

export const TEST_SCENARIOS = ['success', 'failure', 'pending', 'cancelled', 'timeout'];

export function normalizeScenario(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!TEST_SCENARIOS.includes(s)) {
    throw new PaymentInitiationError(
      `Invalid test scenario "${raw}". Supported values: ${TEST_SCENARIOS.join(', ')}`,
    );
  }
  return s;
}

function testReceipt() {
  return `TESTRCPT_${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function testCheckoutRequestId() {
  return `TESTWS_${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function logContext(payment, scenario, userId) {
  // Never log secrets/tokens — only safe order/payment identifiers.
  return {
    order: String(payment.mpesaOrderId || payment.razorpayOrderId || payment._id),
    paymentId: String(payment._id),
    amount: payment.amount,
    amountKES: (payment.amount / 100).toFixed(2),
    scenario: scenario.toUpperCase(),
    user: userId ? String(userId) : String(payment.user || 'guest'),
  };
}

export class TestPaymentService {
  constructor() {
    this.repository = new PaymentRepository();
  }

  /** Locate a payment by id, checkoutRequestId (auditTrail), or order id. */
  async _findPayment({ paymentId, checkoutRequestId, orderId }) {
    let payment = null;
    if (paymentId) {
      payment = await this.repository.findById(paymentId);
    }
    if (!payment && checkoutRequestId) {
      payment = await this.repository.findByMpesaCheckoutRequestId(checkoutRequestId);
    }
    if (!payment && orderId) {
      payment =
        (await this.repository.findByRazorpayOrderId(orderId)) ||
        (await this.repository.findByIdempotencyKey(orderId));
    }
    if (!payment) {
      throw new PaymentNotFoundError(
        `No payment found for ${paymentId || checkoutRequestId || orderId || 'request'}`,
      );
    }
    return payment;
  }

  _assertOwnership(payment, userId) {
    // Guest-created payments (user == null, e.g. public booking STK push)
    // are simulatable by any caller in test mode; owned payments must match.
    // 403 (not 400) so the test UI can offer a "start fresh payment" recovery.
    if (payment.user && userId && String(payment.user) !== String(userId)) {
      logger.warn(`[${MODULE}]`, 'Ownership mismatch', {
        paymentId: String(payment._id),
      });
      throw ApiError.forbidden(
        'Payment does not belong to this user — start a fresh test payment as the current login',
      );
    }
  }

  async simulate({ paymentId, checkoutRequestId, orderId, scenario, userId }) {
    const normalized = normalizeScenario(scenario);
    const payment = await this._findPayment({ paymentId, checkoutRequestId, orderId });
    this._assertOwnership(payment, userId);

    const ctx = logContext(payment, normalized, userId);
    logger.info(`[${MODULE}]`, `Order: ${ctx.order} Amount: ${ctx.amountKES} Scenario: ${ctx.scenario} User: ${ctx.user}`, ctx);

    switch (normalized) {
      case 'success':
        return this._simulateSuccess(payment, userId, ctx);
      case 'failure':
        return this._simulateFailure(payment, ctx);
      case 'pending':
        return this._simulatePending(payment, ctx);
      case 'cancelled':
        return this._simulateCancelled(payment, ctx);
      case 'timeout':
        return this._simulateTimeout(payment, ctx);
      default:
        throw new PaymentInitiationError(`Unsupported test scenario: ${normalized}`);
    }
  }

  // ── SUCCESS: identical downstream flow to a real Daraja callback ──
  async _simulateSuccess(payment, userId, ctx) {
    const fresh = await this.repository.findById(payment._id);

    if (fresh.paymentStatus === 'captured') {
      logger.info(`[${MODULE}]`, 'Duplicate SUCCESS — payment already captured, no duplicate fulfillment', ctx);
      return {
        scenario: 'success',
        status: 'captured',
        idempotent: true,
        message: 'Payment already verified — duplicate ignored, no duplicate booking created',
        payment: fresh,
      };
    }

    if (!['pending', 'initiated'].includes(fresh.paymentStatus)) {
      throw new PaymentStateError(
        `Test SUCCESS not allowed: payment status is "${fresh.paymentStatus}"`,
      );
    }

    // STK-push manual payments sit at "initiated" — promote to pending first
    // (mirrors the live callback path which captures regardless of state).
    if (fresh.paymentStatus === 'initiated') {
      const promoted = await this.repository.atomicStatusTransition(
        fresh._id,
        'initiated',
        'pending',
        { pendingAt: new Date() },
      );
      if (!promoted) {
        throw new PaymentStateError('Payment status changed concurrently — please retry');
      }
      await this.repository.addAuditEntry(fresh._id, {
        action: 'test_promote_pending',
        from: 'initiated',
        to: 'pending',
        by: userId || fresh.user,
        metadata: { source: 'test_payment' },
      });
    }

    const receipt = testReceipt();
    await this.repository.addAuditEntry(fresh._id, {
      action: 'test_stk_success_callback',
      checkoutRequestId:
        fresh.auditTrail?.find((a) => a.checkoutRequestId)?.checkoutRequestId || undefined,
      mpesaReceiptNumber: receipt,
      metadata: { source: 'test_payment', scenario: 'success' },
    });

    if (fresh.user) {
      // Full production path: capture + invoice + fulfillment +
      // ActivityLog + notifications + book-order emails (all inside verify()).
      const { PaymentService } = await import('../../PaymentService.js');
      const paymentService = new PaymentService();
      try {
        const result = await paymentService.verify({
          user: fresh.user,
          mpesaOrderId: fresh.mpesaOrderId || fresh.razorpayOrderId,
          mpesaReceiptNumber: receipt,
        });
        logger.info(`[${MODULE}]`, `Scenario: SUCCESS — verified and fulfilled (invoice ${result.invoiceNo || 'n/a'})`, ctx);
        return {
          scenario: 'success',
          status: 'captured',
          idempotent: Boolean(result.idempotent),
          message: result.idempotent
            ? 'Payment already verified'
            : 'Test payment successful — booking confirmed',
          payment: result.payment,
          invoiceNo: result.invoiceNo || result.payment?.invoiceNo,
          mpesaReceiptNumber: receipt,
        };
      } catch (err) {
        // verify() is idempotent — a concurrent callback may have won the race.
        if (err?.statusCode === 400 && /already captured/i.test(err.message || '')) {
          const current = await this.repository.findById(fresh._id);
          return {
            scenario: 'success',
            status: current?.paymentStatus || 'captured',
            idempotent: true,
            message: 'Payment already verified by a concurrent request',
            payment: current,
          };
        }
        // Manual/STK payments created before synthetic order ids existed
        // cannot be found by verify()'s order-id lookup. Mirroring the live
        // Daraja callback fallback: mark them captured when there is nothing
        // to fulfill (no real items). Payments WITH fulfillable items always
        // rethrow so fulfillment problems stay loud.
        const hasFulfillableItems = (fresh.items || []).some(
          (i) => i.itemType && i.itemType !== 'other',
        );
        if (err?.statusCode === 404 && !hasFulfillableItems) {
          logger.warn(`[${MODULE}]`, 'verify() lookup missed an item-less payment — applying callback-style fallback capture', ctx);
          const updated = await this.repository.markMpesaPaymentSuccess(fresh._id, {
            mpesaReceiptNumber: receipt,
            transactionDate: new Date(),
            phoneNumber: 'test',
            amount: fresh.amount,
          });
          await this.repository.addAuditEntry(fresh._id, {
            action: 'test_fallback_capture',
            metadata: { source: 'test_payment', scenario: 'success', reason: 'verify lookup missed; no fulfillable items' },
          });
          return {
            scenario: 'success',
            status: 'captured',
            idempotent: false,
            message: 'Test payment successful',
            payment: updated,
            mpesaReceiptNumber: receipt,
          };
        }
        throw err;
      }
    }

    // Guest payment (no linked user) — mark captured like the live
    // callback's no-user branch (no fulfillment service to run).
    const updated = await this.repository.markMpesaPaymentSuccess(fresh._id, {
      mpesaReceiptNumber: receipt,
      transactionDate: new Date(),
      phoneNumber: 'test',
      amount: fresh.amount,
    });
    logger.info(`[${MODULE}]`, 'Scenario: SUCCESS — guest payment marked captured', ctx);
    return {
      scenario: 'success',
      status: 'captured',
      idempotent: false,
      message: 'Test payment successful',
      payment: updated,
      mpesaReceiptNumber: receipt,
    };
  }

  // ── FAILURE: like a real gateway decline (insufficient funds, bad PIN) ──
  async _simulateFailure(payment, ctx) {
    const transitioned =
      (await this.repository.atomicStatusTransition(payment._id, 'pending', 'failed', {
        failedAt: new Date(),
      })) ||
      (await this.repository.atomicStatusTransition(payment._id, 'initiated', 'failed', {
        failedAt: new Date(),
      }));

    if (!transitioned) {
      const current = await this.repository.findById(payment._id);
      if (current?.paymentStatus === 'failed') {
        logger.info(`[${MODULE}]`, 'Duplicate FAILURE — already failed', ctx);
        return { scenario: 'failure', status: 'failed', idempotent: true, message: 'Payment already marked as failed', payment: current };
      }
      throw new PaymentStateError(
        `Test FAILURE not allowed: payment status is "${current?.paymentStatus}"`,
      );
    }

    await this.repository.addAuditEntry(payment._id, {
      action: 'test_stk_failed',
      from: transitioned.paymentStatus === 'failed' ? 'pending' : 'initiated',
      to: 'failed',
      metadata: { source: 'test_payment', scenario: 'failure', reason: 'Simulated gateway decline' },
    });
    await this.repository.recordAttempt(payment._id, {
      attempt: (transitioned.attempts?.length || 0) + 1,
      action: 'test_failure',
      gatewayResponse: { source: 'test_payment', scenario: 'failure' },
      error: 'Simulated payment failure',
    });

    logger.info(`[${MODULE}]`, 'Scenario: FAILURE — no fulfillment, no success notification', ctx);
    const current = await this.repository.findById(payment._id);
    return {
      scenario: 'failure',
      status: 'failed',
      idempotent: false,
      message: 'Test payment failed as simulated — booking was not confirmed',
      payment: current,
    };
  }

  // ── PENDING: stays pending, existing retry/status polling keeps working ──
  async _simulatePending(payment, ctx) {
    const current = await this.repository.findById(payment._id);
    if (!['pending', 'initiated'].includes(current?.paymentStatus)) {
      throw new PaymentStateError(
        `Test PENDING not allowed: payment status is "${current?.paymentStatus}"`,
      );
    }
    await this.repository.addAuditEntry(payment._id, {
      action: 'test_stk_pending',
      metadata: { source: 'test_payment', scenario: 'pending' },
    });
    logger.info(`[${MODULE}]`, 'Scenario: PENDING — payment remains pending, user not marked as paid', ctx);
    return {
      scenario: 'pending',
      status: current.paymentStatus,
      idempotent: false,
      message: 'Test payment is pending — complete or retry the payment',
      payment: current,
    };
  }

  // ── CANCELLED: user pressed cancel on the STK prompt (ResultCode 1032) ──
  async _simulateCancelled(payment, ctx) {
    const transitioned =
      (await this.repository.atomicStatusTransition(payment._id, 'pending', 'failed', {
        failedAt: new Date(),
      })) ||
      (await this.repository.atomicStatusTransition(payment._id, 'initiated', 'failed', {
        failedAt: new Date(),
      }));

    if (!transitioned) {
      const current = await this.repository.findById(payment._id);
      if (current?.paymentStatus === 'failed') {
        return { scenario: 'cancelled', status: 'failed', idempotent: true, message: 'Payment already cancelled', payment: current };
      }
      throw new PaymentStateError(
        `Test CANCELLED not allowed: payment status is "${current?.paymentStatus}"`,
      );
    }

    await this.repository.addAuditEntry(payment._id, {
      action: 'test_stk_cancelled',
      to: 'failed',
      metadata: { source: 'test_payment', scenario: 'cancelled', resultCode: 1032, reason: 'Request cancelled by the user' },
    });

    logger.info(`[${MODULE}]`, 'Scenario: CANCELLED — booking not confirmed, user may retry', ctx);
    const current = await this.repository.findById(payment._id);
    return {
      scenario: 'cancelled',
      status: 'failed',
      idempotent: false,
      // Frontend treats "cancelled" distinctly from "failure" for UX copy.
      message: 'Test payment was cancelled — you can retry the payment',
      payment: current,
    };
  }

  // ── TIMEOUT: user never responded to the STK prompt (ResultCode 1037) ──
  async _simulateTimeout(payment, ctx) {
    const transitioned =
      (await this.repository.atomicStatusTransition(payment._id, 'pending', 'expired', {
        expiredAt: new Date(),
      })) ||
      (await this.repository.atomicStatusTransition(payment._id, 'initiated', 'expired', {
        expiredAt: new Date(),
      }));

    if (!transitioned) {
      const current = await this.repository.findById(payment._id);
      if (current?.paymentStatus === 'expired') {
        return { scenario: 'timeout', status: 'expired', idempotent: true, message: 'Payment already expired', payment: current };
      }
      throw new PaymentStateError(
        `Test TIMEOUT not allowed: payment status is "${current?.paymentStatus}"`,
      );
    }

    await this.repository.addAuditEntry(payment._id, {
      action: 'test_stk_timeout',
      to: 'expired',
      metadata: { source: 'test_payment', scenario: 'timeout', resultCode: 1037, reason: 'DS timeout — user did not respond in time' },
    });
    await this.repository.recordAttempt(payment._id, {
      attempt: (transitioned.attempts?.length || 0) + 1,
      action: 'test_timeout',
      gatewayResponse: { source: 'test_payment', scenario: 'timeout' },
      error: 'Simulated gateway timeout',
    });

    logger.warn(`[${MODULE}]`, 'Scenario: TIMEOUT — recorded, booking not confirmed, retry allowed', ctx);
    const current = await this.repository.findById(payment._id);
    return {
      scenario: 'timeout',
      status: 'expired',
      idempotent: false,
      message: 'Test payment timed out — please retry the payment',
      payment: current,
    };
  }
}

export function buildTestStkIds() {
  return {
    checkoutRequestId: testCheckoutRequestId(),
    merchantRequestId: `TESTM_${Date.now().toString(36).toUpperCase()}`,
  };
}

export default TestPaymentService;
