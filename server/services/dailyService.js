// ============================================================
// services/dailyService.js — SOMA DAILY membership/subscription rules
// Implements the approved access rules:
//  - AMANI/UZIMA/FAMILY memberships include SOMA DAILY (no separate charge)
//  - buying an including membership stops future charges on a paid
//    standalone subscription but keeps access until its paid period ends
//  - downgrade to JUA never silently removes a paid subscription
//  - cancellation keeps access until the paid period ends (expiry-based)
// ============================================================
import Membership from '../models/Membership.js';
import SomaDailySubscription from '../models/SomaDailySubscription.js';
import { SOMA_DAILY } from '../config/somaCatalog.js';

export function tierFromPlanName(name = '') {
  const m = String(name).toUpperCase().match(/\b(JUA|AMANI|UZIMA|FAMILY)\b/);
  return m ? m[1] : null;
}

export function tierIncludesDaily(tier) {
  return !!tier && SOMA_DAILY.includedWith.includes(tier);
}

export async function activeMembershipWithDaily(userId) {
  const now = new Date();
  const memberships = await Membership.find({
    user: userId,
    status: { $in: ['active', 'paused'] },
    expiryDate: { $gt: now },
  }).sort({ createdAt: -1 });
  for (const m of memberships) {
    const tier = m.tier || tierFromPlanName(m.planType);
    if (tierIncludesDaily(tier)) return { membership: m, tier };
  }
  return { membership: null, tier: null };
}

// Access state for UX (downgrade offers, paywalls).
export async function getDailyAccess(userId) {
  const now = new Date();
  const { membership, tier } = await activeMembershipWithDaily(userId);
  if (membership) {
    return { hasAccess: true, source: 'membership', tier, membershipId: membership._id, expiryDate: membership.expiryDate };
  }
  const sub = await SomaDailySubscription.findOne({
    user: userId,
    status: { $in: ['active', 'cancelled'] },
    expiryDate: { $gt: now },
  }).sort({ createdAt: -1 });
  if (sub) {
    return { hasAccess: true, source: 'subscription', tier: null, subscriptionId: sub._id, expiryDate: sub.expiryDate, plan: sub.plan, autoRenew: sub.autoRenew };
  }
  return { hasAccess: false, source: 'none', tier: null };
}

// Enforce no-double-payment whenever a membership becomes active:
// stamp missing tier, and stop future charges on standalone paid subs
// while preserving their access until the paid period ends.
export async function syncDailyWithMembership(userId) {
  const { membership, tier } = await activeMembershipWithDaily(userId);
  if (!membership) return { synced: false };
  const updates = {};
  if (!membership.tier && tier) {
    membership.tier = tier;
    await membership.save();
    updates.tierStamped = tier;
  }
  const res = await SomaDailySubscription.updateMany(
    { user: userId, status: 'active', isIncludedWithMembership: false, autoRenew: true },
    { $set: { autoRenew: false } }
  );
  updates.stoppedFutureCharges = res.modifiedCount || 0;
  return { synced: true, tier, ...updates };
}
