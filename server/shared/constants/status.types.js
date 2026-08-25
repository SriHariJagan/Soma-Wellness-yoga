// ── Membership Statuses ──────────────────────────────────────
export const MEMBERSHIP_STATUSES = ['active', 'expired', 'paused', 'cancelled']  ;

// ── Membership Session Attendance Statuses (in sessionHistory) ─
export const MEMBERSHIP_SESSION_STATUSES = ['present', 'zoom', 'absent']  ;

// ── Membership History Actions ───────────────────────────────
export const MEMBERSHIP_HISTORY_ACTIONS = ['created', 'renewed', 'upgraded', 'paused', 'resumed', 'cancelled', 'expired']  ;

// ── UserService Statuses (same as membership + 'completed') ──
export const USER_SERVICE_STATUSES = ['active', 'expired', 'paused', 'cancelled', 'completed']  ;

// ── UserService Payment Statuses ─────────────────────────────
export const SERVICE_PAYMENT_STATUSES = ['paid', 'pending', 'failed', 'refunded']  ;

// ── UserService History Actions ──────────────────────────────
export const SERVICE_HISTORY_ACTIONS = ['purchased', 'activated', 'completed', 'expired', 'renewed']  ;

// ── Free Trial Statuses ──────────────────────────────────────
export const TRIAL_STATUSES = ['active', 'expired', 'converted', 'cancelled']  ;

// ── Event Statuses ───────────────────────────────────────────
export const EVENT_STATUSES = ['available', 'completed', 'cancelled', 'upcoming']  ;

// ── Workshop Statuses (subset of event) ──────────────────────
export const WORKSHOP_STATUSES = ['available', 'completed', 'cancelled']  ;

// ── Consultation Statuses ────────────────────────────────────
export const CONSULTATION_STATUSES = ['upcoming', 'completed', 'cancelled', 'rescheduled']  ;

// ── Consultation Payment Statuses ────────────────────────────
export const CONSULTATION_PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded']  ;

// ── Lead Stages ──────────────────────────────────────────────
export const LEAD_STAGES = ['New', 'Follow up', 'Converted', 'Cold']  ;

// ── Booking Statuses ─────────────────────────────────────────
export const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Cancelled']  ;

// ── Payment Methods (Booking) ────────────────────────────────
export const BOOKING_PAYMENT_METHODS = ['UPI', 'Bank Transfer', 'Cash', 'Card']  ;

// ── Attendance Entity Types (same as Entity Types) ───────────
export { ENTITY_TYPES as ATTENDANCE_ENTITY_TYPES } from './course.types.js';
