import React, { useState, useEffect } from "react";
import { simulateTestPayment, getTestIdentity } from "../api/MpesaServices";
import "./TestPaymentPanel.css";

const SCENARIOS = [
  { value: "success", label: "Simulate Success", hint: "Confirms booking, runs notifications" },
  { value: "failure", label: "Simulate Failure", hint: "Marks payment failed, no booking" },
  { value: "pending", label: "Simulate Pending", hint: "Stays pending, retry works" },
  { value: "cancelled", label: "Simulate Cancelled", hint: "User cancelled, retry allowed" },
  { value: "timeout", label: "Simulate Timeout", hint: "Gateway timeout, retry allowed" },
];

/**
 * TestPaymentPanel — TEST MODE ONLY.
 * Rendered only when the backend reports PAYMENT_MODE=test.
 * Drives the full downstream booking/payment flow without real M-Pesa.
 */
export default function TestPaymentPanel({ amount, paymentId, checkoutRequestId, orderId, onSuccess, onError, onReset }) {
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [recoverable, setRecoverable] = useState(false);
  // Show who the CURRENT TOKEN belongs to (server truth). localStorage
  // user objects can go stale (e.g. test DB resets wipe the account while
  // the browser still caches it) — that skew is the #1 cause of
  // "Payment does not belong to this user".
  const [whoami, setWhoami] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!localStorage.getItem("token")) {
          if (!cancelled) setWhoami("guest (not logged in)");
          return;
        }
        const identity = await getTestIdentity();
        if (cancelled) return;
        if (identity?.email) {
          setWhoami(identity.email);
          return;
        }
        let cachedEmail = "";
        try {
          const raw = localStorage.getItem("user");
          cachedEmail = raw ? (JSON.parse(raw)?.email || "") : "";
        } catch { /* ignore */ }
        setWhoami(cachedEmail
          ? `${cachedEmail} (session invalid — log out and log in again)`
          : "session invalid — log out and log in again");
      } catch {
        if (!cancelled) setWhoami("guest (not logged in)");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Ownership / session problems (e.g. payment was created under a
  // different login, or the account was wiped from the test DB while the
  // browser still holds its token) brick every scenario — offer a fresh
  // payment instead.
  const isRecoverableError = (err) =>
    /belong|fresh test payment|expired|invalid token|no token|unauthori[sz]ed|no longer exists|sign in|log in/i.test(err?.message || "");

  const runScenario = async (scenario) => {
    setBusy(scenario);
    setMessage("");
    setMessageType("");
    setRecoverable(false);
    try {
      const res = await simulateTestPayment({ paymentId, checkoutRequestId, orderId, status: scenario });
      if (scenario === "success") {
        onSuccess?.({ ...res, testMode: true });
      } else if (scenario === "pending") {
        setMessage(res.message || "Payment is pending.");
        setMessageType("pending");
      } else {
        // failure / cancelled / timeout — surface the message, stay retryable
        setMessage(res.message || `Payment ${scenario}.`);
        setMessageType("error");
        onError?.({ ...res, testMode: true, scenario });
      }
    } catch (err) {
      setMessage(err.message || `Simulation failed for ${scenario}.`);
      setMessageType("error");
      setRecoverable(isRecoverableError(err));
      onError?.({ message: err.message, testMode: true, scenario });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="testpay" data-testid="test-payment-panel">
      <div className="testpay-banner">
        <span className="testpay-badge">TEST MODE</span>
        <span className="testpay-note">No real M-Pesa charge — simulated payment</span>
      </div>

      <div className="testpay-amount-row">
        <span>Amount</span>
        <strong>KES {Number(amount || 0).toLocaleString()}</strong>
      </div>
      <div className="testpay-identity" data-testid="test-payment-identity">
        Testing as: <strong>{whoami || "…"}</strong>
      </div>

      <div className="testpay-grid">
        {SCENARIOS.map((s) => (
          <button
            key={s.value}
            type="button"
            className={`testpay-btn testpay-${s.value}`}
            disabled={busy !== null}
            onClick={() => runScenario(s.value)}
            title={s.hint}
          >
            {busy === s.value ? "Simulating…" : s.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`testpay-msg ${messageType}`} role="status">
          {message}
          {(messageType === "error" || messageType === "pending") && !recoverable && (
            <span className="testpay-retry-hint"> You can retry with another scenario above.</span>
          )}
        </div>
      )}

      {recoverable && onReset && (
        <button type="button" className="testpay-btn testpay-pending" style={{ width: "100%", marginTop: 10 }} onClick={() => { setMessage(""); setMessageType(""); setRecoverable(false); onReset?.(); }}>
          ↻ Start fresh test payment as current login
        </button>
      )}
    </div>
  );
}
