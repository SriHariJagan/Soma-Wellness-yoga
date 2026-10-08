// ============================================================
// gateways/pesapal/PesapalProvider.js — PaymentProvider for Pesapal.
// Owns ALL Pesapal HTTP + parsing. PaymentService never touches
// OrderTrackingId/IPN shapes directly.
// ============================================================
import { PaymentProvider } from '../PaymentProvider.js';
import pesapalClient from './PesapalClient.js';
import { toMinor, toPesapalAmount } from '../../../utils/money.js';

const MODULE = 'PesapalProvider';

function callbackUrl() {
  // Per-order callback (return) URL sent to Pesapal in SubmitOrder.
  if (process.env.PESAPAL_CALLBACK_URL) return process.env.PESAPAL_CALLBACK_URL;
  const server = (process.env.SERVER_URL || '').replace(/\/$/, '');
  if (server) return `${server}/payment/return`;
  const frontend = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  return frontend ? `${frontend}/payment/return` : '';
}

function notificationId() {
  return process.env.PESAPAL_IPN_ID || process.env.PESAPAL_NOTIFICATION_ID || '';
}

class PesapalProvider extends PaymentProvider {
  constructor(client = pesapalClient) {
    super();
    this.name = 'pesapal';
    this.client = client;
  }

  get isConfigured() {
    return this.client.isConfigured && !!notificationId() && !!callbackUrl();
  }

  configurationStatus() {
    return {
      configured: this.isConfigured,
      hasCredentials: this.client.isConfigured,
      hasIpnId: !!notificationId(),
      hasCallbackUrl: !!callbackUrl(),
      baseUrl: this.client.baseUrl,
    };
  }

  /**
   * Build + submit a Pesapal order for an already-priced Payment doc.
   * @param {Object} args.payment — Payment doc (amount in MINOR, currency, merchant_reference, label)
   * @param {Object} args.customer — { email, phone, countryCode, firstName, lastName }
   */
  async createOrder({ payment, customer = {}, callback_url, cancellation_url } = {}) {
    if (!payment) throw new Error('createOrder requires payment');
    const merchantRef = payment.merchant_reference || payment.merchantReference;
    if (!merchantRef) throw new Error('Payment is missing merchant_reference');
    const nid = notificationId();
    if (!nid) throw new Error('PESAPAL_IPN_ID is not configured');
    const cb = callback_url || callbackUrl();
    if (!cb) throw new Error('Pesapal callback URL is not configured');

    const email = customer.email || customer.email_address || '';
    const phone = customer.phone || customer.phone_number || '';
    if (!email && !phone) {
      throw new Error('Pesapal requires customer email or phone');
    }
    const order = {
      id: merchantRef,
      currency: String(payment.currency || 'KES').toUpperCase(),
      amount: toPesapalAmount(payment.amount),
      description: String(payment.label || 'Soma Wellness payment').slice(0, 100),
      callback_url: cb,
      notification_id: nid,
      billing_address: {
        email_address: email || undefined,
        phone_number: phone || undefined,
        country_code: customer.countryCode || customer.country_code || 'KE',
        first_name: customer.firstName || customer.first_name || '',
        last_name: customer.lastName || customer.last_name || '',
        line_1: customer.line1 || '',
        city: customer.city || '',
      },
    };
    if (cancellation_url) order.cancellation_url = cancellation_url;
    if (process.env.PESAPAL_BRANCH) order.branch = process.env.PESAPAL_BRANCH;

    // Strip undefined to keep payload clean
    order.billing_address = Object.fromEntries(
      Object.entries(order.billing_address).filter(([, v]) => v !== undefined && v !== ''),
    );

    const submitted = await this.client.submitOrder(order);
    return {
      providerOrderId: submitted.orderTrackingId,
      checkoutId: submitted.orderTrackingId,
      redirectUrl: submitted.redirectUrl,
      merchantReference: submitted.merchantReference || merchantRef,
      raw: submitted.raw,
    };
  }

  async getTransactionStatus(checkoutId) {
    const s = await this.client.getTransactionStatus(checkoutId);
    let amountMinor = null;
    if (s.amount !== null && s.amount !== undefined && s.amount !== '') {
      const n = Number(s.amount);
      amountMinor = Number.isFinite(n) ? toMinor(n) : null;
    }
    return { ...s, amountMinor };
  }

  /**
   * Parse callback/IPN from an Express req (GET query or POST body).
   * Returns { trackingId, merchantReference, notificationType }.
   */
  parseCallback(req) {
    const q = req.query || {};
    const b = (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) ? req.body : {};
    const trackingId = q.OrderTrackingId || q.orderTrackingId || q.order_tracking_id
      || b.OrderTrackingId || b.orderTrackingId || b.order_tracking_id || null;
    const merchantReference = q.OrderMerchantReference || q.orderMerchantReference || q.merchant_reference
      || b.OrderMerchantReference || b.orderMerchantReference || b.merchant_reference || null;
    const notificationType = q.OrderNotificationType || q.orderNotificationType
      || b.OrderNotificationType || b.orderNotificationType || null;
    return { trackingId, merchantReference, notificationType };
  }

  mapStatus(rawStatus) {
    const s = String(rawStatus || '').toUpperCase();
    if (s === 'COMPLETED' || s === '1') return 'captured';
    if (s === 'FAILED' || s === '2') return 'failed';
    if (s === 'REVERSED' || s === '3') return 'failed';
    if (s === 'INVALID' || s === '0') return 'failed';
    return 'pending';
  }

  async refund({ confirmationCode, amountMinor, username, remarks }) {
    if (!confirmationCode) throw new Error('Pesapal refund requires confirmationCode');
    const major = Number((Number(amountMinor) / 100).toFixed(2));
    return this.client.refundRequest({
      confirmationCode,
      amount: major,
      username: username || 'admin',
      remarks: remarks || 'Refund requested',
    });
  }
}

const pesapalProvider = new PesapalProvider();
export { PesapalProvider, callbackUrl, notificationId };
export default pesapalProvider;
