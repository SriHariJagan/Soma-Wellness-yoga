// ============================================================
// payment/gateways/PaymentProvider.js — Provider abstraction.
// Business logic depends ONLY on this interface + canonical states.
// Canonical paymentStatus: initiated|pending|captured|failed|expired|refunding|refunded
// Canonical providerStatus: completed|failed|pending|invalid|reversed (normalized)
// ============================================================

export const CANONICAL_STATUSES = ['initiated', 'pending', 'captured', 'failed', 'expired', 'refunding', 'refunded'];

/**
 * Base class — documents the contract. Concrete providers
 * (PesapalProvider) extend this. No HTTP logic lives here.
 */
export class PaymentProvider {
  constructor() {
    if (new.target === PaymentProvider) {
      // Allow instantiation only as base for documentation; subclasses override.
    }
    this.name = 'base';
  }

  get isConfigured() {
    return false;
  }

  /** Create a provider order. Returns { providerOrderId, checkoutId, redirectUrl, raw } */
  // eslint-disable-next-line no-unused-vars
  async createOrder({ payment, customer, callbackUrl, cancellationUrl }) {
    throw new Error(`${this.name}.createOrder() not implemented`);
  }

  /** Server-to-server status check. Returns normalized { status, amountMinor, currency, transactionId, raw } */
  // eslint-disable-next-line no-unused-vars
  async getTransactionStatus(checkoutId) {
    throw new Error(`${this.name}.getTransactionStatus() not implemented`);
  }

  /** Parse an incoming IPN/callback into { trackingId, merchantReference, notificationType } */
  // eslint-disable-next-line no-unused-vars
  parseCallback(req) {
    throw new Error(`${this.name}.parseCallback() not implemented`);
  }

  /** Map raw provider status → canonical paymentStatus. */
  mapStatus(rawStatus) {
    const s = String(rawStatus || '').toUpperCase();
    if (s === 'COMPLETED' || s === '1') return 'captured';
    if (s === 'FAILED' || s === '2') return 'failed';
    if (s === 'REVERSED' || s === '3') return 'failed';
    if (s === 'INVALID' || s === '0') return 'failed';
    return 'pending';
  }

  /** Refund — override if provider supports it. */
  // eslint-disable-next-line no-unused-vars
  async refund({ transactionId, amountMinor, username, remarks }) {
    throw new Error(`${this.name} refund not supported`);
  }
}

export default PaymentProvider;
