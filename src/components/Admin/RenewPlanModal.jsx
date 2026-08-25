import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LuX, LuCheck, LuCrown, LuCalendar, LuClock, LuAward, LuIndianRupee, LuRefreshCw } from 'react-icons/lu';
import { getAllPlans, renewMembershipAdmin } from '../api/AdminServices.js';

const C = {
  cream: '#F8F4EC', card: '#FFFFFF', border: '#E7D7BE',
  primary: '#F97316', primaryLight: '#81B29A',
  primaryBg: 'rgba(249,115,22,0.10)', primaryShadow: 'rgba(249,115,22,0.30)',
  dark: '#2D1406', text2: '#6B5E4E', text3: '#9C8E7C',
  green: '#16A34A', greenBg: 'rgba(22,163,74,0.10)',
  amber: '#D97706', amberBg: 'rgba(217,119,6,0.10)',
};

const row = { display: 'flex', alignItems: 'center', gap: 8 };

export default function RenewPlanModal({ student, membership, onClose, onSuccess }) {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoadingPlans(true);
    getAllPlans()
      .then(data => {
        if (!cancelled) {
          const active = (data || []).filter(p => p.active !== false).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
          setPlans(active);
        }
      })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoadingPlans(false); });
    return () => { cancelled = true; };
  }, []);

  const currentPlanName = membership?.planType || '';
  const currentPlanId = plans.find(p => p.name === currentPlanName)?._id || null;

  const handleRenew = async () => {
    if (!selectedPlanId || !student?._id) return;
    setBusy(true);
    setError('');
    try {
      await renewMembershipAdmin({ studentId: student._id, planId: selectedPlanId });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Renewal failed');
    } finally {
      setBusy(false);
    }
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return '';
    return '₹' + Number(price).toLocaleString('en-IN');
  };

  const renderPlanCard = (plan) => {
    const isSelected = selectedPlanId === plan._id;
    const isCurrent = plan._id === currentPlanId;

    return (
      <motion.div
        key={plan._id}
        whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}
        onClick={() => { if (!isCurrent) setSelectedPlanId(plan._id); }}
        style={{
          background: C.card,
          borderRadius: 16,
          border: `2px solid ${isSelected ? C.primary : C.border}`,
          boxShadow: isSelected ? `0 0 0 4px ${C.primaryBg}, 0 8px 32px ${C.primaryShadow}` : '0 2px 8px rgba(0,0,0,0.04)',
          padding: 0,
          cursor: isCurrent ? 'default' : 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          display: 'flex',
          flexDirection: 'column',
          opacity: isCurrent && selectedPlanId !== plan._id ? 0.85 : 1,
        }}
      >
        {plan.isPopular && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: C.primary, color: '#fff',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', padding: '4px 10px', borderRadius: 20,
          }}>
            POPULAR
          </div>
        )}

        {isCurrent && selectedPlanId !== plan._id && (
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: C.primary, color: '#fff',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.04em', padding: '4px 10px', borderRadius: 20,
          }}>
            CURRENT PLAN
          </div>
        )}

        {isSelected && (
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            width: 24, height: 24, borderRadius: '50%',
            background: C.primary, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, boxShadow: '0 2px 8px rgba(249,115,22,0.4)',
          }}>
            <LuCheck size={14} />
          </div>
        )}

        <div style={{ padding: '24px 20px 16px', flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.dark, marginBottom: 4 }}>
            {plan.name}
          </div>
          {plan.membershipAccess && (
            <div style={{ fontSize: 11, color: C.text3, marginBottom: 12 }}>
              {plan.membershipAccess}
            </div>
          )}

          <div style={{ fontSize: 28, fontWeight: 800, color: C.dark, marginBottom: 4 }}>
            {formatPrice(plan.price)}
            <span style={{ fontSize: 14, fontWeight: 400, color: C.text2 }}> / {plan.durationMonths}mo</span>
          </div>

          {plan.pauseDays > 0 && (
            <div style={{ ...row, gap: 4, fontSize: 12, color: C.text2, marginTop: 8 }}>
              <LuClock size={12} />
              {plan.pauseDays} pause days
            </div>
          )}
        </div>

        <div style={{ padding: '0 20px 16px', borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          {plan.features?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {plan.features.slice(0, 5).map((f, i) => (
                <div key={i} style={{ ...row, gap: 8, fontSize: 12.5, color: C.dark }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.primary, flexShrink: 0 }} />
                  {f}
                </div>
              ))}
            </div>
          )}
        </div>

        {isCurrent && selectedPlanId !== plan._id && (
          <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: C.text3 }}>Current active plan</div>
          </div>
        )}
      </motion.div>
    );
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 11000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 1200,
            maxHeight: '90vh',
            background: C.cream,
            borderRadius: 24,
            border: `1px solid ${C.border}`,
            boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '28px 32px',
            borderBottom: `1px solid ${C.border}`,
            background: C.card,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
            <div>
              <div style={{ fontSize: 13, color: C.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Renew Membership
              </div>
              <div style={{ fontSize: 11, color: C.text2, marginTop: 8 }}>
                <div style={{ marginBottom: 3 }}>
                  <span style={{ color: C.text3 }}>Student: </span>
                  <span style={{ fontWeight: 600, color: C.dark }}>{student?.name || '—'}</span>
                </div>
                <div style={{ marginBottom: 3 }}>
                  <span style={{ color: C.text3 }}>Current Plan: </span>
                  <span style={{ fontWeight: 600, color: C.dark }}>{membership?.planType || 'No plan'}</span>
                </div>
                <div>
                  <span style={{ color: C.text3 }}>Membership Status: </span>
                  <span style={{
                    fontWeight: 600,
                    color: membership?.status === 'active' ? C.green : C.amber,
                    textTransform: 'capitalize',
                  }}>
                    {membership?.status || 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <button type="button" onClick={onClose} style={{
              width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.cream, cursor: 'pointer', color: C.text2, fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <LuX size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
            {error && (
              <div style={{
                padding: '12px 18px', borderRadius: 12, marginBottom: 20,
                background: 'rgba(220,38,38,0.10)', color: '#DC2626',
                fontSize: 13, fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            {loadingPlans ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.primary, animation: 'spin 0.8s linear infinite' }} />
                <div style={{ color: C.text2, fontSize: 14 }}>Loading plans…</div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: 20,
              }}>
                {plans.map(renderPlanCard)}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 32px',
            borderTop: `1px solid ${C.border}`,
            background: C.card,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 12,
          }}>
            <button type="button" onClick={onClose} style={{
              padding: '10px 22px', border: `1px solid ${C.border}`, borderRadius: 10,
              cursor: 'pointer', fontSize: 13.5, fontWeight: 500,
              color: C.text2, background: C.card, fontFamily: 'inherit',
            }}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRenew}
              disabled={!selectedPlanId || busy}
              style={{
                ...row, gap: 6, padding: '11px 24px',
                border: 'none', borderRadius: 10, cursor: !selectedPlanId || busy ? 'default' : 'pointer',
                fontSize: 13.5, fontWeight: 600, color: '#fff',
                background: !selectedPlanId ? C.text3 : `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
                boxShadow: !selectedPlanId ? 'none' : `0 4px 14px ${C.primaryShadow}`,
                opacity: !selectedPlanId ? 0.5 : 1,
                transition: 'all .15s', fontFamily: 'inherit',
              }}
            >
              <LuRefreshCw size={16} />
              {busy ? 'Renewing…' : 'Renew Membership'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
