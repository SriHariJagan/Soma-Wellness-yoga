// ============================================================
// server/services/cron/somaCron.js — SOMA cron jobs
// ============================================================
import Membership from '../../models/Membership.js';
import GiftVoucher from '../../models/GiftVoucher.js';
import FoundingSettings from '../../models/FoundingSettings.js';
import { resetAllowances } from '../allowanceService.js';
import logger from '../../notification/logger.js';

const MODULE = 'SomaCron';

// 1. Monthly allowance reset on billing renewal
export async function resetDueAllowances() {
  const now = new Date();
  const dues = await Membership.find({
    status: 'active',
    nextResetAt: { $lte: now },
  });
  let count = 0;
  for (const m of dues) {
    resetAllowances(m);
    // Set next reset to +1 month
    const next = new Date(m.nextResetAt || now);
    next.setMonth(next.getMonth() + 1);
    m.nextResetAt = next;
    m.billingCycleStart = new Date(now);
    await m.save();
    count++;
  }
  if (count) logger.info(MODULE, `Reset allowances for ${count} memberships`);
  return count;
}

// 2. Gift voucher expiry (already handled via virtual, but mark expired docs)
export async function expireVouchers() {
  const now = new Date();
  const res = await GiftVoucher.updateMany(
    { status: 'active', expiresAt: { $lte: now } },
    { $set: { status: 'expired' } }
  );
  if (res.modifiedCount) logger.info(MODULE, `Expired ${res.modifiedCount} vouchers`);
  return res.modifiedCount;
}

// 3. Founding window expiry check (just log; eligibility auto-checks)
export async function checkFoundingWindow() {
  const f = await FoundingSettings.getSingleton();
  const now = new Date();
  const windowEnd = new Date(f.openingDate.getTime() + f.windowDays * 86400000);
  if (now > windowEnd && f.active) {
    logger.info(MODULE, 'Founding window expired — founding pricing no longer offered on new signups');
  }
  return { windowEnd, expired: now > windowEnd };
}

// 4. founding_rate_expires_at rollover after 12 months — reset to normal rate flag
export async function rolloverFoundingRates() {
  const now = new Date();
  const members = await Membership.find({
    isFounding: true,
    founding_rate_expires_at: { $lte: now },
    status: 'active',
  });
  for (const m of members) {
    // Keep founding flag false? Spec: existing founding keep locked 12mo, after roll to normal
    // We mark isFounding false but keep history — they remain members at normal rate
    m.isFounding = false;
    m.history.push({ action: 'founding_expired', note: 'Founding rate 12mo lock expired — rolled to normal rate', at: now });
    await m.save();
  }
  if (members.length) logger.info(MODULE, `Rolled over ${members.length} founding memberships to normal rate`);
  return members.length;
}

let intervalIds = [];

export function startSomaCron() {
  // Allowances: check daily (could be hourly — daily is enough)
  intervalIds.push(setInterval(() => resetDueAllowances().catch(() => {}), 60 * 60 * 1000));
  intervalIds.push(setInterval(() => expireVouchers().catch(() => {}), 60 * 60 * 1000));
  intervalIds.push(setInterval(() => checkFoundingWindow().catch(() => {}), 60 * 60 * 1000));
  intervalIds.push(setInterval(() => rolloverFoundingRates().catch(() => {}), 60 * 60 * 1000));
  logger.info(MODULE, 'SOMA cron started (allowance reset, voucher expiry, founding window/rollover)');
}

export function stopSomaCron() {
  for (const id of intervalIds) clearInterval(id);
  intervalIds = [];
}
