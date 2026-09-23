import React, { useEffect, useRef, useState } from 'react';
import './checkout.css';
import PhoneInput from '../common/PhoneInput.jsx';
import { validatePhone, normalizePhone } from '../../lib/phone.js';

const API_URL = import.meta.env.VITE_API_URL || '';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{7,15}$/;

function sanitizePhone(v) { return String(v || '').replace(/[\s\-\(\)]/g, ''); }

export default function OtpVerificationModal({ intent, onClose, onVerified }) {
  const [channel, setChannel] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [detailEmail, setDetailEmail] = useState('');
  const [detailPhone, setDetailPhone] = useState('');
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [step, setStep] = useState('input'); // input | details | otp
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [cooldown, setCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState('');
  const [createdMsg, setCreatedMsg] = useState('');
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

  async function checkExists(identifier) {
    const res = await fetch(`${API_URL}/api/auth/otp/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        channel === 'email' ? { email: identifier } : { phone: identifier },
      ),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Could not check account');
    return !!data.exists;
  }

  async function sendOtpTo(identifier, displayName) {
    const res = await fetch(`${API_URL}/api/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: channel === 'email' ? identifier : undefined,
        phone: channel === 'sms' ? identifier : undefined,
        channel,
        name: displayName || intent?.name || 'there',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Failed to send OTP');
    return data;
  }

  // Step 1 → background existence check, then route new users to details
  async function handleContinue() {
    setMsg({ type: '', text: '' });
    setDevOtp('');
    setCreatedMsg('');
    const identifier = channel === 'email' ? email.trim().toLowerCase() : (phone ? normalizePhone(phone) : '');
    if (channel === 'email') {
      if (!EMAIL_RE.test(identifier)) { setMsg({ type: 'error', text: 'Enter a valid email address' }); return; }
    } else {
      const err = validatePhone(phone);
      if (err) { setMsg({ type: 'error', text: err }); return; }
    }
    setChecking(true);
    try {
      const exists = await checkExists(identifier);
      if (exists) {
        const data = await sendOtpTo(identifier);
        setStep('otp');
        setMsg({ type: 'success', text: data.msg || 'OTP sent' });
        if (data.devOtp) setDevOtp(data.devOtp);
        setCooldown(60);
        setTimeout(() => inputsRef.current[0]?.focus(), 100);
      } else {
        // New user — collect full details before OTP
        if (channel === 'email') { setDetailEmail(identifier); setDetailPhone(phone.trim()); }
        else { setDetailPhone(identifier); setDetailEmail(email.trim()); }
        setStep('details');
        setMsg({ type: 'success', text: 'Welcome! Tell us a little about you to create your account.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
      if (err.message.includes('SMS') && channel === 'sms') {
        setMsg({ type: 'error', text: 'SMS not configured — please use Email instead.' });
      }
    } finally { setChecking(false); }
  }

  async function handleSendFromDetails() {
    setMsg({ type: '', text: '' });
    setDevOtp('');
    const name = fullName.trim();
    const dEmail = detailEmail.trim().toLowerCase();
    const dPhone = detailPhone ? normalizePhone(detailPhone) : '';
    if (name.length < 2) { setMsg({ type: 'error', text: 'Please enter your full name' }); return; }
    if (!EMAIL_RE.test(dEmail)) { setMsg({ type: 'error', text: 'Enter a valid email address' }); return; }
    const phoneErr = validatePhone(detailPhone);
    if (phoneErr) { setMsg({ type: 'error', text: phoneErr }); return; }
    // OTP goes to the channel the user started with
    const identifier = channel === 'email' ? dEmail : dPhone;
    setSending(true);
    try {
      const data = await sendOtpTo(identifier, name);
      setStep('otp');
      setMsg({ type: 'success', text: data.msg || 'OTP sent' });
      if (data.devOtp) setDevOtp(data.devOtp);
      setCooldown(60);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally { setSending(false); }
  }

  async function handleSend() {
    // legacy direct send (used for resend)
    return handleContinueResend();
  }

  async function handleContinueResend() {
    setMsg({ type: '', text: '' });
    setDevOtp('');
    const identifier = channel === 'email'
      ? (detailEmail || email).trim().toLowerCase()
      : normalizePhone((detailPhone || phone) || '');
    const displayName = fullName.trim() || intent?.name || 'there';
    setSending(true);
    try {
      const data = await sendOtpTo(identifier, displayName);
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
    const identifier = channel === 'email'
      ? (detailEmail || email).trim().toLowerCase()
      : normalizePhone((detailPhone || phone) || '');
    // New-user details travel along so the account is created complete
    const vName = fullName.trim() || undefined;
    const vEmail = detailEmail.trim() ? detailEmail.trim().toLowerCase() : undefined;
    const vPhone = detailPhone.trim() ? normalizePhone(detailPhone.trim()) : undefined;
    setVerifying(true);
    setMsg({ type: '', text: '' });
    try {
      const ref = new URLSearchParams(window.location.search).get('ref') || undefined;
      const res = await fetch(`${API_URL}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: channel === 'email' ? identifier : vEmail,
          phone: channel === 'sms' ? identifier : vPhone,
          channel, otp: code, name: vName || intent?.name, ref,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Invalid OTP');
      // success — data.token, data.user
      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // also store isNew flag for ux
        if (data.isNew) {
          setCreatedMsg('Account created! A temporary password was emailed to you — valid 7 days. Please set your own password before it expires.');
        }
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
        {createdMsg && (
          <div className="checkout-msg success">{createdMsg}</div>
        )}

        {step === 'input' ? (
          <div className="checkout-form">
            {channel === 'email' ? (
              <label className="checkout-label">Email address
                <input className="checkout-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
              </label>
            ) : (
              <PhoneInput value={phone} onChange={setPhone} label="Mobile number" required id="otp-phone" />
            )}
            {intent && (
              <div className="checkout-intent-mini">
                <span className="mini-label">You’re purchasing</span>
                <span className="mini-value">{intent.name || intent.title || 'Selected item'} {intent.price ? `— ${typeof intent.price === 'string' ? intent.price : `KES ${intent.price.toLocaleString()}`}` : ''}</span>
              </div>
            )}
            <button className="checkout-btn checkout-btn-primary" onClick={handleContinue} disabled={checking || cooldown > 0}>
              {checking ? 'Checking…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Continue →'}
            </button>
            {channel === 'sms' && <p className="checkout-hint center">If SMS is not configured, please use Email — it works instantly.</p>}
          </div>
        ) : step === 'details' ? (
          <div className="checkout-form">
            <p className="checkout-label">New here? Your details create your account — then we verify with an OTP sent to <strong>{channel === 'email' ? detailEmail : detailPhone}</strong>.</p>
            <label className="checkout-label">Full name
              <input className="checkout-input" type="text" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label className="checkout-label">Email address
              <input className="checkout-input" type="email" placeholder="you@example.com" value={detailEmail} onChange={(e) => setDetailEmail(e.target.value)} />
            </label>
            <PhoneInput value={detailPhone} onChange={setDetailPhone} label="Mobile number" required id="otp-detail-phone" />
            {intent && (
              <div className="checkout-intent-mini">
                <span className="mini-label">You’re purchasing</span>
                <span className="mini-value">{intent.name || intent.title || 'Selected item'} {intent.price ? `— ${typeof intent.price === 'string' ? intent.price : `KES ${intent.price.toLocaleString()}`}` : ''}</span>
              </div>
            )}
            <p className="checkout-hint">A temporary password will be emailed to you (valid 7 days) — set your own password before it expires.</p>
            <div className="checkout-actions">
              <button className="checkout-btn checkout-btn-ghost" onClick={() => { setStep('input'); setMsg({type:'',text:''}); }}>← Back</button>
              <button className="checkout-btn checkout-btn-primary" onClick={handleSendFromDetails} disabled={sending}>{sending ? 'Sending…' : 'Send OTP →'}</button>
            </div>
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
