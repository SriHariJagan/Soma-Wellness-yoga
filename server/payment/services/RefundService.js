import mongoose from 'mongoose';
import razorpay from '../../config/razorpay.js';
import { PaymentRepository } from '../repository/PaymentRepository.js';
import { InvoiceService } from './InvoiceService.js';
import Membership from '../../models/Membership.js';
import ActivityLog from '../../models/ActivityLog.js';
import { PaymentStateMachine } from '../state/PaymentStateMachine.js';
import { PaymentNotFoundError, PaymentStateError, GatewayError } from '../errors/PaymentErrors.js';
import logger from '../../notification/logger.js';

const MODULE = 'RefundService';

export class RefundService {
  constructor() {
    this.paymentRepo = new PaymentRepository();
    this.invoiceService = new InvoiceService();
  }

  async processRefund({ paymentId, adminUserId, amount, reason, idempotencyKey }) {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) throw new PaymentNotFoundError(`Payment not found: ${paymentId}`);

    if (!PaymentStateMachine.canRefund(payment.paymentStatus)) {
      throw new PaymentStateError(
        `Payment cannot be refunded: current status is "${payment.paymentStatus}"`,
      );
    }

    const alreadyRefunded = payment.refunds
      .filter((r) => r.status === 'processed' || r.status === 'pending')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const maxRefundable = payment.amount - alreadyRefunded;

    if (maxRefundable <= 0) {
      throw new PaymentStateError('Payment has already been fully refunded');
    }

    let refundAmount = amount != null ? Math.round(amount) : maxRefundable;

    if (refundAmount <= 0 || refundAmount > maxRefundable) {
      throw new PaymentStateError(
        `Invalid refund amount: ${refundAmount} (max refundable: ${maxRefundable} paise)`,
      );
    }

    const isFullRefund = Math.abs(refundAmount - maxRefundable) < 1;

    if (idempotencyKey) {
      const existingRefund = payment.refunds.find((r) => r.idempotencyKey === idempotencyKey);
      if (existingRefund) {
        logger.info(MODULE, 'Idempotent refund request', { paymentId, idempotencyKey });
        return { refund: existingRefund, idempotent: true };
      }
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      let razorpayRefund;
      try {
        if (!payment.razorpayPaymentId) {
          throw new GatewayError('No gateway payment ID — cannot process external refund', {
            paymentId: String(payment._id),
          });
        }
        razorpayRefund = await razorpay.payments.refund(payment.razorpayPaymentId, {
          amount: refundAmount,
          notes: {
            reason: reason || '',
            initiated_by: String(adminUserId),
            payment_id: String(payment._id),
          },
        });
        if (!razorpayRefund?.id) {
          throw new GatewayError('Gateway returned empty refund response', {});
        }
      } catch (err) {
        await session.abortTransaction();
        logger.error(MODULE, 'Razorpay refund API call failed', {
          paymentId,
          razorpayPaymentId: payment.razorpayPaymentId,
          amount: refundAmount,
          error: err.message,
        });
        throw new GatewayError('Razorpay refund request failed', {
          razorpayError: err.message,
          statusCode: err.statusCode,
        });
      }

      const refundEntry = {
        razorpayRefundId: razorpayRefund.id,
        amount: refundAmount,
        reason: reason || '',
        status: 'pending',
        initiatedBy: adminUserId,
        initiatedAt: new Date(),
      };

      await this.paymentRepo.addRefundEntry(payment._id, refundEntry, session);

      const refundReceipt = await this.invoiceService.generateRefundReceiptNumber(session);

      if (isFullRefund) {
        const updated = await this.paymentRepo.atomicStatusTransition(
          payment._id,
          'captured',
          'refunded',
          { refundedAt: new Date() },
          session,
        );
        if (!updated) {
          throw new PaymentStateError('Payment status could not be updated to refunded');
        }

        const membershipItems = payment.items.filter((i) => i.itemType === 'membership');
        for (const item of membershipItems) {
          await this._deactivateMembership(payment.user, item.itemId || item.name, payment._id, session);
        }
      }

      await this.paymentRepo.addAuditEntry(payment._id, {
        action: isFullRefund ? 'refund_full' : 'refund_partial',
        from: 'captured',
        to: isFullRefund ? 'refunded' : 'captured',
        by: adminUserId,
        metadata: {
          refundAmount,
          razorpayRefundId: razorpayRefund.id,
          refundReceipt,
          reason: reason || '',
          isFullRefund,
        },
      }, session);

      await ActivityLog.create([{
        action: 'payment_refund',
        performedBy: adminUserId,
        targetUser: payment.user,
        meta: {
          paymentId: payment._id,
          refundAmount,
          razorpayRefundId: razorpayRefund.id,
          refundReceipt,
          reason: reason || '',
          isFullRefund,
        },
      }], { session });

      await session.commitTransaction();

      this._sendRefundNotifications(payment, refundAmount, refundReceipt, reason)
        .catch((err) => logger.error(MODULE, 'Refund notification error', { error: err.message }));

      logger.info(MODULE, 'Refund processed', {
        paymentId: String(payment._id),
        refundId: razorpayRefund.id,
        amount: refundAmount,
        isFullRefund,
        refundReceipt,
      });

      return {
        refund: {
          id: razorpayRefund.id,
          amount: refundAmount,
          receipt: refundReceipt,
          status: 'pending',
          isFullRefund,
        },
        idempotent: false,
      };
    } catch (err) {
      await session.abortTransaction();
      logger.error(MODULE, 'Refund transaction aborted', {
        paymentId,
        refundId: razorpayRefund?.id,
        error: err.message,
      });
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

  async _sendRefundNotifications(payment, refundAmount, refundReceipt, reason) {
    const ns = (await import('../../notification/core/NotificationService.js')).default;
    const amountInr = (refundAmount / 100).toFixed(2);

    ns.send(payment.user, {
      channels: ['inApp'],
      data: {
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        amount: refundAmount,
        refundReceipt,
        reason: reason || '',
      },
      subject: 'Refund Processed',
      message: `Refund of KES ${amountInr} has been processed. Refund receipt: ${refundReceipt}`,
      priority: 'normal',
    }).catch((err) => logger.error(MODULE, 'Refund in-app notification failed', { error: err.message }));

    ns.send(payment.user, {
      template: 'refund',
      channels: ['email'],
      data: {
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        amount: amountInr,
        refundReceipt,
        reason: reason || '',
        label: payment.label,
      },
      subject: `Refund Receipt - ${refundReceipt}`,
      title: 'Refund Processed',
      priority: 'normal',
    }).catch((err) => logger.error(MODULE, 'Refund email failed', { error: err.message }));
  }
}

export default RefundService;
