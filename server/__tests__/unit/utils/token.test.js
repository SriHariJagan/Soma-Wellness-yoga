import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import jwt from 'jsonwebtoken';

let mod;

beforeAll(async () => {
  mod = await import('../../../utils/token.js');
});

const ORIGINAL_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

afterAll(() => {
  process.env.JWT_REFRESH_SECRET = ORIGINAL_REFRESH_SECRET;
});

describe('signAccessToken', () => {
  it('should sign a token with user._id and role', () => {
    const user = { _id: 'abc123', role: 'student' };
    const token = mod.signAccessToken(user);
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    expect(decoded.id).toBe('abc123');
    expect(decoded.role).toBe('student');
    expect(decoded.type).toBe('access');
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
  });

  it('should fall back to user.id when _id is absent', () => {
    const user = { id: 'def456', role: 'admin' };
    const token = mod.signAccessToken(user);
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    expect(decoded.id).toBe('def456');
    expect(decoded.role).toBe('admin');
  });

  it('should throw when JWT_SECRET is not configured', () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    expect(() => mod.signAccessToken({ _id: 'x', role: 'user' })).toThrow('JWT_SECRET is not configured');
    process.env.JWT_SECRET = original;
  });
});

describe('signRefreshToken', () => {
  it('should sign a refresh token with user._id', () => {
    const user = { _id: 'abc123' };
    const token = mod.signRefreshToken(user);
    const decoded = jwt.verify(token, `${process.env.JWT_SECRET}::refresh`, { algorithms: ['HS256'] });
    expect(decoded.id).toBe('abc123');
    expect(decoded.type).toBe('refresh');
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
  });

  it('should fall back to user.id when _id is absent', () => {
    const user = { id: 'ghi789' };
    const token = mod.signRefreshToken(user);
    const decoded = jwt.verify(token, `${process.env.JWT_SECRET}::refresh`, { algorithms: ['HS256'] });
    expect(decoded.id).toBe('ghi789');
    expect(decoded.type).toBe('refresh');
  });

  it('should use dedicated JWT_REFRESH_SECRET when set', () => {
    process.env.JWT_REFRESH_SECRET = 'dedicated-refresh-secret';
    const user = { _id: 'abc' };
    const token = mod.signRefreshToken(user);
    const decoded = jwt.verify(token, 'dedicated-refresh-secret', { algorithms: ['HS256'] });
    expect(decoded.id).toBe('abc');
  });

  it('should throw when JWT_SECRET is not configured and no refresh secret', () => {
    const original = process.env.JWT_SECRET;
    process.env.JWT_REFRESH_SECRET = '';
    delete process.env.JWT_SECRET;
    expect(() => mod.signRefreshToken({ _id: 'x' })).toThrow('JWT_SECRET is not configured');
    process.env.JWT_SECRET = original;
  });
});

describe('verifyAccessToken', () => {
  it('should verify a valid access token', () => {
    const user = { _id: 'abc123', role: 'student' };
    const token = mod.signAccessToken(user);
    const decoded = mod.verifyAccessToken(token);
    expect(decoded.id).toBe('abc123');
    expect(decoded.role).toBe('student');
    expect(decoded.type).toBe('access');
  });

  it('should throw TokenExpiredError for an expired token', () => {
    const token = jwt.sign(
      { id: 'x', role: 'student', type: 'access', exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET,
    );
    expect(() => mod.verifyAccessToken(token)).toThrow('jwt expired');
  });

  it('should throw JsonWebTokenError for invalid signature', () => {
    const token = jwt.sign(
      { id: 'x', role: 'student', type: 'access' },
      'wrong-secret-that-is-not-the-correct-one',
    );
    expect(() => mod.verifyAccessToken(token)).toThrow('invalid signature');
  });

  it('should throw JsonWebTokenError for a malformed token', () => {
    expect(() => mod.verifyAccessToken('not-a-valid-jwt-token')).toThrow('jwt malformed');
  });

  it('should throw when JWT_SECRET is not configured', () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    const token = jwt.sign({ id: 'x', role: 'student', type: 'access' }, original);
    expect(() => mod.verifyAccessToken(token)).toThrow('JWT_SECRET is not configured');
    process.env.JWT_SECRET = original;
  });
});

describe('verifyRefreshToken', () => {
  it('should verify a valid refresh token', () => {
    const user = { _id: 'abc123' };
    const token = mod.signRefreshToken(user);
    const decoded = mod.verifyRefreshToken(token);
    expect(decoded.id).toBe('abc123');
    expect(decoded.type).toBe('refresh');
  });

  it('should verify with fallback secret when no dedicated refresh secret', () => {
    const saved = process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    const user = { _id: 'abc123' };
    const token = mod.signRefreshToken(user);
    const decoded = mod.verifyRefreshToken(token);
    expect(decoded.id).toBe('abc123');
    expect(decoded.type).toBe('refresh');
    process.env.JWT_REFRESH_SECRET = saved;
  });

  it('should reject a token signed with a different secret', () => {
    const token = jwt.sign(
      { id: 'x', type: 'refresh' },
      'completely-different-secret',
    );
    expect(() => mod.verifyRefreshToken(token)).toThrow('invalid signature');
  });

  it('should throw when JWT_SECRET is not configured and no refresh secret', () => {
    const originalSecret = process.env.JWT_SECRET;
    const originalRefresh = process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    expect(() => mod.verifyRefreshToken('some-token')).toThrow('JWT_SECRET is not configured');
    process.env.JWT_SECRET = originalSecret;
    process.env.JWT_REFRESH_SECRET = originalRefresh;
  });
});

describe('signPurposeToken', () => {
  it('should sign a purpose token with payload and default TTL', () => {
    const payload = { email: 'test@example.com', purpose: 'reset-password' };
    const token = mod.signPurposeToken(payload);
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.purpose).toBe('reset-password');
    expect(decoded.type).toBe('purpose');
    expect(decoded).toHaveProperty('exp');
    expect(decoded).toHaveProperty('iat');
  });

  it('should sign a purpose token with custom TTL', () => {
    const payload = { userId: 'abc' };
    const token = mod.signPurposeToken(payload, '5m');
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    expect(decoded.userId).toBe('abc');
    expect(decoded.type).toBe('purpose');
  });

  it('should throw when JWT_SECRET is not configured', () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    expect(() => mod.signPurposeToken({ email: 'test@test.com' })).toThrow('JWT_SECRET is not configured');
    process.env.JWT_SECRET = original;
  });
});

describe('verifyPurposeToken', () => {
  it('should verify a valid purpose token', () => {
    const payload = { email: 'test@example.com', purpose: 'reset-password' };
    const token = mod.signPurposeToken(payload);
    const decoded = mod.verifyPurposeToken(token);
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.purpose).toBe('reset-password');
    expect(decoded.type).toBe('purpose');
  });

  it('should reject an expired purpose token', () => {
    const token = jwt.sign(
      { email: 'test@test.com', type: 'purpose', exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET,
    );
    expect(() => mod.verifyPurposeToken(token)).toThrow('jwt expired');
  });

  it('should reject a token with wrong signature', () => {
    const token = jwt.sign(
      { email: 'test@test.com', type: 'purpose' },
      'wrong-secret',
    );
    expect(() => mod.verifyPurposeToken(token)).toThrow('invalid signature');
  });

  it('should reject a malformed token', () => {
    expect(() => mod.verifyPurposeToken('not-a-token')).toThrow('jwt malformed');
  });

  it('should throw when JWT_SECRET is not configured', () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    expect(() => mod.verifyPurposeToken('some-token')).toThrow('JWT_SECRET is not configured');
    process.env.JWT_SECRET = original;
  });
});
