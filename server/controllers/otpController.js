// ============================================================
// controllers/otpController.js — OTP send & verify with auto-login/create
// ============================================================
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Otp from '../models/Otp.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { signAccessToken, signRefreshToken } from '../utils/token.js';
import { ensureReferral, applyReferral } from '../services/referralService.js';
import emailService from '../services/email/email.service.js';
import notificationService from '../notification/core/NotificationService.js';
import otpService from '../services/otpService.js';
import logger from '../notification/logger.js';
import ActivityLog from '../models/ActivityLog.js';

const MODULE = 'OtpCtrl';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{7,15}$/;

function hashToken(t) {
  return crypto.createHash('sha256').update(t).digest('hex');
}

function publicUser(user, memoStatus) {
  const planActive = memoStatus !== undefined ? memoStatus : (user.planMonths || 0) > 0;
  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    phone: user.phone || '',
    city: user.city || '',
    style: user.style || '',
    level: user.level || '',
    planMonths: user.planMonths || 0,
    planActive,
    referralCount: user.referralCount || 0,
    months: user.months || 0,
    certifs: user.certifs || 0,
    stats: user.stats || { classes: 0, attendancePct: 0 },
    progress: user.progress || { flexibility: 0, strength: 0, breathing: 0, meditation: 0 },
    badges: user.badges || [],
    unreadNotifications: user.unreadNotifications || 0,
    emailVerified: user.emailVerified || false,
    phoneVerified: user.phoneVerified || false,
  };
}

async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await User.findByIdAndUpdate(user._id, {
    $push: { refreshTokens: { $each: [hashToken(refreshToken)], $slice: -5 } },
  });
  return { accessToken, refreshToken };
}

function inferChannel(body) {
  if (body.channel) return body.channel;
  if (body.email && EMAIL_RE.test(String(body.email).trim())) return 'email';
  if (body.phone && PHONE_RE.test(String(body.phone).replace(/[\s\-\(\)]/g, ''))) return 'sms';
  return null;
}

function getIdentifier(body, channel) {
  if (channel === 'email') return String(body.email || '').trim().toLowerCase();
  if (channel === 'sms') return String(body.phone || body.mobile || '').trim();
  // fallback: allow either
  if (body.email) return String(body.email).trim().toLowerCase();
  if (body.phone) return String(body.phone).trim();
  if (body.identifier) return String(body.identifier).trim();
  return '';
}

function normalizePhoneVariants(p) {
  const clean = String(p || '').replace(/[\s\-\(\)]/g, '');
  const digits = clean.replace(/^\+/, '');
  return [clean, digits, `+${digits}`].filter((v, i, a) => v && a.indexOf(v) === i);
}

async function findUserByIdentifier({ email, phone }) {
  if (email && EMAIL_RE.test(String(email).trim())) {
    const byEmail = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (byEmail) return byEmail;
  }
  if (phone && PHONE_RE.test(String(phone).replace(/[\s\-\(\)]/g, ''))) {
    const variants = normalizePhoneVariants(phone);
    const byPhone = await User.findOne({ phone: { $in: variants } });
    if (byPhone) return byPhone;
  }
  return null;
}

// POST /api/auth/otp/check — guest checkout: does an account exist?
// Returns { success, exists } so the client can ask new users for
// name + contact details before sending the OTP.
export const checkUserExists = asyncHandler(async (req, res) => {
  const { email, phone, identifier } = req.body;
  const channel = inferChannel({ email, phone, identifier }) || (email ? 'email' : 'sms');
  let id = '';
  if (channel === 'email') {
    id = (email || identifier || '').trim().toLowerCase();
    if (!EMAIL_RE.test(id)) throw ApiError.badRequest('Invalid email address');
  } else {
    id = (phone || identifier || '').trim();
    if (!PHONE_RE.test(id.replace(/[\s\-\(\)]/g, ''))) throw ApiError.badRequest('Invalid phone number');
  }
  const user = await findUserByIdentifier(
    channel === 'email' ? { email: id } : { phone: id },
  );
  return res.json({ success: true, exists: !!user, channel });
});

// POST /api/auth/otp/send
export const sendOtp = asyncHandler(async (req, res) => {
  const { email, phone, identifier, channel: rawChannel, name } = req.body;
  let channel = rawChannel || inferChannel({ email, phone, identifier });
  if (!channel) throw ApiError.badRequest('Provide email or phone with valid format');

  // Normalize channel aliases
  if (channel === 'mobile' || channel === 'phone') channel = 'sms';

  let id = '';
  if (channel === 'email') {
    id = (email || identifier || '').trim().toLowerCase();
    if (!EMAIL_RE.test(id)) throw ApiError.badRequest('Invalid email address');
  } else {
    id = (phone || identifier || '').trim();
    const cleaned = id.replace(/[\s\-\(\)]/g, '');
    if (!PHONE_RE.test(cleaned)) throw ApiError.badRequest('Invalid phone number (include country code, e.g. +2547XXXXXXX)');
  }

  try {
    const result = await otpService.sendOtp({ identifier: id, channel, name: name || 'there' });
    // Don't leak OTP in production
    const payload = {
      success: true,
      msg: channel === 'email' ? 'OTP sent to your email' : 'OTP sent to your phone',
      channel,
      expiresIn: result.ttlMinutes * 60,
      cooldown: 60,
    };
    if (process.env.NODE_ENV === 'development' && result.devOtp) {
      payload.devOtp = result.devOtp;
    }
    return res.json(payload);
  } catch (err) {
    if (err.code === 'COOLDOWN') {
      return res.status(429).json({ success: false, error: err.message, code: 'COOLDOWN', waitSeconds: err.waitSeconds });
    }
    if (err.code === 'SMS_NOT_CONFIGURED') {
      return res.status(400).json({ success: false, error: err.message, code: 'SMS_NOT_CONFIGURED' });
    }
    if (err.code === 'RATE_LIMIT') {
      return res.status(429).json({ success: false, error: err.message, code: 'RATE_LIMIT' });
    }
    logger.error(MODULE, 'sendOtp failed', { identifier: id, channel, error: err.message });
    throw ApiError.badRequest(err.message || 'Failed to send OTP');
  }
});

// POST /api/auth/otp/verify
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, phone, identifier, otp, channel: rawChannel, name: rawName, ref } = req.body;
  if (!otp || String(otp).trim().length !== 6) throw ApiError.badRequest('Valid 6-digit OTP is required');

  let channel = rawChannel || inferChannel({ email, phone, identifier });
  if (!channel) throw ApiError.badRequest('Channel (email/sms) is required');
  if (channel === 'mobile' || channel === 'phone') channel = 'sms';

  let id = '';
  if (channel === 'email') {
    id = (email || identifier || '').trim().toLowerCase();
    if (!EMAIL_RE.test(id)) throw ApiError.badRequest('Invalid email');
  } else {
    id = (phone || identifier || '').trim();
    if (!PHONE_RE.test(id.replace(/[\s\-\(\)]/g, ''))) throw ApiError.badRequest('Invalid phone number');
  }

  // Verify OTP first
  try {
    await otpService.verifyOtp({ identifier: id, channel, otp: String(otp).trim() });
  } catch (err) {
    const statusMap = { NOT_FOUND: 404, EXPIRED: 400, MAX_ATTEMPTS: 429, INVALID: 400, ALREADY_VERIFIED: 400 };
    const status = statusMap[err.code] || 400;
    return res.status(status).json({ success: false, error: err.message, code: err.code, remaining: err.remaining });
  }

  // OTP verified — find or create user
  const normalizedId = channel === 'email' ? id.toLowerCase() : id.replace(/[\s\-\(\)]/g, '');
  let user = null;
  let isNew = false;

  if (channel === 'email') {
    user = await User.findOne({ email: normalizedId });
  } else {
    // phone lookup — find by phone field (exact or normalized)
    const phoneClean = normalizedId.replace(/^\+/, '');
    user = await User.findOne({
      $or: [
        { phone: normalizedId },
        { phone: phoneClean },
        { phone: `+${phoneClean}` },
      ],
    });
    // If phone not found but email provided as backup, try email
    if (!user && email && EMAIL_RE.test(String(email).trim())) {
      user = await User.findOne({ email: String(email).trim().toLowerCase() });
    }
  }

  if (!user) {
    // Auto-create account from guest-checkout details.
    // The client collects name + email + phone for new users; fall back
    // to derived values so older clients keep working.
    isNew = true;
    const givenName = (rawName || '').trim();
    const givenEmail = email && EMAIL_RE.test(String(email).trim()) ? String(email).trim().toLowerCase() : '';
    const givenPhone = phone ? String(phone).trim() : '';
    const derivedName = givenName
      || (channel === 'email' ? normalizedId.split('@')[0] : `User ${normalizedId.slice(-4)}`)
      || 'Soma User';
    const safeName = derivedName.slice(0, 100) || 'Soma User';
    const emailForAccount = channel === 'email'
      ? normalizedId
      : (givenEmail || `${normalizedId.replace(/\+/g, '')}@phone.soma.local`);
    // Ensure email uniqueness — if phone-derived email exists, make unique
    let finalEmail = emailForAccount;
    const emailExists = await User.findOne({ email: finalEmail });
    if (emailExists) {
      // phone user with colliding derived email — append random
      finalEmail = `${normalizedId.replace(/\+/g, '')}-${Date.now().toString(36)}@phone.soma.local`;
    }
    // Readable temporary password, valid 7 days. Emailed to the user;
    // password login is rejected after expiry until they reset it.
    const tempPassword = `Soma-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const tempPasswordExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const hashed = await bcrypt.hash(tempPassword, await bcrypt.genSalt(12));

    user = await User.create({
      name: safeName,
      email: finalEmail,
      password: hashed,
      tempPasswordExpiresAt,
      phone: channel === 'sms' ? normalizedId : givenPhone,
      emailVerified: channel === 'email',
      phoneVerified: channel === 'sms',
    });

    await ensureReferral(user);
    if (ref) await applyReferral(ref, user).catch(() => {});

    // Credentials email with the 7-day temporary password (best-effort).
    // Skipped for synthetic phone-only emails that cannot receive mail.
    if (!user.email.endsWith('@phone.soma.local')) {
      const expiryNote = 'This temporary password expires in 7 days. Please sign in and set your own password before then (Profile → Change password, or use Forgot password anytime).';
      notificationService
        .send(user._id, {
          template: 'welcome',
          channels: ['inApp', 'email'],
          data: {
            name: user.name,
            email: user.email,
            dashboardUrl: `${process.env.FRONTEND_URL || 'https://somawellness.co.ke'}/dashboard`,
            password: tempPassword,
          },
          subject: 'Your SomaWellness account is ready — temporary password inside',
          message: `Hello ${safeName},<br><br>Your SomaWellness account has been created so you can complete your purchase.<br><strong>Email:</strong> ${finalEmail}<br><strong>Temporary password:</strong> ${tempPassword}<br><br>${expiryNote}`,
          priority: 'normal',
        })
        .catch((e) => logger.warn(MODULE, 'Credentials email after OTP creation failed', { error: e.message }));
    }

    emailService.sendRegistrationAdmin({
      studentName: user.name,
      email: user.email,
      phone: user.phone || '',
      registrationDate: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
    }).catch(() => {});

    ActivityLog.create({ action: 'user_registered', targetUser: user._id, meta: { via: 'otp', channel, identifier: normalizedId, autoCreated: true } }).catch(() => {});
    logger.info(MODULE, 'User auto-created via OTP', { userId: String(user._id), channel, identifier: normalizedId });
  } else {
    // Existing user — update verification flag + lastLogin
    const updates = {};
    if (channel === 'email' && !user.emailVerified) updates.emailVerified = true;
    if (channel === 'sms' && !user.phoneVerified) updates.phoneVerified = true;
    // If phone verification and user had no phone, save it
    if (channel === 'sms' && !user.phone) updates.phone = normalizedId;
    if (Object.keys(updates).length) {
      await User.findByIdAndUpdate(user._id, { $set: updates });
      user = await User.findById(user._id);
    }
    if (user.status === 'banned') {
      throw ApiError.forbidden('Your account has been suspended');
    }
  }

  // Mark lastLogin
  user.lastLogin = new Date();
  await user.save();

  // Consume OTP
  await otpService.consumeVerifiedOtp({ identifier: id, channel }).catch(() => {});

  // Issue tokens
  const { accessToken, refreshToken } = await issueTokens(user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV?.toLowerCase() === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  const membership = await Membership.findOne({ user: user._id }).sort({ createdAt: -1 });

  ActivityLog.create({
    action: 'user_login',
    performedBy: user._id,
    targetUser: user._id,
    meta: { via: 'otp', channel, identifier: normalizedId, isNew },
  }).catch(() => {});

  return res.json({
    success: true,
    msg: isNew ? 'Account created and verified' : 'OTP verified',
    token: accessToken,
    user: publicUser(user, membership ? (membership.isActive || membership.isPaused) : false),
    isNew,
    tempPasswordExpiresAt: isNew ? user.tempPasswordExpiresAt : undefined,
  });
});

export default { sendOtp, verifyOtp };
