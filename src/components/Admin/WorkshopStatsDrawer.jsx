import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import Badge from './Badge';
import {
  LuX, LuUsers, LuClock, LuCalendar, LuCheck, LuFileText,
  LuLink, LuBadgeCheck, LuTrendingUp, LuSearch, LuArrowUpDown,
  LuChevronLeft, LuChevronRight, LuIndianRupee, LuAward,
  LuMapPin, LuVideo, LuBookOpen,
} from 'react-icons/lu';

/* ─── Design tokens ─────────────────────────────────────── */
const C = {
  cream: '#F8F4EC', card: '#FFFFFF', border: '#E7D7BE',
  primary: '#2E7D5B', primaryLight: '#81B29A',
  primaryBg: 'rgba(46,125,91,0.10)', primaryShadow: 'rgba(46,125,91,0.25)',
  dark: '#2D1406', text2: '#6B5E4E', text3: '#9C8E7C',
  green: '#16A34A', greenBg: 'rgba(22,163,74,0.10)',
  amber: '#D97706', amberBg: 'rgba(217,119,6,0.10)',
  blue: '#2563EB', blueBg: 'rgba(37,99,235,0.10)',
  red: '#DC2626', redBg: 'rgba(220,38,38,0.10)',
};

/* ─── Style helpers ─────────────────────────────────────── */
const row = { display: 'flex', alignItems: 'center', gap: 8 };
const flexCenter = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const cardSt = {
  background: C.card, borderRadius: 20, border: `1px solid ${C.border}`,
  padding: 24,
};
const iconBox = (bg = C.primaryBg) => ({
  width: 40, height: 40, borderRadius: 12, ...flexCenter, fontSize: 18, background: bg, flexShrink: 0,
});

/* ─── Helpers ───────────────────────────────────────────── */
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const statusMeta = (wk) => {
  if (wk.archived) return { label: 'Archived', color: C.blue, bg: C.blueBg };
  if (wk.status === 'completed') return { label: 'Completed', color: C.green, bg: C.greenBg };
  if (wk.isPublished) return { label: 'Published', color: C.green, bg: C.greenBg };
  return { label: 'Draft', color: C.amber, bg: C.amberBg };
};

/* ─── Drawer Shell ──────────────────────────────────────── */
function Drawer({ open, onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) { document.addEventListener('keydown', handler); document.body.style.overflow = 'hidden'; }
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', justifyContent: 'flex-end' }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            style={{
              position: 'relative', width: 1020, maxWidth: '100vw', height: '100vh',
              background: C.cream, display: 'flex', flexDirection: 'column',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
            }}
          >
            <div style={{ flex: 1, overflow: 'hidden auto' }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ─── Metric Card ───────────────────────────────────────── */
function MetricCard({ icon, value, label, color = C.primary, subtitle }) {
  return (
    <div style={{
      ...cardSt, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16,
      transition: 'transform .15s, box-shadow .15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={iconBox(`${color}1A`)}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.dark, lineHeight: 1.2 }}>{value ?? '—'}</div>
        <div style={{ fontSize: 12, color: C.text2, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        {subtitle && <div style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

/* ─── Section Card ──────────────────────────────────────── */
function SectionCard({ icon, title, children, extra }) {
  return (
    <div style={{ ...cardSt, marginBottom: 16, ...extra }}>
      {title && (
        <div style={{ ...row, marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
          <div style={iconBox(C.primaryBg)}>{icon}</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{title}</div>
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Info Row ──────────────────────────────────────────── */
function InfoRow({ icon, label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
      borderBottom: '1px solid rgba(231,215,190,0.4)',
    }}>
      <div style={{ width: 18, color: C.primary, flexShrink: 0, ...flexCenter }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: C.dark, fontWeight: 500 }}>{value || '—'}</div>
      </div>
    </div>
  );
}

/* ─── Timeline Item ─────────────────────────────────────── */
function TimelineItem({ icon, time, title, meta, color = C.primary }) {
  return (
    <div style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: '1px solid rgba(231,215,190,0.3)' }}>
      <div style={{ ...iconBox(`${color}1A`), width: 36, height: 36, fontSize: 15 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.dark }}>{title}</div>
        {meta && <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{meta}</div>}
      </div>
      {time && <div style={{ fontSize: 11, color: C.text3, whiteSpace: 'nowrap', flexShrink: 0 }}>{time}</div>}
    </div>
  );
}

/* ─── Plan Pill ─────────────────────────────────────────── */
function PlanPill({ name }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 12px', borderRadius: 20,
      background: C.primaryBg, color: C.primary,
      fontSize: 12, fontWeight: 600, border: `1px solid rgba(46,125,91,0.2)`,
      whiteSpace: 'nowrap',
    }}>
      <LuBadgeCheck size={12} />
      {name}
    </span>
  );
}

/* ─── Status Badge ──────────────────────────────────────── */
function StatusBadge({ wk }) {
  const m = statusMeta(wk);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700,
      background: m.bg, color: m.color,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.color }} />
      {m.label}
    </span>
  );
}

/* ─── Main Component ────────────────────────────────────── */
export default function WorkshopStatsDrawer({ open, statsData, statsLoading, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const perPage = 8;

  useEffect(() => {
    if (!open) { setSearchQuery(''); setSortField(''); setSortDir('asc'); setPage(1); }
  }, [open]);

  const wk = statsData?.workshop;
  const st = statsData?.stats;

  const filtered = useMemo(() => {
    if (!statsData?.registrations) return [];
    let list = [...statsData.registrations];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        (r.user?.name || '').toLowerCase().includes(q) ||
        (r.user?.email || '').toLowerCase().includes(q)
      );
    }
    if (sortField) {
      list.sort((a, b) => {
        let av, bv;
        if (sortField === 'name') { av = a.user?.name || ''; bv = b.user?.name || ''; }
        else if (sortField === 'email') { av = a.user?.email || ''; bv = b.user?.email || ''; }
        else if (sortField === 'plan') { av = a.planType || ''; bv = b.planType || ''; }
        else if (sortField === 'date') { av = a.at || ''; bv = b.at || ''; }
        else if (sortField === 'payment') { av = a.paid ? '1' : '0'; bv = b.paid ? '1' : '0'; }
        else if (sortField === 'status') { av = a.attended ? '1' : '0'; bv = b.attended ? '1' : '0'; }
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : (av > bv ? 1 : -1);
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [statsData, searchQuery, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const handleSort = (field) => {
    if (sortField === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <LuArrowUpDown size={11} style={{ opacity: 0.3 }} />;
    return <LuChevronRight size={11} style={{ transform: sortDir === 'asc' ? 'rotate(-90deg)' : 'rotate(90deg)', color: C.primary }} />;
  };

  /* ─── Loading state ────────────────────────────────────── */
  if (statsLoading) {
    return (
      <Drawer open={open} onClose={onClose}>
        <div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 20, borderRadius: 10, background: 'rgba(231,215,190,0.3)', animation: 'shimmer 1.2s infinite', backgroundImage: 'linear-gradient(90deg, rgba(231,215,190,0.3) 25%, rgba(231,215,190,0.5) 50%, rgba(231,215,190,0.3) 75%)', backgroundSize: '200% 100%' }} />
          ))}
        </div>
      </Drawer>
    );
  }

  if (!wk || !st) return null;

  return (
    <Drawer open={open} onClose={onClose}>
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ padding: '32px 36px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h2 style={{
                margin: 0, fontSize: 24, fontWeight: 800, color: C.dark,
                fontFamily: "'Outfit', 'Inter', sans-serif", letterSpacing: '-0.02em',
              }}>{wk.name}</h2>
              <StatusBadge wk={wk} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: C.text2, lineHeight: 1.5 }}>
              {fmtDate(wk.date)}{wk.startTime ? ` · ${wk.startTime}${wk.endTime ? ` – ${wk.endTime}` : ''}` : ''}
              {wk.instructor ? ` · ${wk.instructor}` : ''}
              {wk.isPaid ? ` · KES ${(wk.price || 0).toLocaleString('en-KE')}` : ' · Free'}
              {wk.capacity ? ` · Capacity: ${wk.capacity}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} style={{
            ...flexCenter, width: 36, height: 36, borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer',
            color: C.text2, fontSize: 18, flexShrink: 0,
            transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = C.cream; e.currentTarget.style.color = C.dark; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.color = C.text2; }}
          >
            <LuX />
          </button>
        </div>
      </div>

      <div style={{ padding: '0 36px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Analytics Metrics ──────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
        }}>
          <MetricCard icon={<LuUsers size={20} />} value={st.totalRegistrations ?? 0} label="Total Registrations" color={C.primary} subtitle={wk.capacity ? `of ${wk.capacity} capacity` : ''} />
          <MetricCard icon={<LuCheck size={20} />} value={st.paidRegistrations ?? 0} label="Paid Enrollments" color={C.green} subtitle={st.totalRegistrations > 0 ? `${Math.round((st.paidRegistrations / st.totalRegistrations) * 100)}% paid` : ''} />
          <MetricCard icon={<LuClock size={20} />} value={st.remainingSeats ?? 0} label="Remaining Seats" color={C.blue} subtitle={wk.capacity ? `${Math.round((st.remainingSeats / wk.capacity) * 100)}% available` : ''} />
          <MetricCard icon={<LuTrendingUp size={20} />} value={`${st.enrollmentPct ?? 0}%`} label="Enrollment Rate" color={C.amber} subtitle={wk.capacity ? `${st.totalRegistrations ?? 0} / ${wk.capacity}` : ''} />
          <MetricCard icon={<LuIndianRupee size={20} />} value={wk.isPaid ? `KES ${(wk.price || 0).toLocaleString('en-KE')}` : 'Free'} label="Workshop Price" color={C.primary} />
          <MetricCard icon={<LuAward size={20} />} value={`KES ${(st.totalRevenue || 0).toLocaleString('en-KE')}`} label="Total Revenue" color={C.green} subtitle={`${st.paidRegistrations ?? 0} × KES ${(wk.price || 0).toLocaleString('en-KE')}`} />
        </div>

        {/* ── Workshop Information ───────────────────────────── */}
        <SectionCard icon={<LuFileText size={18} />} title="Workshop Information">
          {wk.description && (
            <InfoRow icon={<LuBookOpen size={14} />} label="Description" value={wk.description} />
          )}
          <InfoRow icon={<LuCalendar size={14} />} label="Date" value={fmtDate(wk.date)} />
          {wk.startTime && (
            <InfoRow icon={<LuClock size={14} />} label="Time" value={`${wk.startTime}${wk.endTime ? ` – ${wk.endTime}` : ''}`} />
          )}
          {wk.duration && (
            <InfoRow icon={<LuClock size={14} />} label="Duration" value={wk.duration} />
          )}
          {wk.instructor && (
            <InfoRow icon={<LuUsers size={14} />} label="Instructor" value={wk.instructor} />
          )}
          <InfoRow icon={<LuVideo size={14} />} label="Capacity" value={`${wk.capacity} seats`} />
          {wk.zoomLink && (
            <InfoRow icon={<LuLink size={14} />} label="Meeting Link" value={
              <a href={wk.zoomLink} target="_blank" rel="noopener noreferrer" style={{ color: C.primary, fontWeight: 600, textDecoration: 'none' }}>
                {wk.zoomLink}
              </a>
            } />
          )}
          <InfoRow icon={<LuMapPin size={14} />} label="Status" value={
            <StatusBadge wk={wk} />
          } />
          <InfoRow icon={<LuCalendar size={14} />} label="Created" value={fmtDateTime(wk.createdAt)} />
          {wk.publishedAt && (
            <InfoRow icon={<LuCalendar size={14} />} label="Published" value={fmtDateTime(wk.publishedAt)} />
          )}
          {wk.registrationDeadline && (
            <InfoRow icon={<LuClock size={14} />} label="Registration Deadline" value={fmtDate(wk.registrationDeadline)} />
          )}
          {wk.isPaid && (
            <InfoRow icon={<LuIndianRupee size={14} />} label="Price" value={`KES ${(wk.price || 0).toLocaleString('en-KE')}`} />
          )}
        </SectionCard>

        {/* ── Eligible Plans ─────────────────────────────────── */}
        <SectionCard icon={<LuBadgeCheck size={18} />} title="Eligible Membership Plans">
          {st.eligiblePlans?.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {st.eligiblePlans.map(p => <PlanPill key={p} name={p} />)}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13.5, color: C.text3 }}>All students can access this workshop (no plan restriction).</p>
          )}
        </SectionCard>

        {/* ── Activity Timeline ──────────────────────────────── */}
        {statsData.activityTimeline?.length > 0 && (
          <SectionCard icon={<LuClock size={18} />} title="Activity Timeline">
            {statsData.activityTimeline.map((evt, i) => (
              <TimelineItem
                key={i}
                icon={i === 0 ? <LuCalendar size={14} /> : i === 1 ? <LuBadgeCheck size={14} /> : <LuUsers size={14} />}
                title={evt.event}
                meta={fmtDateTime(evt.date)}
                color={i === 0 ? C.blue : i === 1 ? C.green : C.primary}
              />
            ))}
          </SectionCard>
        )}

        {/* ── Registered Students ────────────────────────────── */}
        <SectionCard icon={<LuUsers size={18} />} title={`Registered Students (${statsData.registrations?.length || 0})`}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <LuSearch size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.text3 }} />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              style={{
                width: '100%', padding: '11px 16px 11px 40px', borderRadius: 12,
                border: `1px solid ${C.border}`, fontSize: 13, color: C.dark,
                background: C.card, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit', transition: 'border-color .15s',
              }}
              onFocus={e => e.target.style.borderColor = C.primary}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>

          {(!statsData.registrations || statsData.registrations.length === 0) ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: C.text3, fontSize: 13.5 }}>
              <LuUsers size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ margin: 0 }}>No registrations yet.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: C.text3, fontSize: 13.5 }}>
              No results match your search.
            </div>
          ) : (
            <>
              {/* Table */}
              <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${C.border}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: C.cream }}>
                      <Th sortable onClick={() => handleSort('name')}><SortIcon field="name" /> Student Name</Th>
                      <Th sortable onClick={() => handleSort('email')}><SortIcon field="email" /> Email</Th>
                      <Th sortable onClick={() => handleSort('plan')}><SortIcon field="plan" /> Membership Plan</Th>
                      <Th sortable onClick={() => handleSort('date')}><SortIcon field="date" /> Registration Date</Th>
                      <Th sortable onClick={() => handleSort('payment')}><SortIcon field="payment" /> Payment</Th>
                      <Th sortable onClick={() => handleSort('status')}><SortIcon field="status" /> Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((reg, i) => (
                      <tr key={reg._id || i} style={{
                        borderBottom: '1px solid rgba(231,215,190,0.3)',
                        transition: 'background .15s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = C.cream}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <Td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%',
                              background: C.primaryBg, color: C.primary,
                              ...flexCenter, fontSize: 11, fontWeight: 700, flexShrink: 0,
                            }}>
                              {(reg.user?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, color: C.dark }}>{reg.user?.name || 'Unknown'}</span>
                          </div>
                        </Td>
                        <Td style={{ color: C.text2 }}>{reg.user?.email || '—'}</Td>
                        <Td><PlanPill name={reg.planType || '—'} /></Td>
                        <Td style={{ color: C.text2, whiteSpace: 'nowrap' }}>{reg.at ? fmtDate(reg.at) : '—'}</Td>
                        <Td>
                          <Pill color={reg.paid ? C.green : C.amber} bg={reg.paid ? C.greenBg : C.amberBg}>
                            {reg.paid ? 'Paid' : 'Pending'}
                          </Pill>
                        </Td>
                        <Td>
                          <Pill color={reg.attended ? C.green : C.text3} bg={reg.attended ? C.greenBg : 'rgba(156,142,124,0.1)'}>
                            {reg.attended ? 'Enrolled' : 'Registered'}
                          </Pill>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <span style={{ fontSize: 12, color: C.text3 }}>
                  Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <PageBtn disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <LuChevronLeft size={14} />
                  </PageBtn>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <PageBtn key={p} active={p === page} onClick={() => setPage(p)}>
                      {p}
                    </PageBtn>
                  ))}
                  <PageBtn disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                    <LuChevronRight size={14} />
                  </PageBtn>
                </div>
              </div>
            </>
          )}
        </SectionCard>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </Drawer>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */
function Th({ children, sortable, onClick }) {
  return (
    <th onClick={sortable ? onClick : undefined} style={{
      padding: '11px 14px', textAlign: 'left', fontSize: 10.5,
      fontWeight: 700, color: C.text3, textTransform: 'uppercase',
      letterSpacing: '0.05em', whiteSpace: 'nowrap',
      cursor: sortable ? 'pointer' : 'default',
      userSelect: 'none',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
      </span>
    </th>
  );
}

function Td({ children, style: extra }) {
  return (
    <td style={{ padding: '10px 14px', fontSize: 12.5, ...extra }}>{children}</td>
  );
}

function Pill({ children, color = C.primary, bg = C.primaryBg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      background: bg, color, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {children}
    </span>
  );
}

function PageBtn({ children, active, disabled, onClick }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} style={{
      ...flexCenter, width: 30, height: 30, borderRadius: 8,
      border: active ? 'none' : `1px solid ${C.border}`,
      background: active ? C.primary : C.card,
      color: active ? '#fff' : C.text2,
      fontSize: 12, fontWeight: active ? 700 : 500,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'all .15s',
    }}>
      {children}
    </button>
  );
}
