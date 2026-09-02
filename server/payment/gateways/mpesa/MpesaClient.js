// ============================================================
// MpesaClient.js — Safaricom Daraja API client
// Handles OAuth token generation and STK Push initiation
// ============================================================
import crypto from "crypto";
import logger from "../../../notification/logger.js";

const MODULE = "MpesaClient";

const DARAJA_BASE =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

class MpesaClient {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.callbackUrl = process.env.MPESA_CALLBACK_URL;
    this.timeout = 30;
  }

  get isConfigured() {
    return !!(this.consumerKey && this.consumerSecret && this.shortcode && this.passkey);
  }

  /** Base64-encode consumer key:secret for OAuth */
  _basicAuth() {
    const raw = `${this.consumerKey}:${this.consumerSecret}`;
    return Buffer.from(raw).toString("base64");
  }

  /** Fetch an OAuth access token from Daraja (valid ~59 min) */
  async getAccessToken() {
    const url = `${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`;
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${this._basicAuth()}` },
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`OAuth request failed (${res.status} ${res.statusText}): non-JSON response — ${text.slice(0, 200) || "empty body"}`);
    }
    if (!res.ok || !data.access_token) {
      throw new Error(`OAuth failed (${res.status}): ${JSON.stringify(data)}`);
    }
    return data.access_token;
  }

  /**
   * Generate the Daraja password string:
   *   Base64( Shortcode + Passkey + Timestamp )
   */
  _generatePassword(timestamp) {
    const str = `${this.shortcode}${this.passkey}${timestamp}`;
    return Buffer.from(str).toString("base64");
  }

  /**
   * Initiate an STK Push (Lipa Na M-PESA Online) request.
   * @param {Object} opts
   * @param {string} opts.phone     — MSISDN, e.g. "254712345678"
   * @param {number} opts.amount    — Amount in KES (integer)
   * @param {string} opts.accountRef — Account/Order reference (max 12 chars)
   * @param {string} [opts.description] — Description shown to the user (max 13 chars)
   * @returns {Object} Daraja response body
   */
  async stkPush({ phone, amount, accountRef, description }) {
    if (!this.isConfigured) {
      throw new Error("MPESA Daraja credentials not configured");
    }

    const normalised = this._normalisePhone(phone);
    const timestamp = this._timestamp();
    const password = this._generatePassword(timestamp);

    const body = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: normalised,
      PartyB: this.shortcode,
      PhoneNumber: normalised,
      CallBackURL: this.callbackUrl,
      AccountReference: (accountRef || "SOMA").slice(0, 12),
      TransactionDesc: (description || "Payment").slice(0, 13),
    };

    const token = await this.getAccessToken();
    const url = `${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout * 1000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error(MODULE, "STK Push HTTP error", { status: res.status, body: text });
      throw new Error(`Daraja STK Push failed: ${res.status}`);
    }

    const data = await res.json();
    if (data.errorCode) {
      logger.error(MODULE, "STK Push failed", { code: data.errorCode, msg: data.errorMessage, phone: normalised });
    }
    return data;
  }

  /**
   * Check the status of an STK Push transaction.
   * @param {string} checkoutRequestId — The CheckoutRequestID from the STK Push response
   * @returns {Object} Daraja query response
   */
  async queryStatus(checkoutRequestId) {
    if (!checkoutRequestId) throw new Error("checkoutRequestId is required");
    const timestamp = this._timestamp();
    const password = this._generatePassword(timestamp);
    let token;
    try {
      token = await this.getAccessToken();
    } catch (err) {
      logger.error(MODULE, "Query status - failed to get access token", { error: err.message });
      // Return pending status instead of throwing 500 — allows frontend to keep polling or show retry
      return { ResultCode: 1037, ResultDesc: "Pending - unable to verify status, please wait", _error: err.message };
    }

    const url = `${DARAJA_BASE}/mpesa/transactionstatus/v1/query`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Initiator: process.env.MPESA_INITIATOR_NAME || "soma",
          SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL || "",
          CommandID: "TransactionStatusQuery",
          TransactionID: checkoutRequestId,
          PartyA: this.shortcode,
          IdentifierType: "4",
          ResultURL: this.callbackUrl,
          QueueTimeOutURL: this.callbackUrl,
          Remarks: "Status query",
          Occasion: "Status check",
        }),
        signal: AbortSignal.timeout(this.timeout * 1000),
      });

      const text = await res.text().catch(() => "");
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

      if (!res.ok) {
        logger.warn(MODULE, "Query status returned non-OK, treating as pending", { status: res.status, body: text.slice(0, 500) });
        // Daraja often returns 400 for pending/unknown transaction — treat as pending, not 500
        return { ResultCode: 1037, ResultDesc: data.errorMessage || data.errorDesc || `Pending (${res.status})`, _httpStatus: res.status, ...data };
      }

      return data;
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        logger.warn(MODULE, "Query status timeout", { checkoutRequestId });
        return { ResultCode: 1037, ResultDesc: "Pending - verification timeout, retrying", _error: err.message };
      }
      logger.error(MODULE, "Query status error", { error: err.message });
      return { ResultCode: 1037, ResultDesc: "Pending - verification error, retrying", _error: err.message };
    }
  }

  /** Kenya phone normalisation: strip +, leading 0, etc. → 254xxxxxxxxx */
  _normalisePhone(phone) {
    let p = String(phone).replace(/[\s\-()]/g, "");
    if (p.startsWith("+")) p = p.slice(1);
    if (p.startsWith("0")) p = "254" + p.slice(1);
    if (!p.startsWith("254")) p = "254" + p;
    return p;
  }

  /** Daraja timestamp: YYYYMMDDHHmmss */
  _timestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return (
      d.getFullYear().toString() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds())
    );
  }
}

export default new MpesaClient();
