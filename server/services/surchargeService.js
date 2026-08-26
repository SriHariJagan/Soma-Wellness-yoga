// ============================================================
// server/services/surchargeService.js — Signature 20% surcharge
// Bookable 2-2.5hr slots Mon-Fri 10:00-15:00; +20% weekends/evenings
// ============================================================
import { SIGNATURE_SURCHARGE, isWithinFreeWindow } from '../config/somaCatalog.js';

export const SURCHARGE_PCT = SIGNATURE_SURCHARGE.pct; // 0.20

/**
 * Returns surcharge pct for a given slot start date (local Nairobi time).
 * Nairobi is EAT (UTC+3) — we treat input dates as EAT.
 * For tests, pass a Date that already represents EAT local time.
 * @param {Date} slotStart
 * @returns {{ surchargePct: number, isFreeWindow: boolean, reason: string }}
 */
export function getSignatureSurcharge(slotStart) {
  if (!slotStart) return { surchargePct: 0, isFreeWindow: true, reason: 'no_slot' };
  const free = isWithinFreeWindow(new Date(slotStart));
  return {
    surchargePct: free ? 0 : SURCHARGE_PCT,
    isFreeWindow: free,
    reason: free ? 'weekday_free_window' : 'surcharge_applies',
  };
}

export function applySurcharge(basePrice, slotStart) {
  const { surchargePct } = getSignatureSurcharge(slotStart);
  const finalPrice = Math.round(Number(basePrice) * (1 + surchargePct));
  return { basePrice: Number(basePrice), surchargePct, finalPrice };
}
