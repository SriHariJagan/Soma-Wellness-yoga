import React, { useState, useEffect } from "react";
import {
  getWhatsAppStatus,
  verifyWhatsApp,
  sendWhatsAppMessage,
} from "../api/WhatsAppServices";
import "./WhatsAppPanel.css";

export default function WhatsAppPanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await getWhatsAppStatus();
      setStatus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      const res = await verifyWhatsApp();
      setResult(res.verified ? "Connection verified!" : "Verification failed");
      loadStatus();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!phone || !message) return;

    setSending(true);
    setError("");
    setResult(null);

    try {
      const res = await sendWhatsAppMessage({ phone, message });
      setResult(`Message sent! ID: ${res.messageId}`);
      setMessage("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="whatsapp-panel"><p>Loading...</p></div>;
  }

  return (
    <div className="whatsapp-panel">
      <h3>WhatsApp Business API</h3>

      <div className="whatsapp-status">
        <div className="status-row">
          <span>Provider:</span>
          <span className={status?.configured ? "status-ok" : "status-off"}>
            {status?.configured ? "Configured" : "Not Configured"}
          </span>
        </div>
        <div className="status-row">
          <span>Phone Number ID:</span>
          <span>{status?.phoneNumberId || "—"}</span>
        </div>
        <div className="status-row">
          <span>Display Phone:</span>
          <span>{status?.displayPhone || "—"}</span>
        </div>
        <div className="status-row">
          <span>Verified:</span>
          <span className={status?.verified ? "status-ok" : "status-warn"}>
            {status?.verified ? "Yes" : "No"}
          </span>
        </div>
        <button className="whatsapp-btn-secondary" onClick={handleVerify}>
          Verify Connection
        </button>
      </div>

      <div className="whatsapp-send">
        <h4>Send Test Message</h4>
        <form onSubmit={handleSend}>
          <div className="whatsapp-field">
            <label>Phone Number</label>
            <input
              type="tel"
              placeholder="254712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <span className="hint">Kenya format: 2547XXXXXXXX</span>
          </div>
          <div className="whatsapp-field">
            <label>Message</label>
            <textarea
              placeholder="Hello from Soma Wellness!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
            />
          </div>
          <button
            type="submit"
            className="whatsapp-btn-primary"
            disabled={sending || !phone || !message}
          >
            {sending ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>

      {result && <div className="whatsapp-result">{result}</div>}
      {error && <div className="whatsapp-error">{error}</div>}
    </div>
  );
}
