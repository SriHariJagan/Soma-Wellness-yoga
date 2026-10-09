// ============================================================
// Payment/PaymentReturn.jsx — Pesapal return landing (/payment/return).
// NEVER decides success: reads ref → polls BACKEND status (which
// verifies server-to-server) → renders captured/failed/pending.
// Query params from Pesapal: ?OrderTrackingId=&OrderMerchantReference=
//   &OrderNotificationType=CALLBACKURL (plus our own ?ref=&status=).
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { getPesapalPaymentStatus } from '../api/PesapalServices';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20;

function readIntent() {
  try {
    const raw = sessionStorage.getItem('pesapal_intent');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function shortRef(ref) {
  if (!ref) return '—';
  return ref.length > 20 ? `${ref.slice(0, 10)}…${ref.slice(-4)}` : ref;
}

function formatAmountMinor(minor, currency) {
  const n = Number(minor);
  if (!Number.isFinite(n)) return null;
  return `${currency || 'KES'} ${(n / 100).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const shell = {
  maxWidth: 400,
  margin: 'auto',
  width: '100%',
  background: '#FFFFFF',
  borderRadius: 20,
  boxShadow: '0 20px 60px rgba(24,61,45,0.12)',
  border: '1px solid #EFE7D6',
  overflow: 'hidden',
};

// Full-viewport centering wrapper: guarantees X+Y centering even if the
// shared .pay-shell flex context is altered by page-level styles.
const centerWrap = {
  width: '100%',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px',
  boxSizing: 'border-box',
};

const brandBlock = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  padding: '24px 24px 0',
};

const logoImg = {
  height: 104,
  width: 'auto',
  maxWidth: '100%',
  objectFit: 'contain',
};

const logoFallbackBadge = {
  width: 60,
  height: 60,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, #183D2D, #2E7D5B)',
  color: '#fff',
  fontFamily: 'var(--font-display, Georgia, serif)',
  fontSize: 28,
  fontWeight: 700,
  boxShadow: '0 8px 20px rgba(24,61,45,0.25)',
};

const logoFallbackWord = {
  fontFamily: 'var(--font-display, Georgia, serif)',
  fontSize: 24,
  fontWeight: 700,
  color: '#183D2D',
  margin: '10px 0 0',
};

const tagline = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  color: '#B49B5E',
  margin: '10px 0 0',
};

const eyebrow = {
  fontSize: 10.5,
  fontWeight: 800,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: '#B49B5E',
  margin: '18px 0 10px',
  textAlign: 'center',
};

const title = {
  fontSize: 21,
  fontWeight: 800,
  color: '#183D2D',
  letterSpacing: '-0.02em',
  margin: '0 0 6px',
  textAlign: 'center',
};

const sub = {
  fontSize: 13.5,
  color: '#6B5E4E',
  lineHeight: 1.6,
  margin: 0,
  textAlign: 'center',
};

const body = {
  padding: '4px 24px 24px',
  textAlign: 'center',
};

const iconWrap = {
  width: 64,
  height: 64,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  margin: '6px auto 16px',
  fontSize: 32,
  color: '#fff',
  position: 'relative',
};

const amountHero = {
  fontSize: 28,
  fontWeight: 800,
  color: '#183D2D',
  letterSpacing: '-0.02em',
  margin: '10px 0 4px',
  textAlign: 'center',
};

const detailCard = {
  background: '#FAF7F0',
  border: '1px solid #EDE4D2',
  borderRadius: 14,
  padding: '8px 18px',
  margin: '18px 0 4px',
  textAlign: 'left',
};

const detailRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  fontSize: 13,
  padding: '9px 0',
  borderBottom: '1px solid #F0E8D6',
};

const detailRowLast = {
  ...detailRow,
  borderBottom: 'none',
};

const detailLabel = { color: '#9C8E7C' };
const detailValue = { color: '#2B2620', fontWeight: 700, textAlign: 'right', wordBreak: 'break-all' };

const refChip = {
  display: 'inline-block',
  fontSize: 11,
  color: '#6B5E4E',
  background: '#F5F0EB',
  border: '1px solid #E7D7BE',
  borderRadius: 999,
  padding: '5px 14px',
  fontFamily: 'monospace',
  marginTop: 14,
};

const actions = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  marginTop: 20,
};

const primaryBtn = {
  width: '100%',
  padding: '14px 0',
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer',
  background: 'linear-gradient(135deg, #183D2D, #2E7D5B)',
  color: '#fff',
  fontFamily: "'Inter', sans-serif",
};

const ghostBtn = {
  width: '100%',
  padding: '12px 0',
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  background: 'transparent',
  border: '1px solid #E7D7BE',
  color: '#6B5E4E',
  fontFamily: "'Inter', sans-serif",
};

const spinnerRing = {
  width: 76,
  height: 76,
  borderRadius: '50%',
  margin: '6px auto 16px',
  border: '5px solid #EDE4D2',
  borderTopColor: '#2E7D5B',
  animation: 'soma-spin 0.9s linear infinite',
};

const metaNote = {
  fontSize: 11.5,
  color: '#B4A88F',
  marginTop: 12,
};

export default function PaymentReturn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const refParam = params.get('ref') || params.get('OrderMerchantReference') || readIntent()?.merchantReference || null;
  const trackingParam = params.get('OrderTrackingId') || params.get('orderTrackingId') || readIntent()?.orderTrackingId || null;
  const hasRef = !!(refParam || trackingParam);

  const [state, setState] = useState(hasRef ? 'processing' : 'invalid'); // processing|captured|failed|pending|invalid
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [polls, setPolls] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [logoOk, setLogoOk] = useState(true);
  const pollCount = useRef(0);
  const timer = useRef(null);

  useEffect(() => {
    if (!hasRef) return undefined;
    pollCount.current = 0;
    const check = async () => {
      pollCount.current += 1;
      setPolls(pollCount.current);
      try {
        const res = await getPesapalPaymentStatus(refParam, trackingParam);
        setDetail(res);
        if (res.paymentStatus === 'captured') {
          clearInterval(timer.current);
          setState('captured');
          try { sessionStorage.removeItem('pesapal_intent'); } catch { /* storage unavailable — ignore */ }
          try { sessionStorage.removeItem('cart_checkout_key'); } catch { /* next purchase gets a fresh key */ }
        } else if (res.paymentStatus === 'failed' || res.paymentStatus === 'expired') {
          clearInterval(timer.current);
          setState('failed');
          setError(res.failureReason || '');
        } else if (pollCount.current >= MAX_POLLS) {
          clearInterval(timer.current);
          setState('pending');
        }
        // else: still pending → keep polling
      } catch (err) {
        if (pollCount.current >= MAX_POLLS) {
          clearInterval(timer.current);
          setState('pending');
          setError(err.message);
        }
        // transient errors: keep polling until MAX_POLLS
      }
    };
    check();
    timer.current = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(timer.current);
  }, [hasRef, retryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const amountDisplay = detail ? formatAmountMinor(detail.amount, detail.currency) : null;

  const renderBody = () => {
    if (state === 'processing') {
      return (
        <>
          <div style={spinnerRing} />
          <h2 style={title}>{t('payment.paymentPending')}</h2>
          <p style={sub}>{t('payment.waitingForPayment')}</p>
          <p style={{ ...sub, fontSize: 12, marginTop: 8 }}>{t('payment.doNotClose')}</p>
          <div><span style={refChip}>Ref: {shortRef(detail?.merchantReference || refParam)}</span></div>
          <p style={metaNote}>{t('payment.checkingStatus', { count: polls, total: MAX_POLLS })}</p>
        </>
      );
    }
    if (state === 'captured') {
      return (
        <>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 13 }}
            style={{ ...iconWrap, background: 'linear-gradient(135deg, #2E7D5B, #4CAF7D)', boxShadow: '0 12px 32px rgba(46,125,91,0.35)' }}
          >
            ✓
          </motion.div>
          <p style={eyebrow}>{t('payment.paymentSuccessful')}</p>
          {amountDisplay && <p style={amountHero}>{amountDisplay}</p>}
          <p style={sub}>{t('payment.orderConfirmation')}</p>
          <div style={detailCard}>
            {detail?.invoiceNo && (
              <div style={detailRow}>
                <span style={detailLabel}>{t('payment.invoice')}</span>
                <span style={detailValue}>{detail.invoiceNo}</span>
              </div>
            )}
            <div style={detailRowLast}>
              <span style={detailLabel}>{t('payment.reference')}</span>
              <span style={detailValue}>{detail?.merchantReference || refParam}</span>
            </div>
          </div>
          <div style={actions}>
            <button style={primaryBtn} onClick={() => navigate('/studentdashboard')}>
              {t('payment.trackOrder')}
            </button>
            <button style={ghostBtn} onClick={() => navigate('/')}>
              {t('payment.backToHome')}
            </button>
          </div>
        </>
      );
    }
    if (state === 'failed') {
      return (
        <>
          <div style={{ ...iconWrap, background: 'linear-gradient(135deg, #B91C1C, #E0574F)', boxShadow: '0 12px 32px rgba(185,28,28,0.25)' }}>✕</div>
          <p style={eyebrow}>{t('payment.paymentFailed')}</p>
          <h2 style={{ ...title, fontSize: 20 }}>{error || t('payment.paymentFailed')}</h2>
          <div><span style={refChip}>Ref: {shortRef(detail?.merchantReference || refParam)}</span></div>
          <div style={actions}>
            <button style={primaryBtn} onClick={() => navigate(-1)}>
              {t('payment.retryPayment')}
            </button>
            <button style={ghostBtn} onClick={() => navigate('/')}>
              {t('payment.backToHome')}
            </button>
          </div>
        </>
      );
    }
    if (state === 'pending') {
      return (
        <>
          <div style={{ ...iconWrap, background: 'linear-gradient(135deg, #B45309, #F59E0B)', boxShadow: '0 12px 32px rgba(180,83,9,0.25)' }}>◷</div>
          <p style={eyebrow}>{t('payment.paymentPending')}</p>
          <h2 style={{ ...title, fontSize: 20 }}>{t('payment.waitingForPayment')}</h2>
          <p style={sub}>{t('payment.pendingNote')}</p>
          <div><span style={refChip}>Ref: {shortRef(detail?.merchantReference || refParam)}</span></div>
          <div style={actions}>
            <button style={primaryBtn} onClick={() => { pollCount.current = 0; setPolls(0); setRetryKey((k) => k + 1); }}>
              {t('payment.retryPayment')}
            </button>
            <button style={ghostBtn} onClick={() => navigate('/')}>
              {t('payment.backToHome')}
            </button>
          </div>
        </>
      );
    }
    return (
      <>
        <div style={{ ...iconWrap, background: 'linear-gradient(135deg, #6B7280, #9CA3AF)' }}>?</div>
        <p style={eyebrow}>{t('payment.paymentFailed')}</p>
        <h2 style={{ ...title, fontSize: 20 }}>{t('payment.bookingFailed')}</h2>
        <div style={actions}>
          <button style={primaryBtn} onClick={() => navigate('/')}>
            {t('payment.backToHome')}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="pay-shell">
      <div style={centerWrap}>
        <div className="pay-card" style={shell}>
        <div style={brandBlock}>
          {logoOk ? (
            <img
              src="/images/soma/logo.png"
              alt="Soma Wellness"
              style={logoImg}
              onError={() => setLogoOk(false)}
            />
          ) : (
            <>
              <div style={logoFallbackBadge}>
                <span aria-hidden="true">S</span>
              </div>
              <p style={logoFallbackWord}>Soma Wellness</p>
            </>
          )}
          <p style={tagline}>Spring Valley · Nairobi</p>
        </div>

        <div style={body}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={state + retryKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28 }}
            >
              {renderBody()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      </div>
      <style>{`@keyframes soma-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
