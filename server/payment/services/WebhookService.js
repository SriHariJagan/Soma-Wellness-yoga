import crypto from 'crypto';
import mongoose from 'mongoose';
import { PaymentRepository } from '../repository/PaymentRepository.js';
import { WebhookEventRepository } from '../repository/WebhookEventRepository.js';
import { InvoiceService } from './InvoiceService.js';
import { FulfillmentService } from './FulfillmentService.js';
import ActivityLog from '../../models/ActivityLog.js';
import { notifyBookOrderPaid, notifyBookOrderPaymentFailed } from '../../services/bookEmailService.js';
import { releaseOrderReservations } from '../../services/inventoryService.js';
import logger from '../../notification/logger.js';

const MODULE = 'WebhookService';
const MAX_AGE_MS = 5 * 60 * 1000;
const MAX_RETRY_ATTEMPTS = 5;

const EVENT_HANDLERS = {
  'payment.authorized': 'handlePaymentAuthorized',
  'payment.captured': 'handlePaymentCaptured',
  'payment.failed': 'handlePaymentFailed',
  'refund.created': 'handleRefundCreated',
  'refund.processed': 'handleRefundProcessed',
  'order.paid': 'handleOrderPaid',
};

export class WebhookService {
  constructor() {
    this.paymentRepo = new PaymentRepository();
    this.webhookEventRepo = new WebhookEventRepository();
    this.invoiceService = new InvoiceService();
    this.fulfillmentService = new FulfillmentService();
  }

  verifySignature(rawBody, signatureHeader) {
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (typeof signatureHeader !== 'string' || expected.length !== signatureHeader.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }

  preventReplay(payload) {
    if (!payload.created_at) return true;
    const eventTime = Number(payload.created_at) * 1000;
    if (Number.isNaN(eventTime)) return true;
    if (Date.now() - eventTime > MAX_AGE_MS) {
      logger.warn(MODULE, 'Replay attack detected – event too old', {
        eventId: payload.event_id,
        created_at: payload.created_at,
        ageMs: Date.now() - eventTime,
      });
      return false;
    }
    return true;
  }

  extractRazorpayOrderId(payload) {
    if (payload.payload?.payment?.entity?.order_id) {
      return payload.payload.payment.entity.order_id;
    }
    if (payload.payload?.refund?.entity?.order_id) {
      return payload.payload.refund.entity.order_id;
    }
    if (payload.payload?.order?.entity?.id) {
      return payload.payload.order.entity.id;
    }
    return null;
  }

  extractRazorpayPaymentId(payload) {
    if (payload.payload?.payment?.entity?.id) {
      return payload.payload.payment.entity.id;
    }
    if (payload.payload?.refund?.entity?.payment_id) {
      return payload.payload.refund.entity.payment_id;
    }
    return null;
  }

  async processEvent(event, payload, rawBody, signature) {
    logger.info(MODULE, 'Processing webhook event', { event, eventId: payload.event_id });

    const handlerName = EVENT_HANDLERS[event];
    if (!handlerName) {
      logger.info(MODULE, 'Unhandled event type – storing only', { event });
      return { handled: false };
    }

    const razorpayOrderId = this.extractRazorpayOrderId(payload);
    if (!razorpayOrderId) {
      logger.warn(MODULE, 'No order_id in webhook payload – cannot process', { event });
      return { handled: false, reason: 'no_order_id' };
    }

    const payment = await this.paymentRepo.findByRazorpayOrderId(razorpayOrderId);
    if (!payment) {
      logger.warn(MODULE, 'Payment not found for webhook – deferring', {
        event,
        razorpayOrderId,
      });
      return { handled: false, reason: 'payment_not_found' };
    }

    return this[handlerName](payload, payment);
  }

  async handlePaymentAuthorized(payload, payment) {
    const razorpayPaymentId = this.extractRazorpayPaymentId(payload);

    if (payment.paymentStatus === 'initiated') {
      const updated = await this.paymentRepo.atomicStatusTransition(
        payment._id,
        'initiated',
        'pending',
        razorpayPaymentId ? { razorpayPaymentId } : {},
      );
      if (updated) {
        logger.info(MODULE, 'Payment authorized – transitioned to pending', {
          paymentId: String(payment._id),
          razorpayPaymentId,
        });
        return { handled: true, action: 'authorized' };
      }
    }

    logger.info(MODULE, 'Payment already in pending/captured – skipping authorize', {
      paymentId: String(payment._id),
      currentStatus: payment.paymentStatus,
    });
    return { handled: true, action: 'idempotent' };
  }

  async handlePaymentCaptured(payload, payment) {
    if (payment.paymentStatus === 'captured') {
      logger.info(MODULE, 'Payment already captured – idempotent webhook', {
        paymentId: String(payment._id),
      });
      return { handled: true, action: 'idempotent' };
    }

    if (payment.paymentStatus !== 'pending') {
      logger.warn(MODULE, 'Cannot capture – invalid payment status', {
        paymentId: String(payment._id),
        status: payment.paymentStatus,
      });
      return { handled: false, reason: `invalid_status: ${payment.paymentStatus}` };
    }

    const razorpayPaymentId = this.extractRazorpayPaymentId(payload);
    const razorpaySignature = payload.event_id || 'webhook';

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const updated = await this.paymentRepo.updateAfterCapture(
        payment._id,
        razorpayPaymentId,
        razorpaySignature,
        { source: 'webhook', event: 'payment.captured', razorpayPaymentId },
        session,
      );

      if (!updated) {
        await session.abortTransaction();
        logger.info(MODULE, 'Payment already captured by concurrent request', {
          paymentId: String(payment._id),
        });
        return { handled: true, action: 'idempotent' };
      }

      const invoiceNo = await this.invoiceService.generateInvoiceNumber(session);
      await this.paymentRepo.setInvoiceNo(payment._id, invoiceNo, session);

      const items = payment.items || [];
      for (const item of items) {
        await this.fulfillmentService.activateItem(item, payment._id, payment.user, session);
      }

      await this.paymentRepo.setFulfillmentStatus(payment._id, 'completed', session);

      await this.paymentRepo.addAuditEntry(payment._id, {
        action: 'webhook_capture',
        from: 'pending',
        to: 'captured',
        by: null,
        metadata: { razorpayPaymentId, invoiceNo, event: 'payment.captured' },
      }, session);

      await ActivityLog.create([{
        action: 'webhook_payment_captured',
        performedBy: payment.user,
        targetUser: payment.user,
        meta: {
          paymentId: payment._id,
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId,
          invoiceNo,
          amount: payment.amount,
        },
      }], { session });

      await session.commitTransaction();

      // Book store: order emails after commit (failures never roll back).
      notifyBookOrderPaid(payment._id)
        .catch((err) => logger.error(MODULE, 'Book order notification error', { error: err.message }));

      logger.info(MODULE, 'Payment captured via webhook', {
        paymentId: String(payment._id),
        razorpayPaymentId,
        invoiceNo,
      });

      return { handled: true, action: 'captured', invoiceNo };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async handlePaymentFailed(payload, payment) {
    if (payment.paymentStatus === 'failed' || payment.paymentStatus === 'captured') {
      return { handled: true, action: 'idempotent' };
    }

    const razorpayPaymentId = this.extractRazorpayPaymentId(payload);
    const errorReason = payload.payload?.payment?.entity?.error_reason || 'Unknown';

    const updated = await this.paymentRepo.updatePaymentStatus(payment._id, 'failed', payment.paymentStatus);
    if (!updated) {
      return { handled: true, action: 'idempotent' };
    }

    await this.paymentRepo.addAuditEntry(payment._id, {
      action: 'webhook_failed',
      from: payment.paymentStatus,
      to: 'failed',
      by: null,
      metadata: { razorpayPaymentId, errorReason, event: 'payment.failed' },
    });

    await ActivityLog.create([{
      action: 'webhook_payment_failed',
      performedBy: payment.user,
      targetUser: payment.user,
      meta: {
        paymentId: payment._id,
        razorpayPaymentId,
        errorReason,
      },
    }]);

    // Book store: release reserved inventory and notify customer + admin.
    // Order status stays payment_pending so the customer can retry.
    (async () => {
      try {
        const Order = (await import('../../models/Order.js')).default;
        const order = await Order.findOne({ payment: payment._id, kind: 'book' }).lean();
        if (order) {
          await releaseOrderReservations(order._id, {
            by: 'webhook',
            note: 'Payment failed — reservation released',
          });
        }
        await notifyBookOrderPaymentFailed(payment._id);
      } catch (err) {
        logger.error(MODULE, 'Book payment-failure cleanup error', { error: err.message });
      }
    })();

    logger.info(MODULE, 'Payment marked failed via webhook', {
      paymentId: String(payment._id),
      razorpayPaymentId,
      errorReason,
    });

    return { handled: true, action: 'failed' };
  }

  async handleRefundCreated(payload, payment) {
    const refundEntity = payload.payload?.refund?.entity;
    if (!refundEntity) return { handled: false, reason: 'no_refund_entity' };

    const alreadyExists = payment.refunds?.some(
      (r) => r.razorpayRefundId === refundEntity.id,
    );
    if (alreadyExists) {
      return { handled: true, action: 'idempotent' };
    }

    await this.paymentRepo.addRefundEntry(payment._id, {
      razorpayRefundId: refundEntity.id,
      amount: refundEntity.amount || 0,
      reason: refundEntity.notes?.reason || refundEntity.error_reason || '',
      status: 'pending',
      initiatedAt: new Date(),
    });

    await ActivityLog.create([{
      action: 'webhook_refund_created',
      performedBy: payment.user,
      targetUser: payment.user,
      meta: {
        paymentId: payment._id,
        refundId: refundEntity.id,
        amount: refundEntity.amount,
      },
    }]);

    logger.info(MODULE, 'Refund recorded via webhook', {
      paymentId: String(payment._id),
      refundId: refundEntity.id,
    });

    return { handled: true, action: 'refund_created' };
  }

  async handleRefundProcessed(payload, payment) {
    const refundEntity = payload.payload?.refund?.entity;
    if (!refundEntity) return { handled: false, reason: 'no_refund_entity' };

    const refund = payment.refunds?.find((r) => r.razorpayRefundId === refundEntity.id);
    if (refund && refund.status === 'processed') {
      return { handled: true, action: 'idempotent' };
    }

    await this.paymentRepo.markRefundProcessed(payment._id, refundEntity.id);

    const hasUnprocessedRefunds = payment.refunds?.some((r) => r.status !== 'processed');
    if (!hasUnprocessedRefunds) {
      await this.paymentRepo.atomicStatusTransition(payment._id, 'captured', 'refunded', {
        refundedAt: new Date(),
      });
    }

    await ActivityLog.create([{
      action: 'webhook_refund_processed',
      performedBy: payment.user,
      targetUser: payment.user,
      meta: {
        paymentId: payment._id,
        refundId: refundEntity.id,
      },
    }]);

    logger.info(MODULE, 'Refund processed via webhook', {
      paymentId: String(payment._id),
      refundId: refundEntity.id,
    });

    return { handled: true, action: 'refund_processed' };
  }

  async handleOrderPaid(payload, payment) {
    return this.handlePaymentCaptured(payload, payment);
  }

  isRetryable(error) {
    if (error.name === 'MongooseError' || error.name === 'MongoNetworkError') return true;
    if (error.message?.includes('ETIMEOUT') || error.message?.includes('ECONNREFUSED')) return true;
    return false;
  }

  shouldRetry(attempts) {
    return attempts < MAX_RETRY_ATTEMPTS;
  }
}

export default WebhookService;
