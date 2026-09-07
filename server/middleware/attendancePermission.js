import { ROLE_PERMISSIONS } from '../shared/constants/index.js';
import ApiError from '../utils/ApiError.js';
import logger from '../notification/logger.js';

const MODULE = 'AttendancePerm';

export function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }
      const permissions = ROLE_PERMISSIONS[req.user.role] || [];
      if (!permissions.includes(permission)) {
        logger.warn(MODULE, 'Permission denied', {
          userId: String(req.user._id),
          role: req.user.role,
          requiredPermission: permission,
          requestId: req.requestId,
        });
        throw ApiError.forbidden('You do not have permission to perform this action.');
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireAttendanceScan() {
  return requirePermission('attendance.scan');
}

export function requireAttendanceView() {
  return requirePermission('attendance.view');
}

export function requireAttendanceManage() {
  return requirePermission('attendance.manage');
}

export function resolveBranch(req, res, next) {
  const branchId = req.body.branchId || req.query.branchId || req.params.branchId;
  if (branchId) {
    req.branchId = branchId;
    return next();
  }
  if (req.user?.branchId) {
    req.branchId = req.user.branchId;
    return next();
  }
  next();
}

export default { requirePermission, requireAttendanceScan, requireAttendanceView, requireAttendanceManage, resolveBranch };
