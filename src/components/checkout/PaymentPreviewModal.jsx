import React, { Suspense, lazy } from 'react';
import './checkout.css';
import { REGISTRATION_VIDEO } from '../../config/registrationVideo.js';

const RegistrationVideo = lazy(() => import('../Auth/RegistrationVideo.jsx'));

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
          <p className="checkout-sub">Review your selection before signing in.</p>
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
          <p className="checkout-card-desc" style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
            Total payable now. Any daily/monthly figures shown on marketing pages are display-only estimates.
          </p>
          <ul className="checkout-features">
            <li><span className="dot" /> VAT included</li>
            <li><span className="dot" /> Secure payment powered by Pesapal</li>
            <li><span className="dot" /> Instant confirmation after verification</li>
          </ul>
        </div>

        <div className="checkout-notice">
          <span className="checkout-notice-icon">🔒</span>
          <span>Sign in to continue securely. New here? You can create an account on the next step.</span>
        </div>

        {REGISTRATION_VIDEO.enabled && REGISTRATION_VIDEO.showInCheckoutPreview && (
          <div style={{ marginBottom: 12 }}>
            <Suspense fallback={null}>
              <RegistrationVideo config={REGISTRATION_VIDEO} compact />
            </Suspense>
          </div>
        )}

        <div className="checkout-actions">
          <button className="checkout-btn checkout-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="checkout-btn checkout-btn-primary" onClick={onContinue}>Sign in to continue →</button>
        </div>
      </div>
    </div>
  );
}
