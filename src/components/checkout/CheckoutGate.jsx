import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { savePendingIntent, clearPendingIntent } from '../../context/AuthContext.jsx';
import { isLoggedIn } from '../../utils/payment.js';
import PaymentPreviewModal from './PaymentPreviewModal.jsx';

function isAuthenticated() {
  try {
    return isLoggedIn() && !!localStorage.getItem('token');
  } catch { return false; }
}

/**
 * CheckoutGate
 * Wraps any purchase button. If already authenticated, calls onProceed immediately.
 * Otherwise shows a payment preview, then sends the guest to sign in
 * (existing password / registration flow) with a redirect back. After
 * sign-in the shopper re-triggers the purchase while authenticated.
 *
 * Props:
 *  intent: { name, price, sub, time, type, itemType, itemId, amount, ... }
 *  onProceed: (authData) => void | Promise<void>  — what to do once authed
 *  children: trigger element (button). We clone and attach onClick.
 */
export default function CheckoutGate({ intent, onProceed, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(null); // null | 'preview'
  const [pendingIntent, setPendingIntent] = useState(null);

  const handleTrigger = useCallback((e) => {
    // allow child onClick to be preserved? we intercept entirely
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (isAuthenticated()) {
      onProceed?.({ alreadyAuthenticated: true });
      return;
    }
    savePendingIntent(intent);
    setPendingIntent(intent);
    setStep('preview');
  }, [intent, onProceed]);

  const handleContinueToSignIn = useCallback(() => {
    const back = location.pathname + location.search;
    setStep(null);
    navigate(`/login?redirectTo=${encodeURIComponent(back)}`);
  }, [navigate, location]);

  const handleClose = useCallback(() => {
    setStep(null);
  }, []);

  // Clone child to attach our handler while preserving its props
  let trigger = children;
  if (React.isValidElement(children)) {
    trigger = React.cloneElement(children, {
      onClick: () => {
        handleTrigger();
      },
    });
  } else {
    trigger = <button onClick={handleTrigger}>{children}</button>;
  }

  return (
    <>
      {trigger}
      {createPortal(
        <>
          {step === 'preview' && (
            <PaymentPreviewModal intent={pendingIntent} onClose={handleClose} onContinue={handleContinueToSignIn} />
          )}
        </>,
        document.body
      )}
    </>
  );
}

/**
 * Hook version for imperative use (e.g. inside handleEnroll functions).
 * Unauthenticated callers are sent to sign in with a redirect back.
 */
export function useCheckoutGate() {
  const navigate = useNavigate();
  const location = useLocation();

  const requireAuth = useCallback((intent, onProceed) => {
    if (isAuthenticated()) {
      onProceed?.({ alreadyAuthenticated: true });
      return;
    }
    savePendingIntent(intent);
    const back = location.pathname + location.search;
    navigate(`/login?redirectTo=${encodeURIComponent(back)}`);
  }, [navigate, location]);

  const close = useCallback(() => {
    clearPendingIntent();
  }, []);

  const GateModals = null;

  return { requireAuth, GateModals, close };
}
