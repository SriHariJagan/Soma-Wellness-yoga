// ============================================================
// services/RefundService.js — Pesapal refunds + explicit manual fallback.
// Pesapal docs: POST /Transactions/RefundRequest
//   { confirmation_code, amount (major), username, remarks }.
// Limits: COMPLETED only; single refund per payment; mobile-money
// FULL refund only. Approval is asynchronous (finance team).
// UI must never show "Refunded" until actually confirmed.
// ============================================================
import mongoose from 'mongoose';
import pesapalProvider from '../gateways/pesapal/PesapalProvider.js';
import { PaymentRepository } from '../repository/PaymentRepository.js';
import { InvoiceService } from './InvoiceService.js';
import Membership from '../../models/Membership.js';
import ActivityLog from '../../models/ActivityLog.js';
import { PaymentStateMachine } from '../state/PaymentStateMachine.js';
import { PaymentNotFoundError, PaymentStateError, GatewayError } from '../errors/PaymentErrors.js';
import logger from '../../notification/logger.js';

const MODULE = 'RefundService';

export class RefundService {
  constructor({ provider = pesapalProvider } = {}) {
    this.paymentRepo = new PaymentRepository();
    this.invoiceService = new InvoiceService();
    this.provider = provider;
  }

  async processRefund({ paymentId, adminUserId, amount, reason, idempotencyKey, manual = false }) {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) throw new PaymentNotFoundError(`Payment not found: ${paymentId}`);

    if (!PaymentStateMachine.canRefund(payment.paymentStatus)) {
      throw new PaymentStateError(
        `Payment cannot be refunded: current status is "${payment.paymentStatus}"`,
      );
    }

    const alreadyRefunded = (payment.refunds || [])
      .filter((r) => r.status === 'processed' || r.status === 'pending')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const maxRefundable = payment.amount - alreadyRefunded;
    if (maxRefundable <= 0) {
      throw new PaymentStateError('Payment has already been fully refunded');
    }

    let refundAmount = amount != null ? Math.round(amount) : maxRefundable;
    if (refundAmount <= 0 || refundAmount > maxRefundable) {
      throw new PaymentStateError(
        `Invalid refund amount: ${refundAmount} (max refundable: ${maxRefundable} minor units)`,
      );
    }

    const hasPriorRefund = (payment.refunds || []).length > 0;
    if (hasPriorRefund && !manual) {
      // Pesapal allows only ONE refund request per payment.
      throw new PaymentStateError('A refund has already been requested for this payment (Pesapal allows a single refund request)');
    }

    const isFullRefund = Math.abs(refundAmount - maxRefundable) < 1;

    if (idempotencyKey) {
      const existingRefund = (payment.refunds || []).find((r) => r.idempotencyKey === idempotencyKey);
      if (existingRefund) {
        logger.info(MODULE, 'Idempotent refund request', { paymentId, idempotencyKey });
        return { refund: existingRefund, idempotent: true };
      }
    }

    // Mobile-money via Pesapal supports FULL refund only.
    const providerMethod = String(payment.provider_raw?.payment_method || payment.payment_method || '').toUpperCase();
    const looksMobileMoney = ['MPESA', 'MTN', 'TIGO', 'AIRTEL'].some((m) => providerMethod.includes(m));
    if (looksMobileMoney && !isFullRefund && !manual) {
      throw new PaymentStateError('Mobile-money payments support full refund only via Pesapal');
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      let providerRefundId = null;
      let manualRefund = manual;
      let confirmationCode = payment.provider_transaction_id || null;

      if (!manualRefund) {
        if (!this.provider.isConfigured) {
          throw new GatewayError('Pesapal is not configured — use manual refund workflow', {});
        }
        if (payment.payment_provider !== 'pesapal' || !confirmationCode) {
          // Historical (M-Pesa/legacy) payments have no Pesapal confirmation
          // code — they CANNOT be refunded via API. Explicit manual path.
          manualRefund = true;
          logger.info(MODULE, 'Non-Pesapal payment — manual refund required', {
            paymentId: String(payment._id),
            provider: payment.payment_provider,
          });
        } else {
          try {
            const adminName = String(adminUserId);
            const res = await this.provider.refund({
              confirmationCode,
              amountMinor: refundAmount,
              username: adminName.slice(-32),
              remarks: (reason || 'Refund requested').slice(0, 200),
            });
            if (!res.accepted) {
              throw new GatewayError(`Pesapal rejected refund request: ${res.raw?.message || 'unknown'}`, {});
            }
            providerRefundId = `pesapal:${confirmationCode}`;
          } catch (err) {
            if (err instanceof GatewayError || err instanceof PaymentStateError) throw err;
            await session.abortTransaction();
            logger.error(MODULE, 'Pesapal refund API call failed', {
              paymentId,
              amount: refundAmount,
              error: err.message,
            });
            throw new GatewayError('Pesapal refund request failed', { providerError: err.message });
          }
        }
      }

      const refundEntry = {
        provider_refund_id: providerRefundId,
        confirmation_code: confirmationCode || '',
        amount: refundAmount,
        reason: reason || '',
        status: 'pending',
        manual: manualRefund,
        idempotencyKey: idempotencyKey || undefined,
        initiatedBy: adminUserId,
        initiatedAt: new Date(),
      };

      await this.paymentRepo.addRefundEntry(payment._id, refundEntry, session);
      const refundReceipt = await this.invoiceService.generateRefundReceiptNumber(session);

      // Only transition to refunded when FULL amount refunded. Partial
      // refunds keep status captured until confirmed complete.
      // NOTE: Pesapal approval is async — 'refunded' here means
      // "full refund requested+recorded"; final settlement is manual.
      // For strictness, full refunds move to 'refunded' only when manual
      // or provider-accepted (both recorded here).
      if (isFullRefund) {
        const updated = await this.paymentRepo.atomicStatusTransition(
          payment._id,
          payment.paymentStatus === 'refunding' ? 'refunding' : 'captured',
          'refunded',
          { refundedAt: new Date() },
          session,
        );
        if (!updated && payment.paymentStatus !== 'refunded') {
          throw new PaymentStateError('Payment status could not be updated to refunded');
        }
        const membershipItems = (payment.items || []).filter((i) => i.itemType === 'membership');
        for (const item of membershipItems) {
          await this._deactivateMembership(payment.user, item.itemId || item.name, payment._id, session);
        }
      } else if (payment.paymentStatus === 'captured') {
        await this.paymentRepo.atomicStatusTransition(
          payment._id, 'captured', 'refunding', {}, session,
        ).catch(() => { /* already transitioned concurrently — safe to ignore */ });
      }

      await this.paymentRepo.addAuditEntry(payment._id, {
        action: manualRefund ? (isFullRefund ? 'refund_manual_full' : 'refund_manual_partial') : (isFullRefund ? 'refund_full' : 'refund_partial'),
        from: payment.paymentStatus,
        to: isFullRefund ? 'refunded' : 'refunding',
        by: adminUserId,
        metadata: {
          refundAmount,
          providerRefundId,
          confirmationCode,
          refundReceipt,
          reason: reason || '',
          isFullRefund,
          manual: manualRefund,
          provider: payment.payment_provider,
        },
      }, session);

      await ActivityLog.create([{
        action: 'payment_refund',
        performedBy: adminUserId,
        targetUser: payment.user,
        meta: {
          paymentId: payment._id,
          merchantReference: payment.merchant_reference,
          refundAmount,
          providerRefundId,
          refundReceipt,
          reason: reason || '',
          isFullRefund,
          manual: manualRefund,
        },
      }], { session });

      await session.commitTransaction();

      this._sendRefundNotifications(payment, refundAmount, refundReceipt, reason, manualRefund)
        .catch((err) => logger.error(MODULE, 'Refund notification error', { error: err.message }));

      logger.info(MODULE, 'Refund recorded', {
        paymentId: String(payment._id),
        amount: refundAmount,
        isFullRefund,
        manual: manualRefund,
        refundReceipt,
      });

      return {
        refund: {
          id: providerRefundId,
          amount: refundAmount,
          receipt: refundReceipt,
          status: 'pending',
          isFullRefund,
          manual: manualRefund,
          message: manualRefund
            ? 'Recorded as MANUAL REFUND REQUIRED — complete the refund with the provider and confirm separately.'
            : 'Refund request submitted to Pesapal — pending merchant/finance approval.',
        },
        idempotent: false,
      };
    } catch (err) {
      try { await session.abortTransaction(); } catch { /* already aborted — safe to ignore */ }
      logger.error(MODULE, 'Refund transaction aborted', { paymentId, error: err.message });
      throw err;
    } finally {
      session.endSession();
    }
  }

  /** Mark a requested refund as settled (admin confirms money returned). */
  async confirmRefundSettled({ paymentId, adminUserId, refundId }) {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) throw new PaymentNotFoundError(`Payment not found: ${paymentId}`);
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const PaymentModel = (await import('../models/Payment.js')).default;
      const matchField = refundId?.startsWith('pesapal:') || payment.payment_provider === 'pesapal'
        ? { 'refunds.provider_refund_id': refundId }
        : { 'refunds.razorpayRefundId': refundId };
      const updated = await PaymentModel.findOneAndUpdate(
        { _id: paymentId, ...matchField },
        { $set: { 'refunds.$.status': 'processed', 'refunds.$.completedAt': new Date() } },
        { new: true, session },
      );
      if (!updated) throw new PaymentStateError('Refund record not found');
      await this.paymentRepo.addAuditEntry(paymentId, {
        action: 'refund_settled',
        from: updated.paymentStatus,
        to: updated.paymentStatus,
        by: adminUserId,
        metadata: { refundId },
      }, session);
      await session.commitTransaction();
      return { success: true };
    } catch (err) {
      try { await session.abortTransaction(); } catch { /* already aborted — safe to ignore */ }
      throw err;
    } finally {
      session.endSession();
    }
  }

  async _deactivateMembership(userId, planIdentifier, paymentId, session) {
    const query = { user: userId, status: 'active', invoice: paymentId };
    const membership = await Membership.findOne(query).session(session);
    if (!membership) {
      logger.warn(MODULE, 'No active membership found for refund', {
        userId: String(userId),
        paymentId: String(paymentId),
      });
      return;
    }
    membership.status = 'cancelled';
    membership.deactivated = true;
    membership.history.push({
      action: 'cancelled',
      note: 'Membership cancelled due to payment refund',
      at: new Date(),
    });
    await membership.save({ session });
    logger.info(MODULE, 'Membership deactivated due to refund', {
      membershipId: String(membership._id),
      userId: String(userId),
    });
  }

  async _sendRefundNotifications(payment, refundAmount, refundReceipt, reason, manual) {
    const ns = (await import('../../notification/core/NotificationService.js')).default;
    const amountMajor = (refundAmount / 100).toFixed(2);
    const message = manual
      ? `A manual refund of KES ${amountMajor} has been recorded (receipt ${refundReceipt}). Our team will complete the transfer and confirm.`
      : `Refund of KES ${amountMajor} has been requested. Refund receipt: ${refundReceipt}`;
    ns.send(payment.user, {
      channels: ['inApp'],
      data: {
        merchantReference: payment.merchant_reference,
        amount: refundAmount,
        refundReceipt,
        reason: reason || '',
      },
      subject: manual ? 'Manual Refund Recorded' : 'Refund Requested',
      message,
      priority: 'normal',
    }).catch((err) => logger.error(MODULE, 'Refund in-app notification failed', { error: err.message }));

    ns.send(payment.user, {
      template: 'refund',
      channels: ['email'],
      data: {
        merchantReference: payment.merchant_reference,
        amount: amountMajor,
        refundReceipt,
        reason: reason || '',
        label: payment.label,
      },
      subject: `Refund Receipt - ${refundReceipt}`,
      title: manual ? 'Manual Refund Recorded' : 'Refund Requested',
      priority: 'normal',
    }).catch((err) => logger.error(MODULE, 'Refund email failed', { error: err.message }));
  }
}

export default RefundService;
