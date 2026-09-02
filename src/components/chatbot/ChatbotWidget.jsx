import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import ChatbotButton from './ChatbotButton.jsx';
import ChatbotWelcomePopup from './ChatbotWelcomePopup.jsx';
import { SESSION_KEYS, randomWelcomeDelay, ANALYTICS_EVENTS } from '../../config/chatbotConfig.js';
import { trackChatbotEvent, fetchChatbotConfig } from '../../lib/chatbotApi.js';
import './chatbot.css';

// Lazy-load the heavy window so initial bundle stays small
const ChatbotWindow = lazy(() => import('./ChatbotWindow.jsx'));

const ChatbotWidget = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEYS.WELCOME_DISMISSED) === '1';
    } catch { return false; }
  });

  // Hide on dashboard / auth routes (same logic as BackToTop)
  const hiddenRoutes = ['/yogaadmin', '/studentdashboard', '/login', '/forgot-password', '/payment', '/checkout'];
  const isHiddenRoute = hiddenRoutes.includes(location.pathname) || location.pathname.startsWith('/admin');

  // Prefetch WA config early (does not block render)
  useEffect(() => { fetchChatbotConfig().catch(() => {}); }, []);

  // Welcome popup timer — 5–8s, once per session, not on hidden routes
  useEffect(() => {
    // Disable proactive popup in test env to keep tests deterministic
    try { if (import.meta.env.MODE === 'test') return; } catch {}
    if (isHiddenRoute) return;
    if (welcomeDismissed || isOpen) return;
    // Don't show if already shown this session
    try {
      if (sessionStorage.getItem(SESSION_KEYS.WELCOME_SHOWN) === '1') return;
    } catch { /* ignore */ }

    const delay = randomWelcomeDelay();
    const t = setTimeout(() => {
      setShowWelcome(true);
      try { sessionStorage.setItem(SESSION_KEYS.WELCOME_SHOWN, '1'); } catch { /* ignore */ }
      trackChatbotEvent(ANALYTICS_EVENTS.CHATBOT_WELCOME_SHOWN, { delay, page: location.pathname });
    }, delay);

    return () => clearTimeout(t);
  }, [isHiddenRoute, welcomeDismissed, isOpen, location.pathname]);

  const handleDismissWelcome = useCallback(() => {
    setShowWelcome(false);
    setWelcomeDismissed(true);
    try { sessionStorage.setItem(SESSION_KEYS.WELCOME_DISMISSED, '1'); } catch { /* ignore */ }
    trackChatbotEvent(ANALYTICS_EVENTS.CHATBOT_WELCOME_DISMISSED, { page: location.pathname });
  }, [location.pathname]);

  const handleWelcomeCta = useCallback(() => {
    setShowWelcome(false);
    setWelcomeDismissed(true);
    try { sessionStorage.setItem(SESSION_KEYS.WELCOME_DISMISSED, '1'); } catch { /* ignore */ }
    trackChatbotEvent(ANALYTICS_EVENTS.CHATBOT_WELCOME_CTA, { page: location.pathname });
    setIsOpen(true);
    setIsMinimized(false);
    trackChatbotEvent(ANALYTICS_EVENTS.CHATBOT_OPEN, { source: 'welcome_cta', page: location.pathname });
  }, [location.pathname]);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
      setIsMinimized(false);
      trackChatbotEvent(ANALYTICS_EVENTS.CHATBOT_CLOSE, { page: location.pathname });
    } else {
      setIsOpen(true);
      setIsMinimized(false);
      setShowWelcome(false);
      try { sessionStorage.setItem(SESSION_KEYS.WELCOME_DISMISSED, '1'); } catch { /* ignore */ }
      trackChatbotEvent(ANALYTICS_EVENTS.CHATBOT_OPEN, { page: location.pathname });
    }
  }, [isOpen, location.pathname]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
    trackChatbotEvent(ANALYTICS_EVENTS.CHATBOT_CLOSE, { page: location.pathname });
  }, [location.pathname]);

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
    setIsOpen(false);
    trackChatbotEvent(ANALYTICS_EVENTS.CHATBOT_CLOSE, { page: location.pathname, minimized: true });
  }, [location.pathname]);

  // No vertical lift — docked same Y as BackToTop (side-by-side)
  const liftForBackTop = false;

  // If minimized, show button with ability to restore
  const effectiveOpen = isOpen && !isMinimized;

  // Hide BackToTop while chat is open (same Y dock — avoid overlap)
  useEffect(() => {
    const open = effectiveOpen;
    document.body.classList.toggle("soma-chat-open", open);
    window.dispatchEvent(new CustomEvent("soma:chat-toggle", { detail: { open } }));
    return () => {
      if (open) {
        document.body.classList.remove("soma-chat-open");
        window.dispatchEvent(new CustomEvent("soma:chat-toggle", { detail: { open: false } }));
      }
    };
  }, [effectiveOpen]);

  if (isHiddenRoute && !effectiveOpen) {
    // Still allow button? Spec says available throughout public website — hide on dashboard/auth
    return null;
  }

  return (
    <div className={`soma-cb-root ${liftForBackTop && !effectiveOpen ? 'soma-cb-root--lifted' : ''}`} aria-live="polite" aria-relevant="additions">
      {showWelcome && !effectiveOpen && (
        <ChatbotWelcomePopup onDismiss={handleDismissWelcome} onCta={handleWelcomeCta} />
      )}

      {effectiveOpen && (
        <Suspense
          fallback={
            <div className="soma-cb-window" role="dialog" aria-label="Loading Soma assistant" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
              <span style={{ fontSize: 13, color: 'var(--soma-warm-gray)' }}>Loading…</span>
            </div>
          }
        >
          <ChatbotWindow isOpen={effectiveOpen} onClose={handleClose} onMinimize={handleMinimize} />
        </Suspense>
      )}

      <ChatbotButton
        isOpen={effectiveOpen}
        onClick={handleToggle}
        hasUnread={showWelcome && !effectiveOpen}
      />
    </div>
  );
};

export default ChatbotWidget;
