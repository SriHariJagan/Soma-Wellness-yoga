// ============================================================
// utils/token.js
// JWT helpers — access + refresh token signing / verification.
// ============================================================
import jwt from 'jsonwebtoken';

const ACCESS_TTL  = process.env.JWT_ACCESS_TTL  || '2h';
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '30d';

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not configured');
  return s;
}

function refreshSecret() {
  // Fall back to JWT_SECRET with a suffix so refresh tokens are still
  // distinct from access tokens even if a dedicated secret isn't set.
  return process.env.JWT_REFRESH_SECRET || `${secret()}::refresh`;
}

export function signAccessToken(user) {
  return jwt.sign(
    { id: user._id ?? user.id, role: user.role, type: 'access' },
    secret(),
    { expiresIn: ACCESS_TTL }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { id: user._id ?? user.id, type: 'refresh' },
    refreshSecret(),
    { expiresIn: REFRESH_TTL }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, secret(), { algorithms: ['HS256'] });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret(), { algorithms: ['HS256'] });
}

// Short-lived single-purpose token (used for password-reset links).
export function signPurposeToken(payload, ttl = '15m') {
  return jwt.sign({ ...payload, type: 'purpose' }, secret(), { expiresIn: ttl });
}

export function verifyPurposeToken(token) {
  return jwt.verify(token, secret(), { algorithms: ['HS256'] });
}
