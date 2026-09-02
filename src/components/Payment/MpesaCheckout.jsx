import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { initiateStkPush, queryMpesaTransaction } from "../api/MpesaServices";
import "./MpesaCheckout.css";

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 25;

export default function MpesaCheckout({ amount, accountRef, description, paymentId, orderId, onSuccess, onError }) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const pollRef = useRef(null);
  const pollCountRef = useRef(0);

  const normalisePhone = (raw) => {
    let p = raw.replace(/[\s\-()]/g, "");
    if (p.startsWith("+")) p = p.slice(1);
    if (p.startsWith("0")) p = "254" + p.slice(1);
    if (p.startsWith("254") && p.length === 12) return p;
    if (p.startsWith("91") && p.length === 12) return p;
    if (p.length === 10 && (p.startsWith("6") || p.startsWith("7") || p.startsWith("8") || p.startsWith("9"))) return "91" + p;
    if (!p.startsWith("254") && !p.startsWith("91") && p.length === 9) return "254" + p;
    return p;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || !amount) return;
    setLoading(true);
    setStatus("idle");
    setMessage("");
    try {
      const res = await initiateStkPush({ phone: normalisePhone(phone), amount, accountRef, description, paymentId, orderId });
      if (res.success) {
        setStatus("polling");
        setMessage(t("payment.stkPushSent"));
        pollCountRef.current = 0;
        startPolling(res.checkoutRequestId);
      } else {
        setStatus("failed");
        setMessage(res.message || t("payment.stkPushFailed"));
        onError?.(res);
      }
    } catch (err) {
      setStatus("failed");
      setMessage(err.message || t("payment.stkPushFailed"));
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const consecutiveErrorsRef = useRef(0);
  const startPolling = (checkoutRequestId) => {
    consecutiveErrorsRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLLS) {
        clearInterval(pollRef.current);
        setStatus("failed");
        setMessage(t("payment.stkPushTimeout"));
        onError?.({ message: t("payment.stkPushTimeout") });
        return;
      }
      try {
        const res = await queryMpesaTransaction(checkoutRequestId);
        consecutiveErrorsRef.current = 0;
        if (res.ResultCode === 0 || res.resultCode === 0 || res.ResponseCode === "0") {
          clearInterval(pollRef.current);
          setStatus("success");
          setMessage(t("payment.stkPushSuccess"));
          onSuccess?.(res);
        } else if (res.ResultCode && res.ResultCode !== 0 && res.ResultCode !== 1037) {
          clearInterval(pollRef.current);
          setStatus("failed");
          setMessage(res.ResultDesc || res.resultDesc || t("payment.stkPushFailed"));
          onError?.(res);
        } else if (res.resultCode && res.resultCode !== 0 && res.resultCode !== 1037) {
          clearInterval(pollRef.current);
          setStatus("failed");
          setMessage(res.resultDesc || t("payment.stkPushFailed"));
          onError?.(res);
        }
        // ResultCode 1037 = still pending, continue polling
      } catch (err) {
        consecutiveErrorsRef.current += 1;
        // After 3 consecutive 500s, stop polling and show service unavailable
        if (consecutiveErrorsRef.current >= 3) {
          clearInterval(pollRef.current);
          const isServiceUnavailable = err.message && err.message.includes("503");
          setStatus("failed");
          setMessage(
            isServiceUnavailable
              ? "M-Pesa service temporarily unavailable. Please try again or contact support."
              : err.message || t("payment.stkPushFailed")
          );
          onError?.(err);
        }
        // otherwise keep polling — transient network glitch
      }
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (status === "success") {
    return (
      <div className="mpesa-inline mpesa-success">
        <div className="mpesa-success-icon">✓</div>
        <p>{message}</p>
      </div>
    );
  }

  return (
    <div className="mpesa-inline">
      <form onSubmit={handleSubmit} className="mpesa-form">
        <div className="mpesa-field">
          <label>{t("payment.phoneNumber")} *</label>
          <div className="mpesa-input-wrap">
            <span className="mpesa-prefix">+254</span>
            <input
              type="tel"
              placeholder="712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={loading}
              className="mpesa-input"
            />
          </div>
          <span className="mpesa-hint">{t("payment.phoneHint")}</span>
        </div>

        {(status === "polling") && (
          <div className="mpesa-polling">
            <div className="mpesa-spinner" />
            <span>{message}</span>
            <span className="mpesa-poll-count">{pollCountRef.current}/{MAX_POLLS}</span>
          </div>
        )}

        {status === "failed" && (
          <div className="mpesa-error-msg">{message}</div>
        )}

        {status !== "polling" && (
          <button type="submit" className="pay-btn pay-btn-full" disabled={loading || !phone || !amount}>
            {loading ? t("payment.processing") : `${t("payment.payNow")} — KES ${Number(amount).toLocaleString()}`}
          </button>
        )}
      </form>
    </div>
  );
}
