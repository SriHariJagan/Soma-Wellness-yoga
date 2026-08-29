import React from 'react';
import './checkout.css';

export default function PaymentPreviewModal({ intent, onClose, onContinue }) {
  if (!intent) return null;
  const price = intent.price || intent.amount || '—';
  const name = intent.name || intent.title || 'Purchase';
  const sub = intent.sub || intent.description || intent.time || '';
  const period = intent.per || intent.period || '';

  return (
    <div className="checkout-overlay" onClick={onClose}>
      <div className="checkout-modal checkout-preview" onClick={(e) => e.stopPropagation()}>
        <button className="checkout-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="checkout-header">
          <div className="checkout-eyebrow">Secure checkout</div>
          <h2 className="checkout-title">Payment preview</h2>
          <p className="checkout-sub">Review your selection before verification.</p>
        </div>

        <div className="checkout-card">
          <div className="checkout-card-top">
            <span className="checkout-badge">KES</span>
            <span className="checkout-card-name">{name}</span>
          </div>
          {sub && <p className="checkout-card-desc">{sub}</p>}
          <div className="checkout-price-row">
            <span className="checkout-price">{typeof price === 'number' ? `KES ${price.toLocaleString()}` : price}</span>
            {period && <span className="checkout-period">{period}</span>}
          </div>
          <ul className="checkout-features">
            <li><span className="dot" /> VAT included</li>
            <li><span className="dot" /> Secure payment via Razorpay / M-Pesa</li>
            <li><span className="dot" /> Instant confirmation after verification</li>
          </ul>
        </div>

        <div className="checkout-notice">
          <span className="checkout-notice-icon">🔒</span>
          <span>We’ll verify your email or phone with a one-time code before payment.</span>
        </div>

        <div className="checkout-actions">
          <button className="checkout-btn checkout-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="checkout-btn checkout-btn-primary" onClick={onContinue}>Continue to verify →</button>
        </div>
      </div>
    </div>
  );
}
