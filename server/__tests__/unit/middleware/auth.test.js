import { jest, describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';

const mockVerifyAccessToken = jest.fn();
const mockFindById = jest.fn();
const mockLogger = { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() };

let requireAuth;
let requireRole;
let requireAdmin;

beforeAll(async () => {
  await jest.unstable_mockModule('../../../utils/token.js', () => ({
    verifyAccessToken: mockVerifyAccessToken,
  }));
  await jest.unstable_mockModule('../../../models/User.js', () => ({
    default: { findById: mockFindById },
  }));
  await jest.unstable_mockModule('../../../notification/logger.js', () => ({
    default: mockLogger,
  }));

  const mod = await import('../../../middleware/auth.js');
  requireAuth = mod.requireAuth;
  requireRole = mod.requireRole;
  requireAdmin = mod.requireAdmin;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function makeReq(headers = {}, overrides = {}) {
  return {
    method: 'GET',
    path: '/',
    baseUrl: '',
    ip: '127.0.0.1',
    header: (name) => headers[name],
    requestId: 'test-req-id',
    ...overrides,
  };
}

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    end: jest.fn(),
  };
}

describe('requireAuth', () => {
  it('should return 401 when Authorization header is missing', async () => {
    const req = makeReq({});
    const res = makeRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: 'No token, authorization denied' }),
    );
  });

  it('should return 401 when Authorization header does not start with Bearer', async () => {
    const req = makeReq({ Authorization: 'Basic xyz' });
    const res = makeRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: 'No token, authorization denied' }),
    );
  });

  it('should return 401 when token verification fails with JsonWebTokenError', async () => {
    const jwtErr = new Error('invalid signature');
    jwtErr.name = 'JsonWebTokenError';
    mockVerifyAccessToken.mockImplementation(() => { throw jwtErr; });

    const req = makeReq({ Authorization: 'Bearer invalid-token' });
    const res = makeRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: 'Invalid token' }),
    );
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should return 401 when token is expired', async () => {
    const jwtErr = new Error('jwt expired');
    jwtErr.name = 'TokenExpiredError';
    mockVerifyAccessToken.mockImplementation(() => { throw jwtErr; });

    const req = makeReq({ Authorization: 'Bearer expired-token' });
    const res = makeRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: 'Session expired, please sign in again' }),
    );
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should return 401 when decoded user is not found in database', async () => {
    mockVerifyAccessToken.mockReturnValue({ id: 'nonexistent-id', role: 'student' });
    mockFindById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const req = makeReq({ Authorization: 'Bearer valid-token' });
    const res = makeRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: 'Account no longer exists' }),
    );
    expect(mockFindById).toHaveBeenCalledWith('nonexistent-id');
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should return 403 when user is banned', async () => {
    mockVerifyAccessToken.mockReturnValue({ id: 'user-id', role: 'student' });
    const bannedUser = {
      _id: 'user-id',
      name: 'Banned User',
      role: 'student',
      status: 'banned',
      email: 'banned@test.com',
    };
    mockFindById.mockReturnValue({ select: jest.fn().mockResolvedValue(bannedUser) });

    const req = makeReq({ Authorization: 'Bearer valid-token' });
    const res = makeRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: 'Your account has been suspended' }),
    );
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should call next() and set req.user and req.userId for a valid, active user', async () => {
    mockVerifyAccessToken.mockReturnValue({ id: 'active-user-id', role: 'student' });
    const activeUser = {
      _id: 'active-user-id',
      name: 'Active User',
      role: 'student',
      status: 'active',
      email: 'active@test.com',
    };
    mockFindById.mockReturnValue({ select: jest.fn().mockResolvedValue(activeUser) });

    const req = makeReq({ Authorization: 'Bearer valid-token' });
    const res = makeRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual(activeUser);
    expect(req.userId).toBe('active-user-id');
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should call User.findById with decoded.id and exclude password', async () => {
    mockVerifyAccessToken.mockReturnValue({ id: 'user-1', role: 'student' });
    const selectMock = jest.fn().mockResolvedValue({
      _id: 'user-1',
      name: 'Test',
      role: 'student',
      status: 'active',
    });
    mockFindById.mockReturnValue({ select: selectMock });

    const req = makeReq({ Authorization: 'Bearer token' });
    const res = makeRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(mockFindById).toHaveBeenCalledWith('user-1');
    expect(selectMock).toHaveBeenCalledWith('-password');
  });

  it('should handle the case where header() returns a string from headers object', async () => {
    mockVerifyAccessToken.mockReturnValue({ id: 'u1', role: 'student' });
    mockFindById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'u1', name: 'T', role: 'student', status: 'active' }),
    });

    const headers = { Authorization: 'Bearer some-jwt-token' };
    const req = {
      method: 'GET',
      path: '/',
      baseUrl: '',
      ip: '127.0.0.1',
      header: (name) => headers[name],
      requestId: 'req-1',
    };
    const res = makeRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(mockVerifyAccessToken).toHaveBeenCalledWith('some-jwt-token');
  });
});

describe('requireRole', () => {
  it('should call next() when the user has the required role', async () => {
    const middleware = requireRole('admin');
    const req = { user: { _id: 'a1', role: 'admin' } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should call next() when the user has one of the required roles', async () => {
    const middleware = requireRole('admin', 'superadmin');
    const req = { user: { _id: 'a1', role: 'superadmin' } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should return 403 when user role does not match required roles', async () => {
    const middleware = requireRole('admin');
    const req = { user: { _id: 's1', role: 'student' }, requestId: 'req-1' };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: 'Access denied. Insufficient privileges.' }),
    );
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should return 403 when req.user is not set (no auth)', async () => {
    const middleware = requireRole('admin');
    const req = {};
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: 'Unauthorized' }),
    );
  });

  it('should return 403 when user role is undefined', async () => {
    const middleware = requireRole('admin');
    const req = { user: { _id: 'u1' } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: 'Access denied. Insufficient privileges.' }),
    );
  });

  it('should support multiple allowed roles', async () => {
    const middleware = requireRole('admin', 'moderator');
    const req = { user: { _id: 'm1', role: 'moderator' } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});

describe('requireAdmin', () => {
  it('should call next() when the user is admin', async () => {
    const req = { user: { _id: 'a1', role: 'admin' } };
    const res = makeRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should return 403 when the user is not admin', async () => {
    const req = { user: { _id: 's1', role: 'student' }, requestId: 'req-1' };
    const res = makeRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it('should return 401 when req.user is not set', async () => {
    const req = {};
    const res = makeRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });
});
