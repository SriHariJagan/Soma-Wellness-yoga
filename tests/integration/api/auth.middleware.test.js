/**
 * @vitest-environment node
 */
import '../../../server/__tests__/setup-env.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requireAuth, requireAdmin } from '../../../server/middleware/auth.js';
import { mockReq, mockRes, mockNext, buildUser, buildAdmin, signToken } from '../../../server/__tests__/helpers.js';
import jwt from '../../../server/node_modules/jsonwebtoken/index.js';
import User from '../../../server/models/User.js';

vi.mock('../../../server/models/User.js', () => ({
  default: { findById: vi.fn() },
}));
vi.mock('../../../server/notification/logger.js', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe('Auth Middleware Integration — requireAuth + requireAdmin (B13, B4)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('happy: valid Bearer token + active user → req.user set → next()', async () => {
    const user = buildUser({ role: 'student', status: 'active' });
    User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(user) });
    const token = signToken(user);
    const req = mockReq({ headers: { authorization: `Bearer ${token}` }, header: (h) => h.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined });
    // mockReq header helper uses get; so set header method properly
    req.header = (h) => h.toLowerCase() === 'authorization' ? `Bearer ${token}` : null;
    const res = mockRes();
    const next = mockNext();
    await requireAuth(req, res, next);
    expect(next.error).toBeUndefined();
    expect(req.user._id).toEqual(user._id);
  });

  it('no token → 401 No token', async () => {
    const req = mockReq({ header: () => null });
    const res = mockRes();
    const next = mockNext();
    await requireAuth(req, res, next);
    expect(next.error).toBeTruthy();
    expect(next.error.statusCode).toBe(401);
  });

  it('invalid token → 401 Invalid token', async () => {
    const req = mockReq({ header: () => 'Bearer invalid.xyz' });
    const res = mockRes();
    const next = mockNext();
    await requireAuth(req, res, next);
    expect(next.error.statusCode).toBe(401);
  });

  it('expired token → 401 Session expired', async () => {
    const user = buildUser();
    const expired = jwt.sign({ id: user._id, type: 'access' }, process.env.JWT_SECRET, { expiresIn: '0s' });
    await new Promise(r => setTimeout(r, 10));
    const req = mockReq({ header: () => `Bearer ${expired}` });
    const res = mockRes();
    const next = mockNext();
    await requireAuth(req, res, next);
    expect(next.error.statusCode).toBe(401);
    expect(next.error.message).toMatch(/Session expired/);
  });

  it('banned user → 403 Your account has been suspended', async () => {
    const user = buildUser({ status: 'banned' });
    User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(user) });
    const token = signToken(user);
    const req = mockReq({ header: () => `Bearer ${token}` });
    const res = mockRes();
    const next = mockNext();
    await requireAuth(req, res, next);
    expect(next.error.statusCode).toBe(403);
  });

  it('requireAdmin: admin passes, student → 403', async () => {
    const admin = buildAdmin();
    const student = buildUser({ role: 'student' });
    const reqAdmin = { user: admin, requestId: '1' };
    const reqStu = { user: student, requestId: '2' };
    const res = mockRes();
    let nextErr;
    await new Promise(resolve => {
      requireAdmin(reqAdmin, res, (err) => { nextErr = err; resolve(); });
    });
    expect(nextErr).toBeUndefined();
    await new Promise(resolve => {
      requireAdmin(reqStu, res, (err) => { nextErr = err; resolve(); });
    });
    expect(nextErr.statusCode).toBe(403);
  });
});
