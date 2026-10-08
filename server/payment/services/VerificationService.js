// ============================================================
// services/VerificationService.js — Provider-neutral verification.
// Rule: a payment is captured ONLY after server-to-server status
// fetch + amount + currency + merchant-reference equality.
// Never trusts frontend, redirect params, or IPN alone.
// ============================================================
import { PaymentVerificationError } from '../errors/PaymentErrors.js';
import { PaymentStateMachine } from '../state/PaymentStateMachine.js';
import { amountsEqual } from '../../utils/money.js';
import logger from '../../notification/logger.js';

const MODULE = 'VerificationService';

export class VerificationService {
  verifyOwnership(payment, userId) {
    if (!userId) return true; // guest/server flows validate via reference instead
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

  verifyAmount(providerAmountMinor, expectedAmountMinor) {
    if (providerAmountMinor == null) {
      throw new PaymentVerificationError('Provider did not return an amount — refusing capture');
    }
    if (!amountsEqual(providerAmountMinor, expectedAmountMinor)) {
      logger.warn(MODULE, 'Amount mismatch', { providerAmountMinor, expectedAmountMinor });
      throw new PaymentVerificationError(
        `Amount mismatch: provider reported ${providerAmountMinor}, expected ${expectedAmountMinor}`,
      );
    }
    return true;
  }

  verifyCurrency(providerCurrency, expectedCurrency = 'KES') {
    const got = String(providerCurrency || '').toUpperCase();
    const want = String(expectedCurrency || 'KES').toUpperCase();
    if (got !== want) {
      throw new PaymentVerificationError(`Currency mismatch: expected ${want}, got ${providerCurrency}`);
    }
    return true;
  }

  verifyMerchantReference(providerReference, expectedReference) {
    if (!providerReference || !expectedReference) {
      throw new PaymentVerificationError('Merchant reference missing — refusing capture');
    }
    if (String(providerReference) !== String(expectedReference)) {
      logger.warn(MODULE, 'Merchant reference mismatch', { providerReference, expectedReference });
      throw new PaymentVerificationError('Merchant reference mismatch');
    }
    return true;
  }

  async checkTransactionIdNotDuplicate(providerTransactionId, repository, currentPaymentId) {
    if (!providerTransactionId) return true;
    const existing = await repository.findByProviderTransactionId(String(providerTransactionId));
    if (existing && String(existing._id) !== String(currentPaymentId)) {
      logger.warn(MODULE, 'Duplicate provider transaction detected', { providerTransactionId });
      throw new PaymentVerificationError('This provider transaction has already been processed');
    }
    return true;
  }

  /**
   * Full server-to-server verification via a provider.
   * @param {Object} args.payment — Payment doc
   * @param {Object} args.provider — PaymentProvider instance
   * @param {string} args.checkoutId — OrderTrackingId / provider order id
   */
  async verifyWithProvider({ payment, provider, checkoutId, repository }) {
    this.verifyPaymentStatus(payment);
    const status = await provider.getTransactionStatus(checkoutId);
    const canonical = provider.mapStatus(status.statusDescription || status.status);
    if (canonical !== 'captured') {
      const err = new PaymentVerificationError(`Provider reports payment as "${status.statusDescription || status.status}"`);
      err.providerStatus = status.status;
      err.code = 'PROVIDER_NOT_COMPLETED';
      throw err;
    }
    this.verifyAmount(status.amountMinor, payment.amount);
    this.verifyCurrency(status.currency, payment.currency);
    const expectedRef = payment.merchant_reference;
    if (expectedRef) this.verifyMerchantReference(status.merchantReference, expectedRef);
    if (repository) {
      await this.checkTransactionIdNotDuplicate(
        status.confirmationCode || status.merchantReference,
        repository,
        payment._id,
      );
    }
    return status;
  }
}

export default VerificationService;
