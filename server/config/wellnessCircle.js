// ============================================================
// server/config/wellnessCircle.js — SOMA WELLNESS CIRCLE
// Single source of truth for the one annual privilege membership.
// Backend is authoritative for price/duration/discount — the
// frontend may display these values but must never dictate them.
// ============================================================

export const WELLNESS_CIRCLE = {
  NAME: 'Soma Wellness Circle',
  // Canonical planType values accepted for active-membership checks.
  // (Historical writes should all use NAME; the upper-case alias is
  // accepted defensively so older records keep working.)
  ALIASES: ['Soma Wellness Circle', 'SOMA WELLNESS CIRCLE', 'SOMA Wellness Circle'],
  SUBTITLE: 'Annual Privilege Membership',
  TAGLINE: 'Your year of wellness, inspiration and member-only privileges.',
  PRICE: 36500, // KES — authoritative
  CURRENCY: 'KES',
  DURATION_MONTHS: 12,
  DISCOUNT_PCT: 0.05, // 5% off eligible regular-priced services
  POSITIONING:
    'A loyalty and lifestyle subscription for people who want ongoing connection with SOMA — not a replacement for the main yoga or therapy packages.',
  WHY_JOIN:
    'A simple way to stay connected with SOMA all year — receive practical wellness guidance, enjoy member savings and belong to a calm wellness community, without committing to a full yoga package.',
  BENEFITS: [
    '5% saving on regular-priced SOMA services.*',
    'Weekly motivational and wellness inspiration.',
    'One curated “Good Read” wellness article every month.',
    'Member-only premium content: short yoga, breathwork, meditation and wellness resources.',
    'Complimentary access to designated SOMA meditation, garden and reading/relaxation spaces during member hours.',
    'Priority booking for appointments, workshops and selected events.',
    'A birthday wellness gift from SOMA.',
    'One guest privilege each year for a selected community/meditation experience.',
    'Early invitations to new programs, special events and member experiences.',
  ],
  NOT_INCLUDED: [
    'It is not an unlimited yoga-class membership.',
    'Yoga classes, private sessions, therapy, massage and other treatments remain separately chargeable.',
    'The 5% benefit does not stack with already discounted packages, memberships or promotional offers.',
  ],
  POPUP: {
    TITLE: 'Join SOMA Wellness Circle — KES 36,500',
    DESCRIPTION:
      'Enjoy 5% off regular-priced services, monthly wellness reads, weekly inspiration, premium member content, access to selected SOMA wellness spaces, priority booking, birthday surprises and exclusive member invitations.',
    CTA: 'BECOME A SOMA MEMBER',
  },
};

export const CIRCLE_PRICE = WELLNESS_CIRCLE.PRICE;
export const CIRCLE_DURATION_MONTHS = WELLNESS_CIRCLE.DURATION_MONTHS;
export const CIRCLE_DISCOUNT_PCT = WELLNESS_CIRCLE.DISCOUNT_PCT;
export const CIRCLE_NAME = WELLNESS_CIRCLE.NAME;
export const CIRCLE_ALIASES = WELLNESS_CIRCLE.ALIASES;

export function isCirclePlanName(name) {
  if (!name) return false;
  const n = String(name).trim().toLowerCase();
  return CIRCLE_ALIASES.some((a) => a.toLowerCase() === n);
}

export function circleExpiryFrom(startDate) {
  const start = new Date(startDate);
  const expiry = new Date(start);
  expiry.setFullYear(expiry.getFullYear() + 1);
  return expiry;
}

export function formatKE(n) {
  return `KES ${Number(n || 0).toLocaleString('en-KE')}`;
}
