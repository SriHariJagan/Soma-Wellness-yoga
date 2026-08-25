import { jest, describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';

const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
const mockGetContext = jest.fn();

let notFound;
let errorHandler;
let ApiError;

beforeAll(async () => {
  await jest.unstable_mockModule('../../../notification/logger.js', () => ({
    default: mockLogger,
    getContext: mockGetContext,
  }));

  const ApiErrorMod = await import('../../../utils/ApiError.js');
  ApiError = ApiErrorMod.default;

  const errMod = await import('../../../middleware/errorHandler.js');
  notFound = errMod.notFound;
  errorHandler = errMod.errorHandler;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetContext.mockReturnValue({});
});

function makeReq(overrides = {}) {
  return {
    method: 'GET',
    originalUrl: '/test',
    path: '/test',
    baseUrl: '',
    ip: '127.0.0.1',
    header: jest.fn(),
    requestId: 'req-123',
    ...overrides,
  };
}

function makeRes() {
  const state = { statusCode: 200, body: null };
  const res = {
    state,
    status: jest.fn((code) => { state.statusCode = code; return res; }),
    json: jest.fn((body) => { state.body = body; return res; }),
    setHeader: jest.fn(),
    getHeader: jest.fn(),
  };
  return res;
}

describe('notFound middleware', () => {
  it('should pass an ApiError with 404 to next()', () => {
    const req = makeReq({ method: 'POST', originalUrl: '/api/unknown' });
    const res = makeRes();
    const next = jest.fn();

    notFound(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(404);
    expect(next.mock.calls[0][0].message).toContain('POST');
    expect(next.mock.calls[0][0].message).toContain('/api/unknown');
  });

  it('should include the HTTP method in the error message', () => {
    const req = makeReq({ method: 'DELETE', originalUrl: '/api/users/123' });
    const res = makeRes();
    const next = jest.fn();

    notFound(req, res, next);

    expect(next.mock.calls[0][0].message).toBe('Route not found: DELETE /api/users/123');
  });

  it('should be an operational error', () => {
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();

    notFound(req, res, next);

    expect(next.mock.calls[0][0].isOperational).toBe(true);
  });
});

describe('errorHandler middleware', () => {
  it('should return 500 for unknown errors', () => {
    const err = new Error('Something unexpected happened');
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.statusCode).toBe(500);
    expect(res.state.body.success).toBe(false);
    expect(res.state.body.error).toBe('Something unexpected happened');
  });

  it('should return 500 for Error without statusCode', () => {
    const err = new Error('Unknown crash');
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.statusCode).toBe(500);
    expect(res.state.body.error).toBe('Unknown crash');
  });

  it('should handle ApiError with correct status and message', () => {
    const err = ApiError.badRequest('Invalid email format', { field: 'email' });
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.statusCode).toBe(400);
    expect(res.state.body.error).toBe('Invalid email format');
    expect(res.state.body.details).toEqual({ field: 'email' });
  });

  it('should handle ApiError.unauthorized', () => {
    const err = ApiError.unauthorized('Token expired');
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.statusCode).toBe(401);
    expect(res.state.body.error).toBe('Token expired');
  });

  it('should handle ApiError.forbidden', () => {
    const err = ApiError.forbidden('Access denied');
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.statusCode).toBe(403);
    expect(res.state.body.error).toBe('Access denied');
  });

  it('should handle ApiError.notFound', () => {
    const err = ApiError.notFound('User not found');
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.statusCode).toBe(404);
    expect(res.state.body.error).toBe('User not found');
  });

  it('should handle ApiError.conflict', () => {
    const err = ApiError.conflict('Email already exists');
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.statusCode).toBe(409);
    expect(res.state.body.error).toBe('Email already exists');
  });

  it('should handle Mongoose ValidationError with 400', () => {
    const err = new Error('Validation failed');
    err.name = 'ValidationError';
    err.errors = {
      email: { path: 'email', message: 'Please provide a valid email' },
      name: { path: 'name', message: 'Name is required' },
    };

    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.statusCode).toBe(400);
    expect(res.state.body.error).toBe('Validation failed');
    expect(res.state.body.details).toEqual([
      { field: 'email', message: 'Please provide a valid email' },
      { field: 'name', message: 'Name is required' },
    ]);
  });

  it('should handle Mongoose CastError with 400', () => {
    const err = new Error('Cast error');
    err.name = 'CastError';
    err.path = 'userId';
    err.value = 'invalid-id';

    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.statusCode).toBe(400);
    expect(res.state.body.error).toBe('Invalid userId: invalid-id');
  });

  it('should handle Mongoose duplicate key error (code 11000) with 409', () => {
    const err = new Error('Duplicate key');
    err.code = 11000;
    err.keyValue = { email: 'test@test.com' };

    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.statusCode).toBe(409);
    expect(res.state.body.error).toBe('That email is already in use');
  });

  it('should handle Mongoose duplicate key error without keyValue', () => {
    const err = new Error('Duplicate key');
    err.code = 11000;

    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.statusCode).toBe(409);
    expect(res.state.body.error).toBe('That field is already in use');
  });

  it('should handle JsonWebTokenError with 401', () => {
    const err = new Error('invalid signature');
    err.name = 'JsonWebTokenError';

    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.statusCode).toBe(401);
    expect(res.state.body.error).toBe('Invalid token');
  });

  it('should handle TokenExpiredError with 401', () => {
    const err = new Error('jwt expired');
    err.name = 'TokenExpiredError';

    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.statusCode).toBe(401);
    expect(res.state.body.error).toBe('Token expired');
  });

  it('should log 5xx errors with logger.error', () => {
    const err = new Error('Critical failure');
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should log 4xx errors with logger.warn', () => {
    const err = ApiError.badRequest('Bad input');
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(mockLogger.warn).toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should not include stack trace in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('Production error');
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.body).not.toHaveProperty('stack');
    process.env.NODE_ENV = originalEnv;
  });

  it('should include stack trace in development log meta, never in response', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const err = new Error('Dev error');
    err.stack = 'Error: Dev error\n    at test.js:1:1';
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    const logCall = mockLogger.error.mock.calls[0];
    expect(logCall[2].stack).toBeDefined();
    expect(res.state.body).not.toHaveProperty('stack');
    process.env.NODE_ENV = originalEnv;
  });

  it('should not include details in response if none present', () => {
    const err = new Error('Plain error');
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.body).not.toHaveProperty('details');
  });

  it('should use err.message as fallback for 500 errors', () => {
    const err = { statusCode: 500 };
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.statusCode).toBe(500);
    expect(res.state.body.error).toBe('Internal server error');
  });

  it('should extract context from getContext', () => {
    mockGetContext.mockReturnValue({ requestId: 'ctx-req-1', userId: 'ctx-user-1' });

    const err = ApiError.badRequest('test');
    const req = makeReq({ requestId: 'req-1', userId: 'user-1' });
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'ErrorHandler',
      'test',
      expect.objectContaining({
        requestId: 'ctx-req-1',
        userId: 'ctx-user-1',
      }),
    );
  });

  it('should pass error code and name in log meta', () => {
    const err = new Error('custom');
    err.code = 'CUSTOM_ERR';
    err.name = 'CustomError';
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(mockLogger.error).toHaveBeenCalledWith(
      'ErrorHandler',
      'custom',
      expect.objectContaining({
        errorCode: 'CUSTOM_ERR',
        statusCode: 500,
        method: 'GET',
        url: '/test',
      }),
    );
  });

  it('should handle error with no code property', () => {
    const err = new Error('no code');
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(mockLogger.error).toHaveBeenCalledWith(
      'ErrorHandler',
      'no code',
      expect.objectContaining({
        errorCode: 'Error',
      }),
    );
  });

  it('should handle Malformed JWT error (non-standard name)', () => {
    const err = new Error('jwt malformed');
    err.name = 'JsonWebTokenError';
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.state.statusCode).toBe(401);
    expect(res.state.body.error).toBe('Invalid token');
  });

  it('should not include stack trace in test environment (default)', () => {
    const err = new Error('Test env error');
    err.stack = 'Error: Test env error\n    at test.js:1:1';
    const req = makeReq();
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    const logCall = mockLogger.error.mock.calls[0];
    expect(logCall[2].stack).toBeUndefined();
  });
});
