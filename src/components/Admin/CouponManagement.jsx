import { useState, useEffect, useRef } from 'react';
import s from './YogaAdmin.module.css';
import FeedbackBanner from './FeedbackBanner';
import { PageHeader, KpiCard } from './ui/Primitives';
import {
  LuTicketPercent, LuTag, LuCopy, LuTrash2, LuToggleLeft, LuToggleRight, LuPlus,
  LuSearch, LuChevronDown, LuChevronUp, LuCalendar, LuClock, LuPercent, LuIndianRupee,
  LuRefreshCw, LuFilter, LuFileText, LuX, LuCheck, LuUsers,
} from 'react-icons/lu';
import { couponsApi, getAdminOrders } from '../api/AdminServices.js';

const STATUS_TABS = ['active', 'scheduled', 'expired', 'exhausted', 'disabled'];

export default function CouponManagement({ feedback }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [stats, setStats] = useState(null);
  const [flash, setFlash] = useState({ message: '', type: '' });

  const [form, setForm] = useState({
    code: '', description: '', discountType: 'Percentage', discountValue: '',
    maxDiscount: '', minPurchase: '', usageLimit: '', usagePerUser: '',
    startDate: '', expiryDate: '', active: true, autoApply: false,
    priority: 0, isReferral: false, applicableTo: 'all', products: [],
  });

  const [productSearch, setProductSearch] = useState({ type: 'plan', q: '' });
  const [searchResults, setSearchResults] = useState([]);

  const flashMsg = (message, type = 'success') => {
    setFlash({ message, type });
    setTimeout(() => setFlash({ message: '', type: '' }), 4000);
  };

  useEffect(() => { loadCoupons(); loadStats(); }, [activeTab, page]);

  async function loadCoupons() {
    try {
      setLoading(true);
      const data = await couponsApi.list({ page, limit: 50, status: activeTab, search });
      setCoupons(Array.isArray(data.coupons) ? data.coupons : []);
      setTotal(data.total || 0);
    } catch { setCoupons([]); }
    finally { setLoading(false); }
  }

  async function loadStats() {
    try {
      const data = await couponsApi.getStats();
      setStats(data);
    } catch {}
  }

  async function handleSearchProducts() {
    if (!productSearch.type) return;
    try {
      const data = await couponsApi.searchProducts(productSearch.type, productSearch.q);
      setSearchResults(Array.isArray(data) ? data : []);
    } catch { setSearchResults([]); }
  }

  useEffect(() => {
    if (productSearch.type) handleSearchProducts();
  }, [productSearch.type]);

  let searchTimer;
  function onProductSearchChange(val) {
    setProductSearch((p) => ({ ...p, q: val }));
    clearTimeout(searchTimer);
    searchTimer = setTimeout(handleSearchProducts, 300);
  }

  function addProduct(product) {
    const exists = form.products.find((p) => p.productType === product.productType && p.productId === product._id);
    if (exists) return;
    setForm((f) => ({ ...f, products: [...f.products, { productType: product.productType, productId: product._id }] }));
  }

  function removeProduct(idx) {
    setForm((f) => ({ ...f, products: f.products.filter((_, i) => i !== idx) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.code || form.discountValue === '') {
      flashMsg('Coupon code and discount value are required.', 'error');
      return;
    }
    try {
      const payload = {
        ...form,
        discountValue: Number(form.discountValue),
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : 0,
        minPurchase: form.minPurchase ? Number(form.minPurchase) : 0,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : 0,
        usagePerUser: form.usagePerUser ? Number(form.usagePerUser) : 0,
        startDate: form.startDate || null,
        expiryDate: form.expiryDate || null,
        priority: Number(form.priority) || 0,
      };

      if (editingId) {
        await couponsApi.update(editingId, payload);
        flashMsg('Coupon updated successfully.');
      } else {
        await couponsApi.create(payload);
        flashMsg(`Coupon ${form.code.toUpperCase()} created.`);
      }

      resetForm();
      loadCoupons();
      loadStats();
    } catch (err) {
      flashMsg(err.message || 'Failed to save coupon.', 'error');
    }
  }

  async function handleToggle(id) {
    try {
      await couponsApi.toggle(id);
      loadCoupons();
    } catch {}
  }

  async function handleDuplicate(id) {
    try {
      await couponsApi.duplicate(id);
      flashMsg('Coupon duplicated as draft.');
      loadCoupons();
    } catch (err) { flashMsg(err.message, 'error'); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this coupon permanently?')) return;
    try {
      await couponsApi.remove(id);
      flashMsg('Coupon deleted.');
      loadCoupons();
      loadStats();
      if (detailId === id) { setDetailId(null); setDetail(null); }
    } catch {}
  }

  async function handleViewDetail(id) {
    try {
      const data = await couponsApi.getDetail(id);
      setDetail(data);
      setDetailId(id);
    } catch {}
  }

  function editCoupon(c) {
    setForm({
      code: c.code,
      description: c.description || '',
      discountType: c.discountType,
      discountValue: c.discountValue,
      maxDiscount: c.maxDiscount || '',
      minPurchase: c.minPurchase || '',
      usageLimit: c.usageLimit || '',
      usagePerUser: c.usagePerUser || '',
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      expiryDate: c.expiryDate ? c.expiryDate.slice(0, 10) : '',
      active: c.active,
      autoApply: c.autoApply || false,
      priority: c.priority || 0,
      isReferral: c.isReferral || false,
      applicableTo: c.applicableTo,
      products: c.products?.map((p) => ({ productType: p.productType, productId: p.productId })) || [],
    });
    setEditingId(c._id);
    setShowForm(true);
  }

  function resetForm() {
    setForm({
      code: '', description: '', discountType: 'Percentage', discountValue: '',
      maxDiscount: '', minPurchase: '', usageLimit: '', usagePerUser: '',
      startDate: '', expiryDate: '', active: true, autoApply: false,
      priority: 0, isReferral: false, applicableTo: 'all', products: [],
    });
    setEditingId(null);
    setShowForm(false);
  }

  function statusBadge(c) {
    const map = {
      active: { label: 'Active', cls: s.badgeActive },
      scheduled: { label: 'Scheduled', cls: s.badgePending },
      expired: { label: 'Expired', cls: s.badgeInactive },
      exhausted: { label: 'Exhausted', cls: s.badgeInactive },
      disabled: { label: 'Disabled', cls: s.badgeInactive },
    };
    const m = map[c.computedStatus] || map.active;
    return <span className={`${s.badge} ${m.cls}`}>{m.label}</span>;
  }

  function productTypeLabel(type) {
    const map = { plan: 'Plan', service: 'Service', course: 'Course', workshop: 'Workshop', consultation: 'Consultation' };
    return map[type] || type;
  }

  const displayCoupons = coupons.filter((c) => {
    if (search) return c.code.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  return (
    <div>
      <PageHeader title="Coupon Management" subtitle="Create, manage, and track discount coupons" />

      {(flash.message || feedback?.message) && (
        <FeedbackBanner message={flash.message || feedback.message} type={flash.type || feedback.type} />
      )}

      {/* Stats */}
      {stats && (
        <div className={s.statsGrid} style={{ marginBottom: 20 }}>
          <KpiCard icon={<LuTicketPercent />} accent="orange" label="Total Coupons" value={stats.total || 0} />
          <KpiCard icon={<LuCheck />} accent="green" label="Active" value={stats.active || 0} />
          <KpiCard icon={<LuClock />} accent="blue" label="Scheduled" value={stats.scheduled || 0} />
          <KpiCard icon={<LuIndianRupee />} accent="amber" label="Total Discount Given" value={`KES ${(stats.totalDiscount || 0).toLocaleString()}`} />
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); }}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: activeTab === tab ? '1.5px solid #F97316' : '1px solid #E7D7BE',
                background: activeTab === tab ? 'rgba(249,115,22,0.08)' : '#fff',
                color: activeTab === tab ? '#F97316' : '#6B5E4E',
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <LuSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9C8E7C' }} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search coupons..."
              style={{ paddingLeft: 30, height: 34, borderRadius: 8, border: '1px solid #E7D7BE', fontSize: 12, width: 180, fontFamily: "'Inter', sans-serif" }}
            />
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className={`${s.btn} ${s.btnPrimary}`} style={{ height: 34, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <LuPlus size={14} /> Create Coupon
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className={s.card} style={{ marginBottom: 20, padding: 20 }}>
          <h3 className={s.cardTitle} style={{ marginBottom: 16 }}>
            {editingId ? 'Edit Coupon' : 'Create New Coupon'}
          </h3>
          <form onSubmit={handleSubmit} className={s.formStack}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#6B5E4E', marginBottom: 2, display: 'block' }}>Coupon Code *</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. YOGA20" style={{ height: 34, borderRadius: 8, border: '1px solid #E7D7BE', width: '100%', fontFamily: "'Inter', sans-serif" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6B5E4E', marginBottom: 2, display: 'block' }}>Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" style={{ height: 34, borderRadius: 8, border: '1px solid #E7D7BE', width: '100%', fontFamily: "'Inter', sans-serif" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6B5E4E', marginBottom: 2, display: 'block' }}>Discount Type</label>
                <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} style={{ height: 34, borderRadius: 8, border: '1px solid #E7D7BE', width: '100%', fontFamily: "'Inter', sans-serif" }}>
                  <option value="Percentage">Percentage (%)</option>
                  <option value="Flat">Flat (KES )</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6B5E4E', marginBottom: 2, display: 'block' }}>Discount Value *</label>
                <input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} placeholder={form.discountType === 'Percentage' ? 'e.g. 20' : 'e.g. 500'} min="0" style={{ height: 34, borderRadius: 8, border: '1px solid #E7D7BE', width: '100%', fontFamily: "'Inter', sans-serif" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6B5E4E', marginBottom: 2, display: 'block' }}>Max Discount (KES )</label>
                <input type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} placeholder="0 = unlimited" min="0" style={{ height: 34, borderRadius: 8, border: '1px solid #E7D7BE', width: '100%', fontFamily: "'Inter', sans-serif" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6B5E4E', marginBottom: 2, display: 'block' }}>Min Purchase (KES )</label>
                <input type="number" value={form.minPurchase} onChange={(e) => setForm({ ...form, minPurchase: e.target.value })} placeholder="0 = no minimum" min="0" style={{ height: 34, borderRadius: 8, border: '1px solid #E7D7BE', width: '100%', fontFamily: "'Inter', sans-serif" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6B5E4E', marginBottom: 2, display: 'block' }}>Usage Limit</label>
                <input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="0 = unlimited" min="0" style={{ height: 34, borderRadius: 8, border: '1px solid #E7D7BE', width: '100%', fontFamily: "'Inter', sans-serif" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6B5E4E', marginBottom: 2, display: 'block' }}>Per User Limit</label>
                <input type="number" value={form.usagePerUser} onChange={(e) => setForm({ ...form, usagePerUser: e.target.value })} placeholder="0 = unlimited" min="0" style={{ height: 34, borderRadius: 8, border: '1px solid #E7D7BE', width: '100%', fontFamily: "'Inter', sans-serif" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6B5E4E', marginBottom: 2, display: 'block' }}>Start Date</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={{ height: 34, borderRadius: 8, border: '1px solid #E7D7BE', width: '100%', fontFamily: "'Inter', sans-serif" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6B5E4E', marginBottom: 2, display: 'block' }}>Expiry Date</label>
                <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} style={{ height: 34, borderRadius: 8, border: '1px solid #E7D7BE', width: '100%', fontFamily: "'Inter', sans-serif" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6B5E4E', marginBottom: 2, display: 'block' }}>Priority</label>
                <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} min="0" style={{ height: 34, borderRadius: 8, border: '1px solid #E7D7BE', width: '100%', fontFamily: "'Inter', sans-serif" }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                  Active
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                  <input type="checkbox" checked={form.autoApply} onChange={(e) => setForm({ ...form, autoApply: e.target.checked })} />
                  Auto-apply
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                  <input type="checkbox" checked={form.isReferral} onChange={(e) => setForm({ ...form, isReferral: e.target.checked })} />
                  Referral
                </label>
              </div>
            </div>

            {/* Applicability */}
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B5E4E', display: 'block', marginBottom: 8 }}>Applicable To</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                  <input type="radio" name="applicableTo" checked={form.applicableTo === 'all'} onChange={() => setForm({ ...form, applicableTo: 'all', products: [] })} />
                  Entire Cart
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                  <input type="radio" name="applicableTo" checked={form.applicableTo === 'specific'} onChange={() => setForm({ ...form, applicableTo: 'specific' })} />
                  Specific Products
                </label>
              </div>
            </div>

            {/* Product Selection */}
            {form.applicableTo === 'specific' && (
              <div style={{ marginTop: 12, padding: 12, background: 'rgba(249,115,22,0.04)', borderRadius: 10, border: '1px solid #E7D7BE' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <select
                    value={productSearch.type}
                    onChange={(e) => setProductSearch({ type: e.target.value, q: '' })}
                    style={{ height: 34, borderRadius: 8, border: '1px solid #E7D7BE', fontFamily: "'Inter', sans-serif", fontSize: 12 }}
                  >
                    <option value="plan">Plans</option>
                    <option value="service">Services</option>
                    <option value="course">Courses</option>
                    <option value="workshop">Workshops</option>
                  </select>
                  <input
                    value={productSearch.q}
                    onChange={(e) => onProductSearchChange(e.target.value)}
                    placeholder="Search products..."
                    style={{ flex: 1, height: 34, borderRadius: 8, border: '1px solid #E7D7BE', fontSize: 12, fontFamily: "'Inter', sans-serif", paddingLeft: 8 }}
                  />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 120, overflowY: 'auto', marginBottom: 8 }}>
                  {searchResults.map((p) => (
                    <button
                      key={`${p.productType}-${p._id}`}
                      type="button"
                      onClick={() => addProduct(p)}
                      style={{
                        padding: '4px 10px', borderRadius: 14, fontSize: 11, cursor: 'pointer',
                        border: '1px solid #E7D7BE', background: '#fff', color: '#6B5E4E',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      + {p.name} (KES {p.price})
                    </button>
                  ))}
                </div>
                {form.products.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {form.products.map((p, i) => (
                      <span key={i} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 12, fontSize: 11,
                        background: 'rgba(249,115,22,0.1)', color: '#F97316',
                      }}>
                        {productTypeLabel(p.productType)}
                        <button type="button" onClick={() => removeProduct(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#DC2626', fontSize: 12 }}><LuX size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`}>{editingId ? 'Update Coupon' : 'Create Coupon'}</button>
              <button type="button" onClick={resetForm} className={s.btn} style={{ border: '1px solid #E7D7BE', color: '#6B5E4E' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Coupon List */}
      {loading ? (
        <div className={s.card}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={s.skel} style={{ height: 60, marginBottom: 8, borderRadius: 8 }} />
          ))}
        </div>
      ) : displayCoupons.length === 0 ? (
        <div className={s.card}>
          <p style={{ textAlign: 'center', color: '#9C8E7C', padding: 20 }}>No coupons found.</p>
        </div>
      ) : (
        <div className={s.card} style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-tertiary)', color: '#6B5E4E', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Code</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Discount</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Applicable</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Usage</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Validity</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayCoupons.map((c) => (
                <tr key={c._id} style={{ borderTop: '1px solid var(--color-border-light)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--color-dark)', cursor: 'pointer' }} onClick={() => handleViewDetail(c._id)}>
                    {c.code}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {c.discountType === 'Percentage' ? `${c.discountValue}%` : `KES ${c.discountValue}`}
                    {c.maxDiscount > 0 && <span style={{ color: '#9C8E7C', fontSize: 10 }}> (max KES {c.maxDiscount})</span>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>{statusBadge(c)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11 }}>
                    {c.applicableTo === 'all' ? (
                      <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', padding: '2px 8px', borderRadius: 8 }}>All Products</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {Object.keys(c.productTypeGroups || {}).map((pt) => (
                          <span key={pt} style={{ background: 'rgba(249,115,22,0.08)', color: '#F97316', padding: '1px 6px', borderRadius: 6, fontSize: 10 }}>{productTypeLabel(pt)}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11 }}>
                    {c.usageCount || 0}{c.usageLimit > 0 ? ` / ${c.usageLimit}` : ''}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: '#9C8E7C' }}>
                    {c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}
                    {' → '}
                    {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : '∞'}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button onClick={() => handleToggle(c._id)} className={s.btnSm} title={c.active ? 'Disable' : 'Enable'}>
                        {c.active ? <LuToggleRight size={14} /> : <LuToggleLeft size={14} />}
                      </button>
                      <button onClick={() => editCoupon(c)} className={s.btnSm} title="Edit"><LuTag size={14} /></button>
                      <button onClick={() => handleDuplicate(c._id)} className={s.btnSm} title="Duplicate"><LuCopy size={14} /></button>
                      <button onClick={() => handleDelete(c._id)} className={s.btnSm} title="Delete"><LuTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Panel */}
      {detail && (
        <div className={s.card} style={{ marginTop: 20, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 className={s.cardTitle}>{detail.coupon.code} — Usage History</h3>
            <button onClick={() => { setDetailId(null); setDetail(null); }} className={s.btnSm}><LuX size={14} /></button>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12 }}><strong>Total Orders:</strong> {detail.totalOrders}</div>
            <div style={{ fontSize: 12 }}><strong>Total Discount Given:</strong> KES {detail.totalDiscount.toLocaleString()}</div>
          </div>
          {detail.usageHistory.length === 0 ? (
            <p style={{ color: '#9C8E7C', fontSize: 12 }}>No usage yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Student</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Discount</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {detail.usageHistory.map((u) => (
                  <tr key={u._id} style={{ borderTop: '1px solid var(--color-border-light)' }}>
                    <td style={{ padding: '6px 10px' }}>{u.user?.name || 'Unknown'} ({u.user?.email || ''})</td>
                    <td style={{ padding: '6px 10px' }}>KES {u.discountAmount}</td>
                    <td style={{ padding: '6px 10px' }}>{new Date(u.usedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
