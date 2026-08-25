// ── Notification Types ───────────────────────────────────────
// This is the master enum validated by the Notification model.
// Every value passed as type to notify() or notificationService.send()
// must appear here. Template-only identifiers (e.g. 'welcome',
// 'class-reminder') are also listed because NotificationService
// falls back to type = templateKey when no explicit overrideType
// is given.
export const NOTIFICATION_TYPES = [
  // ── High-level categories ──
  "general",
  "information",
  "reminder",
  "payment_reminder",
  "membership_expiry",
  "membership_activated",
  "course_update",
  "service_update",
  "workshop_update",
  "attendance",
  "promotional",
  "emergency",
  "success",
  "info",
  "workshop",
  "class",
  "yttc",
  "password-reset",

  // ── Asset notifications (used by assetController) ──
  "new_asset",
  "asset_updated",
  "asset_replaced",

  // ── Template-based types (used as fallback when notificationService.send()
  //    is called with a template but without an explicit type) ──
  "welcome",
  "class-reminder",
  "class-enrollment",
  "workshop-reminder",
  "workshop-confirmation",
  "event-reminder",
  "membership-reminder",
  "invoice",
  "newsletter",
  "birthday",
  "consultation-confirmation",
  "service-enrollment",
  "booking-confirmation",
  "referral-invite",
  "lead-confirmation",
  "refund",
];

// ── Notification Priority Levels ─────────────────────────────
export const PRIORITY_LEVELS = ["low", "normal", "high", "urgent", "critical"];

// ── Notification Statuses ────────────────────────────────────
export const NOTIFICATION_STATUSES = [
  "pending",
  "sent",
  "delivered",
  "failed",
  "cancelled",
];

// ── Notification Log Statuses ────────────────────────────────
export const NOTIFICATION_LOG_STATUSES = [
  "scheduled",
  "queued",
  "sending",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "failed",
  "bounced",
  "complained",
];

// ── Notification Channels ────────────────────────────────────
export const NOTIFICATION_CHANNELS = [
  "email",
  "inApp",
  "sms",
  "whatsapp",
  "push",
];

// ── Priority Map (for BullMQ) ────────────────────────────────
export const PRIORITY_MAP = {
  critical: 1,
  high: 2,
  normal: 3,
  low: 4,
};

// ── Notification Template Categories ─────────────────────────
export const NOTIFICATION_TEMPLATE_CATEGORIES = [
  "transactional",
  "marketing",
  "system",
  "digest",
];

// ── Reminder Types ───────────────────────────────────────────
// Used by reminder/checks.js for ReminderLog deduplication keys.
// The membership-expiry variants (7d, 3d, 1d) track the three
// distinct reminder windows independently.
export const REMINDER_TYPES = [
  "class-reminder",
  "workshop-reminder",
  "event-reminder",
  "membership-expiry",
  "membership-expiry-7d",
  "membership-expiry-3d",
  "membership-expiry-1d",
  "birthday",
];

// ── Notification Schedule Types ──────────────────────────────
export const NOTIFICATION_SCHEDULE_TYPES = [
  "recurring",
  "oneTime",
  "triggerBased",
];

// ── Notification Schedule Statuses ───────────────────────────
export const NOTIFICATION_SCHEDULE_STATUSES = [
  "active",
  "paused",
  "completed",
  "archived",
];
