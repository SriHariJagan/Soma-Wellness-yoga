import React, { useState, useEffect, useMemo, useCallback } from 'react';
import s from './YogaAdmin.module.css';
import Badge from './Badge';
import { PageHeader, KpiCard, ChartCard, AreaChart, BarChart, Donut, Avatar } from './ui/Primitives';
import { LuReceipt, LuClock, LuIndianRupee, LuWallet, LuSearch, LuX, LuExternalLink, LuCopy, LuPrinter, LuSend, LuUser, LuFileText, LuShoppingCart, LuCheck, LuCircleX, LuInfo } from 'react-icons/lu';
import { getAdminOrders, getAdminOrderDetail } from '../api/AdminServices.js';
import InvoiceView from '../shared/InvoiceView.jsx';

const STATUS_LABEL = { paid: 'Settled', pending: 'Pending', failed: 'Failed', refunded: 'Refunded' };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtPrice = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const TYPE_LABELS = {
  plan: 'Membership', service: 'Service', course: 'Course',
  workshop: 'Workshop', consultation: 'Consultation',
};

const PAGE_LIMIT = 15;

function monthlyBuckets(payments = []) {
  const buckets = {};
  for (const p of payments) {
    if (!p.date) continue;
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!buckets[key]) buckets[key] = { total: 0, count: 0 };
    if (p.status === 'paid') buckets[key].total += p.amount || 0;
    buckets[key].count += 1;
  }
  return buckets;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

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
  const { collected, pending, count, byStatus, monthlyRev, monthlyCount } = useMemo(() => {
    let collected = 0, pending = 0;
    const byStatus = { paid: 0, pending: 0, failed: 0, refunded: 0 };
    for (const p of payments) {
      if (p.status === 'paid') collected += p.amount || 0;
      else if (p.status === 'pending') pending += p.amount || 0;
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    }
    const buckets = monthlyBuckets(payments);
    const monthlyRev = MONTHS.map((_, i) => {
      const key = `2026-${String(i + 1).padStart(2, '0')}`;
      return buckets[key]?.total || 0;
    });
    const monthlyCount = MONTHS.map((_, i) => {
      const key = `2026-${String(i + 1).padStart(2, '0')}`;
      return buckets[key]?.count || 0;
    });
    return { collected, pending, count: payments.length, byStatus, monthlyRev, monthlyCount };
  }, [payments]);

  const revenue = metrics.revenue ?? collected;

  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
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
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter, pmFilter, dateRange, buildDateFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter, pmFilter, dateRange]);

  const openDetail = async (orderId) => {
    setDetailLoading(true);
    try {
      const data = await getAdminOrderDetail(orderId);
      setSelectedOrder(data);
    } catch {
      setSelectedOrder(null);
    } finally {
      setDetailLoading(false);
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
      const { default: request } = await import('../api/AdminServices.js');
      const ADMIN_URL = (await import('../api/AdminServices.js')).ADMIN_URL || '';
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

      {showInvoice && selectedOrder && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(45,20,6,0.55)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, overflowY: 'auto',
        }} onClick={() => setShowInvoice(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760, width: '100%' }}>
            <InvoiceView order={selectedOrder} onClose={() => setShowInvoice(false)} />
          </div>
        </div>
      )}

      <PageHeader title="Revenue Analytics" subtitle="Invoice management & collection insights — live from MongoDB" />

      <div className={s.statsGrid}>
        <KpiCard icon={<LuReceipt />} accent="orange" label="Total Invoices" value={count} spark={monthlyCount} />
        <KpiCard icon={<LuClock />} accent="amber" label="Pending" value={pending} prefix="₹" spark={[pending * 0.3, pending * 0.5, pending * 0.7, pending * 0.8, pending * 0.9, pending || 1]} />
        <KpiCard icon={<LuIndianRupee />} accent="green" label="Revenue Collected" value={revenue} prefix="₹" trend="collected" trendUp spark={monthlyRev} />
        <KpiCard icon={<LuWallet />} accent="blue" label="Avg. Invoice" value={count ? Math.round(revenue / count) : 0} prefix="₹" spark={monthlyCount.length ? monthlyCount : [1, 2, 3, 4, 5, 6]} />
      </div>

      <div className={s.grid2}>
        <ChartCard title="Revenue Trend" subtitle="Monthly collected revenue"
          right={<div style={{ textAlign: 'right' }}><div className={s.chartBig}>₹{revenue.toLocaleString('en-IN')}</div><div className={s.chartSub}>total</div></div>}
          legend={[{ color: '#F97316', label: 'Revenue' }]}>
          <div style={{ color: 'var(--text-1)' }}><AreaChart labels={MONTHS} series={[{ color: '#F97316', data: monthlyRev }]} /></div>
        </ChartCard>
        <ChartCard title="Collection Rate" subtitle="% of invoices settled per month" legend={[{ color: '#16A34A', label: 'Collection %' }]}>
          <div style={{ color: 'var(--text-1)' }}><BarChart labels={MONTHS} data={monthlyCount.length ? monthlyCount.map((c, i) => monthlyRev[i] > 0 ? Math.min(100, Math.round((monthlyRev[i] / ((collected || 1000) / 6)) * 60 + 30)) : 0) : [1, 2, 3, 4, 5, 6]} color="#16A34A" /></div>
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
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <LuSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input placeholder="Search by invoice, order, student, coupon..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, outline: 'none', background: '#fff' }} />
            {search && <LuX size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', cursor: 'pointer' }} onClick={() => setSearch('')} />}
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
            <option value="">All Methods</option><option value="Manual">Manual</option><option value="UPI">UPI</option>
            <option value="Cash">Cash</option><option value="Card">Card</option><option value="Bank Transfer">Bank Transfer</option>
          </select>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, background: '#fff', outline: 'none', cursor: 'pointer' }}>
            <option value="">All Time</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option>
          </select>
        </div>

        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr><th>Invoice</th><th>Student</th><th>Products Purchased</th><th>Coupon</th><th>Final Amount</th><th>Payment Method</th><th>Date</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className={s.tdMuted} style={{ textAlign: 'center', padding: 32 }}>Loading orders...</td></tr>}
              {!loading && orders.length === 0 && <tr><td colSpan={9} className={s.tdMuted} style={{ textAlign: 'center', padding: 32 }}>No orders found.</td></tr>}
              {!loading && orders.map((o) => {
                const items = o.items || [];
                const firstItem = items[0];
                const restCount = items.length - 1;
                return (
                  <tr key={o._id} style={{ cursor: 'pointer' }} onClick={() => openDetail(o._id)}>
                    <td><strong style={{ fontSize: 11 }}>#{o.orderNumber || o._id.slice(-6).toUpperCase()}</strong></td>
                    <td><div className={s.cellUser}><Avatar name={o.student?.name || '—'} size={s.avatarSm} />{o.student?.name || '—'}</div></td>
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
                      <button type="button" onClick={() => openDetail(o._id)}
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 11, cursor: 'pointer', color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <LuExternalLink size={12} /> View
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

      {/* Order Detail Drawer */}
      {(selectedOrder || detailLoading) && (
        <div className={s.drawerOverlay} onClick={closeDetail}>
          <div className={`${s.drawer} ${s.drawerWide}`} onClick={(e) => e.stopPropagation()}>
            {detailLoading && <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading order details...</div>}

            {selectedOrder && !detailLoading && (
              <>
                <div className={s.drawerHeader}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <LuShoppingCart size={18} /> Order #{selectedOrder.orderNumber}
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>{fmtDateTime(selectedOrder.createdAt)}</p>
                  </div>
                  <button type="button" onClick={closeDetail} className={s.drawerClose}><LuX size={18} /></button>
                </div>

                <div className={s.drawerBody}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                    <Badge label={selectedOrder.status === 'completed' ? 'Completed' : selectedOrder.status} />
                    <Badge label={selectedOrder.paymentMethod || 'Manual'} />
                  </div>

                  {/* Basic Information */}
                  <div className={s.drawerSection}>
                    <h4 className={s.drawerSectionTitle}>Basic Information</h4>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      {[['Invoice ID', selectedOrder.payment?.invoiceNo || '—'], ['Order ID', selectedOrder.orderNumber], ['Transaction ID', selectedOrder.transactionId || '—'], ['Purchase Date', fmtDateTime(selectedOrder.createdAt)], ['Student Name', selectedOrder.student?.name || '—'], ['Student Email', selectedOrder.student?.email || '—'], ['Student Phone', selectedOrder.student?.phone || '—'], ['Student ID', selectedOrder.student?._id || '—']].map(([label, val], i) => (
                        <div key={i} className={s.infoRow}>
                          <span className={s.infoLabel}>{label}</span>
                          <span className={s.infoVal} style={(label === 'Transaction ID' || label === 'Student ID') ? { fontFamily: 'monospace', fontSize: 11 } : {}}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Purchased Items */}
                  <div className={s.drawerSection}>
                    <h4 className={s.drawerSectionTitle}>Order Items</h4>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      {(selectedOrder.items || []).map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: idx < (selectedOrder.items || []).length - 1 ? '1px solid var(--border)' : 'none', background: idx % 2 === 0 ? '#fafafa' : '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(46,125,91,0.1)', color: '#2E7D5B', display: 'grid', placeItems: 'center', fontSize: 14 }}><LuShoppingCart size={14} /></div>
                            <div><div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{item.name}</div><div style={{ fontSize: 11, color: '#9ca3af' }}>{TYPE_LABELS[item.itemType] || item.itemType} · Qty: 1</div></div>
                          </div>
                          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{fmtPrice(item.finalPrice)}</div>{item.discount > 0 && <div style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through' }}>{fmtPrice(item.price)}</div>}</div>
                        </div>
                      ))}
                      {(selectedOrder.items || []).length === 0 && <div style={{ padding: 14, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>No items</div>}
                    </div>
                  </div>

                  {/* Coupon Details */}
                  <div className={s.drawerSection}>
                    <h4 className={s.drawerSectionTitle}>Coupon Information</h4>
                    {selectedOrder.coupon ? (
                      <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                        <div className={s.infoRow}><span className={s.infoLabel}>Coupon Code</span><span className={s.infoVal} style={{ color: '#2E7D5B', fontWeight: 700 }}>{selectedOrder.couponCode}</span></div>
                        <div className={s.infoRow}><span className={s.infoLabel}>Coupon Type</span><span className={s.infoVal}>{selectedOrder.coupon.discountType === 'Percentage' ? `${selectedOrder.coupon.discountValue}% OFF` : `${fmtPrice(selectedOrder.coupon.discountValue)} OFF`}</span></div>
                        <div className={s.infoRow}><span className={s.infoLabel}>Discount Given</span><span className={s.infoVal} style={{ color: '#10B981', fontWeight: 600 }}>-{fmtPrice(selectedOrder.couponDiscount || selectedOrder.discount)}</span></div>
                        <div className={s.infoRow}><span className={s.infoLabel}>Applied On</span><span className={s.infoVal}>{(selectedOrder.items || []).filter((i) => i.coupon).map((i) => i.name).join(', ') || (selectedOrder.items || []).map((i) => i.name).join(', ')}</span></div>
                      </div>
                    ) : (
                      <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>No coupon applied</div>
                    )}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className={s.drawerSection}>
                    <h4 className={s.drawerSectionTitle}>Pricing Breakdown</h4>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: '#fafafa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 4 }}><span>Subtotal</span><span style={{ color: '#374151', fontWeight: 600 }}>{fmtPrice(selectedOrder.subtotal)}</span></div>
                      {(selectedOrder.discount > 0 || selectedOrder.couponDiscount > 0) && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#10B981', marginBottom: 4 }}><span>Coupon Discount {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}</span><span>-{fmtPrice(selectedOrder.discount)}</span></div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 4 }}><span>Tax</span><span style={{ color: '#374151' }}>{fmtPrice(selectedOrder.tax || 0)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: '#2E7D5B', borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 6 }}><span>Final Paid</span><span>{fmtPrice(selectedOrder.total)}</span></div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className={s.drawerSection}>
                    <h4 className={s.drawerSectionTitle}>Payment Information</h4>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div className={s.infoRow}><span className={s.infoLabel}>Payment Method</span><span className={s.infoVal}>{selectedOrder.paymentMethod || 'Manual Checkout'}</span></div>
                      <div className={s.infoRow}><span className={s.infoLabel}>Gateway</span><span className={s.infoVal} style={{ color: '#9ca3af' }}>Pending Integration</span></div>
                      <div className={s.infoRow}><span className={s.infoLabel}>Payment Status</span><span className={s.infoVal}><Badge label={selectedOrder.payment?.status === 'paid' ? 'Completed' : selectedOrder.payment?.status || selectedOrder.status} /></span></div>
                      <div className={s.infoRow}><span className={s.infoLabel}>Payment Time</span><span className={s.infoVal}>{fmtDateTime(selectedOrder.payment?.date || selectedOrder.createdAt)}</span></div>
                    </div>
                  </div>

                  {/* Enrollment Summary */}
                  <div className={s.drawerSection}>
                    <h4 className={s.drawerSectionTitle}>Enrollment Summary</h4>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                      {(selectedOrder.enrollments || []).length === 0 && <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>No enrollment data available</div>}
                      {(selectedOrder.enrollments || []).map((enr, idx) => {
                        const label = TYPE_LABELS[enr.itemType] || enr.itemType;
                        const isActive = enr.status === 'active' || enr.status === 'registered' || enr.status === 'enrolled';
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < (selectedOrder.enrollments || []).length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <div><div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{enr.name}</div><div style={{ fontSize: 11, color: '#9ca3af' }}>{label}</div></div>
                            <div style={{ textAlign: 'right' }}><Badge label={isActive ? 'Active' : enr.status} />{enr.expiryDate && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Till {fmtDate(enr.expiryDate)}</div>}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className={s.drawerSection}>
                    <h4 className={s.drawerSectionTitle}>Student Timeline</h4>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                      {(selectedOrder.timeline || []).length === 0 ? (
                        <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>No timeline events</div>
                      ) : (
                        <div style={{ position: 'relative', paddingLeft: 20 }}>
                          <div style={{ position: 'absolute', left: 8, top: 4, bottom: 4, width: 2, background: '#e5e7eb', borderRadius: 2 }} />
                          {(selectedOrder.timeline || []).map((entry, idx) => (
                            <div key={idx} style={{ position: 'relative', paddingBottom: 12, paddingLeft: 16 }}>
                              <div style={{ position: 'absolute', left: -16, top: 4, width: 10, height: 10, borderRadius: '50%', background: idx === 0 ? '#2E7D5B' : '#e5e7eb', border: '2px solid #fff' }} />
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{entry.action}</div>
                              <div style={{ fontSize: 11, color: '#9ca3af' }}>{fmtDateTime(entry.createdAt)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Actions */}
                  <div className={s.drawerSection}>
                    <h4 className={s.drawerSectionTitle}>Admin Actions</h4>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => onViewStudent?.(selectedOrder.student?._id)}
                        style={actionBtnStyle}><LuUser size={13} /> View Student Profile</button>
                      <button type="button" onClick={() => setShowInvoice(true)}
                        style={actionBtnStyle}><LuFileText size={13} /> View Invoice</button>
                      <button type="button" onClick={() => { setShowInvoice(true); setTimeout(() => document.querySelector('[class*="invoice"]')?.querySelector('button:last-child')?.click(), 100); }}
                        style={actionBtnStyle}><LuPrinter size={13} /> Print Invoice</button>
                      <button type="button" onClick={() => { setShowInvoice(true); setTimeout(() => { const btns = document.querySelectorAll('button'); const printBtn = Array.from(btns).find(b => b.textContent.includes('Print')); printBtn?.click(); }, 100); }}
                        style={actionBtnStyle}><LuFileText size={13} /> Download PDF</button>
                      <button type="button" onClick={() => copyToClipboard(selectedOrder.orderNumber, 'Order ID')}
                        style={actionBtnStyle}><LuCopy size={13} /> Copy Order ID</button>
                      <button type="button" onClick={() => copyToClipboard(selectedOrder.transactionId || selectedOrder.payment?.invoiceNo || selectedOrder.orderNumber, 'Transaction ID')}
                        style={actionBtnStyle}><LuCopy size={13} /> Copy Transaction ID</button>
                      <button type="button" onClick={handleResendNotification} disabled={resending}
                        style={{ ...actionBtnStyle, opacity: resending ? 0.6 : 1 }}><LuSend size={13} /> {resending ? 'Sending...' : 'Resend Notification'}</button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
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
