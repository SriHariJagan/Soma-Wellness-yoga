import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LuX, LuCheck, LuArrowUp, LuCalendar, LuClock, LuAward, LuIndianRupee, LuTrendingUp, LuZap } from 'react-icons/lu';
import { getAllPlans, upgradeMembershipAdmin } from '../api/AdminServices.js';

const C = {
  cream: '#F8F4EC', card: '#FFFFFF', border: '#E7D7BE',
  primary: '#F97316', primaryLight: '#81B29A',
  primaryBg: 'rgba(249,115,22,0.10)', primaryShadow: 'rgba(249,115,22,0.30)',
  dark: '#2D1406', text2: '#6B5E4E', text3: '#9C8E7C',
  green: '#16A34A', greenBg: 'rgba(22,163,74,0.10)',
  blue: '#2563EB', blueBg: 'rgba(37,99,235,0.10)',
};

const row = { display: 'flex', alignItems: 'center', gap: 8 };

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPrice(price) {
  if (!price && price !== 0) return '';
  return '₹' + Number(price).toLocaleString('en-IN');
}

export default function UpgradePlanModal({ student, membership, onClose, onSuccess }) {
  const [allPlans, setAllPlans] = useState([]);
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
          setAllPlans(active);
        }
      })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoadingPlans(false); });
    return () => { cancelled = true; };
  }, []);

  const currentPlanName = membership?.planType || '';
  const currentPlan = allPlans.find(p => p.name === currentPlanName) || null;
  const currentDisplayOrder = currentPlan?.displayOrder || 0;

  const eligiblePlans = allPlans.filter(p => (p.displayOrder || 0) >= currentDisplayOrder);

  const selectedPlan = allPlans.find(p => p._id === selectedPlanId) || null;

  const handleUpgrade = async () => {
    if (!selectedPlanId || !student?._id) return;
    setBusy(true);
    setError('');
    try {
      await upgradeMembershipAdmin({
        studentId: student._id,
        currentPlanId: currentPlan?._id || null,
        targetPlanId: selectedPlanId,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Upgrade failed');
    } finally {
      setBusy(false);
    }
  };

  const renderPlanCard = (plan) => {
    const isSelected = selectedPlanId === plan._id;
    const isCurrent = plan._id === currentPlan?._id;
    const additionalCost = currentPlan ? (plan.price - currentPlan.price) : plan.price;

    const newExpiry = membership?.expiryDate
      ? new Date(new Date().getTime() + plan.durationMonths * 30 * 24 * 60 * 60 * 1000)
      : null;

    return (
      <motion.div
        key={plan._id}
        whileHover={isCurrent ? {} : { y: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}
        style={{
          background: C.card,
          borderRadius: 16,
          border: `2px solid ${isSelected ? C.primary : isCurrent ? C.border : C.border}`,
          boxShadow: isSelected ? `0 0 0 4px ${C.primaryBg}, 0 8px 32px ${C.primaryShadow}` : '0 2px 8px rgba(0,0,0,0.04)',
          padding: 0,
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          display: 'flex',
          flexDirection: 'column',
          opacity: isCurrent ? 0.75 : 1,
        }}
      >
        {plan.isPopular && !isCurrent && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: C.primary, color: '#fff',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', padding: '4px 10px', borderRadius: 20,
          }}>
            POPULAR
          </div>
        )}

        {isCurrent && (
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: C.primary, color: '#fff',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.04em', padding: '4px 10px', borderRadius: 20,
          }}>
            CURRENT PLAN
          </div>
        )}

        <div style={{ padding: '24px 20px 16px', flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.dark, marginBottom: 2 }}>
            {plan.name}
          </div>
          {plan.membershipAccess && (
            <div style={{ fontSize: 11, color: C.text3, marginBottom: 12 }}>
              {plan.membershipAccess}
            </div>
          )}

          <div style={{ fontSize: 24, fontWeight: 800, color: C.dark, marginBottom: 4 }}>
            {formatPrice(plan.price)}
            <span style={{ fontSize: 13, fontWeight: 400, color: C.text2 }}> / {plan.durationMonths}mo</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
            {plan.features?.slice(0, 4).map((f, i) => (
              <div key={i} style={{ ...row, gap: 8, fontSize: 12.5, color: C.dark }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.primary, flexShrink: 0 }} />
                {f}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}` }}>
          {isCurrent ? (
            <div style={{
              padding: '10px', borderRadius: 10, background: C.cream,
              textAlign: 'center', fontSize: 12, color: C.text3, fontWeight: 500,
            }}>
              Current Plan — Cannot Select
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSelectedPlanId(plan._id)}
              style={{
                width: '100%', padding: '10px', border: `1px solid ${C.primary}`, borderRadius: 10,
                cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                color: isSelected ? '#fff' : C.primary,
                background: isSelected ? `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})` : 'transparent',
                transition: 'all .15s', fontFamily: 'inherit',
              }}
            >
              {isSelected ? 'Selected' : 'Upgrade To This Plan'}
            </button>
          )}
        </div>
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
                Upgrade Membership
              </div>
              <div style={{ fontSize: 11, color: C.text2, marginTop: 8 }}>
                <div style={{ marginBottom: 3 }}>
                  <span style={{ color: C.text3 }}>Student: </span>
                  <span style={{ fontWeight: 600, color: C.dark }}>{student?.name || '—'}</span>
                </div>
                <div style={{ marginBottom: 3 }}>
                  <span style={{ color: C.text3 }}>Current Plan: </span>
                  <span style={{ fontWeight: 600, color: C.dark }}>{currentPlanName || 'No plan'}</span>
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
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: 20,
                }}>
                  {eligiblePlans.map(renderPlanCard)}
                </div>

                {/* Upgrade Summary */}
                {selectedPlan && selectedPlan._id !== currentPlan?._id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: 24,
                      background: C.card,
                      borderRadius: 16,
                      border: `1px solid ${C.primary}`,
                      boxShadow: `0 4px 20px ${C.primaryBg}`,
                      padding: 24,
                    }}
                  >
                    <div style={{ ...row, gap: 10, marginBottom: 18, color: C.primary, fontWeight: 700, fontSize: 15 }}>
                      <LuZap size={18} />
                      Upgrade Preview
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
                      <div style={{ padding: 14, background: C.cream, borderRadius: 12, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 11, color: C.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Current Plan</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>{currentPlan?.name || '—'}</div>
                        <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{formatPrice(currentPlan?.price)} / {currentPlan?.durationMonths}mo</div>
                      </div>

                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: C.primaryBg, color: C.primary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, flexShrink: 0,
                      }}>
                        <LuArrowUp size={18} />
                      </div>

                      <div style={{ padding: 14, background: C.primaryBg, borderRadius: 12, border: `2px solid ${C.primary}` }}>
                        <div style={{ fontSize: 11, color: C.primary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>New Plan</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>{selectedPlan?.name}</div>
                        <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{formatPrice(selectedPlan?.price)} / {selectedPlan?.durationMonths}mo</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ ...row, justifyContent: 'space-between', padding: '8px 12px', background: C.cream, borderRadius: 8 }}>
                        <span style={{ ...row, gap: 6, fontSize: 12.5, color: C.text2 }}>
                          <LuCalendar size={13} /> Current Expiry
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{formatDate(membership?.expiryDate)}</span>
                      </div>
                      <div style={{ ...row, justifyContent: 'space-between', padding: '8px 12px', background: C.greenBg, borderRadius: 8 }}>
                        <span style={{ ...row, gap: 6, fontSize: 12.5, color: C.text2 }}>
                          <LuCalendar size={13} /> New Expiry
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.green }}>
                          {selectedPlan ? formatDate(new Date(Date.now() + selectedPlan.durationMonths * 30 * 24 * 60 * 60 * 1000)) : '—'}
                        </span>
                      </div>
                      <div style={{ ...row, justifyContent: 'space-between', padding: '8px 12px', background: C.primaryBg, borderRadius: 8 }}>
                        <span style={{ ...row, gap: 6, fontSize: 12.5, color: C.text2 }}>
                          <LuIndianRupee size={13} /> Additional Cost
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>
                          {formatPrice(selectedPlan && currentPlan ? selectedPlan.price - currentPlan.price : selectedPlan?.price)}
                        </span>
                      </div>
                    </div>

                    {selectedPlan?.features && currentPlan?.features && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 12, color: C.text3, fontWeight: 600, marginBottom: 8 }}>Benefits Added:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {selectedPlan.features
                            .filter(f => !currentPlan.features.includes(f))
                            .slice(0, 4)
                            .map((f, i) => (
                              <div key={i} style={{
                                ...row, gap: 4, fontSize: 12, color: C.green,
                                background: C.greenBg, padding: '4px 10px', borderRadius: 20,
                              }}>
                                <LuZap size={11} />
                                {f}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </>
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
              onClick={handleUpgrade}
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
              <LuArrowUp size={16} />
              {busy ? 'Upgrading…' : 'Upgrade Membership'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
