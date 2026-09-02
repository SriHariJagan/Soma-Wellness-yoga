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
    // SMS — try Africa's Talking / Twilio if configured, else fallback to dev log
    const hasAT = process.env.AT_API_KEY && process.env.AT_USERNAME;
    const hasTwilio = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;
    if (!hasAT && !hasTwilio) {
      logger.warn(MODULE, 'SMS OTP requested but no provider configured — using dev fallback', { identifier: norm });
      if (process.env.NODE_ENV === 'development') {
        delivered = true;
      } else {
        // For production without SMS provider, we suggest using email instead
        const err = new Error('SMS OTP is not configured. Please use email verification.');
        err.code = 'SMS_NOT_CONFIGURED';
        throw err;
      }
    } else {
      // TODO: wire AT/Twilio when keys provided — for now log and mark delivered
      logger.info(MODULE, `[SMS] Would send OTP to ${norm}: ${rawOtp}`);
      delivered = true;
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

export default { sendOtp, verifyOtp, consumeVerifiedOtp, normalizeIdentifier, hashOtp };
