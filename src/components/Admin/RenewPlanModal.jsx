import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LuX, LuCheck, LuCrown, LuClock, LuRefreshCw, LuSearch, LuArrowUpDown, LuLayers, LuSparkles, LuBadgeCheck } from 'react-icons/lu';
import { getAllPlans, renewMembershipAdmin, servicesApi, serviceAssignmentsApi, getStudentDetail } from '../api/AdminServices.js';

const C = {
  cream: '#F8F4EC', card: '#FFFFFF', border: '#E7D7BE',
  primary: '#F97316', primaryLight: '#81B29A',
  primaryBg: 'rgba(249,115,22,0.10)', primaryShadow: 'rgba(249,115,22,0.30)',
  dark: '#2D1406', text2: '#6B5E4E', text3: '#9C8E7C',
  green: '#16A34A', greenBg: 'rgba(22,163,74,0.10)',
  amber: '#D97706', amberBg: 'rgba(217,119,6,0.10)',
  blue: '#2563EB', blueBg: 'rgba(37,99,235,0.10)',
};

const row = { display: 'flex', alignItems: 'center', gap: 8 };

export default function RenewPlanModal({ student, membership, onClose, onSuccess }) {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('low-high');
  const [filterType, setFilterType] = useState('all'); // all | membership | service
  const [enrolledIds, setEnrolledIds] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    setLoadingPlans(true);
    Promise.all([
      getAllPlans().catch(() => []),
      servicesApi.list().catch(() => []),
    ])
      .then(([plansData, servicesData]) => {
        if (cancelled) return;
        const ALLOWED = new Set(['bronze', 'silver', 'gold']);
        const planItems = (plansData || [])
          .filter(p => p.active !== false && ALLOWED.has(String(p.name || '').trim().toLowerCase()))
          .map(p => ({
            _id: p._id,
            name: p.name,
            price: Number(p.price) || 0,
            description: p.description || '',
            membershipAccess: p.membershipAccess || '',
            durationMonths: p.durationMonths || 1,
            durationLabel: `${p.durationMonths || 1}mo`,
            pauseDays: p.pauseDays || 0,
            benefits: p.benefits || [],
            features: p.features || [],
            isPopular: !!p.isPopular,
            displayOrder: p.displayOrder || 0,
            category: 'Membership',
            typeLabel: 'Membership',
            source: 'plan',
            active: p.active,
            raw: p,
          }));
        const serviceItems = (Array.isArray(servicesData) ? servicesData : servicesData?.services || [])
          .filter(s => s.active !== false)
          .map(s => {
            const validity = s.validityDuration ? `${s.validityDuration} ${s.validityUnit}` : '';
            const sessions = s.totalSessions ? `${s.totalSessions} sessions` : '';
            return {
              _id: s._id,
              name: s.name,
              price: Number(s.price) || 0,
              description: s.description || '',
              membershipAccess: '',
              durationMonths: s.validityDuration && s.validityUnit === 'months' ? s.validityDuration : s.validityDuration && s.validityUnit === 'weeks' ? Math.ceil(s.validityDuration / 4) : 1,
              durationLabel: validity || sessions || `${s.sessionDuration || 60}min`,
              pauseDays: 0,
              benefits: s.description ? [s.description.slice(0, 100)] : [],
              features: [],
              isPopular: !!s.isPopular,
              displayOrder: s.displayOrder || 99,
              category: s.category || 'Service',
              typeLabel: s.type || s.category || 'Service',
              source: 'service',
              mode: s.mode || '',
              sessions: s.totalSessions || 0,
              validityDuration: s.validityDuration,
              validityUnit: s.validityUnit,
              active: s.active,
              raw: s,
            };
          });
        const combined = [...planItems, ...serviceItems];
        setPlans(combined);
      })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoadingPlans(false); });
    return () => { cancelled = true; };
  }, []);

  // Fetch already enrolled services for this student to disable them.
  // Matches by service AND offering ids/names since enrollments can come
  // from either the legacy Service catalog or the unified Offering catalog.
  useEffect(() => {
    if (!student?._id) return;
    let cancelled = false;
    getStudentDetail(student._id).then(det => {
      if (cancelled) return;
      const svcs = det?.services || [];
      const active = svcs.filter(s => s.status === 'active' || s.isActive);
      const ids = active
        .map(s => String(s.service?._id || s.service || s.offering?._id || s.offering || s._id || ''))
        .filter(Boolean);
      // Also check by service/offering name for rows where the id may not match (fallback)
      const nameSet = new Set(active.map(s => String(s.serviceName || s.offeringName || s.service?.name || s.offering?.name || '').toLowerCase().trim()).filter(Boolean));
      // store both ids and names for matching
      setEnrolledIds(new Set([...ids, ...Array.from(nameSet).map(n => `name:${n}`)]));
    }).catch(()=>{});
    return ()=>{ cancelled=true; };
  }, [student?._id]);

  const currentPlanName = membership?.planType || '';
  const currentPlan = plans.find(p => String(p.name || '').trim().toLowerCase() === String(currentPlanName || '').trim().toLowerCase()) || null;
  const currentPlanId = currentPlan?._id || null;

  const filteredPlans = useMemo(() => {
    let list = [...plans];
    if (filterType !== 'all') {
      if (filterType === 'membership') list = list.filter(p => p.source === 'plan');
      else if (filterType === 'service') list = list.filter(p => p.source === 'service');
      else list = list.filter(p => (p.category || '').toLowerCase() === filterType.toLowerCase());
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.typeLabel || '').toLowerCase().includes(q) ||
        String(p.price || '').includes(q)
      );
    }
    list.sort((a, b) => {
      const pa = Number(a.price) || 0;
      const pb = Number(b.price) || 0;
      if (sortOrder === 'high-low') return pb - pa;
      return pa - pb;
    });
    return list;
  }, [plans, search, sortOrder, filterType]);

  const filteredMembership = useMemo(() => filteredPlans.filter(p => p.source === 'plan'), [filteredPlans]);
  const filteredServices = useMemo(() => filteredPlans.filter(p => p.source === 'service'), [filteredPlans]);

  const selectedPlan = plans.find(p => p._id === selectedPlanId) || null;

  const isEnrolledService = (plan) => {
    if (plan.source !== 'service') return false;
    if (enrolledIds.has(String(plan._id))) return true;
    if (enrolledIds.has(`name:${String(plan.name||'').toLowerCase().trim()}`)) return true;
    return false;
  };

  const handleRenew = async () => {
    if (!selectedPlan || !student?._id) return;
    if (isEnrolledService(selectedPlan)) {
      setError('You already have an active enrollment for this service');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (selectedPlan.source === 'service') {
        await serviceAssignmentsApi.assign({
          studentId: student._id,
          serviceId: selectedPlan._id,
          price: selectedPlan.price,
        });
      } else {
        await renewMembershipAdmin({ studentId: student._id, planId: selectedPlan._id });
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Renewal failed');
    } finally {
      setBusy(false);
    }
  };

  const formatPrice = (price) => {
    if (price == null) return '';
    return 'KES ' + Number(price).toLocaleString('en-KE');
  };

  const renderPlanCard = (plan) => {
    const isSelected = selectedPlanId === plan._id;
    const isCurrent = plan._id === currentPlanId;
    const isService = plan.source === 'service';
    const isEnrolled = isEnrolledService(plan);
    const isDisabled = isCurrent || isEnrolled;

    return (
      <motion.div
        key={plan._id}
        whileHover={isDisabled ? {} : { y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}
        onClick={() => { if (!isDisabled) setSelectedPlanId(plan._id); }}
        style={{
          background: C.card,
          borderRadius: 16,
          border: `2px solid ${isSelected ? C.primary : C.border}`,
          boxShadow: isSelected ? `0 0 0 4px ${C.primaryBg}, 0 8px 32px ${C.primaryShadow}` : '0 2px 8px rgba(0,0,0,0.04)',
          padding: 0,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          display: 'flex',
          flexDirection: 'column',
          opacity: isDisabled ? 0.55 : 1,
        }}
      >
        {/* Category badge — Bronze/Silver/Gold get tier colors, services get category colors */}
        {(() => {
          const tierColors = {
            Bronze: { bg: 'rgba(176,121,59,0.14)', color: '#8a5a22', border: 'rgba(176,121,59,0.22)' },
            Silver: { bg: 'rgba(138,155,168,0.18)', color: '#5a6b7a', border: 'rgba(138,155,168,0.25)' },
            Gold:   { bg: 'rgba(201,162,39,0.18)', color: '#8a6d00', border: 'rgba(201,162,39,0.30)' },
          };
          const svcColors = {
            Membership: { bg: C.greenBg, color: C.green, border: 'rgba(22,163,74,0.18)' },
            Daily: { bg: 'rgba(14,165,233,0.12)', color: '#0284c7', border: 'rgba(14,165,233,0.18)' },
            Private: { bg: 'rgba(124,58,237,0.12)', color: '#6d28d9', border: 'rgba(124,58,237,0.18)' },
            'Life Stages': { bg: 'rgba(236,72,153,0.12)', color: '#be185d', border: 'rgba(236,72,153,0.18)' },
            Restore: { bg: 'rgba(16,185,129,0.12)', color: '#047857', border: 'rgba(16,185,129,0.18)' },
            Signature: { bg: 'rgba(245,158,11,0.14)', color: '#b45309', border: 'rgba(245,158,11,0.22)' },
            Academy: { bg: 'rgba(249,115,22,0.12)', color: '#c2410c', border: 'rgba(249,115,22,0.18)' },
            Corporate: { bg: 'rgba(71,85,105,0.10)', color: '#334155', border: 'rgba(71,85,105,0.18)' },
          };
          let tagStyle, tagLabel, tagIcon;
          if (!isService) {
            const t = tierColors[plan.name] || { bg: C.cream, color: C.text2, border: C.border };
            tagStyle = t;
            tagLabel = plan.name;
            tagIcon = <LuCrown size={10} />;
          } else {
            const c = svcColors[plan.category] || { bg: C.blueBg, color: C.blue, border: 'rgba(37,99,235,0.15)' };
            tagStyle = c;
            tagLabel = plan.category || plan.typeLabel || 'Service';
            tagIcon = <LuSparkles size={10} />;
          }
          return (
            <div style={{
              position: 'absolute', top: 10, right: 10,
              background: tagStyle.bg,
              color: tagStyle.color,
              border: `1px solid ${tagStyle.border}`,
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.05em', padding: '3px 8px', borderRadius: 20,
              display: 'flex', alignItems: 'center', gap: 4, zIndex: 1,
            }}>
              {tagIcon}{tagLabel}
            </div>
          );
        })()}

        {plan.isPopular && !isDisabled && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: C.primary, color: '#fff',
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', padding: '4px 8px', borderRadius: 20,
          }}>
            POPULAR
          </div>
        )}

        {isCurrent && (
          <div style={{
            position: 'absolute', top: plan.isPopular ? 36 : 10, left: 10,
            background: C.dark, color: '#fff',
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.04em', padding: '4px 8px', borderRadius: 20,
            opacity: 0.9,
          }}>
            CURRENT PLAN
          </div>
        )}
        {isEnrolled && !isCurrent && (
          <div style={{
            position: 'absolute', top: plan.isPopular ? 36 : 10, left: 10,
            background: C.green, color: '#fff',
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.04em', padding: '4px 8px', borderRadius: 20,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <LuBadgeCheck size={10} /> Already Enrolled
          </div>
        )}

        {isSelected && !isDisabled && (
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

        <div style={{ padding: '38px 20px 16px', flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 4, paddingRight: 80, lineHeight: 1.3 }}>
            {plan.name}
          </div>
          <div style={{ fontSize: 10, color: C.text3, marginBottom: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {plan.typeLabel && <span style={{ background: 'rgba(45,20,6,0.06)', padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>{plan.typeLabel}</span>}
            {plan.mode && <span style={{ background: C.cream, border: `1px solid ${C.border}`, padding: '2px 6px', borderRadius: 6 }}>{plan.mode}</span>}
          </div>
          {plan.description && (
            <div style={{ fontSize: 11, color: C.text3, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
              {plan.description}
            </div>
          )}

          <div style={{ fontSize: 24, fontWeight: 800, color: C.dark, marginBottom: 4 }}>
            {formatPrice(plan.price)}
            <span style={{ fontSize: 12, fontWeight: 400, color: C.text2 }}> / {plan.durationLabel}</span>
          </div>
          {isService && plan.sessions > 0 && (
            <div style={{ fontSize: 11, color: C.blue, fontWeight: 600 }}>{plan.sessions} sessions</div>
          )}
          {plan.pauseDays > 0 && (
            <div style={{ ...row, gap: 4, fontSize: 11, color: C.text2, marginTop: 6 }}>
              <LuClock size={11} />
              {plan.pauseDays} pause days
            </div>
          )}
        </div>

        <div style={{ padding: '0 20px 14px', borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          {(plan.features?.length > 0 || plan.benefits?.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {(plan.features?.length ? plan.features : plan.benefits).slice(0, 3).map((f, i) => (
                <div key={i} style={{ ...row, gap: 6, fontSize: 11.5, color: C.dark }}>
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: isService ? C.blue : C.primary, flexShrink: 0 }} />
                  {typeof f === 'string' ? f.slice(0, 60) : f}
                </div>
              ))}
            </div>
          )}
        </div>

        {isDisabled && (
          <div style={{ padding: '8px 20px', borderTop: `1px solid ${C.border}`, textAlign: 'center', background: isEnrolled ? 'rgba(22,163,74,0.06)' : 'rgba(45,20,6,0.04)' }}>
            <div style={{ fontSize: 11, color: isEnrolled ? C.green : C.text2, fontWeight: 600 }}>{isEnrolled ? 'Already enrolled — cannot select again' : 'Current plan — select another to renew'}</div>
          </div>
        )}
      </motion.div>
    );
  };

  const SectionHeader = ({ icon, title, count, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 12px', paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: color || C.cream, border: `1px solid ${C.border}`, display: 'grid', placeItems: 'center', color: C.dark }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 13, color: C.dark }}>{title}</div>
      <span style={{ fontSize: 11, background: C.cream, border: `1px solid ${C.border}`, padding: '2px 8px', borderRadius: 20, color: C.text2 }}>{count} items</span>
    </div>
  );

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
            padding: '20px 32px',
            borderBottom: `1px solid ${C.border}`,
            background: C.card,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
            <div>
              <div style={{ fontSize: 13, color: C.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <LuRefreshCw size={14} /> Renew — All Plans & Services
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11, color: C.text2, marginTop: 8 }}>
                <div>
                  <span style={{ color: C.text3 }}>Student: </span>
                  <span style={{ fontWeight: 600, color: C.dark }}>{student?.name || '—'}</span>
                </div>
                <div>
                  <span style={{ color: C.text3 }}>Current Plan: </span>
                  <span style={{ fontWeight: 600, color: C.dark }}>{membership?.planType || 'No plan'}</span>
                </div>
                <div>
                  <span style={{ color: C.text3 }}>Status: </span>
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

          {/* Filter Bar */}
          <div style={{ padding: '14px 32px', borderBottom: `1px solid ${C.border}`, background: C.card, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
              <LuSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.text3 }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search all plans & services…"
                style={{
                  width: '100%', padding: '9px 12px 9px 34px', border: `1px solid ${C.border}`, borderRadius: 10,
                  fontSize: 12.5, color: C.dark, background: C.cream, outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = C.primary}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: C.text3, fontWeight: 600 }}>Filter:</span>
              {[
                { id: 'all', label: 'All', count: plans.length },
                { id: 'membership', label: 'Membership', count: plans.filter(p=>p.source==='plan').length },
                { id: 'service', label: 'Services', count: plans.filter(p=>p.source==='service').length },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 20, border: `1px solid ${filterType===f.id?C.primary:C.border}`,
                    background: filterType===f.id ? C.primary : C.card,
                    color: filterType===f.id ? '#fff' : C.text2,
                    fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {f.label} <span style={{ opacity: 0.8, marginLeft: 4, background: filterType===f.id ? 'rgba(255,255,255,0.2)' : C.cream, padding: '1px 6px', borderRadius: 10, fontSize: 10 }}>{f.count}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
              <span style={{ fontSize: 11, color: C.text3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><LuArrowUpDown size={11} /> Sort:</span>
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                style={{
                  padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 10,
                  fontSize: 11.5, color: C.dark, background: C.card, outline: 'none', cursor: 'pointer',
                }}
              >
                <option value="low-high">Price: Low to High</option>
                <option value="high-low">Price: High to Low</option>
              </select>
            </div>
            <div style={{ fontSize: 11, color: C.text3 }}>
              {filteredPlans.length} of {plans.length}
            </div>
          </div>

          {/* Body — separated membership / service sections for clarity */}
          <div style={{ flex: 1, overflow: 'auto', padding: '20px 32px' }}>
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
                <div style={{ color: C.text2, fontSize: 14 }}>Loading all plans & services…</div>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: C.text3 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark, marginBottom: 6 }}>{search ? 'No matching plans' : 'No plans available'}</div>
                <div style={{ fontSize: 12 }}>{search ? `No plans match "${search}".` : 'No active plans or services found.'}</div>
                {search && <button type="button" onClick={() => setSearch('')} style={{ marginTop: 12, padding: '8px 16px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, cursor: 'pointer', fontSize: 12, color: C.text2 }}>Clear search</button>}
              </div>
            ) : filterType === 'all' ? (
              <>
                <SectionHeader icon={<LuCrown size={14} />} title="Membership — Bronze / Silver / Gold" count={filteredMembership.length} color={C.cream} />
                {filteredMembership.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.text3, textAlign: 'center', padding: 16, border: `1px dashed ${C.border}`, borderRadius: 12, background: C.card }}>No membership plans match your filter.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16, marginBottom: 8 }}>
                    {filteredMembership.map(renderPlanCard)}
                  </div>
                )}
                <SectionHeader icon={<LuSparkles size={14} />} title="Services — by category" count={filteredServices.length} color={C.blueBg} />
                {filteredServices.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.text3, textAlign: 'center', padding: 16, border: `1px dashed ${C.border}`, borderRadius: 12, background: C.card }}>No services match your filter.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
                    {filteredServices.map(renderPlanCard)}
                  </div>
                )}
              </>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: 16,
              }}>
                {filteredPlans.map(renderPlanCard)}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '14px 32px',
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
              {busy ? 'Processing…' : selectedPlan?.source === 'service' ? 'Assign Service' : 'Renew Membership'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
