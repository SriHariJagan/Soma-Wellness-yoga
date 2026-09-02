import React from 'react';

const ChatIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {/* Premium chat bubble — thin stroke, soft fill */}
    <path
      d="M8.1 4.2h7.8A3.8 3.8 0 0 1 19.7 8v5.1a3.8 3.8 0 0 1-3.8 3.8h-4.1l-2.95 2.4a1 1 0 0 1-1.6-.8v-1.6H8.1A3.8 3.8 0 0 1 4.3 13.1V8A3.8 3.8 0 0 1 8.1 4.2Z"
      stroke="white"
      strokeWidth="1.45"
      strokeLinejoin="round"
      fill="white"
      fillOpacity="0.08"
    />
    {/* Minimal conversation lines — premium, not cartoon dots */}
    <path d="M8.8 9.1h7.4" stroke="white" strokeWidth="1.45" strokeLinecap="round" opacity="0.96" />
    <path d="M8.8 12.1h5.2" stroke="white" strokeWidth="1.45" strokeLinecap="round" opacity="0.72" />
    {/* Subtle lotus accent — wellness signature, top-right */}
    <g transform="translate(15.6 6.0)">
      <path
        d="M0 2.7C0 1.15.85.1 2 .1S4 1.15 4 2.7c0 1.05-.85 2.05-2 2.7C.85 4.75 0 3.75 0 2.7Z"
        fill="#F4B400"
        stroke="#183D2D"
        strokeWidth="0.55"
      />
      <path d="M2 1.1c-.55.7-.9 1.35-.9 1.95 0 .3.12.62.37.93A2.6 2.6 0 0 0 2 4.15a2.6 2.6 0 0 0 .53-.17c.25-.31.37-.63.37-.93 0-.6-.35-1.25-.9-1.95Z" fill="white" fillOpacity="0.92" />
    </g>
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="17" y1="7" x2="7" y2="17" />
    <line x1="7" y1="7" x2="17" y2="17" />
  </svg>
);

const ChatbotButton = ({ isOpen, onClick, hasUnread = false, label = 'Chat with Soma — wellness concierge' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={isOpen ? 'Close Soma wellness assistant' : label}
    aria-expanded={isOpen}
    aria-haspopup="dialog"
    className={`soma-cb-btn ${isOpen ? 'soma-cb-btn--open' : ''}`}
  >
    <span className="soma-cb-btn-inner" aria-hidden="true">
      <span className={`soma-cb-btn-ic ${isOpen ? 'soma-cb-btn-ic--close' : 'soma-cb-btn-ic--chat'}`}>
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </span>
    </span>
    {!isOpen && hasUnread && <span className="soma-cb-btn-dot" aria-hidden="true" />}
    <span className="soma-cb-btn-ring" aria-hidden="true" />
  </button>
);

export default ChatbotButton;
