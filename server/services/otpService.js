// ============================================================
// services/otpService.js — OTP generation, hashing, send & verify
// Email OTP (primary MVP) + SMS stub (Africa's Talking / Twilio if configured)
// ============================================================
import crypto from 'crypto';
import Otp from '../models/Otp.js';
import emailService from './email/email.service.js';
import logger from '../notification/logger.js';

const MODULE = 'OtpService';

const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6', 10);
const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || '10', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
const RESEND_COOLDOWN_SEC = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);

function normalizeIdentifier(raw, channel) {
  const v = String(raw || '').trim();
  if (channel === 'email') return v.toLowerCase();
  // phone: strip spaces/dashes, ensure + prefix handling — store as digits-only lower
  return v.replace(/[\s\-\(\)]/g, '').toLowerCase();
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function generateRawOtp() {
  const digits = '0123456789';
  let otp = '';
  // crypto-secure random digits
  const bytes = crypto.randomBytes(OTP_LENGTH);
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[bytes[i] % 10];
  }
  // ensure length 6 and not all same
  if (/^(\d)\1+$/.test(otp)) {
    return generateRawOtp();
  }
  return otp;
}

function getExpiryDate() {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}

// Send a real SMS through Africa's Talking.
// Sandbox accounts (AT_USERNAME=sandbox) hit the sandbox endpoint.
// Throws on any provider rejection or network failure.
async function sendSmsViaAT({ to, otp }) {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  const isSandbox = username === 'sandbox' || process.env.AT_ENV === 'sandbox';
  const endpoint = isSandbox
    ? 'https://api.sandbox.africastalking.com/version1/messaging'
    : 'https://api.africastalking.com/version1/messaging';

  const message = `Your Soma Wellness verification code is ${otp}. Valid for ${OTP_TTL_MINUTES} minutes. Do not share it.`;
  const form = new URLSearchParams({ username, to, message });
  if (process.env.AT_SENDER_ID) form.set('from', process.env.AT_SENDER_ID);

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15000);
  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      signal: ctrl.signal,
    });
  } catch (err) {
    throw new Error(err.name === 'AbortError' ? 'SMS provider timed out' : `SMS provider unreachable: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON error body
  }
  if (!res.ok) {
    const detail = data?.SMSMessageData?.Message || (typeof data === 'string' ? data : JSON.stringify(data)) || res.statusText;
    throw new Error(`SMS provider rejected request (${res.status}): ${detail}`);
  }

  const recipients = data?.SMSMessageData?.Recipients || [];
  const ok = recipients.find((r) => r.status === 'Success');
  if (!ok) {
    const detail = recipients.map((r) => `${r.number}: ${r.status}`).join('; ') || data?.SMSMessageData?.Message || 'no recipient accepted';
    throw new Error(`SMS not accepted: ${detail}`);
  }
  return { messageId: ok.messageId || '', cost: ok.cost || '' };
}

export async function sendOtp({ identifier, channel, name = 'there' }) {
  const norm = normalizeIdentifier(identifier, channel);
  if (!norm) throw new Error('Identifier required');

  const now = new Date();
  const existing = await Otp.findOne({ identifier: norm, channel });

  if (existing) {
    const elapsed = (now - new Date(existing.lastSentAt)) / 1000;
    if (elapsed < RESEND_COOLDOWN_SEC) {
      const wait = Math.ceil(RESEND_COOLDOWN_SEC - elapsed);
      const err = new Error(`Please wait ${wait}s before requesting a new OTP`);
      err.code = 'COOLDOWN';
      err.waitSeconds = wait;
      throw err;
    }
    // max resends guard — allow 5 resends per TTL window
    if (existing.resendCount >= 5) {
      const err = new Error('Too many OTP requests. Please try after some time.');
      err.code = 'RATE_LIMIT';
      throw err;
    }
  }

  const rawOtp = generateRawOtp();
  const otpHash = hashOtp(rawOtp);
  const expiresAt = getExpiryDate();

  // Upsert OTP doc
  await Otp.findOneAndUpdate(
    { identifier: norm, channel },
    {
      $set: { otpHash, expiresAt, attempts: 0, verified: false, lastSentAt: now },
      $inc: { resendCount: existing ? 1 : 0 },
      $setOnInsert: { identifier: norm, channel },
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Deliver
  let delivered = false;
  if (channel === 'email') {
    try {
      const result = await emailService.sendOTP({ email: norm, name, otp: rawOtp, expiryMinutes: OTP_TTL_MINUTES });
      delivered = result?.success !== false;
      if (!delivered) logger.warn(MODULE, 'Email OTP send returned failure', { identifier: norm, error: result?.error });
    } catch (err) {
      logger.error(MODULE, 'Email OTP send failed', { identifier: norm, error: err.message });
      // In dev without SMTP, we still want to allow flow — log OTP
      if (process.env.NODE_ENV === 'development') {
        logger.warn(MODULE, `[DEV] OTP for ${norm}: ${rawOtp} (email send failed, using dev fallback)`);
        delivered = true;
      } else {
        throw new Error('Failed to send OTP email. Please try again.');
      }
    }
    // Dev fallback: also log so tester can retrieve
    if (process.env.NODE_ENV === 'development') {
      logger.info(MODULE, `[DEV] OTP for ${norm}: ${rawOtp} | expires in ${OTP_TTL_MINUTES}m`);
    }
  } else if (channel === 'sms') {
    // SMS via Africa's Talking (the configured provider for this app).
    // Without AT credentials no text can actually be sent, so fail
    // honestly instead of pretending delivery succeeded.
    const hasAT = !!(process.env.AT_API_KEY && process.env.AT_USERNAME);
    if (!hasAT) {
      logger.warn(MODULE, 'SMS OTP requested but no provider configured', { identifier: norm });
      if (process.env.NODE_ENV === 'development') {
        logger.info(MODULE, `[DEV] SMS OTP for ${norm}: ${rawOtp} (no provider — dev fallback)`);
        delivered = true;
      } else {
        const err = new Error('SMS OTP is not configured. Please use email verification.');
        err.code = 'SMS_NOT_CONFIGURED';
        throw err;
      }
    } else {
      try {
        const smsResult = await sendSmsViaAT({ to: norm, otp: rawOtp });
        delivered = true;
        logger.info(MODULE, 'SMS OTP sent', { identifier: norm, messageId: smsResult.messageId });
      } catch (err) {
        logger.error(MODULE, 'SMS OTP send failed', { identifier: norm, error: err.message });
        if (process.env.NODE_ENV === 'development') {
          logger.warn(MODULE, `[DEV] SMS OTP for ${norm}: ${rawOtp} (provider failed — dev fallback)`);
          delivered = true;
        } else {
          throw new Error('Failed to send SMS OTP. Please try again or use email verification.');
        }
      }
    }
  }

  return { success: true, channel, identifier: norm, expiresAt, ttlMinutes: OTP_TTL_MINUTES, delivered, ...(process.env.NODE_ENV === 'development' ? { devOtp: rawOtp } : {}) };
}

export async function verifyOtp({ identifier, channel, otp }) {
  const norm = normalizeIdentifier(identifier, channel);
  const doc = await Otp.findOne({ identifier: norm, channel }).select('+otpHash');
  if (!doc) {
    const err = new Error('No OTP found. Please request a new one.');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (doc.verified) {
    const err = new Error('OTP already used. Please request a new one.');
    err.code = 'ALREADY_VERIFIED';
    throw err;
  }
  if (doc.expiresAt < new Date()) {
    await Otp.deleteOne({ _id: doc._id });
    const err = new Error('OTP has expired. Please request a new one.');
    err.code = 'EXPIRED';
    throw err;
  }
  if (doc.attempts >= OTP_MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: doc._id });
    const err = new Error('Too many failed attempts. Please request a new OTP.');
    err.code = 'MAX_ATTEMPTS';
    throw err;
  }

  const hashed = hashOtp(String(otp).trim());
  if (hashed !== doc.otpHash) {
    doc.attempts += 1;
    await doc.save();
    const remaining = OTP_MAX_ATTEMPTS - doc.attempts;
    const err = new Error(`Invalid OTP. ${remaining > 0 ? `${remaining} attempt(s) left.` : 'No attempts left.'}`);
    err.code = 'INVALID';
    err.remaining = remaining;
    throw err;
  }

  // Success — mark verified and remove (one-time use)
  // Keep doc briefly as verified for idempotency, then delete on successful login
  doc.verified = true;
  await doc.save();
  return { success: true, identifier: norm, channel };
}

export async function consumeVerifiedOtp({ identifier, channel }) {
  const norm = normalizeIdentifier(identifier, channel);
  await Otp.deleteOne({ identifier: norm, channel, verified: true });
}

export default { sendOtp, verifyOtp, consumeVerifiedOtp, normalizeIdentifier, hashOtp, sendSmsViaAT };
