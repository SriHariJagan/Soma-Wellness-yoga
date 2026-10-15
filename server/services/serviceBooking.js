// ============================================================
// services/serviceBooking.js — one booking switch, two storefronts.
//
// The public website renders the Offering catalog (which owns the
// bookingEnabled switch + status), while the logged-in dashboard renders
// the Service catalog (which has no such switch). Offerings are matched
// to services by name — the same key the admin Service→Offering mirror
// uses. Every logged-in purchase path consults this helper so an admin
// disabling bookings on the website automatically disables them after
// login too. No new fields, no admin UI changes, no migration.
// ============================================================
import Offering from '../models/Offering.js';

const BOOKABLE_STATUSES = new Set(['available']);

/**
 * Map service name → booking-disabled flag for the given names.
 * A service counts as booking-disabled when its same-named offering is
 * explicitly unbookable (bookingEnabled === false), hidden, or in a
 * non-available status. Services with no matching offering follow their
 * own active flag (handled by callers).
 */
export async function getBookingDisabledMap(names = []) {
  const list = [...new Set((names || []).filter(Boolean))];
  if (list.length === 0) return new Map();
  let offerings = [];
  try {
    offerings = await Offering.find({ name: { $in: list } })
      .select('name bookingEnabled status visibility')
      .lean();
  } catch {
    return new Map();
  }
  const map = new Map();
  for (const o of offerings) {
    const disabled =
      o.bookingEnabled === false ||
      o.visibility === 'hidden' ||
      (o.status && !BOOKABLE_STATUSES.has(o.status));
    map.set(o.name, disabled);
  }
  return map;
}

/**
 * True when a Service doc may be booked from logged-in surfaces.
 * Mirrors the public website rule (price/availability handled by callers).
 */
export async function isServiceBookingEnabled(service) {
  if (!service || service.active === false) return false;
  try {
    const map = await getBookingDisabledMap([service.name]);
    if (map.get(service.name)) return false;
  } catch {
    /* lookup failure must never block a sale — fail open, like today */
  }
  return true;
}
