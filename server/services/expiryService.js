// ============================================================
// services/expiryService.js
// Unified enrollment expiry — finds every active enrollment whose
// expiry date has passed and marks it as expired in the database.
// ============================================================
import Membership from '../models/Membership.js';
import UserService from '../models/UserService.js';
import { expireTrials } from '../controllers/freeTrialController.js';
import { notify } from './notificationService.js';
import { isSingleSessionService } from '../utils/serviceHelpers.js';

export async function expireDueEnrollments() {
  const now = new Date();
  const results = { memberships: 0, services: 0, trials: 0 };

  // ── Memberships ──
  const dueMemberships = await Membership.find({
    status: 'active',
    expiryDate: { $lte: now },
  });
  for (const m of dueMemberships) {
    m.status = 'expired';
    if (m.history) {
      m.history.push({ action: 'expired', note: 'Membership period ended', at: now });
    }
    await m.save();
  }
  results.memberships = dueMemberships.length;

  // ── User Services ──
  const dueServices = await UserService.find({
    status: 'active',
    expiryDate: { $lte: now },
  });
  for (const us of dueServices) {
    us.status = 'expired';
    if (us.activationDate && us.expiryDate) {
      const total = us.expiryDate.getTime() - us.activationDate.getTime();
      const elapsed = now.getTime() - us.activationDate.getTime();
      us.frozenProgressPct = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 100;
    } else {
      us.frozenProgressPct = 100;
    }
    if (us.history) {
      us.history.push({ action: 'expired', note: 'Service period ended', at: now });
    }
    await us.save();
    if (isSingleSessionService(us.serviceName)) {
      try {
        await notify(us.user, {
          title: 'Service expired',
          message: `Your <strong>${us.serviceName}</strong> service has expired because the 7-day validity period has ended.`,
          type: 'info',
        });
      } catch {}
    }
  }
  results.services = dueServices.length;

  // ── Free Trials (reuses the existing trial-expiry logic) ──
  try {
    results.trials = await expireTrials();
  } catch {
    // trial expiry runs independently
  }

  return results;
}
