import ShippingRule from '../models/ShippingRule.js';
import Settings from '../models/Settings.js';

// ─────────────────────────────────────────────────────────────
// shippingService — server-side shipping rule engine.
//
// Default-allow model: delivery is available everywhere. Rules only
// override the terms (charge, ETA) for the destinations they cover;
// any destination NOT covered by a rule falls back to the global
// store defaults. The ONLY ways to restrict delivery are:
//   - a blocked PIN / blocked range on a rule, or
//   - a rule with shippingType 'unavailable'.
//
// Rule matching priority (most specific wins):
//   1. Specific PIN (blocked overrides allowed)
//   2. PIN range
//   3. State
//   4. Country
//   5. Default rule (country '*' / 'Any')
//
// A 'blocked' decision always wins over an 'allowed' decision at
// the same level, and a more specific level wins over a general
// level regardless of the admin-set priority. The admin priority
// field only breaks ties between rules at the SAME specificity.
// ─────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  freeShippingThreshold: 0,
  defaultShippingCharge: 60,
  deliveryMinDays: 3,
  deliveryMaxDays: 5,
};

export async function getShippingSettings() {
  const settings = await Settings.getSingleton();
  const cfg = settings.bookStoreShipping || {};
  return { ...DEFAULT_SETTINGS, ...cfg };
}

export async function saveShippingSettings(patch) {
  const settings = await Settings.getSingleton();
  settings.bookStoreShipping = { ...(settings.bookStoreShipping || {}), ...patch };
  await settings.save();
  return settings.bookStoreShipping;
}

function isPincodeAllowed(rule, pincode) {
  if (rule.blockedPincodes && rule.blockedPincodes.includes(pincode)) return false;
  if (rule.allowedPincodes && rule.allowedPincodes.length > 0 && !rule.allowedPincodes.includes(pincode)) return false;
  return true;
}

function isPincodeInRange(rule, pincode) {
  const p = parseInt(pincode, 10);
  if (!Number.isFinite(p)) return false;
  return (rule.pincodeRanges || []).some((r) => p >= parseInt(r.from, 10) && p <= parseInt(r.to, 10));
}

function ruleMatchesAddress(rule, { pincode, state, country }) {
  // Specific PIN match
  const hasSpecificPinRules =
    (rule.allowedPincodes && rule.allowedPincodes.length > 0) ||
    (rule.blockedPincodes && rule.blockedPincodes.length > 0) ||
    (rule.pincodeRanges && rule.pincodeRanges.length > 0);

  if (hasSpecificPinRules) {
    if (rule.blockedPincodes && rule.blockedPincodes.includes(pincode)) {
      return { specificity: 4, blocked: true };
    }
    if (rule.allowedPincodes && rule.allowedPincodes.includes(pincode)) {
      return { specificity: 4, blocked: false };
    }
    if (isPincodeInRange(rule, pincode)) {
      return { specificity: 3, blocked: false };
    }
    // A rule with PIN lists applies ONLY to those PINs — no partial match.
    return null;
  }

  // State match
  if (rule.states && rule.states.length > 0) {
    if (!state) return null;
    const stateMatch = rule.states.some((s) => s.trim().toLowerCase() === state.trim().toLowerCase());
    if (stateMatch) return { specificity: 2, blocked: false };
    return null;
  }

  // Country match
  if (rule.country && rule.country !== '*' && rule.country.toLowerCase() !== 'any') {
    if (!country) return null;
    if (rule.country.trim().toLowerCase() !== country.trim().toLowerCase()) return null;
    return { specificity: 1, blocked: false };
  }

  // Default rule (country '*' / 'any' / empty with no other scope)
  return { specificity: 0, blocked: false };
}

/**
 * Determine the delivery decision for a destination.
 * @returns {{ available: boolean, reason?: string, rule?: object,
 *            shippingAmount: number, deliveryMinDays: number, deliveryMaxDays: number,
 *            shippingType: string, freeShippingThreshold: number }}
 */
export async function checkAvailability({ pincode, state, country = 'India' }) {
  if (!pincode || !/^\d{6}$/.test(pincode.trim())) {
    return { available: false, reason: 'Enter a valid 6-digit PIN code' };
  }
  const cleanPincode = pincode.trim();

  const rules = await ShippingRule.find({ status: 'active' }).sort({ priority: -1 }).lean();
  const settings = await getShippingSettings();

  // Find the best (most specific) matching rule.
  let best = null;
  for (const rule of rules) {
    const match = ruleMatchesAddress(rule, { pincode: cleanPincode, state: state?.trim(), country: country?.trim() });
    if (!match) continue;
    if (!best || match.specificity > best.match.specificity) {
      best = { rule, match };
      // A blocked PIN-level match is the final word; keep scanning
      // otherwise so a blocked rule can override an allowed one.
      if (match.specificity >= 4 && match.blocked) break;
    } else if (match.specificity === best.match.specificity && match.blocked && !best.match.blocked) {
      // A blocked decision always wins over an allowed decision at the same level.
      best = { rule, match };
      if (match.specificity >= 4) break;
    }
  }

  if (!best) {
    // Default-allow: the destination is not covered by any rule, so it
    // ships with the global store defaults. Only blocked PINs and
    // 'unavailable' rules (handled below) actually restrict delivery.
    return {
      available: true,
      shippingAmount: settings.defaultShippingCharge,
      shippingType: 'flat',
      freeShippingThreshold: settings.freeShippingThreshold || 0,
      deliveryMinDays: settings.deliveryMinDays,
      deliveryMaxDays: settings.deliveryMaxDays,
    };
  }

  if (best.match.blocked) {
    return {
      available: false,
      reason: 'Delivery is currently unavailable for this PIN code',
      shippingAmount: 0,
    };
  }

  const rule = best.rule;
  if (rule.shippingType === 'unavailable') {
    return {
      available: false,
      reason: 'Delivery is currently unavailable for this PIN code',
      shippingAmount: 0,
    };
  }

  const shippingAmount = rule.shippingType === 'free' ? 0 : rule.shippingAmount ?? 0;
  return {
    available: true,
    shippingAmount,
    shippingType: rule.shippingType,
    freeShippingThreshold: rule.freeShippingThreshold || settings.freeShippingThreshold || 0,
    deliveryMinDays: rule.deliveryMinDays || settings.deliveryMinDays,
    deliveryMaxDays: rule.deliveryMaxDays || settings.deliveryMaxDays,
    rule: rule._id,
    ruleName: rule.name,
  };
}

/**
 * Calculate the final shipping charge for a cart+destination.
 * Free shipping threshold is applied against the post-discount subtotal.
 */
export async function calculateShipping(subtotal, address) {
  const availability = await checkAvailability(address);
  if (!availability.available) return { ...availability, shippingCharge: 0 };

  let shippingCharge = availability.shippingAmount;
  if (availability.freeShippingThreshold > 0 && subtotal >= availability.freeShippingThreshold) {
    shippingCharge = 0;
  }
  return { ...availability, shippingCharge };
}

export default { checkAvailability, calculateShipping, getShippingSettings, saveShippingSettings };