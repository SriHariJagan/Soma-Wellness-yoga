import { ApiError } from '../../utils/ApiError.js';

export class PaymentInitiationError extends ApiError {
  constructor(message = 'Payment initiation failed', details = undefined) {
    super(400, message, details);
  }
}

export class PaymentVerificationError extends ApiError {
  constructor(message = 'Payment verification failed', details = undefined) {
    super(400, message, details);
  }
}

export class PaymentNotFoundError extends ApiError {
  constructor(message = 'Payment not found') {
    super(404, message);
  }
}

export class PaymentStateError extends ApiError {
  constructor(message = 'Invalid payment state transition', details = undefined) {
    super(409, message, details);
  }
}

export class IdempotencyError extends ApiError {
  constructor(message = 'Duplicate request detected') {
    super(409, message);
  }
}

export class AmountMismatchError extends ApiError {
  constructor(message = 'Amount mismatch detected') {
    super(400, message);
  }
}

export class GatewayError extends ApiError {
  constructor(message = 'Payment gateway error', details = undefined) {
    super(502, message, details);
  }
}
