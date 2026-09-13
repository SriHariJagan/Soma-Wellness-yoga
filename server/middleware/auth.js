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

// Center staff (admin + center manager). Used by /api/staff — attendance,
// walk-in booking and class invites. Revenue, coupons, comms and settings
// remain requireAdmin-only.
export const requireStaff = requireRole('admin', 'manager');

// Reception role — used by /api/reception
export const requireReception = requireRole('reception');

/**
 * Middleware factory: checks that the authenticated user has ANY of the
 * specified permission keys (OR logic). Admin and manager roles bypass
 * all permission checks. Must be used AFTER requireAuth.
 *
 * OR logic is intentional: permission keys come in alias pairs
 * (e.g. customers.view / users.view, attendance.view / classes.attendance,
 * bookings.view / sections.view). Granting either alias grants access,
 * matching the frontend's hasAnyPermission(...) gating.
 */
export function requirePermission(...permissionKeys) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    // Admin bypasses all permission checks
    if (req.user.role === 'admin') return next();
    // Manager bypasses permission checks (has staff-level access)
    if (req.user.role === 'manager') return next();
    // Only reception staff are subject to granular permission checks.
    // Students (or any other role) must never pass, even if a permissions
    // array was somehow set on their record.
    if (req.user.role !== 'reception') {
      logger.warn(MODULE, 'Non-staff role attempted permission-gated route', {
        userId: String(req.user._id),
        role: req.user.role,
        required: permissionKeys,
        requestId: req.requestId,
      });
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    // Check reception permissions (ANY match suffices)
    const userPerms = req.user.permissions || [];
    const hasAny = permissionKeys.length === 0 || permissionKeys.some((key) => userPerms.includes(key));
    if (!hasAny) {
      logger.warn(MODULE, 'Missing permissions', {
        userId: String(req.user._id),
        role: req.user.role,
        required: permissionKeys,
        has: userPerms,
        requestId: req.requestId,
      });
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

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
