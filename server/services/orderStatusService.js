import { BOOK_ORDER_TRANSITIONS, BOOK_ORDER_STATUSES } from '../shared/constants/index.js';
import { ApiError } from '../utils/ApiError.js';

// ─────────────────────────────────────────────────────────────
// orderStatusService — controlled book-order status machine.
// Invalid transitions (e.g. DELIVERED → PACKED) are rejected.
// Every transition is recorded on the order timeline and in the
// audit log by the caller.
// ─────────────────────────────────────────────────────────────

export function canTransition(from, to) {
  if (from === to) return true; // no-op transitions are allowed (idempotent)
  if (!BOOK_ORDER_STATUSES.includes(from) || !BOOK_ORDER_STATUSES.includes(to)) return false;
  const allowed = BOOK_ORDER_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export function assertCanTransition(from, to) {
  if (!canTransition(from, to)) {
    throw ApiError.badRequest(`Invalid order status transition: ${from} → ${to}`);
  }
}

export function getNextStatuses(from) {
  if (from === 'cancelled' || from === 'returned') return [];
  return BOOK_ORDER_TRANSITIONS[from] || [];
}

/**
 * Human-readable labels for the UI.
 */
export const STATUS_LABELS = {
  new: 'New',
  payment_pending: 'Payment Pending',
  payment_confirmed: 'Payment Confirmed',
  packed: 'Packed',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

export const STATUS_COLORS = {
  new: 'blue',
  payment_pending: 'amber',
  payment_confirmed: 'green',
  packed: 'blue',
  dispatched: 'orange',
  delivered: 'green',
  on_hold: 'amber',
  cancelled: 'red',
  returned: 'red',
};

export default { canTransition, assertCanTransition, getNextStatuses, STATUS_LABELS, STATUS_COLORS };