import mongoose from 'mongoose';
import { PaymentRepository } from './repository/PaymentRepository.js';
import { OrderService } from './services/OrderService.js';
import { VerificationService } from './services/VerificationService.js';
import { InvoiceService } from './services/InvoiceService.js';
import { FulfillmentService } from './services/FulfillmentService.js';
import { IdempotencyPlugin } from './plugins/IdempotencyPlugin.js';
import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';
import emailService from '../services/email/email.service.js';
import { notifyBookOrderPaid } from '../services/bookEmailService.js';
import logger from '../notification/logger.js';
import {
  PaymentInitiationError,
  PaymentVerificationError,
  PaymentNotFoundError,
} from './errors/PaymentErrors.js';

const MODULE = 'PaymentService';

export class PaymentService {
  constructor() {
    this.repository = new PaymentRepository();
    this.orderService = new OrderService();
    this.verificationService = new VerificationService();
    this.invoiceService = new InvoiceService();
    this.fulfillmentService = new FulfillmentService();
    this.idempotency = new IdempotencyPlugin();
  }

  async initiateFree({ user, items, label, description, idempotencyKey }) {
    if (idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        logger.info(MODULE, 'Idempotent free request – returning existing payment', {
          paymentId: String(existing._id),
          idempotencyKey,
        });
        return existing;
      }
    }

    const resolvedItems = await this.orderService.resolveItems(items);

    if (resolvedItems.some((i) => i.unitPrice > 0)) {
      throw new PaymentInitiationError('initiateFree requires all items to have zero price');
    }

    const doCreate = async () => {
      const labelText = label || resolvedItems.map((i) => i.name).join(', ');
      const payment = await this.repository.createFreePayment({
        user,
        label: labelText,
        description: description || '',
        items: resolvedItems,
        idempotencyKey,
      });

      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        for (const item of resolvedItems) {
          await this.fulfillmentService.activateItem(item, payment._id, user, session);
        }

        await this.repository.setFulfillmentStatus(payment._id, 'completed', session);

        await this.repository.addAuditEntry(payment._id, {
          action: 'fulfill_free',
          from: 'captured',
          to: 'captured',
          by: user,
          metadata: { source: 'free_checkout' },
        }, session);

        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        logger.error(MODULE, 'Free fulfillment transaction aborted', {
          paymentId: String(payment._id),
          error: err.message,
        });
        throw err;
      } finally {
        session.endSession();
      }

      logger.info(MODULE, 'Free payment fulfilled', {
        paymentId: String(payment._id),
        itemCount: resolvedItems.length,
      });

      return payment;
    };

    if (idempotencyKey) {
      return this.idempotency.executeWithIdempotency(idempotencyKey, 300, doCreate);
    }

    return doCreate();
  }

  async _doInitiate(user, items, label, description, idempotencyKey) {
    const resolvedItems = await this.orderService.resolveItems(items);
    const totalAmount = this.orderService.calculateTotal(resolvedItems);

    if (totalAmount <= 0) {
      throw new PaymentInitiationError('Payment amount must be greater than zero');
    }

    const receipt = `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const razorpayOrder = await this.orderService.createRazorpayOrder(totalAmount, receipt);

    const labelText = label || resolvedItems.map((i) => i.name).join(', ');

    const payment = await this.repository.create({
      user,
      label: labelText,
      description: description || '',
      items: resolvedItems,
      amount: totalAmount,
      currency: 'KES',
      gateway: 'razorpay',
      razorpayOrderId: razorpayOrder.id,
      paymentStatus: 'pending',
      pendingAt: new Date(),
      idempotencyKey,
      initiatedAt: new Date(),
      auditTrail: [{
        action: 'initiate',
        from: 'initiated',
        to: 'pending',
        by: user,
        timestamp: new Date(),
      }],
      attempts: [{
        attempt: 1,
        action: 'initiate',
        gatewayResponse: { razorpayOrderId: razorpayOrder.id, amount: razorpayOrder.amount },
        timestamp: new Date(),
      }],
    });

    logger.info(MODULE, 'Payment initiated', {
      paymentId: String(payment._id),
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount,
    });

    return payment;
  }

  async _sendNotifications(userId, payment, invoiceNo) {
    try {
      const user = await User.findById(userId).select('name email').lean();
      const amountInr = (payment.amount / 100).toFixed(2);
      const amountDisplay = `KES ${amountInr}`;

      const mod = await import('../notification/core/NotificationService.js');
      const ns = mod.default;

      // In-app notification
      ns.send(userId, {
        channels: ['inApp'],
        data: {
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: payment.razorpayPaymentId,
          amount: payment.amount,
          invoiceNo,
        },
        subject: 'Payment Successful',
        message: `Payment of ${amountDisplay} was successful. Invoice: ${invoiceNo}`,
        priority: 'normal',
      }).catch((err) => logger.error(MODULE, 'In-app notification failed', { error: err.message }));

      // Email: Invoice to customer via new email service
      if (user?.email) {
        emailService.sendInvoice({
          email: user.email,
          name: user.name,
          invoiceNumber: invoiceNo,
          amount: amountDisplay,
          description: payment.label || 'Purchase',
          invoiceDate: new Date().toLocaleDateString('en-KE'),
          paymentMethod: 'Razorpay',
        }).catch((err) => logger.error(MODULE, 'Invoice email failed', { error: err.message }));

        // Email: Payment success to customer
        emailService.sendPaymentSuccess({
          email: user.email,
          name: user.name,
          amount: amountDisplay,
          transactionId: payment.razorpayPaymentId || '',
          orderId: payment.razorpayOrderId || '',
          description: payment.label || 'Purchase',
          paymentDate: new Date().toLocaleString('en-KE'),
        }).catch((err) => logger.error(MODULE, 'Payment success email failed', { error: err.message }));
      }

      // Email: Admin notification
      emailService.sendPaymentReceivedAdmin({
        customerName: user?.name || 'Unknown',
        customerEmail: user?.email || '',
        order: payment.label || 'Purchase',
        amount: amountDisplay,
        paymentId: payment.razorpayPaymentId || '',
        razorpayOrderId: payment.razorpayOrderId || '',
      }).catch((err) => logger.error(MODULE, 'Admin payment notification failed', { error: err.message }));

      // Also send via notification system for invoice (backward compat)
      ns.send(userId, {
        template: 'invoice',
        channels: ['email'],
        data: {
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: payment.razorpayPaymentId,
          amount: amountInr,
          invoiceNumber: invoiceNo,
          description: payment.label,
          planName: payment.label,
          invoiceDate: new Date().toLocaleDateString('en-KE'),
        },
        subject: `Payment Receipt - ${invoiceNo}`,
        title: 'Payment Successful',
        priority: 'normal',
      }).catch((err) => logger.error(MODULE, 'Notification system invoice failed', { error: err.message }));
    } catch (err) {
      logger.error(MODULE, 'Notification module import failed – skipping notifications', { error: err.message });
    }
  }

  async initiate({ user, items, label, description, idempotencyKey }) {
    if (idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        logger.info(MODULE, 'Idempotent request – returning existing payment', {
          paymentId: String(existing._id),
          idempotencyKey,
        });
        return existing;
      }

      return this.idempotency.executeWithIdempotency(idempotencyKey, 300, () =>
        this._doInitiate(user, items, label, description, idempotencyKey),
      );
    }

    return this._doInitiate(user, items, label, description, idempotencyKey);
  }

  async verify({ user, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const payment = await this.repository.findByRazorpayOrderId(razorpayOrderId);
    if (!payment) {
      throw new PaymentNotFoundError(`No payment found for order: ${razorpayOrderId}`);
    }

    if (String(payment.user) !== String(user)) {
      logger.warn(MODULE, 'Payment ownership mismatch', {
        paymentUser: String(payment.user),
        requestUser: String(user),
      });
      throw new PaymentVerificationError('Payment does not belong to this user');
    }

    if (payment.paymentStatus === 'captured') {
      logger.info(MODULE, 'Idempotent verify – payment already captured', {
        paymentId: String(payment._id),
      });
      return { payment, idempotent: true };
    }

    if (payment.paymentStatus !== 'pending') {
      throw new PaymentVerificationError(
        `Payment cannot be verified: current status is "${payment.paymentStatus}"`,
      );
    }

    this.verificationService.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    await this.verificationService.checkPaymentIdNotDuplicate(razorpayPaymentId, this.repository);
    await this.verificationService.checkSignatureNotReused(razorpaySignature, this.repository);

    const gatewayPayment = await this.verificationService.fetchPaymentFromGateway(razorpayPaymentId);
    this.verificationService.verifyAmount(gatewayPayment.amount, payment.amount);
    this.verificationService.verifyCurrency(gatewayPayment.currency, payment.currency);

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const updated = await this.repository.updateAfterCapture(
        payment._id,
        razorpayPaymentId,
        razorpaySignature,
        { razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId },
        session,
      );

      if (!updated) {
        throw new PaymentVerificationError('Payment was already captured by another request');
      }

      const invoiceNo = await this.invoiceService.generateInvoiceNumber(session);

      await this.repository.setInvoiceNo(payment._id, invoiceNo, session);

      const items = payment.items || [];
      for (const item of items) {
        await this.fulfillmentService.activateItem(item, payment._id, user, session);
      }

      await this.repository.setFulfillmentStatus(payment._id, 'completed', session);

      await this.repository.addAuditEntry(payment._id, {
        action: 'verify',
        from: 'pending',
        to: 'captured',
        by: user,
        metadata: { razorpayPaymentId, razorpaySignature, invoiceNo },
      }, session);

      await ActivityLog.create([{
        action: 'payment_verified',
        performedBy: user,
        targetUser: user,
        meta: {
          paymentId: payment._id,
          razorpayOrderId,
          razorpayPaymentId,
          invoiceNo,
          amount: payment.amount,
          label: payment.label,
        },
      }], { session });

      await session.commitTransaction();

      const finalPayment = await this.repository.findById(payment._id);

      this._sendNotifications(user, finalPayment, invoiceNo)
        .catch((err) => logger.error(MODULE, 'Post-commit notification error', { error: err.message }));

      // Book store: order emails after commit. Failures are logged and
      // never roll back the payment.
      notifyBookOrderPaid(payment._id)
        .catch((err) => logger.error(MODULE, 'Book order notification error', { error: err.message }));

      logger.info(MODULE, 'Payment verified and fulfilled', {
        paymentId: String(payment._id),
        razorpayPaymentId,
        invoiceNo,
        itemCount: items.length,
      });

      return { payment: finalPayment, invoiceNo, idempotent: false };
    } catch (err) {
      await session.abortTransaction();
      logger.error(MODULE, 'Verification transaction aborted', {
        razorpayOrderId,
        razorpayPaymentId,
        error: err.message,
      });
      throw err;
    } finally {
      session.endSession();
    }
  }
}

export default PaymentService;
