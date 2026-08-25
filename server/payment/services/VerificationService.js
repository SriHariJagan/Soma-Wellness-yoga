import crypto from 'crypto';
import razorpay from '../../config/razorpay.js';
import {
  PaymentVerificationError,
  PaymentNotFoundError,
} from '../errors/PaymentErrors.js';
import { PaymentStateMachine } from '../state/PaymentStateMachine.js';
import logger from '../../notification/logger.js';

const MODULE = 'VerificationService';

export class VerificationService {
  async verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (typeof razorpaySignature !== 'string' || expected.length !== razorpaySignature.length) {
      logger.warn(MODULE, 'Signature mismatch', { razorpayOrderId, razorpayPaymentId });
      throw new PaymentVerificationError('Payment signature verification failed');
    }

    try {
      const match = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpaySignature));
      if (!match) throw new Error('mismatch');
    } catch {
      logger.warn(MODULE, 'Signature mismatch', { razorpayOrderId, razorpayPaymentId });
      throw new PaymentVerificationError('Payment signature verification failed');
    }

    return true;
  }

  async fetchPaymentFromGateway(razorpayPaymentId) {
    try {
      const gatewayPayment = await razorpay.payments.fetch(razorpayPaymentId);
      return gatewayPayment;
    } catch (err) {
      logger.error(MODULE, 'Failed to fetch payment from Razorpay', {
        razorpayPaymentId,
        error: err.message,
      });
      throw new PaymentVerificationError('Failed to verify payment with gateway');
    }
  }

  verifyAmount(gatewayAmount, expectedAmount) {
    if (Number(gatewayAmount) !== Number(expectedAmount)) {
      logger.warn(MODULE, 'Amount mismatch', {
        gatewayAmount,
        expectedAmount,
      });
      throw new PaymentVerificationError(
        `Amount mismatch: gateway returned ${gatewayAmount}, expected ${expectedAmount}`,
      );
    }
    return true;
  }

  verifyCurrency(gatewayCurrency, expectedCurrency = 'INR') {
    if (gatewayCurrency !== expectedCurrency) {
      throw new PaymentVerificationError(
        `Currency mismatch: expected ${expectedCurrency}, got ${gatewayCurrency}`,
      );
    }
    return true;
  }

  verifyOwnership(payment, userId) {
    if (String(payment.user) !== String(userId)) {
      logger.warn(MODULE, 'Payment does not belong to user', {
        paymentUserId: String(payment.user),
        requestUserId: String(userId),
      });
      throw new PaymentVerificationError('Payment does not belong to this user');
    }
    return true;
  }

  verifyPaymentStatus(payment) {
    if (!PaymentStateMachine.canCapture(payment.paymentStatus)) {
      logger.warn(MODULE, 'Invalid payment status for capture', {
        currentStatus: payment.paymentStatus,
        paymentId: String(payment._id),
      });
      throw new PaymentVerificationError(
        `Payment cannot be verified: current status is "${payment.paymentStatus}"`,
      );
    }
    return true;
  }

  async checkSignatureNotReused(razorpaySignature, repository) {
    const existing = await repository.findBySignature(razorpaySignature);
    if (existing) {
      logger.warn(MODULE, 'Signature already used', { razorpaySignature });
      throw new PaymentVerificationError('This payment signature has already been used');
    }
    return true;
  }

  async checkPaymentIdNotDuplicate(razorpayPaymentId, repository) {
    const existing = await repository.findByPaymentIdCaptured(razorpayPaymentId);
    if (existing) {
      logger.warn(MODULE, 'Duplicate payment ID detected', { razorpayPaymentId });
      throw new PaymentVerificationError('This payment has already been processed');
    }
    return true;
  }

  async verify({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    userId,
    payment,
    repository,
  }) {
    await this.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    await this.checkPaymentIdNotDuplicate(razorpayPaymentId, repository);

    await this.checkSignatureNotReused(razorpaySignature, repository);

    this.verifyOwnership(payment, userId);

    this.verifyPaymentStatus(payment);

    const gatewayPayment = await this.fetchPaymentFromGateway(razorpayPaymentId);

    this.verifyAmount(gatewayPayment.amount, payment.amount);

    this.verifyCurrency(gatewayPayment.currency, payment.currency);

    return {
      gatewayPayment,
      gatewayAmount: gatewayPayment.amount,
      gatewayCurrency: gatewayPayment.currency,
      gatewayStatus: gatewayPayment.status,
    };
  }
}

export default VerificationService;
