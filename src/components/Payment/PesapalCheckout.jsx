// ============================================================
// Payment/PesapalCheckout.jsx — Provider-neutral Pesapal checkout.
// Flow: click Pay → backend initiate (server-priced) → redirect to
// Pesapal. No amounts, no phone-PIN form, no client-side success.
// ============================================================
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { initiatePesapalPayment, continuePesapalPayment, newIdempotencyKey } from '../api/PesapalServices';
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

  const handlePay = async (e) => {
    e?.preventDefault?.();
    if (loading) return; // double-click guard
    setLoading(true);
    setError('');
    try {
      const idempotencyKey = newIdempotencyKey('pay');
      let res;
      if (paymentId) {
        res = await continuePesapalPayment(paymentId, customer);
      } else {
        res = await initiatePesapalPayment({
          items,
          label,
          description,
          idempotencyKey,
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
      onInitiated?.(res);
      // Full-page redirect to Pesapal (never an API call to Pesapal).
      window.location.href = res.redirectUrl;
    } catch (err) {
      const msg = err.message || t('payment.paymentFailed');
      setError(msg);
      onError?.(err);
      setLoading(false);
    }
  };

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
