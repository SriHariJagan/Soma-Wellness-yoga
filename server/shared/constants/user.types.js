// ── User Roles ───────────────────────────────────────────────
export const USER_ROLES = ['student', 'admin', 'branch_manager', 'staff'];
export const USER_ROLES_FLAT = ['student', 'admin', 'branch_manager', 'staff'];

// ── User Statuses ────────────────────────────────────────────
export const USER_STATUSES = ['active', 'banned', 'pending'];

// ── Attendance Permissions ──────────────────────────────────
export const ATTENDANCE_PERMISSIONS = ['attendance.scan', 'attendance.view', 'attendance.manage'];

// ── Role-Permission Mapping ─────────────────────────────────
export const ROLE_PERMISSIONS = {
  admin: ['attendance.scan', 'attendance.view', 'attendance.manage'],
  branch_manager: ['attendance.scan', 'attendance.view', 'attendance.manage'],
  staff: ['attendance.scan', 'attendance.view'],
  student: [],
};

// ── Branch Attendance Statuses ──────────────────────────────
export const BRANCH_ATTENDANCE_STATUSES = ['PRESENT', 'CANCELLED'];
export const BRANCH_ATTENDANCE_METHODS = ['QR'];

// ── QR Token Prefix ─────────────────────────────────────────
export const QR_TOKEN_PREFIX = 'SW-ATT-';

// ── YTTC Enrollment Statuses ─────────────────────────────────
export const YTTC_ENROLLMENT_STATUSES = ['not_enrolled', 'pending', 'active', 'completed'];

// ── YTTC Modes ────────────────────────────────────────────────
export const YTTC_MODES = ['online', 'hybrid', ''];

// ── Referral ─────────────────────────────────────────────────
export const REFERRAL_REWARD_DEFAULT = 500;
