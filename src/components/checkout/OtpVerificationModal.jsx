import React, { useEffect, useRef, useState } from 'react';
import './checkout.css';

const API_URL = import.meta.env.VITE_API_URL || '';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{7,15}$/;

function sanitizePhone(v) { return String(v || '').replace(/[\s\-\(\)]/g, ''); }

export default function OtpVerificationModal({ intent, onClose, onVerified }) {
  const [channel, setChannel] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [step, setStep] = useState('input'); // input | otp
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [cooldown, setCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState('');
  const inputsRef = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // prefill from local user if any
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u.email && !email) setEmail(u.email);
        if (u.phone && !phone) setPhone(u.phone);
      }
    } catch {}
  }, []);

  async function handleSend() {
    setMsg({ type: '', text: '' });
    setDevOtp('');
    const identifier = channel === 'email' ? email.trim().toLowerCase() : sanitizePhone(phone.trim());
    if (channel === 'email') {
      if (!EMAIL_RE.test(identifier)) { setMsg({ type: 'error', text: 'Enter a valid email address' }); return; }
    } else {
      if (!PHONE_RE.test(identifier)) { setMsg({ type: 'error', text: 'Enter phone with country code, e.g. +2547XXXXXXX' }); return; }
    }
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: channel === 'email' ? identifier : undefined, phone: channel === 'sms' ? identifier : undefined, channel, name: intent?.name || 'there' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to send OTP');
      setStep('otp');
      setMsg({ type: 'success', text: data.msg || 'OTP sent' });
      if (data.devOtp) setDevOtp(data.devOtp);
      setCooldown(60);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
      if (err.message.includes('SMS') && channel === 'sms') {
        setMsg({ type: 'error', text: 'SMS not configured — please use Email instead.' });
      }
    } finally { setSending(false); }
  }

  async function handleVerify() {
    const code = otp.join('').trim();
    if (!/^\d{6}$/.test(code)) { setMsg({ type: 'error', text: 'Enter the 6-digit OTP' }); return; }
    const identifier = channel === 'email' ? email.trim().toLowerCase() : sanitizePhone(phone.trim());
    setVerifying(true);
    setMsg({ type: '', text: '' });
    try {
      const ref = new URLSearchParams(window.location.search).get('ref') || undefined;
      const res = await fetch(`${API_URL}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: channel === 'email' ? identifier : undefined,
          phone: channel === 'sms' ? identifier : undefined,
          channel, otp: code, name: intent?.name, ref,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Invalid OTP');
      // success — data.token, data.user
      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // also store isNew flag for ux
        if (data.isNew) setMsg({ type: 'success', text: 'Account created and verified!' });
      }
      onVerified?.(data);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally { setVerifying(false); }
  }

  function handleOtpChange(idx, val) {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = v;
    setOtp(next);
    if (v && idx < 5) inputsRef.current[idx + 1]?.focus();
  }
  function handleOtpKeyDown(idx, e) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) inputsRef.current[idx - 1]?.focus();
    if (e.key === 'Enter') handleVerify();
  }
  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      setOtp(pasted.split(''));
      inputsRef.current[5]?.focus();
    }
  }

  return (
    <div className="checkout-overlay" onClick={onClose}>
      <div className="checkout-modal checkout-otp" onClick={(e) => e.stopPropagation()}>
        <button className="checkout-close" onClick={onClose}>✕</button>
        <div className="checkout-header">
          <div className="checkout-eyebrow">Verification required</div>
          <h2 className="checkout-title">Verify to continue</h2>
          <p className="checkout-sub">We’ll send a one-time code to your email or phone. New users get an account created automatically.</p>
        </div>

        <div className="checkout-tabs">
          <button className={`checkout-tab ${channel === 'email' ? 'active' : ''}`} onClick={() => { setChannel('email'); setStep('input'); setMsg({type:'',text:''}); }}>Email OTP</button>
          <button className={`checkout-tab ${channel === 'sms' ? 'active' : ''}`} onClick={() => { setChannel('sms'); setStep('input'); setMsg({type:'',text:''}); }}>Mobile OTP</button>
        </div>

        {msg.text && (
          <div className={`checkout-msg ${msg.type}`}>{msg.text}</div>
        )}

        {step === 'input' ? (
          <div className="checkout-form">
            {channel === 'email' ? (
              <label className="checkout-label">Email address
                <input className="checkout-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
              </label>
            ) : (
              <label className="checkout-label">Mobile number
                <input className="checkout-input" type="tel" placeholder="+2547XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                <span className="checkout-hint">Include country code (e.g. +254 for Kenya, +91 for India)</span>
              </label>
            )}
            {intent && (
              <div className="checkout-intent-mini">
                <span className="mini-label">You’re purchasing</span>
                <span className="mini-value">{intent.name || intent.title || 'Selected item'} {intent.price ? `— ${typeof intent.price === 'string' ? intent.price : `KES ${intent.price.toLocaleString()}`}` : ''}</span>
              </div>
            )}
            <button className="checkout-btn checkout-btn-primary" onClick={handleSend} disabled={sending || cooldown > 0}>
              {sending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Send OTP →'}
            </button>
            {channel === 'sms' && <p className="checkout-hint center">If SMS is not configured, please use Email — it works instantly.</p>}
          </div>
        ) : (
          <div className="checkout-form">
            <p className="checkout-label">Enter the 6-digit code sent to <strong>{channel === 'email' ? email : phone}</strong></p>
            <div className="checkout-otp-row" onPaste={handlePaste}>
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (inputsRef.current[i] = el)}
                  className="checkout-otp-input"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                />
              ))}
            </div>
            {devOtp && <div className="checkout-dev">Dev OTP: <strong>{devOtp}</strong> (shown in dev only)</div>}
            <div className="checkout-actions">
              <button className="checkout-btn checkout-btn-ghost" onClick={() => { setStep('input'); setOtp(Array(6).fill('')); setMsg({type:'',text:''}); }}>Change {channel === 'email' ? 'email' : 'phone'}</button>
              <button className="checkout-btn checkout-btn-primary" onClick={handleVerify} disabled={verifying}>{verifying ? 'Verifying…' : 'Verify & continue →'}</button>
            </div>
            <button className="checkout-link" onClick={handleSend} disabled={sending || cooldown > 0}>
              {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend OTP'}
            </button>
          </div>
        )}

        <p className="checkout-footer-note">By continuing you agree to our Terms and Privacy Policy. A new account will be created automatically if you don’t have one.</p>
      </div>
    </div>
  );
}
