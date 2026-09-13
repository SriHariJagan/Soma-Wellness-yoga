import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

const mockLogger = { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() };

let requirePermission;

beforeAll(async () => {
  await jest.unstable_mockModule('../../../utils/token.js', () => ({
    verifyAccessToken: jest.fn(),
  }));
  await jest.unstable_mockModule('../../../models/User.js', () => ({
    default: { findById: jest.fn() },
  }));
  await jest.unstable_mockModule('../../../notification/logger.js', () => ({
    default: mockLogger,
  }));

  const mod = await import('../../../middleware/auth.js');
  requirePermission = mod.requirePermission;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function run(client, ...keys) {
  const req = { user: client, requestId: 'test-req' };
  const next = jest.fn();
  requirePermission(...keys)(req, {}, next);
  return next;
}

describe('requirePermission (OR logic over permission aliases)', () => {
  it('allows when the user holds ANY of the required keys', () => {
    const next = run(
      { _id: 'r1', role: 'reception', permissions: ['customers.view'] },
      'customers.view',
      'users.view',
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('denies when the user holds NONE of the required keys', () => {
    const next = run(
      { _id: 'r1', role: 'reception', permissions: ['bookings.view'] },
      'attendance.view',
      'classes.attendance',
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('lets admin bypass without any permissions', () => {
    const next = run({ _id: 'a1', role: 'admin', permissions: [] }, 'anything.at.all');
    expect(next).toHaveBeenCalledWith();
  });

  it('lets manager bypass without any permissions', () => {
    const next = run({ _id: 'm1', role: 'manager', permissions: [] }, 'anything.at.all');
    expect(next).toHaveBeenCalledWith();
  });

  it('denies students even if a permissions array is set on their record', () => {
    const next = run(
      { _id: 's1', role: 'student', permissions: ['customers.view'] },
      'customers.view',
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('denies unauthenticated requests with 401', () => {
    const next = jest.fn();
    requirePermission('customers.view')({}, {}, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('allows single-key checks for exact permission holders', () => {
    const next = run(
      { _id: 'r3', role: 'reception', permissions: ['bookings.cancel'] },
      'bookings.cancel',
    );
    expect(next).toHaveBeenCalledWith();
  });
});
