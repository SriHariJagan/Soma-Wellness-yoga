// ── User Roles ───────────────────────────────────────────────
// manager = center manager / reception: marks attendance, books walk-in
// classes via the staff API (/api/staff). Admin-only areas (revenue,
// coupons, comms, settings) stay admin-only.
// reception = front-desk staff with granular permissions assigned by admin.
export const USER_ROLES = ['student', 'admin', 'manager', 'reception'];
export const USER_ROLES_FLAT = ['student', 'admin', 'manager', 'reception'];

// ── User Statuses ────────────────────────────────────────────
export const USER_STATUSES = ['active', 'banned', 'pending']  ;

// ── YTTC Enrollment Statuses ─────────────────────────────────
export const YTTC_ENROLLMENT_STATUSES = ['not_enrolled', 'pending', 'active', 'completed']  ;

// ── YTTC Modes ────────────────────────────────────────────────
export const YTTC_MODES = ['online', 'hybrid', '']  ;

// ── Referral ─────────────────────────────────────────────────
export const REFERRAL_REWARD_DEFAULT = 500;
