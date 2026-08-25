const PAYMENT_TRANSITIONS = {
  initiated: ['pending', 'failed'],
  pending: ['captured', 'failed', 'expired'],
  captured: ['refunding', 'refunded'],
  refunding: ['refunded', 'captured'],
  refunded: [],
  failed: [],
  expired: [],
};

const FULFILLMENT_TRANSITIONS = {
  pending: ['partial', 'completed', 'cancelled'],
  partial: ['completed', 'cancelled'],
  completed: ['cancelled'],
  cancelled: [],
};

export class PaymentStateMachine {
  static isValidPaymentTransition(from, to) {
    const allowed = PAYMENT_TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.includes(to);
  }

  static isValidFulfillmentTransition(from, to) {
    const allowed = FULFILLMENT_TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.includes(to);
  }

  static canInitiate(from) {
    return from === 'initiated';
  }

  static canCapture(from) {
    return from === 'pending';
  }

  static canRefund(from) {
    return from === 'captured';
  }

  static getPaymentStatuses() {
    return Object.keys(PAYMENT_TRANSITIONS);
  }

  static getFulfillmentStatuses() {
    return Object.keys(FULFILLMENT_TRANSITIONS);
  }
}
