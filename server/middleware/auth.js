import { verifyAccessToken } from '../utils/token.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/User.js';
import logger from '../notification/logger.js';

const MODULE = 'Auth';

export async function requireAuth(req, res, next) {
  try {
    const header = req.header('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('No token, authorization denied');

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      const authError = err.name === 'TokenExpiredError'
        ? ApiError.unauthorized('Session expired, please sign in again')
        : ApiError.unauthorized('Invalid token');
      logger.warn(MODULE, 'Token verification failed', {
        error: authError.message,
        errorCode: err.name,
        requestId: req.requestId,
      });
      throw authError;
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      logger.warn(MODULE, 'Account not found', {
        userId: decoded.id,
        requestId: req.requestId,
      });
      throw ApiError.unauthorized('Account no longer exists');
    }

    if (user.status === 'banned') {
      logger.warn(MODULE, 'Banned user attempted access', {
        userId: String(user._id),
        requestId: req.requestId,
      });
      throw ApiError.forbidden('Your account has been suspended');
    }

    req.user = user;
    req.userId = user._id;

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      logger.warn(MODULE, 'Insufficient privileges', {
        userId: String(req.user._id),
        role: req.user.role,
        requiredRoles: roles,
        requestId: req.requestId,
      });
      return next(ApiError.forbidden('Access denied. Insufficient privileges.'));
    }
    next();
  };
}

export const requireAdmin = requireRole('admin');

export async function optionalAuth(req, res, next) {
  try {
    const header = req.header('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next();

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return next();
    }

    const user = await User.findById(decoded.id).select('-password');
    if (user && user.status !== 'banned') {
      req.user = user;
      req.userId = user._id;
    }
    next();
  } catch {
    next();
  }
}

export default requireAuth;
