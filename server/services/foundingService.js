// ============================================================
// server/services/foundingService.js — Founding member eligibility
// First 100 members OR first 90 days after opening — whichever first.
// Rate held 12 months from join date.
// ============================================================
import { FOUNDING_CAP, FOUNDING_WINDOW_DAYS, FOUNDING_LOCK_MONTHS } from '../config/somaCatalog.js';

const MS_PER_DAY = 86400000;

/**
 * @param {object} params
 * @param {number} params.currentCount - founding members signed up so far
 * @param {Date} params.openingDate - launch date
 * @param {Date} [params.now] - current date (for testing)
 * @returns {{ eligible: boolean, remainingSlots: number, daysRemaining: number, reason?: string }}
 */
export function checkFoundingEligibility({ currentCount, openingDate, now = new Date() }) {
  if (!openingDate) return { eligible: false, remainingSlots: 0, daysRemaining: 0, reason: 'no_opening_date' };
  const opening = new Date(openingDate);
  const current = new Date(now);
  const elapsedDays = Math.floor((current - opening) / MS_PER_DAY);
  const windowEnd = new Date(opening.getTime() + FOUNDING_WINDOW_DAYS * MS_PER_DAY);
  const daysRemaining = Math.max(0, Math.ceil((windowEnd - current) / MS_PER_DAY));
  const remainingSlots = Math.max(0, FOUNDING_CAP - currentCount);

  const capOk = currentCount < FOUNDING_CAP;
  const windowOk = current < windowEnd;

  const eligible = capOk && windowOk;
  let reason = null;
  if (!eligible) {
    if (!capOk && !windowOk) reason = 'cap_and_window_exceeded';
    else if (!capOk) reason = 'cap_reached';
    else reason = 'window_expired';
  }

  return { eligible, remainingSlots, daysRemaining, capOk, windowOk, reason, windowEnd };
}

export function foundingRateExpiresAt(joinDate) {
  const d = new Date(joinDate);
  const expiry = new Date(d);
  expiry.setMonth(expiry.getMonth() + FOUNDING_LOCK_MONTHS);
  return expiry;
}

export function isFoundingRateActive({ joinDate, now = new Date() }) {
  const expiry = foundingRateExpiresAt(joinDate);
  return new Date(now) < expiry;
}

export function dashboardSnapshot({ currentCount, openingDate, members = [], now = new Date() }) {
  const eligibility = checkFoundingEligibility({ currentCount, openingDate, now });
  const expiringMembers = members
    .filter((m) => m.founding_rate_expires_at)
    .map((m) => ({
      user: m.user,
      tier: m.tier,
      founding_rate_expires_at: m.founding_rate_expires_at,
      daysLeft: Math.max(0, Math.ceil((new Date(m.founding_rate_expires_at) - new Date(now)) / MS_PER_DAY)),
    }));
  return {
    ...eligibility,
    cap: FOUNDING_CAP,
    windowDays: FOUNDING_WINDOW_DAYS,
    lockMonths: FOUNDING_LOCK_MONTHS,
    totalFounding: currentCount,
    expiringMembers,
  };
}

// Atomic attempt to claim a founding slot — to be used with MongoDB
// Returns the Mongo update filter condition for use in findOneAndUpdate.
// Caller should do: FoundingSettings.findOneAndUpdate({ count: { $lt: CAP } }, { $inc: { count: 1 } })
export function claimFilter() {
  return { count: { $lt: FOUNDING_CAP } };
}
