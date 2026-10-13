// ============================================================
// Payment/PesapalCheckout.jsx — Provider-neutral Pesapal checkout.
// Flow: click Pay → backend initiate (server-priced) → redirect to
// Pesapal. No amounts, no phone-PIN form, no client-side success.
//
// DEF-006: the idempotency key is STABLE per intended purchase. It is
// minted once, reused by retries and by a page refresh, and dropped only
// once the attempt has been handed to Pesapal. An in-flight ref guard
// blocks rapid double-clicks before React state has committed.
// ============================================================
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { initiatePesapalPayment, continuePesapalPayment } from '../api/PesapalServices';
import { buildPurchaseSignature, getOrCreateIntentKey, clearIntentKey } from '../../lib/paymentIntentKey.js';
import { formatKES } from '../../utils/money.js';

export default function PesapalCheckout({
  amount,
  items,
  label,
  description,
  paymentId,
  customer,
  buttonLabel,
  onInitiated,
  onError,
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Synchronous guard: `loading` state is not committed until the next
  // render, so two clicks in the same tick would both pass a state check.
  const inFlightRef = useRef(false);

  const signature = buildPurchaseSignature({ items, label, amount, paymentId });

  const handlePay = useCallback(async (e) => {
    e?.preventDefault?.();
    if (inFlightRef.current) return; // double-click / rapid-click guard
    inFlightRef.current = true;
    setLoading(true);
    setError('');
    try {
      let res;
      if (paymentId) {
        res = await continuePesapalPayment(paymentId, customer);
      } else {
        // Stable key: retries and refreshes reuse it, so the backend replays
        // the same intent instead of minting a second Pesapal order.
        res = await initiatePesapalPayment({
          items,
          label,
          description,
          idempotencyKey: getOrCreateIntentKey(signature),
          customer,
        });
      }
      if (!res.redirectUrl) {
        throw new Error(t('payment.paymentNotConfigured'));
      }
      try {
        sessionStorage.setItem(
          'pesapal_intent',
          JSON.stringify({
            merchantReference: res.merchantReference,
            orderTrackingId: res.orderTrackingId,
            paymentId: res.paymentId,
            at: Date.now(),
          }),
        );
      } catch {
        /* sessionStorage may be unavailable (private mode) — intent still works via URL params */
      }
      // The attempt now belongs to Pesapal. Drop the key so that a later,
      // genuinely new attempt (e.g. after a cancellation) starts clean instead
      // of replaying a retired intent.
      clearIntentKey();
      onInitiated?.(res);
      // Full-page redirect to Pesapal (never an API call to Pesapal).
      window.location.href = res.redirectUrl;
    } catch (err) {
      const msg = err.message || t('payment.paymentFailed');
      setError(msg);
      onError?.(err);
      // NOTE: the key is intentionally NOT cleared here. No redirect happened,
      // so the customer is still in the same attempt and a retry must reuse it.
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [customer, description, items, label, onError, onInitiated, paymentId, signature, t]);

  return (
    <div className="pesapal-inline">
      {error && <div className="pay-error">{error}</div>}
      <button
        type="button"
        className="pay-btn pay-btn-full"
        disabled={loading}
        onClick={handlePay}
      >
        {loading
          ? (t('payment.processing'))
          : (buttonLabel || `${t('payment.payNow')} — ${formatKES(amount)}`)}
      </button>
      <p style={{ fontSize: 11, color: '#6B5E4E', marginTop: 8, textAlign: 'center' }}>
        {t('payment.pesapalSecureNote')}
      </p>
    </div>
  );
}
