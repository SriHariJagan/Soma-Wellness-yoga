// ============================================================
// PaymentService.js — Provider-agnostic orchestration (Pesapal only).
// Owns: server-side pricing, idempotency, state transitions,
// provider delegation, verification orchestration, atomic capture,
// fulfillment, invoices, notifications, audit logging.
// Contains NO Pesapal HTTP logic (see gateways/pesapal/).
// ============================================================
import mongoose from 'mongoose';
import { PaymentRepository } from './repository/PaymentRepository.js';
import { OrderService } from './services/OrderService.js';
import { VerificationService } from './services/VerificationService.js';
import { InvoiceService } from './services/InvoiceService.js';
import { FulfillmentService } from './services/FulfillmentService.js';
import { IdempotencyPlugin } from './plugins/IdempotencyPlugin.js';
import pesapalProvider from './gateways/pesapal/PesapalProvider.js';
import { generateMerchantReference } from '../utils/merchantReference.js';
import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';
import emailService from '../services/email/email.service.js';
import { notifyBookOrderPaid } from '../services/bookEmailService.js';
import { finalizePurchase } from './services/finalizePurchase.js';
import logger from '../notification/logger.js';
import {
  PaymentInitiationError,
  PaymentVerificationError,
  PaymentNotFoundError,
} from './errors/PaymentErrors.js';

const MODULE = 'PaymentService';
const PROVIDER = 'pesapal';

function sanitizeProviderRaw(raw) {
  if (!raw || typeof raw !== 'object') return raw || {};
  const copy = { ...raw };
  delete copy.token;
  delete copy.accessToken;
  delete copy.consumer_key;
  delete copy.consumer_secret;
  return copy;
}

export class PaymentService {
  constructor({ provider = pesapalProvider } = {}) {
    this.repository = new PaymentRepository();
    this.orderService = new OrderService();
    this.verificationService = new VerificationService();
    this.invoiceService = new InvoiceService();
    this.fulfillmentService = new FulfillmentService();
    this.idempotency = new IdempotencyPlugin();
    this.provider = provider;
  }

  // ── Free items (unchanged business logic) ────────────────────
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
        await finalizePurchase(user, payment, session);
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

  // ── Server-priced intent (no provider call yet) ──────────────
  async _doInitiateIntent(user, items, label, description, idempotencyKey, customer = {}) {
    let circleActive = false;
    try {
      if (user) {
        const { getActiveCircleMembership } = await import('../services/circleService.js');
        circleActive = (await getActiveCircleMembership(user)) != null;
      }
    } catch {}
    const hasCouponDiscount = Array.isArray(items) && items.some((i) => i?.metadata?.couponId || i?.metadata?.couponCode);
    const resolvedItems = await this.orderService.resolveItems(items, {
      userId: user,
      circleActive,
      hasCouponDiscount,
    });
    const totalAmount = this.orderService.calculateTotal(resolvedItems);

    if (totalAmount <= 0) {
      throw new PaymentInitiationError('Payment amount must be greater than zero');
    }

    const merchantReference = generateMerchantReference();
    const labelText = label || resolvedItems.map((i) => i.name).join(', ');

    const payment = await this.repository.create({
      user: user || null,
      label: labelText,
      description: description || '',
      items: resolvedItems,
      amount: totalAmount,
      currency: 'KES',
      gateway: PROVIDER,
      payment_provider: PROVIDER,
      payment_method: PROVIDER,
      merchant_reference: merchantReference,
      paymentStatus: 'initiated',
      initiatedAt: new Date(),
      idempotencyKey,
      auditTrail: [{
        action: 'initiate',
        from: 'initiated',
        to: 'initiated',
        by: user || null,
        timestamp: new Date(),
        metadata: { provider: PROVIDER },
      }],
      attempts: [{
        attempt: 1,
        action: 'initiate',
        gatewayResponse: { provider: PROVIDER, amount: totalAmount },
        timestamp: new Date(),
      }],
    });

    logger.info(MODULE, 'Payment intent created (Pesapal)', {
      paymentId: String(payment._id),
      merchantReference,
      amount: totalAmount,
    });
    return payment;
  }

  async initiateIntent({ user, items, label, description, idempotencyKey, customer }) {
    if (idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        logger.info(MODULE, 'Idempotent intent – returning existing payment', {
          paymentId: String(existing._id),
          idempotencyKey,
        });
        return existing;
      }
      return this.idempotency.executeWithIdempotency(idempotencyKey, 300, () =>
        this._doInitiateIntent(user, items, label, description, idempotencyKey, customer),
      );
    }
    return this._doInitiateIntent(user, items, label, description, idempotencyKey, customer);
  }

  /**
   * Create an intent from PRE-RESOLVED items + authoritative total.
   * For callers with their own server-side pricing (cart, book store)
   * where re-resolution would diverge (coupons/shipping). Amount must
   * already be in minor units and computed server-side — never from client.
   */
  async createIntent({ user, items, amount, currency = 'KES', label, description, idempotencyKey }) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new PaymentInitiationError('Items array is required and must not be empty');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new PaymentInitiationError('Payment amount must be greater than zero');
    }
    if (idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        logger.info(MODULE, 'Idempotent intent – returning existing payment', {
          paymentId: String(existing._id),
          idempotencyKey,
        });
        return existing;
      }
    }
    const merchantReference = generateMerchantReference();
    const payment = await this.repository.create({
      user: user || null,
      label: label || items.map((i) => i.name).join(', '),
      description: description || '',
      items,
      amount: Math.round(amount),
      currency: String(currency || 'KES').toUpperCase(),
      gateway: PROVIDER,
      payment_provider: PROVIDER,
      payment_method: PROVIDER,
      merchant_reference: merchantReference,
      paymentStatus: 'initiated',
      initiatedAt: new Date(),
      idempotencyKey,
      auditTrail: [{
        action: 'initiate',
        from: 'initiated',
        to: 'initiated',
        by: user || null,
        timestamp: new Date(),
        metadata: { provider: PROVIDER },
      }],
    });
    logger.info(MODULE, 'Payment intent created (pre-resolved)', {
      paymentId: String(payment._id),
      merchantReference,
      amount: Math.round(amount),
    });
    return payment;
  }

  /** Resolve customer contact for Pesapal billing_address. */
  async _resolveCustomer(userId, override = {}) {
    const customer = {
      email: override.email || '',
      phone: override.phone || '',
      countryCode: override.countryCode || override.country_code || 'KE',
      firstName: override.firstName || override.first_name || '',
      lastName: override.lastName || override.last_name || '',
      city: override.city || '',
    };
    if (userId) {
      try {
        const u = await User.findById(userId).select('name email phone').lean();
        if (u) {
          if (!customer.email && u.email) customer.email = u.email;
          if (!customer.phone && u.phone) customer.phone = u.phone;
          if (!customer.firstName && u.name) customer.firstName = String(u.name).split(' ')[0] || '';
          if (!customer.lastName && u.name) {
            const parts = String(u.name).split(' ');
            customer.lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
          }
        }
      } catch {}
    }
    return customer;
  }

  /**
   * Submit an initiated payment to Pesapal and transition to pending.
   * Returns { payment, redirectUrl, merchantReference, orderTrackingId }.
   */
  async createProviderOrder({ paymentId, user, customer = {}, callbackUrl, cancellationUrl }) {
    const payment = await this.repository.findById(paymentId);
    if (!payment) throw new PaymentNotFoundError(`No payment found: ${paymentId}`);
    if (payment.user && user && String(payment.user) !== String(user)) {
      throw new PaymentVerificationError('Payment does not belong to this user');
    }
    if (payment.paymentStatus === 'pending' && payment.provider_checkout_id) {
      // Already submitted — return existing redirect context (no duplicate order).
      logger.info(MODULE, 'Provider order already exists – idempotent return', {
        paymentId: String(payment._id),
      });
      return {
        payment,
        redirectUrl: payment.provider_raw?.redirect_url || null,
        merchantReference: payment.merchant_reference,
        orderTrackingId: payment.provider_checkout_id,
        idempotent: true,
      };
    }
    if (payment.paymentStatus !== 'initiated') {
      throw new PaymentVerificationError(
        `Provider order cannot be created: current status is "${payment.paymentStatus}"`,
      );
    }
    const resolvedCustomer = await this._resolveCustomer(payment.user || user, customer);
    if (!resolvedCustomer.email && !resolvedCustomer.phone) {
      throw new PaymentInitiationError('Customer email or phone is required for Pesapal payment');
    }
    let submitted;
    try {
      submitted = await this.provider.createOrder({
        payment,
        customer: resolvedCustomer,
        callback_url: callbackUrl,
        cancellation_url: cancellationUrl,
      });
    } catch (err) {
      await this.repository.recordAttempt(payment._id, {
        attempt: (payment.attempts?.length || 0) + 1,
        action: 'provider_order_failed',
        error: err.message,
      });
      throw new PaymentInitiationError(`Pesapal order submission failed: ${err.message}`);
    }
    await this.repository.saveProviderOrderDetails(payment._id, {
      providerOrderId: submitted.providerOrderId,
      checkoutId: submitted.checkoutId,
      merchantReference: submitted.merchantReference || payment.merchant_reference,
      providerRaw: sanitizeProviderRaw(submitted.raw),
    });
    const updated = await this.repository.atomicStatusTransition(
      payment._id, 'initiated', 'pending',
      { provider_checkout_id: submitted.checkoutId, provider_order_id: submitted.providerOrderId, pendingAt: new Date() },
    );
    await this.repository.addAuditEntry(payment._id, {
      action: 'provider_order_created',
      from: 'initiated',
      to: 'pending',
      by: payment.user || user || null,
      metadata: {
        provider: PROVIDER,
        orderTrackingId: submitted.checkoutId,
        merchantReference: submitted.merchantReference || payment.merchant_reference,
      },
    });
    const finalPayment = updated || await this.repository.findById(payment._id);
    logger.info(MODULE, 'Pesapal order submitted', {
      paymentId: String(payment._id),
      orderTrackingId: submitted.checkoutId,
    });
    return {
      payment: finalPayment,
      redirectUrl: submitted.redirectUrl,
      merchantReference: finalPayment.merchant_reference,
      orderTrackingId: submitted.checkoutId,
      idempotent: false,
    };
  }

  /**
   * One-step initiate: server-priced intent + Pesapal SubmitOrder.
   * Used by POST /api/payments/initiate. Frontend amount is NEVER trusted.
   */
  async initiate({ user, items, label, description, idempotencyKey, customer, callbackUrl, cancellationUrl }) {
    const intent = await this.initiateIntent({ user, items, label, description, idempotencyKey, customer });
    // If intent already pending (idempotent replay), return existing provider context.
    if (intent.paymentStatus === 'pending' && intent.provider_checkout_id) {
      return {
        payment: intent,
        redirectUrl: intent.provider_raw?.redirect_url || null,
        merchantReference: intent.merchant_reference,
        orderTrackingId: intent.provider_checkout_id,
        idempotent: true,
      };
    }
    return this.createProviderOrder({
      paymentId: intent._id, user, customer, callbackUrl, cancellationUrl,
    });
  }

  /** Locate a payment by merchant reference, checkout id, or _id. */
  async _locatePayment({ merchantReference, checkoutId, paymentId }) {
    if (merchantReference) {
      const p = await this.repository.findByMerchantReference(merchantReference);
      if (p) return p;
    }
    if (checkoutId) {
      const p = await this.repository.findByCheckoutId(checkoutId);
      if (p) return p;
    }
    if (paymentId) {
      const p = await this.repository.findById(paymentId);
      if (p) return p;
    }
    throw new PaymentNotFoundError('No payment found for the given reference');
  }

  /**
   * Server-to-server verification + atomic capture + fulfillment.
   * THE ONLY path that sets captured for provider payments.
   */
  async verifyAndCapture({ merchantReference, checkoutId, paymentId, user }) {
    const payment = await this._locatePayment({ merchantReference, checkoutId, paymentId });
    if (user && payment.user && String(payment.user) !== String(user)) {
      throw new PaymentVerificationError('Payment does not belong to this user');
    }
    if (payment.paymentStatus === 'captured') {
      logger.info(MODULE, 'Idempotent verify – already captured', { paymentId: String(payment._id) });
      return { payment, idempotent: true };
    }
    if (payment.paymentStatus !== 'pending' && payment.paymentStatus !== 'initiated') {
      throw new PaymentVerificationError(
        `Payment cannot be verified: current status is "${payment.paymentStatus}"`,
      );
    }
    const trackingId = checkoutId || payment.provider_checkout_id || payment.provider_order_id;
    if (!trackingId) {
      throw new PaymentVerificationError('Payment has no provider tracking id yet');
    }
    let status;
    try {
      status = await this.provider.getTransactionStatus(trackingId);
    } catch (err) {
      logger.error(MODULE, 'Provider status fetch failed', {
        paymentId: String(payment._id),
        error: err.message,
      });
      throw new PaymentVerificationError(`Unable to verify with provider: ${err.message}`);
    }
    const canonical = this.provider.mapStatus(status.statusDescription || status.status);
    if (canonical !== 'captured') {
      // Persist provider status + failure reason without capturing.
      const failed = canonical === 'failed';
      const PaymentModel = (await import('./models/Payment.js')).default;
      await PaymentModel.findByIdAndUpdate(payment._id, {
        $set: {
          provider_status: status.statusDescription || status.status || '',
          provider_raw: sanitizeProviderRaw(status.raw),
          callback_data: {
            orderTrackingId: trackingId,
            merchantReference: payment.merchant_reference,
            status: status.status,
          },
          ...(failed ? { paymentStatus: 'failed', failedAt: new Date(), failure_reason: status.description || status.statusDescription || 'Provider reported failure' } : {}),
        },
        $push: {
          auditTrail: {
            action: failed ? 'provider_failed' : 'provider_pending',
            from: payment.paymentStatus,
            to: failed ? 'failed' : payment.paymentStatus,
            timestamp: new Date(),
            metadata: { provider: PROVIDER, trackingId, status: status.statusDescription || status.status },
          },
        },
      });
      const err = new PaymentVerificationError(
        failed ? `Provider reports payment as "${status.statusDescription || status.status}"` : 'Payment is still pending at provider',
      );
      err.providerStatus = status.status;
      err.code = failed ? 'PROVIDER_FAILED' : 'PROVIDER_PENDING';
      throw err;
    }

    // Mandatory equality checks before capture.
    this.verificationService.verifyAmount(status.amountMinor, payment.amount);
    this.verificationService.verifyCurrency(status.currency, payment.currency);
    if (payment.merchant_reference) {
      this.verificationService.verifyMerchantReference(status.merchantReference, payment.merchant_reference);
    }
    await this.verificationService.checkTransactionIdNotDuplicate(
      status.confirmationCode || trackingId, this.repository, payment._id,
    );

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const confirmationCode = status.confirmationCode || trackingId;
      const updated = await this.repository.capturePending(payment._id, {
        providerTransactionId: confirmationCode,
        providerStatus: status.statusDescription || status.status,
        callbackData: {
          orderTrackingId: trackingId,
          merchantReference: payment.merchant_reference,
          confirmationCode,
          paymentMethod: status.paymentMethod || PROVIDER,
        },
        providerRaw: sanitizeProviderRaw(status.raw),
        auditAction: 'verify_capture',
        auditMetadata: {
          provider: PROVIDER,
          orderTrackingId: trackingId,
          confirmationCode,
          paymentMethod: status.paymentMethod,
        },
      }, session);
      if (!updated) {
        throw new PaymentVerificationError('Payment was already captured by another request');
      }
      const invoiceNo = await this.invoiceService.generateInvoiceNumber(session);
      await this.repository.setInvoiceNo(payment._id, invoiceNo, session);
      const items = payment.items || [];
      for (const item of items) {
        await this.fulfillmentService.activateItem(item, payment._id, payment.user || user, session);
      }
      await this.repository.setFulfillmentStatus(payment._id, 'completed', session);
      // Post-capture bookkeeping: consume coupon (reserved until now) and
      // clear purchased items from cart. Runs inside the same transaction
      // so it can never happen without capture, nor twice.
      await finalizePurchase(payment.user || user, { ...payment.toObject?.() || payment, items, _id: payment._id }, session);
      await this.repository.addAuditEntry(payment._id, {
        action: 'fulfill',
        from: 'pending',
        to: 'captured',
        by: payment.user || user || null,
        metadata: { invoiceNo, provider: PROVIDER, confirmationCode },
      }, session);
      await ActivityLog.create([{
        action: 'payment_verified',
        performedBy: payment.user || user || null,
        targetUser: payment.user || user || null,
        meta: {
          paymentId: payment._id,
          merchantReference: payment.merchant_reference,
          orderTrackingId: trackingId,
          confirmationCode,
          invoiceNo,
          amount: payment.amount,
          label: payment.label,
          provider: PROVIDER,
        },
      }], { session });
      await session.commitTransaction();

      const finalPayment = await this.repository.findById(payment._id);
      this._sendNotifications(payment.user || user, finalPayment, invoiceNo)
        .catch((err) => logger.error(MODULE, 'Post-commit notification error', { error: err.message }));
      notifyBookOrderPaid(payment._id)
        .catch((err) => logger.error(MODULE, 'Book order notification error', { error: err.message }));
      logger.info(MODULE, 'Payment verified and fulfilled (Pesapal)', {
        paymentId: String(payment._id),
        merchantReference: payment.merchant_reference,
        invoiceNo,
      });
      return { payment: finalPayment, invoiceNo, idempotent: false };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Handle a Pesapal IPN (IPNCHANGE). Never captures directly —
   * always delegates to verifyAndCapture (server-to-server).
   * Deduplicates via WebhookEvent (eventId = pesapal:<trackingId>).
   */
  async handleIpn({ trackingId, merchantReference }) {
    if (!trackingId && !merchantReference) {
      throw new PaymentVerificationError('IPN requires OrderTrackingId or merchant reference');
    }
    const { default: WebhookEvent } = await import('./models/WebhookEvent.js');
    const eventId = `pesapal:${trackingId || merchantReference}`;
    const existing = await WebhookEvent.findOne({ eventId, status: { $in: ['processing', 'processed'] } }).lean();
    if (existing) {
      logger.info(MODULE, 'Duplicate IPN – already processed', { eventId });
      // Still attempt verify in case the first attempt failed pre-capture.
      try {
        const result = await this.verifyAndCapture({ merchantReference, checkoutId: trackingId });
        return { ...result, duplicate: true };
      } catch (err) {
        if (err.code === 'PROVIDER_PENDING') return { pending: true, duplicate: true };
        throw err;
      }
    }
    await WebhookEvent.create({
      eventId,
      event: 'pesapal.ipn',
      payload: { trackingId, merchantReference },
      status: 'processing',
      attempts: 1,
    });
    try {
      const result = await this.verifyAndCapture({ merchantReference, checkoutId: trackingId });
      await WebhookEvent.updateOne({ eventId }, { $set: { status: 'processed', processedAt: new Date() } });
      return result;
    } catch (err) {
      if (err.code === 'PROVIDER_PENDING') {
        // Pending is not a failure — keep event for reconciliation, do not DLQ.
        await WebhookEvent.updateOne({ eventId }, { $set: { status: 'processed', processedAt: new Date(), lastError: 'pending' } });
        return { pending: true };
      }
      await WebhookEvent.updateOne({ eventId }, { $set: { status: 'failed', lastError: String(err.message).slice(0, 500) } });
      throw err;
    }
  }

  /** Owner-scoped status read. Opportunistically captures if provider completed. */
  async getStatus({ merchantReference, checkoutId, paymentId, user }) {
    const payment = await this._locatePayment({ merchantReference, checkoutId, paymentId });
    if (user && payment.user && String(payment.user) !== String(user)) {
      throw new PaymentVerificationError('Payment does not belong to this user');
    }
    if (payment.paymentStatus === 'pending' || payment.paymentStatus === 'initiated') {
      const trackingId = checkoutId || payment.provider_checkout_id || payment.provider_order_id;
      if (trackingId) {
        try {
          const result = await this.verifyAndCapture({
            merchantReference: payment.merchant_reference,
            checkoutId: trackingId,
          });
          return { payment: result.payment, refreshed: true, idempotent: !!result.idempotent };
        } catch (err) {
          if (err.code === 'PROVIDER_PENDING') {
            return { payment, refreshed: false, pending: true };
          }
          if (err.code === 'PROVIDER_FAILED' || err.code === 'PROVIDER_NOT_COMPLETED') {
            const fresh = await this.repository.findById(payment._id);
            return { payment: fresh || payment, refreshed: true, failed: true, reason: err.message };
          }
          return { payment, refreshed: false, error: err.message };
        }
      }
    }
    return { payment, refreshed: false };
  }

  async _sendNotifications(userId, payment, invoiceNo) {
    try {
      if (!userId) return;
      const user = await User.findById(userId).select('name email').lean();
      const amountMajor = (payment.amount / 100).toFixed(2);
      const amountDisplay = `KES ${amountMajor}`;

      const mod = await import('../notification/core/NotificationService.js');
      const ns = mod.default;

      ns.send(userId, {
        channels: ['inApp'],
        data: {
          merchantReference: payment.merchant_reference,
          providerTransactionId: payment.provider_transaction_id || '',
          amount: payment.amount,
          invoiceNo,
        },
        subject: 'Payment Successful',
        message: `Payment of ${amountDisplay} was successful. Invoice: ${invoiceNo}`,
        priority: 'normal',
      }).catch((err) => logger.error(MODULE, 'In-app notification failed', { error: err.message }));

      if (user?.email) {
        emailService.sendInvoice({
          email: user.email,
          name: user.name,
          invoiceNumber: invoiceNo,
          amount: amountDisplay,
          description: payment.label || 'Purchase',
          invoiceDate: new Date().toLocaleDateString('en-KE'),
          paymentMethod: 'Pesapal',
        }).catch((err) => logger.error(MODULE, 'Invoice email failed', { error: err.message }));

        emailService.sendPaymentSuccess({
          email: user.email,
          name: user.name,
          amount: amountDisplay,
          transactionId: payment.provider_transaction_id || payment.merchant_reference || '',
          orderId: payment.merchant_reference || '',
          description: payment.label || 'Purchase',
          paymentDate: new Date().toLocaleString('en-KE'),
        }).catch((err) => logger.error(MODULE, 'Payment success email failed', { error: err.message }));
      }

      emailService.sendPaymentReceivedAdmin({
        customerName: user?.name || 'Unknown',
        customerEmail: user?.email || '',
        order: payment.label || 'Purchase',
        amount: amountDisplay,
        paymentId: payment.provider_transaction_id || payment.merchant_reference || '',
        razorpayOrderId: payment.merchant_reference || '',
      }).catch((err) => logger.error(MODULE, 'Admin payment notification failed', { error: err.message }));
    } catch (err) {
      logger.error(MODULE, 'Notification module import failed – skipping notifications', { error: err.message });
    }
  }

  // ── Legacy compat (Razorpay/M-Pesa removed) ──────────────────
  /** @deprecated — kept so old imports fail loudly instead of silently. */
  async verify() {
    throw new PaymentVerificationError('Legacy verification removed. Use verifyAndCapture with merchant_reference.');
  }

  /** @deprecated */
  async _doInitiate() {
    throw new PaymentVerificationError('Legacy initiation removed. Use initiateIntent/initiate (Pesapal).');
  }
}

export default PaymentService;
