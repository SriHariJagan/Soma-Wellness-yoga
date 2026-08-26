// ============================================================
// server/services/allowanceService.js — Monthly allowance reset
// Allowances reset every cycle and NOT roll over (global rule 5).
// ============================================================

/**
 * Build initial allowances object from tier key.
 * Returns allowance counters set to starting values.
 */
import { MEMBERSHIP_TIERS } from '../config/somaCatalog.js';

export function initialAllowances(tierKey) {
  const tier = MEMBERSHIP_TIERS[tierKey?.toUpperCase()];
  if (!tier) return {};
  const out = {};
  const alloc = tier.allowances || {};
  for (const [k, v] of Object.entries(alloc)) {
    // Infinity means unlimited — store as -1 sentinel or large
    out[k] = v === Infinity ? -1 : Number(v);
  }
  // Also initialise usage counters
  out._usage = {};
  for (const k of Object.keys(alloc)) out._usage[k] = 0;
  return out;
}

/**
 * Consume an allowance.
 * @param {object} membershipLike - { allowances, allowanceUsage }
 * @param {string} key
 * @param {number} qty
 * @returns {{ allowed: boolean, remaining: number, reason?: string }}
 */
export function consumeAllowance(membership, key, qty = 1) {
  if (!membership) return { allowed: false, reason: 'no_membership' };
  const alloc = membership.allowances || {};
  // unlimited sentinel -1 or Infinity
  const total = alloc[key];
  if (total === -1 || total === Infinity) return { allowed: true, remaining: Infinity, unlimited: true };
  if (total == null) return { allowed: false, reason: 'no_allowance_for_key' };
  const usage = membership.allowanceUsage || {};
  const used = Number(usage[key] || 0);
  const remaining = total - used;
  if (remaining < qty) return { allowed: false, remaining, reason: 'insufficient_allowance' };
  return { allowed: true, remaining: remaining - qty };
}

/**
 * Apply consumption (mutates allowanceUsage).
 */
export function applyConsume(membership, key, qty = 1) {
  const check = consumeAllowance(membership, key, qty);
  if (!check.allowed) throw new Error(check.reason || 'not_allowed');
  if (check.unlimited) return check;
  membership.allowanceUsage = membership.allowanceUsage || {};
  membership.allowanceUsage[key] = Number(membership.allowanceUsage[key] || 0) + qty;
  return { ...check, allowanceUsage: membership.allowanceUsage };
}

/**
 * Reset all usage counters at billing cycle renewal — does NOT roll over.
 * @param {object} membership
 * @returns {object} new usage object (all zeros)
 */
export function resetAllowances(membership) {
  const alloc = membership.allowances || {};
  const newUsage = {};
  for (const k of Object.keys(alloc)) newUsage[k] = 0;
  membership.allowanceUsage = newUsage;
  membership.lastResetAt = new Date();
  // Do NOT add previous remaining to next cycle — enforce no rollover
  return newUsage;
}

/**
 * Compute human-readable allowance status for dashboard.
 * e.g. "3 of 8 classes used"
 */
export function allowanceStatus(membership) {
  const alloc = membership.allowances || {};
  const usage = membership.allowanceUsage || {};
  const lines = [];
  for (const [k, total] of Object.entries(alloc)) {
    if (k.startsWith('_')) continue;
    const used = Number(usage[k] || 0);
    if (total === -1 || total === Infinity) {
      lines.push({ key: k, label: k, used, total: Infinity, remaining: Infinity, display: `${used} used · unlimited` });
    } else {
      lines.push({ key: k, label: k, used, total, remaining: Math.max(0, total - used), display: `${used} of ${total} used` });
    }
  }
  return lines;
}

/**
 * For package `activated_at`-based expiry: expiry = activated_at + validity.
 * If activated_at is null, not yet started.
 */
export function isPackageActive(pkg, now = new Date()) {
  if (!pkg.activated_at) return false; // not yet first use
  if (!pkg.expiryDate) return true;
  return new Date(now) < new Date(pkg.expiryDate);
}
export function activatePackage(pkg, now = new Date()) {
  if (pkg.activated_at) return pkg.activated_at; // idempotent
  pkg.activated_at = new Date(now);
  // Caller should compute expiryDate from activated_at + validity
  return pkg.activated_at;
}
