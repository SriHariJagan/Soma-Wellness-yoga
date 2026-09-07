// ============================================================
// controllers/testPaymentController.js — TEST MODE ONLY endpoints
// Backend (PAYMENT_MODE env) is the source of truth for the mode.
// The simulate endpoint is unreachable in live mode (403).
// ============================================================
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import ActivityLog from '../models/ActivityLog.js';
import { signAccessToken, signRefreshToken } from '../utils/token.js';
import { ensureReferral, applyReferral } from '../services/referralService.js';
import emailService from '../services/email/email.service.js';
import { getPaymentMode, isTestPaymentMode } from '../config/paymentMode.js';
import { TEST_SCENARIOS } from '../payment/gateways/test/TestPaymentService.js';
import logger from '../notification/logger.js';

const MODULE = 'TestPaymentCtrl';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashToken(t) {
  return crypto.createHash('sha256').update(t).digest('hex');
}

// Same public shape as OTP verify, so the frontend login() works identically.
function publicUser(user, planActive = false) {
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

// ── GET /api/mpesa/mode  (also aliased at /api/payment/mode) ──
// Public: the frontend must ask the backend which mode is active.
// Never expose secrets here — only the mode flag.
export const getPaymentModeStatus = asyncHandler(async (req, res) => {
  const mode = getPaymentMode();
  res.json({
    success: true,
    mode,
    testMode: mode === 'test',
  });
});

// ── POST /api/mpesa/test  (also aliased at /api/payment/test) ──
// Body: { paymentId?, checkoutRequestId?, orderId?, status|scenario }
// Auth required. Mode comes ONLY from server env — never from the body.
export const simulateTestPayment = asyncHandler(async (req, res) => {
  if (!isTestPaymentMode()) {
    logger.warn(MODULE, 'Test payment endpoint hit while live mode is active');
    throw ApiError.forbidden('Test payment mode is disabled');
  }

  const { paymentId, checkoutRequestId, orderId, status, scenario } = req.body || {};
  const requested = status || scenario;
  if (!requested) {
    throw ApiError.badRequest(
      `status is required. Supported values: ${TEST_SCENARIOS.join(', ')}`,
    );
  }
  if (!paymentId && !checkoutRequestId && !orderId) {
    throw ApiError.badRequest('paymentId, checkoutRequestId, or orderId is required');
  }

  const { TestPaymentService, normalizeScenario } = await import(
    '../payment/gateways/test/TestPaymentService.js'
  );
  const service = new TestPaymentService();

  // normalizeScenario throws 400 on invalid values (tested checklist item).
  const normalized = normalizeScenario(requested);

  const result = await service.simulate({
    paymentId,
    checkoutRequestId,
    orderId,
    scenario: normalized,
    userId: req.user?._id || req.userId || null,
  });

  const payment = result.payment;
  res.json({
    success: normalized === 'success',
    scenario: result.scenario,
    status: result.status,
    idempotent: Boolean(result.idempotent),
    message: result.message,
    paymentId: payment?._id || paymentId,
    paymentStatus: payment?.paymentStatus || result.status,
    mpesaOrderId: payment?.mpesaOrderId || payment?.razorpayOrderId,
    amount: payment?.amount,
    currency: payment?.currency || 'KES',
    invoiceNo: result.invoiceNo || payment?.invoiceNo,
    mpesaReceiptNumber: result.mpesaReceiptNumber,
  });
});

// ── POST /api/payment/test/provision (alias /api/mpesa/test/provision) ──
// TEST MODE ONLY, no auth (new users have no token yet).
// Instantly provisions the same student account OTP verification would
// create (same fields, same welcome/admin emails, same ActivityLog, same
// token shape) so a guest can complete a simulated purchase end-to-end.
// Existing emails are NEVER logged in here (409) — prevents test-env
// account takeover, including of admin accounts.
export const provisionTestAccount = asyncHandler(async (req, res) => {
  if (!isTestPaymentMode()) {
    logger.warn(MODULE, 'Test provision endpoint hit while live mode is active');
    throw ApiError.forbidden('Test payment mode is disabled');
  }

  const { name, email, phone, password, ref } = req.body || {};
  const cleanName = String(name || '').trim().slice(0, 100);
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPhone = String(phone || '').trim().slice(0, 20);

  if (!cleanName) throw ApiError.badRequest('Name is required');
  if (!EMAIL_RE.test(cleanEmail)) throw ApiError.badRequest('A valid email is required');
  if (!cleanPhone) throw ApiError.badRequest('Phone is required');
  if (password !== undefined && String(password).length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters');
  }

  const existing = await User.findOne({ email: cleanEmail });
  if (existing) {
    throw ApiError.conflict(
      'An account with this email already exists — please log in (or verify via OTP) to continue testing',
    );
  }

  // Same credentials model as OTP auto-creation: known password if the
  // tester supplied one (so they can log in again later), else random.
  const plainPassword = password ? String(password) : crypto.randomBytes(8).toString('base64url');
  const hashed = await bcrypt.hash(plainPassword, await bcrypt.genSalt(12));

  const user = await User.create({
    name: cleanName,
    email: cleanEmail,
    password: hashed,
    phone: cleanPhone,
    emailVerified: true,
    phoneVerified: false,
  });

  await ensureReferral(user);
  if (ref) await applyReferral(ref, user).catch(() => {});

  emailService.sendWelcome({
    email: user.email,
    name: user.name,
    dashboardUrl: `${process.env.FRONTEND_URL || 'https://somawellness.in'}/dashboard`,
  }).catch((e) => logger.warn(MODULE, 'Welcome after test provision failed', { error: e.message }));

  emailService.sendRegistrationAdmin({
    studentName: user.name,
    email: user.email,
    phone: user.phone || '',
    registrationDate: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
  }).catch(() => {});

  ActivityLog.create({
    action: 'user_registered',
    targetUser: user._id,
    meta: { via: 'test_provision', autoCreated: true },
  }).catch(() => {});

  user.lastLogin = new Date();
  await user.save();

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
    meta: { via: 'test_provision', isNew: true },
  }).catch(() => {});

  logger.info('[TestPayment]', `Provisioned test account for ${cleanEmail} (isNew: true)`);

  return res.status(201).json({
    success: true,
    msg: 'Test account created',
    token: accessToken,
    user: publicUser(user, membership ? (membership.isActive || membership.isPaused) : false),
    isNew: true,
  });
});

export default { getPaymentModeStatus, simulateTestPayment, provisionTestAccount };
