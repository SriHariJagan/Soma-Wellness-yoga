// ── Offering Categories ──────────────────────────────────────
export const OFFERING_CATEGORIES = [
  'group_yoga',
  'membership',
  'personal_training',
  'meditation',
  'corporate',
  'therapy',
  'mama',
  'signature',
  'academy',
];

// ── Offering Statuses ────────────────────────────────────────
// draft: admin-only, not publicly visible
// available: visible and bookable
// unavailable: visible but booking disabled
// upcoming: visible with "Coming Soon" indication
// archived: not publicly visible
export const OFFERING_STATUSES = ['draft', 'available', 'unavailable', 'upcoming', 'archived'];

// ── Offering Visibility ──────────────────────────────────────
// public: shown on public website
// private: visible to authenticated users only
// hidden: not shown anywhere publicly
export const OFFERING_VISIBILITY = ['public', 'private', 'hidden'];

// ── Offering Pricing Models ──────────────────────────────────
export const OFFERING_PRICING_MODELS = ['flat', 'per_session', 'per_package', 'monthly', 'contact'];

// ── Validity Units ───────────────────────────────────────────
export const OFFERING_VALIDITY_UNITS = ['single', 'sessions', 'days', 'weeks', 'months'];
