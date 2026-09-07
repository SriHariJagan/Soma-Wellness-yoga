import React, { useState } from "react";
import { simulateTestPayment } from "../api/MpesaServices";
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

  // Ownership / session problems (e.g. payment was created under a
  // different login) brick every scenario — offer a fresh payment instead.
  const isRecoverableError = (err) =>
    /belong|fresh test payment|expired|invalid token|no token|unauthori[sz]ed|sign in/i.test(err?.message || "");

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
