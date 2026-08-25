// ── Attendance Statuses ──────────────────────────────────────
export const ATTENDANCE_STATUSES = ['present', 'zoom', 'absent', 'late', 'excused', 'not_marked']  ;

// ── Attendance Modes ─────────────────────────────────────────
export const ATTENDANCE_MODES = ['online', 'offline']  ;

// ── Entity Types (ClassInvite + Attendance) ──────────────────
export const ENTITY_TYPES = ['membership', 'service', 'course', 'trial', 'workshop', 'batch', 'yttc', 'none']  ;

// ── Course Modes ─────────────────────────────────────────────
export const COURSE_MODES = ['Online', 'Hybrid', 'Studio']  ;

// ── Service Modes ────────────────────────────────────────────
export const SERVICE_MODES = ['offline', 'online', 'home', 'center', 'hybrid']  ;

// ── Service Pricing Models ───────────────────────────────────
export const PRICING_MODELS = ['flat', 'monthly', 'per_session', 'contact']  ;

// ── Validity Units ───────────────────────────────────────────
export const VALIDITY_UNITS = ['days', 'weeks', 'months']  ;

// ── Service Categories ───────────────────────────────────────
export const SERVICE_CATEGORIES = ['Group', 'Personal', 'Specialty', 'Corporate', 'Therapy', 'General']  ;

// ── Class Session Statuses ───────────────────────────────────
export const CLASS_SESSION_STATUSES = ['upcoming', 'completed', 'cancelled']  ;

// ── Class Invite Statuses ────────────────────────────────────
export const CLASS_INVITE_STATUSES = ['active', 'cancelled', 'completed']  ;

// ── Class Invite Categories ──────────────────────────────────
export const INVITE_CATEGORIES = ['class', 'yttc']  ;

// ── Recipient Statuses (ClassInvite) ─────────────────────────
export const RECIPIENT_STATUSES = ['pending', 'delivered', 'read', 'joined']  ;

// ── Platform Types ───────────────────────────────────────────
export const PLATFORM_TYPES = ['Zoom', 'Google Meet', 'Offline', 'Custom']  ;

// ── Recipient Types (ClassInvite audience filter) ────────────
export const RECIPIENT_TYPES = [
  'all_members',
  'service_members',
  'batch',
  'course',
  'trial',
  'workshop',
  'custom',
  'yttc_students',
]  ;

// ── Batch Statuses ───────────────────────────────────────────
export const BATCH_STATUSES = ['Active', 'Upcoming', 'Closed']  ;

// ── Plan Visibility ──────────────────────────────────────────
export const PLAN_VISIBILITY = ['public', 'private', 'hidden']  ;
