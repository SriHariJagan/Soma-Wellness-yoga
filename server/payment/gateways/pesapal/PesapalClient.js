// ============================================================
// gateways/pesapal/PesapalClient.js — Pesapal API v3 REST client.
// Docs: https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/api-reference
// Endpoints verified 2026-10:
//   POST {base}/api/Auth/RequestToken {consumer_key, consumer_secret}
//   POST {base}/api/URLSetup/RegisterIPN {url, ipn_notification_type}
//   POST {base}/api/Transactions/SubmitOrderRequest {...}
//   GET  {base}/api/Transactions/GetTransactionStatus?orderTrackingId=...
//   POST {base}/api/Transactions/RefundRequest {confirmation_code, amount, username, remarks}
//   POST {base}/api/Transactions/CancelOrder {order_tracking_id}
// Base: sandbox https://cybqa.pesapal.com/pesapalv3
//       live    https://pay.pesapal.com/v3
// Server-side only. Never log credentials or Authorization headers.
// ============================================================
import logger from '../../../notification/logger.js';

const MODULE = 'PesapalClient';

// Token is valid ~5 minutes per docs. Cache with 60s safety margin.
const TOKEN_SAFETY_MS = 60 * 1000;

function resolveBaseUrl() {
  if (process.env.PESAPAL_API_URL) return process.env.PESAPAL_API_URL.replace(/\/$/, '');
  const env = (process.env.PESAPAL_ENV || 'sandbox').toLowerCase();
  return env === 'production' || env === 'live' || env === 'prod'
    ? 'https://pay.pesapal.com/v3'
    : 'https://cybqa.pesapal.com/pesapalv3';
}

class PesapalClient {
  constructor() {
    this._token = null;
    this._tokenExpiry = 0;
    this.timeoutMs = Number(process.env.PESAPAL_TIMEOUT_MS || 30000);
  }

  get baseUrl() {
    return resolveBaseUrl();
  }

  get isConfigured() {
    return !!(process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET);
  }

  _assertConfigured() {
    if (!this.isConfigured) {
      throw new Error('Pesapal credentials not configured (PESAPAL_CONSUMER_KEY/SECRET)');
    }
  }

  async _fetch(path, { method = 'GET', body, auth = true } = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
    if (auth) {
      const token = await this.getAccessToken();
      headers.Authorization = `Bearer ${token}`;
    }
    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      logger.error(MODULE, 'Pesapal request network error', { path, error: err.message });
      throw new Error(`Pesapal request failed: ${err.message}`);
    }
    const text = await res.text().catch(() => '');
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Pesapal non-JSON response (${res.status}): ${String(text).slice(0, 200)}`);
    }
    if (!res.ok) {
      const msg = data?.error?.message || data?.message || `HTTP ${res.status}`;
      logger.error(MODULE, 'Pesapal API error', { path, status: res.status, message: String(msg).slice(0, 300) });
      const err = new Error(`Pesapal API error (${res.status}): ${msg}`);
      err.statusCode = res.status;
      err.providerData = data;
      throw err;
    }
    return data;
  }

  /** Fetch (and cache) a bearer token. Token TTL ~5 min. */
  async getAccessToken(force = false) {
    this._assertConfigured();
    const now = Date.now();
    if (!force && this._token && now < this._tokenExpiry - TOKEN_SAFETY_MS) {
      return this._token;
    }
    const url = `${this.baseUrl}/api/Auth/RequestToken`;
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumer_key: process.env.PESAPAL_CONSUMER_KEY,
          consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      logger.error(MODULE, 'Pesapal auth network error', { error: err.message });
      throw new Error(`Pesapal auth failed: ${err.message}`);
    }
    const text = await res.text().catch(() => '');
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Pesapal auth non-JSON response (${res.status})`);
    }
    if (!res.ok || !data.token) {
      logger.error(MODULE, 'Pesapal auth failed', { status: res.status });
      throw new Error(`Pesapal auth failed (${res.status}): ${data?.error?.message || data?.message || 'no token'}`);
    }
    this._token = data.token;
    const expiry = Date.parse(data.expiryDate);
    this._tokenExpiry = Number.isFinite(expiry) ? expiry : now + 4 * 60 * 1000;
    return this._token;
  }

  /** For tests: clear cached token. */
  _clearToken() {
    this._token = null;
    this._tokenExpiry = 0;
  }

  async registerIPN(url, type = 'POST') {
    const t = String(type).toUpperCase() === 'GET' ? 'GET' : 'POST';
    return this._fetch('/api/URLSetup/RegisterIPN', {
      method: 'POST',
      body: { url, ipn_notification_type: t },
    });
  }

  async getIPNList() {
    return this._fetch('/api/URLSetup/GetIpnList', { method: 'GET' });
  }

  /**
   * Submit an order. `order` follows Pesapal docs:
   * { id, currency, amount (major float), description, callback_url,
   *   cancellation_url?, notification_id, branch?, billing_address }
   */
  async submitOrder(order) {
    if (!order || !order.id || !order.currency || order.amount == null || !order.callback_url || !order.notification_id) {
      throw new Error('submitOrder requires id, currency, amount, callback_url, notification_id');
    }
    const data = await this._fetch('/api/Transactions/SubmitOrderRequest', {
      method: 'POST',
      body: order,
    });
    if (!data.order_tracking_id || !data.redirect_url) {
      throw new Error(`Pesapal SubmitOrder invalid response: ${JSON.stringify(data).slice(0, 300)}`);
    }
    return {
      orderTrackingId: data.order_tracking_id,
      merchantReference: data.merchant_reference || order.id,
      redirectUrl: data.redirect_url,
      raw: data,
    };
  }

  /**
   * Server-to-server status check. Returns normalized object.
   * Docs: payment_status_description COMPLETED|FAILED|INVALID|REVERSED,
   * status_code 0|1|2|3. Amount is MAJOR units.
   */
  async getTransactionStatus(orderTrackingId) {
    if (!orderTrackingId) throw new Error('orderTrackingId is required');
    const q = `?orderTrackingId=${encodeURIComponent(orderTrackingId)}`;
    const data = await this._fetch(`/api/Transactions/GetTransactionStatus${q}`, { method: 'GET' });
    const code = Number(data.status_code ?? data.payment_status_code ?? NaN);
    const desc = String(data.payment_status_description || '').toUpperCase();
    let canonical = 'pending';
    if (code === 1 || desc === 'COMPLETED') canonical = 'completed';
    else if (code === 2 || desc === 'FAILED') canonical = 'failed';
    else if (code === 3 || desc === 'REVERSED') canonical = 'reversed';
    else if (code === 0 || desc === 'INVALID') canonical = 'invalid';
    return {
      status: canonical,
      statusCode: Number.isFinite(code) ? code : null,
      statusDescription: data.payment_status_description || null,
      amount: data.amount ?? null,
      currency: data.currency || null,
      merchantReference: data.merchant_reference || null,
      confirmationCode: data.confirmation_code || null,
      paymentMethod: data.payment_method || null,
      paymentAccount: data.payment_account || null,
      description: data.description || null,
      raw: data,
    };
  }

  /**
   * Refund a COMPLETED payment. Docs: single refund per payment;
   * mobile-money payments support FULL refund only.
   * Returns { accepted: boolean, raw }.
   */
  async refundRequest({ confirmationCode, amount, username, remarks }) {
    if (!confirmationCode || amount == null || !username || !remarks) {
      throw new Error('refundRequest requires confirmationCode, amount, username, remarks');
    }
    const data = await this._fetch('/api/Transactions/RefundRequest', {
      method: 'POST',
      body: {
        confirmation_code: confirmationCode,
        amount: Number(Number(amount).toFixed(2)),
        username,
        remarks,
      },
    });
    const status = String(data.status ?? '');
    return { accepted: status === '200', raw: data };
  }

  async cancelOrder(orderTrackingId) {
    if (!orderTrackingId) throw new Error('orderTrackingId is required');
    return this._fetch('/api/Transactions/CancelOrder', {
      method: 'POST',
      body: { order_tracking_id: orderTrackingId },
    });
  }
}

const pesapalClient = new PesapalClient();
export { PesapalClient, resolveBaseUrl };
export default pesapalClient;
