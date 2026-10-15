// Per-method proof-of-payment copy for counter sales. Cash needs no
// reference; every electronic method must carry its transaction / reference
// ID — the same rule the backend enforces, so the desk can never record an
// unverifiable online payment.
export const METHOD_META = {
  Cash: {
    refRequired: false,
    refNote: 'Cash received at the counter — no reference needed.',
  },
  'M-Pesa': {
    refRequired: true,
    refLabel: 'M-Pesa confirmation code',
    refPlaceholder: 'e.g. QHX7Y2K9AB',
    refHint: 'The 10-character code from the customer\u2019s M-Pesa SMS.',
    uppercase: true,
  },
  Card: {
    refRequired: true,
    refLabel: 'Card approval code',
    refPlaceholder: 'e.g. 483920',
    refHint: 'The approval / auth code printed on the PDQ receipt.',
  },
  'Bank transfer': {
    refRequired: true,
    refLabel: 'Bank reference number',
    refPlaceholder: 'e.g. FT2312345678',
    refHint: 'The reference from the customer\u2019s bank confirmation message.',
  },
};

export const needsReference = (method) => (METHOD_META[method]?.refRequired ?? true);

export const isPaymentComplete = (method, reference) =>
  !needsReference(method) || String(reference || '').trim().length > 0;
