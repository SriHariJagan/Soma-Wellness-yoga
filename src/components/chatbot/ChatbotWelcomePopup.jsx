import React, { useEffect, useRef } from 'react';

const ChatbotWelcomePopup = ({ onDismiss, onCta }) => {
  const ctaRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => ctaRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="soma-cb-welcome"
      role="dialog"
      aria-label="Welcome to Soma Wellness"
      aria-live="polite"
    >
      <button
        type="button"
        className="soma-cb-welcome-close"
        onClick={onDismiss}
        aria-label="Dismiss welcome message"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="soma-cb-welcome-head">
        <span className="soma-cb-welcome-dot" aria-hidden="true" />
        <span className="soma-cb-welcome-eyebrow">Soma Wellness · Online</span>
      </div>

      <p className="soma-cb-welcome-title">Hi 👋 Welcome to Soma Wellness.</p>
      <p className="soma-cb-welcome-body">
        Looking for the right wellness program? I can help you explore our courses, programs and services.
      </p>

      <button
        ref={ctaRef}
        type="button"
        className="soma-cb-welcome-cta"
        onClick={onCta}
      >
        Explore with us
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
};

export default ChatbotWelcomePopup;
