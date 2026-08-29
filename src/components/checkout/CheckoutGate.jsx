import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth, savePendingIntent, clearPendingIntent } from '../../context/AuthContext.jsx';
import { isLoggedIn } from '../../utils/payment.js';
import PaymentPreviewModal from './PaymentPreviewModal.jsx';
import OtpVerificationModal from './OtpVerificationModal.jsx';

function isAuthenticated() {
  try {
    return isLoggedIn() && !!localStorage.getItem('token');
  } catch { return false; }
}

/**
 * CheckoutGate
 * Wraps any purchase button. If already authenticated, calls onProceed immediately.
 * Otherwise shows Preview -> OTP flow, auto-creates/logins, then calls onProceed.
 *
 * Props:
 *  intent: { name, price, sub, time, type, itemType, itemId, amount, ... }
 *  onProceed: (authData) => void | Promise<void>  — what to do after auth (e.g. addToCart, navigate to payment)
 *  children: trigger element (button). We clone and attach onClick.
 */
export default function CheckoutGate({ intent, onProceed, children }) {
  const { login } = useAuth();
  const [step, setStep] = useState(null); // null | 'preview' | 'otp'
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

  const handleContinueFromPreview = useCallback(() => {
    setStep('otp');
  }, []);

  const handleVerified = useCallback((data) => {
    // data: { token, user, isNew }
    if (data?.token && data?.user) login(data.token, data.user);
    // dispatch storage event for other hooks
    window.dispatchEvent(new CustomEvent('auth-login', { detail: data }));
    window.dispatchEvent(new Event('storage'));
    setStep(null);
    clearPendingIntent();
    // slight delay to let login propagate
    setTimeout(() => {
      onProceed?.(data);
    }, 100);
  }, [login, onProceed]);

  const handleClose = useCallback(() => {
    setStep(null);
  }, []);

  // Clone child to attach our handler while preserving its props
  let trigger = children;
  if (React.isValidElement(children)) {
    const childOnClick = children.props.onClick;
    trigger = React.cloneElement(children, {
      onClick: (e) => {
        // if child had onClick that expects to run only when authed, we bypass it
        // CheckoutGate is the gate — so we ignore child's onClick and use handleTrigger
        // but we still call child's onClick if already authenticated and child wants it
        if (isAuthenticated() && childOnClick) {
          // let gate decide
          handleTrigger(e);
        } else {
          handleTrigger(e);
        }
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
            <PaymentPreviewModal intent={pendingIntent} onClose={handleClose} onContinue={handleContinueFromPreview} />
          )}
          {step === 'otp' && (
            <OtpVerificationModal intent={pendingIntent} onClose={handleClose} onVerified={handleVerified} />
          )}
        </>,
        document.body
      )}
    </>
  );
}

/**
 * Hook version for imperative use (e.g. inside handleEnroll functions)
 */
export function useCheckoutGate() {
  const { login } = useAuth();
  const [state, setState] = useState({ step: null, intent: null, onProceed: null });

  const requireAuth = useCallback((intent, onProceed) => {
    if (isAuthenticated()) {
      onProceed?.({ alreadyAuthenticated: true });
      return;
    }
    savePendingIntent(intent);
    setState({ step: 'preview', intent, onProceed });
  }, []);

  const close = useCallback(() => {
    setState({ step: null, intent: null, onProceed: null });
  }, []);

  const handleVerified = useCallback((data) => {
    if (data?.token && data?.user) login(data.token, data.user);
    window.dispatchEvent(new CustomEvent('auth-login', { detail: data }));
    window.dispatchEvent(new Event('storage'));
    const cb = state.onProceed;
    setState({ step: null, intent: null, onProceed: null });
    clearPendingIntent();
    setTimeout(() => cb?.(data), 100);
  }, [login, state.onProceed]);

  const GateModals = createPortal(
    <>
      {state.step === 'preview' && (
        <PaymentPreviewModal intent={state.intent} onClose={close} onContinue={() => setState((s) => ({ ...s, step: 'otp' }))} />
      )}
      {state.step === 'otp' && (
        <OtpVerificationModal intent={state.intent} onClose={close} onVerified={handleVerified} />
      )}
    </>,
    document.body
  );

  return { requireAuth, GateModals, close };
}
