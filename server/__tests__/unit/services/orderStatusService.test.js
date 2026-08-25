import { describe, it, expect } from '@jest/globals';
import orderStatusService, { canTransition, assertCanTransition, STATUS_LABELS } from '../../../services/orderStatusService.js';

describe('orderStatusService — status machine', () => {
  it('rejects transitions to unknown statuses', () => {
    expect(canTransition('payment_pending', 'shipped_now')).toBe(false);
    expect(canTransition('made_up', 'delivered')).toBe(false);
  });

  it('allows the canonical fulfilment flow', () => {
    const flow = ['payment_pending', 'payment_confirmed', 'packed', 'dispatched', 'delivered'];
    for (let i = 0; i < flow.length - 1; i++) {
      expect(canTransition(flow[i], flow[i + 1])).toBe(true);
    }
  });

  it('rejects backwards/illegal jumps', () => {
    expect(canTransition('delivered', 'packed')).toBe(false);
    expect(canTransition('dispatched', 'payment_confirmed')).toBe(false);
    expect(canTransition('cancelled', 'payment_confirmed')).toBe(false);
    expect(canTransition('returned', 'delivered')).toBe(false);
  });

  it('terminal statuses have no outgoing transitions', () => {
    expect(orderStatusService.getNextStatuses?.('cancelled') || []).toEqual([]);
    expect(canTransition('cancelled', 'delivered')).toBe(false);
    expect(canTransition('returned', 'delivered')).toBe(false);
  });

  it('a transition to the same status is a safe no-op', () => {
    expect(canTransition('packed', 'packed')).toBe(true);
  });

  it('payment_pending may be cancelled but not packed directly', () => {
    expect(canTransition('payment_pending', 'cancelled')).toBe(true);
    expect(canTransition('payment_pending', 'packed')).toBe(false);
  });

  it('on_hold can resume into most states', () => {
    expect(canTransition('on_hold', 'payment_confirmed')).toBe(true);
    expect(canTransition('on_hold', 'packed')).toBe(true);
    expect(canTransition('on_hold', 'dispatched')).toBe(true);
    expect(canTransition('on_hold', 'cancelled')).toBe(true);
  });

  it('assertCanTransition throws ApiError on illegal transitions', () => {
    expect(() => assertCanTransition('delivered', 'dispatched')).toThrow(/Invalid order status transition/);
    expect(() => assertCanTransition('payment_confirmed', 'payment_confirmed')).not.toThrow();
  });

  it('exposes human labels for every book status', () => {
    expect(STATUS_LABELS.payment_pending).toBe('Payment Pending');
    expect(STATUS_LABELS.payment_confirmed).toBe('Payment Confirmed');
    expect(STATUS_LABELS.dispatched).toBe('Dispatched');
    expect(STATUS_LABELS.cancelled).toBe('Cancelled');
    expect(STATUS_LABELS.returned).toBe('Returned');
    expect(orderStatusService.STATUS_COLORS.delivered).toBe('green');
  });
});
