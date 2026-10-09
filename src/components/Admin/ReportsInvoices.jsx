import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import s from './YogaAdmin.module.css';
import Badge from './Badge';
import { PageHeader, KpiCard, ChartCard, AreaChart, BarChart, Donut, Avatar } from './ui/Primitives';
import { LuReceipt, LuClock, LuCoins, LuWallet, LuSearch, LuX, LuExternalLink, LuCopy, LuSend, LuUser, LuMail, LuPhone, LuFileText, LuShoppingCart, LuCheck, LuCircleX, LuInfo } from 'react-icons/lu';
import { getAdminOrders, getAdminOrderDetail } from '../api/AdminServices.js';
import InvoiceView from '../shared/InvoiceView.jsx';
import { QuickDrawer, SectionCard as QCard, FieldGroup as QField, DrawerFooter } from './QuickActionModals.jsx';

// Read-only value cell matching the Add-User field look.
const InfoVal = ({ children, mono, strong, green, large }) => (
  <div style={{
    fontSize: large ? 16 : 14, fontWeight: strong || large ? 800 : 600,
    color: green ? '#2E7D5B' : '#2D1406', overflowWrap: 'anywhere', lineHeight: 1.5,
    ...(mono ? { fontFamily: 'monospace', fontSize: 12.5 } : {}),
  }}>
    {children}
  </div>
);

// Tiny inline copy chip for IDs / refs.
const CopyChip = ({ text, label, onCopy }) => (
  <button type="button" onClick={() => onCopy(text, label)} title={`Copy ${label}`}
    style={{ marginLeft: 8, padding: '3px 7px', borderRadius: 7, border: '1px solid rgba(46,125,91,0.25)', background: 'rgba(46,125,91,0.07)', color: '#2E7D5B', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
    <LuCopy size={11} />
  </button>
);

const STATUS_LABEL = { paid: 'Settled', pending: 'Pending', failed: 'Failed', refunded: 'Refunded' };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtPrice = (n) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;

const TYPE_LABELS = {
  plan: 'Membership', service: 'Service', course: 'Course',
  workshop: 'Workshop', consultation: 'Consultation',
};

// Timeline helpers: raw ActivityLog actions (payment_verified, …) become
// human rows with a category icon + key meta (invoice / order / ref).
const prettyAction = (a = '') => String(a).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const timeAgo = (d) => {
  if (!d) return '';
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86400);
  return days === 1 ? 'yesterday' : `${days}d ago`;
};
const timelineTone = (action = '') => {
  const a = String(action).toLowerCase();
  if (/cancel|fail|expire|error/.test(a)) return { bg: 'rgba(220,38,38,0.10)', fg: '#B91C1C', Icon: LuX };
  if (/payment|verif|paid|captured|invoice/.test(a)) return { bg: 'rgba(22,163,74,0.12)', fg: '#15803d', Icon: LuCheck };
  if (/notif|resent|remind|email|send/.test(a)) return { bg: 'rgba(217,119,6,0.12)', fg: '#B45309', Icon: LuSend };
  if (/order|checkout|enrol|purchase|cart/.test(a)) return { bg: 'rgba(46,125,91,0.12)', fg: '#2E7D5B', Icon: LuShoppingCart };
  return { bg: 'rgba(107,114,128,0.12)', fg: '#6b7280', Icon: LuInfo };
};
const timelineMeta = (entry = {}) => {
  const m = entry.meta || {};
  const bits = [];
  if (m.invoiceNo) bits.push(`Invoice ${m.invoiceNo}`);
  if (m.orderNumber) bits.push(`Order ${m.orderNumber}`);
  if (m.confirmationCode) bits.push(`Ref ${String(m.confirmationCode).slice(0, 18)}`);
  else if (m.merchantReference) bits.push(`Ref ${String(m.merchantReference).slice(0, 18)}`);
  return bits.join('  ·  ');
};

// Raw Payment.paymentStatus → human label for the detail drawer.
const payStatusLabel = (st) => (
  { captured: 'Paid', pending: 'Pending', initiated: 'Initiated', failed: 'Failed', expired: 'Expired', refunded: 'Refunded', refunding: 'Refunding' }[st] || st || '—'
);

const PAGE_LIMIT = 15;

// ── Payment normalisation ─────────────────────────────────────
// getPayments returns raw Payment docs: amount in MINOR units (cents),
// status in `paymentStatus` (captured/pending/initiated/failed/...),
// date in `createdAt`. Charts/KPIs need major units + canonical status.
// Already-normalised shapes ({status, date, major amount}) pass through.
const PAY_STATUS_MAP = {
  captured: 'paid', pending: 'pending', initiated: 'pending',
  failed: 'failed', expired: 'failed', refunded: 'refunded', refunding: 'pending',
};
function normalizePayments(list = []) {
  return (list || []).map((p) => {
    const isRaw = p.paymentStatus !== undefined || p.merchant_reference !== undefined;
    return {
      ...p,
      date: p.date || p.createdAt || null,
      status: p.status || PAY_STATUS_MAP[p.paymentStatus] || p.paymentStatus || 'pending',
      amount: isRaw ? (Number(p.amount) || 0) / 100 : (Number(p.amount) || 0),
    };
  });
}

function monthlyBuckets(payments = []) {
  const buckets = {};
  for (const p of payments) {
    if (!p.date) continue;
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!buckets[key]) buckets[key] = { total: 0, count: 0, paid: 0 };
    if (p.status === 'paid') {
      buckets[key].total += p.amount || 0;
      buckets[key].paid += 1;
    }
    buckets[key].count += 1;
  }
  return buckets;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function downloadCsv(filename, rows) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  const bg = type === 'success' ? 'linear-gradient(135deg, #059669, #10B981)' : type === 'error' ? 'linear-gradient(135deg, #DC2626, #EF4444)' : 'linear-gradient(135deg, #D97706, #F59E0B)';
  const icon = type === 'success' ? <LuCheck size={14} /> : type === 'error' ? <LuCircleX size={14} /> : <LuInfo size={14} />;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      padding: '10px 18px', borderRadius: 10, background: bg,
      color: '#fff', fontSize: 12, fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      fontFamily: "'Inter', sans-serif",
    }}>
      {icon}{message}
    </div>
  );
}

export default function ReportsInvoices({ payments = [], metrics = {}, onViewStudent }) {
  const currentYear = new Date().getFullYear();
  const [reportYear, setReportYear] = useState(currentYear);
  const [reportMonth, setReportMonth] = useState('all');

  // Normalised once: major-unit amounts, canonical statuses, real dates.
  const normPayments = useMemo(() => normalizePayments(payments), [payments]);

  const availableYears = useMemo(() => {
    const years = new Set([currentYear]);
    for (const p of normPayments) {
      if (p.date) years.add(new Date(p.date).getFullYear());
    }
    return [...years].sort((a, b) => b - a);
  }, [normPayments, currentYear]);

  const { collected, pending, count, byStatus, monthlyRev, monthlyCount, monthlyRate } = useMemo(() => {
    let collected = 0, pending = 0;
    const byStatus = { paid: 0, pending: 0, failed: 0, refunded: 0 };
    for (const p of normPayments) {
      if (p.status === 'paid') collected += p.amount || 0;
      else if (p.status === 'pending') pending += p.amount || 0;
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    }
    const buckets = monthlyBuckets(normPayments);
    const monthlyRev = MONTHS.map((_, i) => {
      const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
      return buckets[key]?.total || 0;
    });
    const monthlyCount = MONTHS.map((_, i) => {
      const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
      return buckets[key]?.count || 0;
    });
    // Real collection rate: % of invoices settled per month (by count).
    const monthlyRate = MONTHS.map((_, i) => {
      const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
      const b = buckets[key];
      if (!b || !b.count) return 0;
      return Math.round(((b.paid || 0) / b.count) * 100);
    });
    return { collected, pending, count: normPayments.length, byStatus, monthlyRev, monthlyCount, monthlyRate };
  }, [normPayments, reportYear]);

  // metrics.revenue is stored in minor units — only a fallback when the
  // payments list itself is empty.
  const revenue = normPayments.length ? collected : (metrics.revenue ? Number(metrics.revenue) / 100 : collected);

  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pmFilter, setPmFilter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [toast, setToast] = useState(null);
  const [resending, setResending] = useState(false);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const buildDateFilter = useCallback((range) => {
    const now = new Date();
    switch (range) {
      case 'today': return { dateFrom: now.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
      case 'week': {
        const start = new Date(now); start.setDate(start.getDate() - start.getDay());
        return { dateFrom: start.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { dateFrom: start.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
      }
      default: return {};
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = { page, limit: PAGE_LIMIT };
      if (search.trim()) params.search = search.trim();
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (pmFilter) params.paymentMethod = pmFilter;
      if (dateRange) {
        const df = buildDateFilter(dateRange);
        if (df.dateFrom) params.dateFrom = df.dateFrom;
        if (df.dateTo) params.dateTo = df.dateTo;
      }
      const res = await getAdminOrders(params);
      setOrders(res.orders || []);
      setTotalOrders(res.total || 0);
      setPages(res.pages || 0);
    } catch (err) {
      setOrders([]);
      setLoadError(err?.message || 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter, pmFilter, dateRange, buildDateFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter, pmFilter, dateRange]);

  // Escape closes the topmost layer. NOTE: body scroll-lock lives ONLY in
  // QuickDrawer — a second locker here raced it on unmount (child restores
  // '' first, parent then restored 'hidden'), permanently freezing page
  // scroll everywhere until reload. Never lock body overflow from this file.
  useEffect(() => {
    if (selectedOrder || detailLoading || showInvoice) {
      const onKey = (e) => {
        if (e.key === 'Escape') {
          if (showInvoice) setShowInvoice(false);
          else closeDetail();
        }
      };
      window.addEventListener('keydown', onKey);
      return () => { window.removeEventListener('keydown', onKey); };
    }
  }, [selectedOrder, detailLoading, showInvoice]);

  // Debounce the ledger search so typing doesn't hammer the API on every
  // keystroke. Matches invoice no, order no, transaction / payment ref,
  // student name + email, item name and coupon (backend listAllOrders).
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [openingId, setOpeningId] = useState(null);
  // Instant-open: paint the modal immediately from the ledger row (it already
  // carries orderNumber, total, status, student, items and payment), then
  // enrich with coupon/enrollments/timeline when the detail API resolves.
  // The popup never sits on an empty "Loading…" card again.
  const openDetail = async (orderId) => {
    const row = orders.find((o) => String(o._id) === String(orderId));
    if (row) setSelectedOrder(row);
    setOpeningId(orderId);
    setDetailLoading(true);
    try {
      const data = await getAdminOrderDetail(orderId);
      setSelectedOrder(data);
    } catch (err) {
      if (!row) setSelectedOrder(null);
      showToast(err?.message || 'Could not open order details', 'error');
    } finally {
      setDetailLoading(false);
      setOpeningId(null);
    }
  };

  const closeDetail = () => { setSelectedOrder(null); setShowInvoice(false); };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied successfully`);
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleResendNotification = async () => {
    if (!selectedOrder) return;
    setResending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/orders/${selectedOrder._id}/resend-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resend notification');
      showToast('Purchase notification resent successfully');
    } catch (err) {
      showToast(err.message || 'Failed to resend notification', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {showInvoice && selectedOrder && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(45,20,6,0.55)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, overflow: 'hidden',
        }} onClick={() => setShowInvoice(false)}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 760, width: '100%', maxHeight: '92vh', overflowY: 'auto', overscrollBehavior: 'contain', borderRadius: 16 }}>
            <InvoiceView order={selectedOrder} onClose={() => setShowInvoice(false)} />
          </div>
        </div>,
        document.body,
      )}

      <PageHeader title="Revenue Analytics" subtitle="Invoice management & collection insights — live from MongoDB" />

      {/* Annual / monthly export bar */}
      <div className={`${s.card}`} style={{ marginBottom: 16, padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <strong style={{ fontSize: 13 }}>Reports:</strong>
        <select value={reportYear} onChange={(e) => setReportYear(Number(e.target.value))}
          style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, background: '#fff', cursor: 'pointer' }}
          aria-label="Report year">
          {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={reportMonth} onChange={(e) => setReportMonth(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, background: '#fff', cursor: 'pointer' }}
          aria-label="Report month">
          <option value="all">Full year (annual)</option>
          {MONTHS.map((m, i) => <option key={m} value={i}>{m} {reportYear}</option>)}
        </select>
        <button type="button" onClick={() => {
          if (reportMonth === 'all') {
            downloadCsv(`soma-annual-report-${reportYear}.csv`, [
              ['Month', 'Revenue Collected (KES)', 'Invoices'],
              ...MONTHS.map((m, i) => [m, monthlyRev[i], monthlyCount[i]]),
              ['TOTAL', monthlyRev.reduce((a, b) => a + b, 0), monthlyCount.reduce((a, b) => a + b, 0)],
            ]);
            showToast(`Annual report ${reportYear} exported`);
          } else {
            const mi = Number(reportMonth);
            const rows = normPayments.filter((p) => {
              if (!p.date) return false;
              const d = new Date(p.date);
              return d.getFullYear() === reportYear && d.getMonth() === mi;
            });
            downloadCsv(`soma-monthly-report-${reportYear}-${String(mi + 1).padStart(2, '0')}.csv`, [
              ['Date', 'Status', 'Amount (KES)'],
              ...rows.map((p) => [p.date ? new Date(p.date).toLocaleDateString('en-KE') : '', p.status || '', p.amount || 0]),
              ['TOTAL', '', rows.filter((p) => p.status === 'paid').reduce((a, p) => a + (p.amount || 0), 0)],
            ]);
            showToast(`${MONTHS[mi]} ${reportYear} report exported`);
          }
        }}
          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #2E7D5B', background: '#2E7D5B', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Export {reportMonth === 'all' ? 'Annual' : 'Monthly'} CSV
        </button>
        <button type="button" onClick={() => {
          downloadCsv(`soma-ledger-${new Date().toISOString().slice(0, 10)}.csv`, [
            ['Invoice', 'Student', 'Items', 'Coupon', 'Total (KES)', 'Method', 'Date', 'Status'],
            ...orders.map((o) => [
              o.orderNumber || String(o._id).slice(-6).toUpperCase(),
              o.student?.name || '',
              (o.items || []).map((i) => i.name).join('; '),
              o.couponCode || '',
              o.total || 0,
              o.paymentMethod || 'Manual',
              o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-KE') : '',
              o.status || '',
            ]),
          ]);
          showToast('Ledger exported');
        }}
          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
          Export Ledger CSV
        </button>
        <button type="button" onClick={() => window.print()}
          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
          Print / PDF
        </button>
      </div>

      <div className={s.statsGrid}>
        <KpiCard icon={<LuReceipt />} accent="orange" label="Total Invoices" value={count} spark={monthlyCount} />
        <KpiCard icon={<LuClock />} accent="amber" label="Pending" value={pending} prefix="KES " spark={[pending * 0.3, pending * 0.5, pending * 0.7, pending * 0.8, pending * 0.9, pending || 1]} />
        <KpiCard icon={<LuCoins />} accent="green" label="Revenue Collected" value={revenue} prefix="KES " trend="collected" trendUp spark={monthlyRev} />
        <KpiCard icon={<LuWallet />} accent="blue" label="Avg. Invoice" value={count ? Math.round(revenue / count) : 0} prefix="KES " spark={monthlyCount.length ? monthlyCount : [1, 2, 3, 4, 5, 6]} />
      </div>

      <div className={s.grid2}>
        <ChartCard title="Revenue Trend" subtitle="Monthly collected revenue"
          right={<div style={{ textAlign: 'right' }}><div className={s.chartBig}>KES {revenue.toLocaleString('en-KE')}</div><div className={s.chartSub}>total</div></div>}
          legend={[{ color: '#F97316', label: 'Revenue' }]}>
          <div style={{ color: 'var(--text-1)' }}><AreaChart labels={MONTHS} series={[{ color: '#F97316', data: monthlyRev }]} /></div>
        </ChartCard>
        <ChartCard title="Collection Rate" subtitle="% of invoices settled per month" legend={[{ color: '#16A34A', label: 'Collection %' }]}>
          <div style={{ color: 'var(--text-1)' }}><BarChart labels={MONTHS} data={monthlyRate} color="#16A34A" /></div>
        </ChartCard>
      </div>

      <div className={s.grid2}>
        <ChartCard title="Payment Status Mix" subtitle="Distribution of all invoices">
          <div style={{ display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap', color: 'var(--text-1)' }}>
            <Donut size={150} segments={[
              { value: byStatus.paid || 0, color: '#16A34A' },
              { value: byStatus.pending || 0, color: '#D97706' },
              { value: byStatus.failed || 0, color: '#DC2626' },
              { value: byStatus.refunded || 0, color: '#81B29A' },
            ]} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {[['Settled', byStatus.paid, '#16A34A'], ['Pending', byStatus.pending, '#D97706'], ['Failed', byStatus.failed, '#DC2626'], ['Refunded', byStatus.refunded, '#81B29A']].map(([lbl, val, col]) => (
                <div key={lbl} className={s.legendItem}><span className={s.legendDot} style={{ background: col }} />{lbl} <strong style={{ marginLeft: 4 }}>{val || 0}</strong></div>
              ))}
            </div>
          </div>
        </ChartCard>
        <ChartCard title="Membership vs Acquisition" subtitle="New members acquired per month" legend={[{ color: '#81B29A', label: 'New members' }]}>
          <div style={{ color: 'var(--text-1)' }}><BarChart labels={MONTHS} data={monthlyCount.length ? monthlyCount : [1, 2, 3, 4, 5, 6]} color="#81B29A" /></div>
        </ChartCard>
      </div>

      {/* Revenue Ledger */}
      <div className={`${s.card} ${s.cardNoPad}`}>
        <div style={{ padding: '16px 20px 0' }}>
          <h3 className={s.cardTitle}><span className={s.cardTitleIcon}><LuReceipt /></span>Revenue Ledger</h3>
        </div>

        <div style={{ padding: '12px 20px', display: 'flex', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <LuSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#2E7D5B' }} />
            <input placeholder="Search invoice #, order #, transaction, student, item, coupon..." value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ width: '100%', padding: '9px 34px 9px 34px', borderRadius: 10, border: searchInput ? '1.5px solid #2E7D5B' : '1px solid #e5e7eb', fontSize: 12.5, outline: 'none', background: '#fff', boxShadow: searchInput ? '0 0 0 3px rgba(46,125,91,0.10)' : 'none', transition: 'all 0.15s' }} />
            {searchInput
              ? <LuX size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', cursor: 'pointer' }} onClick={() => setSearchInput('')} />
              : (loading && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#9ca3af' }}>…</span>)}
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, background: '#fff', outline: 'none', cursor: 'pointer' }}>
            <option value="">All Types</option>
            <option value="plan">Membership</option><option value="service">Service</option><option value="course">Course</option>
            <option value="workshop">Workshop</option><option value="consultation">Consultation</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, background: '#fff', outline: 'none', cursor: 'pointer' }}>
            <option value="">All Status</option><option value="completed">Completed</option><option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option><option value="refunded">Refunded</option>
          </select>
          <select value={pmFilter} onChange={(e) => setPmFilter(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, background: '#fff', outline: 'none', cursor: 'pointer' }}>
            <option value="">All Methods</option><option value="Pesapal">Pesapal</option><option value="Free">Free</option>
            <option value="Manual">Manual</option><option value="Cash">Cash</option><option value="M-Pesa">M-Pesa</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, background: '#fff', outline: 'none', cursor: 'pointer' }}>
            <option value="">All Time</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option>
          </select>
        </div>

        {(!loading && (search || typeFilter || statusFilter || pmFilter || dateRange)) && (
          <div style={{ padding: '8px 20px 0', fontSize: 11.5, color: '#6b7280' }}>
            {totalOrders} result{totalOrders === 1 ? '' : 's'}
            {search && <> for <strong style={{ color: '#1f2937' }}>“{search}”</strong></>}
            <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setTypeFilter(''); setStatusFilter(''); setPmFilter(''); setDateRange(''); }}
              style={{ marginLeft: 10, padding: '2px 10px', borderRadius: 20, border: '1px solid #e5e7eb', background: '#fff', fontSize: 11, cursor: 'pointer', color: '#6b7280' }}>
              Clear all
            </button>
          </div>
        )}

        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr><th>Invoice</th><th>Student</th><th>Products Purchased</th><th>Coupon</th><th>Final Amount</th><th>Payment Method</th><th>Date</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className={s.tdMuted} style={{ textAlign: 'center', padding: 36 }}><span style={{ fontSize: 13 }}>Loading orders…</span></td></tr>}
              {!loading && loadError && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '44px 20px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#B91C1C', marginBottom: 4 }}>Couldn't load orders</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>{loadError}</div>
                  <button type="button" onClick={fetchOrders}
                    style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #2E7D5B, #F97316)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Retry
                  </button>
                </td></tr>
              )}
              {!loading && !loadError && orders.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '44px 20px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 4 }}>No orders found</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{search ? `Nothing matches “${search}” — try an invoice #, order #, email or item name.` : 'Orders will appear here once students check out.'}</div>
                </td></tr>
              )}
              {!loading && orders.map((o) => {
                const items = o.items || [];
                const firstItem = items[0];
                const restCount = items.length - 1;
                const invoiceNo = o.payment?.invoiceNo || '—';
                return (
                  <tr key={o._id} style={{ cursor: 'pointer' }} onClick={() => openDetail(o._id)}>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1f2937' }}>#{invoiceNo}</div>
                      <div style={{ fontSize: 10.5, color: '#9ca3af', fontFamily: 'monospace', marginTop: 1 }}>{o.orderNumber || ''}</div>
                    </td>
                    <td><div className={s.cellUser}><Avatar name={o.student?.name || '—'} size={s.avatarSm} /><div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{o.student?.name || '—'}</div><div style={{ fontSize: 10.5, color: '#9ca3af' }}>{o.student?.email || ''}</div></div></div></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {firstItem && <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{firstItem.name} <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 4, fontSize: 11 }}>({TYPE_LABELS[firstItem.itemType] || firstItem.itemType})</span></span>}
                        {restCount > 0 && <span style={{ fontSize: 11, color: '#2E7D5B', fontWeight: 600 }}>+{restCount} more</span>}
                        {items.length === 0 && <span style={{ fontSize: 11, color: '#9ca3af' }}>{o.itemCount || 0} item(s)</span>}
                      </div>
                    </td>
                    <td>{o.couponCode ? <span style={{ fontSize: 11, fontWeight: 600, color: '#2E7D5B', background: 'rgba(46,125,91,0.1)', padding: '2px 8px', borderRadius: 12 }}>{o.couponCode}</span> : <span style={{ fontSize: 11, color: '#d1d5db' }}>—</span>}</td>
                    <td style={{ fontWeight: 700, fontSize: 13 }}>{fmtPrice(o.total)}</td>
                    <td><span style={{ fontSize: 11, color: '#6b7280' }}>{o.paymentMethod || 'Manual'}</span></td>
                    <td className={s.tdMuted} style={{ fontSize: 11 }}>{fmtDate(o.createdAt)}</td>
                    <td><Badge label={o.status === 'completed' ? 'Completed' : o.status} /></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => openDetail(o._id)} disabled={openingId === o._id}
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: openingId === o._id ? '#f3f4f6' : '#fff', fontSize: 11, cursor: openingId === o._id ? 'wait' : 'pointer', color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <LuExternalLink size={12} /> {openingId === o._id ? 'Opening…' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e5e7eb', background: page <= 1 ? '#f9fafb' : '#fff', fontSize: 12, cursor: page <= 1 ? 'not-allowed' : 'pointer', color: page <= 1 ? '#d1d5db' : '#374151' }}>Previous</button>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Page {page} of {pages} ({totalOrders} total)</span>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}
              style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e5e7eb', background: page >= pages ? '#f9fafb' : '#fff', fontSize: 12, cursor: page >= pages ? 'not-allowed' : 'pointer', color: page >= pages ? '#d1d5db' : '#374151' }}>Next</button>
          </div>
        )}
      </div>

      {/* Order Detail — Register-New-Student drawer shell */}
      {(selectedOrder || detailLoading) && (
        <QuickDrawer
          open
          onClose={closeDetail}
          title={selectedOrder ? `Order #${selectedOrder.orderNumber}` : 'Order details'}
          subtitle={selectedOrder
            ? `${selectedOrder.payment?.invoiceNo ? `Invoice ${selectedOrder.payment.invoiceNo} · ` : ''}${fmtDateTime(selectedOrder.createdAt)} · ${fmtPrice(selectedOrder.total)}`
            : 'Loading order details…'}
          icon={<LuShoppingCart size={20} />}
        >
          {!selectedOrder ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading order details…</div>
          ) : (
            <>
              {detailLoading && (
                <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 18, fontSize: 12.5, fontWeight: 600, background: 'rgba(46,125,91,0.08)', color: '#2E7D5B' }}>
                  Loading full details…
                </div>
              )}

              {/* Collection hero */}
              <div style={{
                borderRadius: 18, padding: '24px 24px 20px', marginBottom: 18, color: '#fff',
                background: 'linear-gradient(135deg, #1A0F0A 0%, #2D1B10 55%, #5A3A22 100%)',
                position: 'relative', overflow: 'hidden',
                boxShadow: '0 12px 32px rgba(45,20,6,0.25)',
              }}>
                <div style={{ position: 'absolute', right: -60, top: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,149,108,0.35) 0%, transparent 70%)' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'linear-gradient(90deg, #C8956C, #F97316, transparent)' }} />
                <div style={{ fontSize: 10.5, letterSpacing: 3, textTransform: 'uppercase', color: '#C8956C', fontWeight: 800 }}>Total Collected</div>
                <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 38, fontWeight: 700, lineHeight: 1.1, marginTop: 4 }}>{fmtPrice(selectedOrder.total)}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, alignItems: 'center' }}>
                  {selectedOrder.payment?.invoiceNo && (
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: '#F5EDE4', border: '1.5px solid rgba(200,149,108,0.6)', padding: '4px 12px', borderRadius: 999 }}>#{selectedOrder.payment.invoiceNo}</span>
                  )}
                  <span style={{ fontSize: 11.5, color: '#E8DCCF', fontFamily: 'monospace' }}>{selectedOrder.orderNumber}</span>
                  <Badge label={selectedOrder.status === 'completed' ? 'Completed' : selectedOrder.status} />
                  <Badge label={payStatusLabel(selectedOrder.payment?.paymentStatus)} />
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(232,220,207,0.85)', marginTop: 10 }}>
                  {(selectedOrder.items || []).length} item(s){selectedOrder.couponCode ? ` · Coupon ${selectedOrder.couponCode}` : ''} · {selectedOrder.paymentMethod || 'Manual'} · {fmtDateTime(selectedOrder.createdAt)}
                </div>
              </div>

              <QCard icon={<LuReceipt size={18} />} title="Order Summary" col="2">
                <QField icon={<LuFileText size={15} />} label="Invoice No">
                  <InfoVal>#{selectedOrder.payment?.invoiceNo || '—'}</InfoVal>
                </QField>
                <QField icon={<LuShoppingCart size={15} />} label="Order ID">
                  <InfoVal mono>{selectedOrder.orderNumber}</InfoVal>
                </QField>
                <QField icon={<LuCopy size={15} />} label="Transaction ID" fullWidth>
                  <InfoVal mono>{selectedOrder.payment?.provider_transaction_id || selectedOrder.transactionId || '—'}
                    {(selectedOrder.payment?.provider_transaction_id || selectedOrder.transactionId) && (
                      <CopyChip text={selectedOrder.payment?.provider_transaction_id || selectedOrder.transactionId} label="Transaction ID" onCopy={copyToClipboard} />
                    )}
                  </InfoVal>
                </QField>
                {(selectedOrder.payment?.merchant_reference && selectedOrder.payment.merchant_reference !== selectedOrder.orderNumber) && (
                  <QField icon={<LuCopy size={15} />} label="Payment Ref" fullWidth>
                    <InfoVal mono>{selectedOrder.payment.merchant_reference}
                      <CopyChip text={selectedOrder.payment.merchant_reference} label="Payment ref" onCopy={copyToClipboard} />
                    </InfoVal>
                  </QField>
                )}
                <QField icon={<LuClock size={15} />} label="Purchased">
                  <InfoVal>{fmtDateTime(selectedOrder.createdAt)}</InfoVal>
                </QField>
                <QField icon={<LuWallet size={15} />} label="Total Paid">
                  <InfoVal>{fmtPrice(selectedOrder.total)}</InfoVal>
                </QField>
                <QField icon={<LuCheck size={15} />} label="Order Status">
                  <Badge label={selectedOrder.status === 'completed' ? 'Completed' : selectedOrder.status} />
                </QField>
                <QField icon={<LuCheck size={15} />} label="Payment Status">
                  <Badge label={payStatusLabel(selectedOrder.payment?.paymentStatus)} />
                </QField>
              </QCard>

              <QCard icon={<LuUser size={18} />} title="Student" col="2">
                <QField icon={<LuUser size={15} />} label="Full Name">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #2E7D5B, #81B29A)', color: '#fff',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 800,
                    }}>
                      {(selectedOrder.student?.name || '?').trim().charAt(0).toUpperCase()}
                    </span>
                    <InfoVal strong>{selectedOrder.student?.name || '—'}</InfoVal>
                  </div>
                </QField>
                <QField icon={<LuPhone size={15} />} label="Phone">
                  <InfoVal>{selectedOrder.student?.phone || '—'}</InfoVal>
                </QField>
                <QField icon={<LuMail size={15} />} label="Email" fullWidth>
                  <InfoVal>{selectedOrder.student?.email || '—'}</InfoVal>
                </QField>
              </QCard>

              {/* Purchased Items */}
              <QCard icon={<LuShoppingCart size={18} />} title={`Order Items · ${(selectedOrder.items || []).length}`} col="1">
                <div style={{ border: '1px solid rgba(45,20,6,0.06)', borderRadius: 12, overflow: 'hidden' }}>
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: idx < (selectedOrder.items || []).length - 1 ? '1px solid rgba(45,20,6,0.06)' : 'none', background: idx % 2 === 0 ? '#fff' : '#FFF9F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(46,125,91,0.10)', color: '#2E7D5B', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><LuShoppingCart size={16} /></div>
                        <div style={{ minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700, color: '#2D1406' }}>{item.name}</div><div style={{ fontSize: 11, color: '#7C6A58', marginTop: 1 }}>{TYPE_LABELS[item.itemType] || item.itemType} · Qty 1</div></div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}><div style={{ fontSize: 14, fontWeight: 800, color: '#2D1406' }}>{fmtPrice(item.finalPrice)}</div>{item.discount > 0 && <div style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through' }}>{fmtPrice(item.price)}</div>}</div>
                    </div>
                  ))}
                  {(selectedOrder.items || []).length === 0 && <div style={{ padding: 16, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>No items</div>}
                  {(selectedOrder.items || []).length > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(46,125,91,0.06)', fontSize: 12, fontWeight: 800, color: '#2E7D5B' }}>
                      <span>{(selectedOrder.items || []).length} items</span>
                      <span>{fmtPrice((selectedOrder.items || []).reduce((a, i) => a + (Number(i.finalPrice) || 0), 0))}</span>
                    </div>
                  )}
                </div>
              </QCard>

              {/* Coupon + Pricing */}
              <QCard icon={<LuWallet size={18} />} title="Pricing" col="2">
                <QField icon={<LuWallet size={15} />} label="Subtotal">
                  <InfoVal>{fmtPrice(selectedOrder.subtotal)}</InfoVal>
                </QField>
                <QField icon={<LuWallet size={15} />} label={`Discount${selectedOrder.couponCode ? ` (${selectedOrder.couponCode})` : ''}`}>
                  <InfoVal>{(selectedOrder.discount > 0 || selectedOrder.couponDiscount > 0) ? `-${fmtPrice(selectedOrder.discount)}` : '—'}</InfoVal>
                </QField>
                <QField icon={<LuWallet size={15} />} label="Tax">
                  <InfoVal>{fmtPrice(selectedOrder.tax || 0)}</InfoVal>
                </QField>
                <QField icon={<LuCoins size={15} />} label="Final Paid">
                  <InfoVal green large>{fmtPrice(selectedOrder.total)}</InfoVal>
                </QField>
                {(selectedOrder.coupon || selectedOrder.couponCode) && (
                  <QField icon={<LuFileText size={15} />} label="Coupon" fullWidth>
                    <InfoVal>{selectedOrder.coupon
                      ? `${selectedOrder.couponCode} · ${selectedOrder.coupon.discountType === 'Percentage' ? `${selectedOrder.coupon.discountValue}% OFF` : `${fmtPrice(selectedOrder.coupon.discountValue)} OFF`}`
                      : `${selectedOrder.couponCode} · -${fmtPrice(selectedOrder.couponDiscount || selectedOrder.discount)}`}</InfoVal>
                  </QField>
                )}
              </QCard>

              {/* Payment Information */}
              <QCard icon={<LuCoins size={18} />} title="Payment" col="2">
                <QField icon={<LuWallet size={15} />} label="Method">
                  <InfoVal>{selectedOrder.paymentMethod || 'Manual Checkout'}</InfoVal>
                </QField>
                <QField icon={<LuCheck size={15} />} label="Status">
                  <Badge label={payStatusLabel(selectedOrder.payment?.paymentStatus)} />
                </QField>
                <QField icon={<LuCoins size={15} />} label="Amount">
                  <InfoVal>{fmtPrice((selectedOrder.payment?.amount != null ? selectedOrder.payment.amount / 100 : selectedOrder.total))}</InfoVal>
                </QField>
                <QField icon={<LuClock size={15} />} label="Paid At">
                  <InfoVal>{fmtDateTime(selectedOrder.payment?.capturedAt || selectedOrder.createdAt)}</InfoVal>
                </QField>
                <QField icon={<LuCopy size={15} />} label="Gateway Ref" fullWidth>
                  <InfoVal mono>{selectedOrder.payment?.provider_transaction_id || selectedOrder.payment?.merchant_reference || '—'}</InfoVal>
                </QField>
              </QCard>

                  {/* Enrollment Summary */}
              <QCard icon={<LuCheck size={18} />} title="Enrollment" col="1">
                <div style={{ border: '1px solid rgba(45,20,6,0.06)', borderRadius: 12, padding: '4px 14px' }}>
                  {(selectedOrder.enrollments || []).length === 0 && <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '14px 0' }}>{detailLoading ? 'Loading enrollments…' : 'No enrollment data available'}</div>}
                      {(selectedOrder.enrollments || []).map((enr, idx) => {
                        const label = TYPE_LABELS[enr.itemType] || enr.itemType;
                        const isActive = enr.status === 'active' || enr.status === 'registered' || enr.status === 'enrolled';
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: idx < (selectedOrder.enrollments || []).length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: isActive ? 'rgba(22,163,74,0.12)' : 'rgba(107,114,128,0.12)', color: isActive ? '#15803d' : '#6b7280', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 13, fontWeight: 800 }}>
                                {(enr.name || '?').trim().charAt(0).toUpperCase()}
                              </div>
                              <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{enr.name}</div><div style={{ fontSize: 11, color: '#9ca3af' }}>{label}</div></div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}><Badge label={isActive ? 'Active' : enr.status} />{enr.expiryDate && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Till {fmtDate(enr.expiryDate)}</div>}</div>
                          </div>
                        );
                      })}
                </div>
              </QCard>

                  {/* Timeline */}
              <QCard icon={<LuClock size={18} />} title={`Timeline · ${(selectedOrder.timeline || []).length}`} col="1">
                <div>
                      {(selectedOrder.timeline || []).length === 0 ? (
                        <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '14px 0' }}>{detailLoading ? 'Loading timeline…' : 'No timeline events yet'}</div>
                      ) : (
                        (selectedOrder.timeline || []).map((entry, idx, arr) => {
                          const { bg, fg, Icon } = timelineTone(entry.action);
                          const meta = timelineMeta(entry);
                          const last = idx === arr.length - 1;
                          return (
                            <div key={idx} style={{ position: 'relative', display: 'flex', gap: 12, padding: '12px 0', borderBottom: last ? 'none' : '1px solid #f3f4f6' }}>
                              {!last && <div style={{ position: 'absolute', left: 15, top: 44, bottom: -2, width: 2, background: '#eef2f0', borderRadius: 2 }} />}
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: bg, color: fg, display: 'grid', placeItems: 'center', flexShrink: 0, zIndex: 1 }}>
                                <Icon size={14} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1f2937' }}>{prettyAction(entry.action)}</div>
                                {meta && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, fontFamily: 'monospace', overflowWrap: 'anywhere', lineHeight: 1.5 }}>{meta}</div>}
                                <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 3 }}>{timeAgo(entry.createdAt)} · {fmtDateTime(entry.createdAt)}</div>
                              </div>
                            </div>
                          );
                        })
                      )}
                </div>
              </QCard>

              {/* Admin Actions */}
              <QCard icon={<LuUser size={18} />} title="Admin Actions" col="2">
                <div><button type="button" onClick={() => onViewStudent?.(selectedOrder.student?._id)}
                  style={{ ...actionBtnStyle, width: '100%', justifyContent: 'center' }}><LuUser size={13} /> Student Profile</button></div>
                <div><button type="button" onClick={handleResendNotification} disabled={resending}
                  style={{ ...actionBtnStyle, width: '100%', justifyContent: 'center', opacity: resending ? 0.6 : 1 }}><LuSend size={13} /> {resending ? 'Sending...' : 'Resend Notification'}</button></div>
                <div><button type="button" onClick={() => copyToClipboard(selectedOrder.orderNumber, 'Order ID')}
                  style={{ ...actionBtnStyle, width: '100%', justifyContent: 'center' }}><LuCopy size={13} /> Copy Order ID</button></div>
                <div><button type="button" onClick={() => copyToClipboard(selectedOrder.payment?.invoiceNo || selectedOrder.orderNumber, 'Invoice no')}
                  style={{ ...actionBtnStyle, width: '100%', justifyContent: 'center' }}><LuCopy size={13} /> Copy Invoice No</button></div>
              </QCard>

              <DrawerFooter
                onCancel={closeDetail}
                onSubmit={() => setShowInvoice(true)}
                submitText="View / Print Invoice"
                submitIcon={<LuFileText size={16} />}
              />
            </>
          )}
        </QuickDrawer>
      )}
    </div>
  );
}

const actionBtnStyle = {
  padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
  background: '#fff', fontSize: 11, fontWeight: 500, color: '#374151',
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
  transition: 'all 0.15s',
};
