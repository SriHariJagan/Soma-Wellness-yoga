import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// ── Factory Functions ──

export function buildUser(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    name: 'Test User',
    email: 'test@example.com',
    password: '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Y7mY6n8K9o0pRm1s2t3u4v5',
    role: 'student',
    status: 'active',
    phone: '1234567890',
    city: 'Test City',
    style: 'Hatha',
    level: 'Beginner',
    ...overrides,
  };
}

export function buildAdmin(overrides = {}) {
  return buildUser({ role: 'admin', ...overrides });
}

export function buildPayment(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    user: new mongoose.Types.ObjectId(),
    label: 'Test Payment',
    amount: 1000,
    status: 'paid',
    method: 'UPI',
    date: new Date(),
    ...overrides,
  };
}

export function buildNotification(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    user: null,
    title: 'Test Notification',
    message: 'Test message content',
    type: 'info',
    read: false,
    channels: ['email'],
    status: 'pending',
    priority: 'normal',
    subject: 'Test Subject',
    template: 'welcome',
    templateData: { name: 'Test' },
    ...overrides,
  };
}

export function buildNotificationLog(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    notification: new mongoose.Types.ObjectId(),
    user: new mongoose.Types.ObjectId(),
    channel: 'email',
    status: 'queued',
    attempt: 0,
    maxAttempts: 5,
    ...overrides,
  };
}

export function buildClassSession(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    name: 'Morning Yoga',
    date: new Date(),
    time: '6:00 AM',
    mode: 'online',
    trainer: 'Test Trainer',
    status: 'upcoming',
    capacity: 30,
    ...overrides,
  };
}

export function buildWorkshop(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    name: 'Test Workshop',
    date: new Date(Date.now() + 86400000),
    price: 500,
    capacity: 50,
    isPublished: true,
    status: 'available',
    registrations: [],
    ...overrides,
  };
}

export function buildBatch(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    name: 'Morning Batch',
    timing: '6:00 AM',
    trainer: 'Test Trainer',
    status: 'Active',
    ...overrides,
  };
}

export function buildBooking(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    name: 'Test Booking',
    email: 'booking@test.com',
    phone: '9876543210',
    courseName: 'Yoga Course',
    coursePrice: '500',
    status: 'Pending',
    ...overrides,
  };
}

export function buildLead(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    name: 'Test Lead',
    phone: '9876543210',
    email: 'lead@test.com',
    interestType: 'General Yoga',
    stage: 'New',
    ...overrides,
  };
}

export function buildMembership(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    user: new mongoose.Types.ObjectId(),
    planType: 'Monthly Pass',
    planMonths: 1,
    price: 1000,
    status: 'active',
    startDate: new Date(),
    expiryDate: new Date(Date.now() + 30 * 86400000),
    ...overrides,
  };
}

// ── JWT Helpers ──

export function signToken(user) {
  return jwt.sign(
    { id: user._id ?? user.id, role: user.role, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_TTL || '15m' },
  );
}

export function signRefreshToken(user) {
  const secret = process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}::refresh`;
  return jwt.sign(
    { id: user._id ?? user.id, type: 'refresh' },
    secret,
    { expiresIn: process.env.JWT_REFRESH_TTL || '1d' },
  );
}

// ── Express Mock ──

export function mockReq(overrides = {}) {
  return {
    ip: '127.0.0.1',
    method: 'GET',
    path: '/',
    baseUrl: '',
    headers: {},
    body: {},
    query: {},
    params: {},
    get: (h) => overrides.headers?.[h],
    ...overrides,
  };
}

export function mockRes() {
  const state = { statusCode: 200, body: null, headers: {} };
  const res = {
    state,
    status: (code) => { state.statusCode = code; return res; },
    json: (body) => { state.body = body; return res; },
    send: (body) => { state.body = body; return res; },
    setHeader: (k, v) => { state.headers[k] = v; },
    getHeader: (k) => state.headers[k],
    end: () => {},
  };
  return res;
}

export function mockNext() {
  const fn = (err) => { fn.error = err; };
  fn.error = undefined;
  return fn;
}

// ── SMTP Mock ──

export function createSmtpMock() {
  const state = { sent: [], verifyResult: true, shouldFail: false };
  const transporter = {
    state,
    sendMail: async (opts) => {
      if (state.shouldFail) throw new Error('SMTP connection failed');
      state.sent.push(opts);
      return { accepted: [opts.to], rejected: [], messageId: '<mock-id>' };
    },
    verify: async () => state.verifyResult,
    getStatus: () => ({
      configured: true,
      verified: state.verifyResult,
      lastVerified: Date.now(),
      host: 'smtp.test.com',
      port: 587,
      secure: false,
      fromEmail: 'test@test.com',
      fromName: 'Test',
      hasReplyTo: false,
    }),
    close: () => {},
  };
  return transporter;
}

// ── Redis Mock ──

export function createRedisMock() {
  const store = new Map();
  return {
    store,
    get: async (key) => store.get(key),
    set: async (key, val) => { store.set(key, val); },
    del: async (key) => { store.delete(key); },
    quit: async () => {},
    disconnect: async () => {},
    on: () => {},
    status: 'ready',
  };
}
