import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import s from './YogaAdmin.module.css';
import FeedbackBanner from './FeedbackBanner';
import { PageHeader, KpiCard } from './ui/Primitives';
import {
  LuPackage, LuPlus, LuSearch, LuRefreshCw, LuFilter,
  LuToggleLeft, LuToggleRight, LuPencil, LuTrash2, LuX,
  LuCheck, LuClock, LuEye, LuEyeOff, LuStar, LuHeart,
  LuCalendar, LuUsers, LuIndianRupee, LuImage, LuTag,
  LuChevronDown, LuSparkles, LuCalendarDays, LuFileText,
} from 'react-icons/lu';
import { offeringsApi } from '../api/AdminServices.js';

const CATEGORIES = [
  { value: 'group_yoga', label: 'Group Yoga' },
  { value: 'membership', label: 'Membership' },
  { value: 'personal_training', label: 'Personal Training' },
  { value: 'meditation', label: 'Meditation' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'therapy', label: 'Therapy' },
  { value: 'mama', label: 'Mama' },
  { value: 'signature', label: 'Signature' },
  { value: 'academy', label: 'Academy' },
];

const STATUSES = ['draft', 'available', 'unavailable', 'upcoming', 'archived'];
const VISIBILITIES = ['public', 'private', 'hidden'];
const VALIDITY_UNITS = ['single', 'sessions', 'days', 'weeks', 'months'];

const INITIAL_FORM = {
  name: '',
  subtitle: '',
  description: '',
  category: 'group_yoga',
  subcategory: '',
  tags: '',
  price: '',
  originalPrice: '',
  sessions: '',
  sessionDuration: '',
  validityDuration: '',
  validityUnit: 'days',
  whatIncluded: '',
  benefits: '',
  image: '',
  galleryUrls: '',
  displayOrder: '',
  featured: false,
  isPopular: false,
  status: 'draft',
  visibility: 'public',
  bookingEnabled: false,
  startDate: '',
  endDate: '',
  capacity: '',
};

export default function OfferingsManagement() {
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const searchTimer = useRef(null);

  const [showDrawer, setShowDrawer] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [flash, setFlash] = useState({ message: '', type: '' });

  // Lock background scroll while any popup is open (with scrollbar compensation)
  useEffect(() => {
    if (!showDrawer && !deleteConfirm) return;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, [showDrawer, deleteConfirm]);

  function closeSheet() {
    if (saving) return;
    setShowDrawer(false);
    setEditingId(null);
  }

  const catLabel = CATEGORIES.find((c) => c.value === form.category)?.label || form.category;

  const flashMsg = useCallback((message, type = 'success') => {
    setFlash({ message, type });
    setTimeout(() => setFlash({ message: '', type: '' }), 4000);
  }, []);

  const loadOfferings = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      if (search) params.search = search;
      const data = await offeringsApi.list(params);
      setOfferings(Array.isArray(data.offerings) ? data.offerings : []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      setOfferings([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterCategory, search]);

  const loadStats = useCallback(async () => {
    try {
      const data = await offeringsApi.stats();
      setStats(data);
    } catch {}
  }, []);

  useEffect(() => { loadOfferings(); }, [loadOfferings]);
  useEffect(() => { loadStats(); }, [loadStats]);

  function onSearchChange(val) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setPage(1), 300);
  }

  function openCreate() {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setShowDrawer(true);
  }

  function openEdit(o) {
    setForm({
      name: o.name || '',
      subtitle: o.subtitle || '',
      description: o.description || '',
      category: o.category || 'group_yoga',
      subcategory: o.subcategory || '',
      tags: Array.isArray(o.tags) ? o.tags.join(', ') : (o.tags || ''),
      price: o.price ?? '',
      originalPrice: o.originalPrice ?? '',
      sessions: o.sessions ?? '',
      sessionDuration: o.sessionDuration ?? '',
      validityDuration: o.validityDuration ?? '',
      validityUnit: o.validityUnit || 'days',
      whatIncluded: Array.isArray(o.whatIncluded) ? o.whatIncluded.join('\n') : (o.whatIncluded || ''),
      benefits: Array.isArray(o.benefits) ? o.benefits.join('\n') : (o.benefits || ''),
      image: o.image || '',
      galleryUrls: Array.isArray(o.galleryUrls) ? o.galleryUrls.join('\n') : (o.galleryUrls || ''),
      displayOrder: o.displayOrder ?? '',
      featured: o.featured || false,
      isPopular: o.isPopular || false,
      status: o.status || 'draft',
      visibility: o.visibility || 'public',
      bookingEnabled: o.bookingEnabled || false,
      startDate: o.startDate ? o.startDate.slice(0, 10) : '',
      endDate: o.endDate ? o.endDate.slice(0, 10) : '',
      capacity: o.capacity ?? '',
    });
    setEditingId(o._id);
    setShowDrawer(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      flashMsg('Offering name is required.', 'error');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        name: form.name.trim(),
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        subcategory: form.subcategory.trim(),
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        price: form.price !== '' ? Number(form.price) : 0,
        originalPrice: form.originalPrice !== '' ? Number(form.originalPrice) : 0,
        sessions: form.sessions !== '' ? Number(form.sessions) : 0,
        sessionDuration: form.sessionDuration !== '' ? Number(form.sessionDuration) : 0,
        validityDuration: form.validityDuration !== '' ? Number(form.validityDuration) : 0,
        whatIncluded: form.whatIncluded ? form.whatIncluded.split('\n').map((l) => l.trim()).filter(Boolean) : [],
        benefits: form.benefits ? form.benefits.split('\n').map((l) => l.trim()).filter(Boolean) : [],
        galleryUrls: form.galleryUrls ? form.galleryUrls.split('\n').map((l) => l.trim()).filter(Boolean) : [],
        displayOrder: form.displayOrder !== '' ? Number(form.displayOrder) : 0,
        capacity: form.capacity !== '' ? Number(form.capacity) : 0,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };

      if (editingId) {
        await offeringsApi.update(editingId, payload);
        flashMsg('Offering updated successfully.');
      } else {
        await offeringsApi.create(payload);
        flashMsg(`"${payload.name}" created.`);
      }

      setShowDrawer(false);
      setEditingId(null);
      setForm(INITIAL_FORM);
      loadOfferings();
      loadStats();
    } catch (err) {
      flashMsg(err.message || 'Failed to save offering.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      setDeletingId(deleteConfirm.id);
      await offeringsApi.remove(deleteConfirm.id);
      flashMsg('Offering archived.');
      setDeleteConfirm(null);
      loadOfferings();
      loadStats();
    } catch (err) {
      flashMsg(err.message || 'Failed to archive offering.', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggle(id, field) {
    try {
      await offeringsApi.toggle(id, field);
      loadOfferings();
    } catch (err) {
      flashMsg(err.message || 'Failed to toggle.', 'error');
    }
  }

  async function handleStatusChange(id, status, visibility) {
    try {
      await offeringsApi.setStatus(id, status, visibility);
      flashMsg('Status updated.');
      loadOfferings();
      loadStats();
    } catch (err) {
      flashMsg(err.message || 'Failed to update status.', 'error');
    }
  }

  function statusBadge(status) {
    const map = {
      draft: { label: 'Draft', color: '#9C8E7C', bg: 'rgba(156,142,124,0.1)' },
      available: { label: 'Available', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
      unavailable: { label: 'Unavailable', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
      upcoming: { label: 'Upcoming', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
      archived: { label: 'Archived', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
    };
    const m = map[status] || map.draft;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
        color: m.color, background: m.bg,
      }}>
        {m.label}
      </span>
    );
  }

  function visIcon(v) {
    if (v === 'public') return <LuEye size={13} style={{ color: '#10B981' }} />;
    if (v === 'private') return <LuEyeOff size={13} style={{ color: '#F59E0B' }} />;
    return <LuEyeOff size={13} style={{ color: '#9C8E7C' }} />;
  }

  const inputStyle = {
    height: 34, borderRadius: 8, border: '1px solid #E7D7BE', width: '100%',
    fontFamily: "'Inter', sans-serif", fontSize: 12, padding: '0 10px',
  };

  const labelStyle = {
    fontSize: 11, color: '#6B5E4E', marginBottom: 3, display: 'block', fontWeight: 500,
  };

  return (
    <div>
      <PageHeader
        title="Offerings Management"
        subtitle="Unified catalog for yoga classes, memberships, training, meditation, and more"
      >
        <button onClick={() => loadOfferings()} className={`${s.btn} ${s.btnSm}`}>
          <LuRefreshCw size={14} /> Refresh
        </button>
      </PageHeader>

      {(flash.message) && (
        <FeedbackBanner message={flash.message} type={flash.type} />
      )}

      {/* Stats Bar */}
      {stats && (
        <div className={s.statsGrid} style={{ marginBottom: 20 }}>
          <KpiCard icon={<LuPackage />} accent="orange" label="Total Offerings" value={stats.total || 0} />
          <KpiCard icon={<LuCheck />} accent="green" label="Available" value={stats.byStatus?.available || 0} />
          <KpiCard icon={<LuClock />} accent="blue" label="Draft" value={stats.byStatus?.draft || 0} />
          <KpiCard icon={<LuStar />} accent="amber" label="Upcoming" value={stats.byStatus?.upcoming || 0} />
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <LuSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9C8E7C' }} />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search offerings..."
              style={{ ...inputStyle, paddingLeft: 30, width: 200 }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <LuFilter size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9C8E7C', pointerEvents: 'none' }} />
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              style={{ ...inputStyle, width: 130, paddingLeft: 26, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((st) => <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>)}
            </select>
            <LuChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6B5E4E' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <LuTag size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9C8E7C', pointerEvents: 'none' }} />
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
              style={{ ...inputStyle, width: 160, paddingLeft: 26, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <LuChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6B5E4E' }} />
          </div>
          {total > 0 && (
            <span style={{ fontSize: 11, color: '#9C8E7C' }}>{total} offering{total !== 1 ? 's' : ''}</span>
          )}
        </div>
        <button onClick={openCreate} className={`${s.btn} ${s.btnPrimary}`} style={{ height: 34, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <LuPlus size={14} /> New Offering
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className={s.card}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={s.skel} style={{ height: 56, marginBottom: 6, borderRadius: 8 }} />
          ))}
        </div>
      ) : offerings.length === 0 ? (
        <div className={s.card} style={{ textAlign: 'center', padding: 48 }}>
          <LuPackage size={40} style={{ color: '#E7D7BE', marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#6B5E4E', marginBottom: 4 }}>No offerings found</p>
          <p style={{ fontSize: 12, color: '#9C8E7C', marginBottom: 16 }}>
            {search || filterStatus || filterCategory ? 'Try adjusting your filters' : 'Create your first offering to get started'}
          </p>
          {!search && !filterStatus && !filterCategory && (
            <button onClick={openCreate} className={`${s.btn} ${s.btnPrimary}`}>
              <LuPlus size={14} /> Create Offering
            </button>
          )}
        </div>
      ) : (
        <div className={s.card} style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 900 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-tertiary)', color: '#6B5E4E', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Price</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Visibility</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Featured</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Popular</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Booking</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {offerings.map((o) => (
                  <tr key={o._id} style={{ borderTop: '1px solid var(--color-border-light)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-dark)', marginBottom: 2 }}>{o.name}</div>
                      {o.subtitle && <div style={{ fontSize: 11, color: '#9C8E7C' }}>{o.subtitle}</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 8,
                        background: 'rgba(249,115,22,0.08)', color: '#F97316',
                      }}>
                        {CATEGORIES.find((c) => c.value === o.category)?.label || o.category}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      KES {(o.price || 0).toLocaleString()}
                      {o.originalPrice > 0 && o.originalPrice > o.price && (
                        <span style={{ fontSize: 10, color: '#9C8E7C', textDecoration: 'line-through', marginLeft: 4 }}>
                          KES {o.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>{statusBadge(o.status)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        {visIcon(o.visibility)}
                        {o.visibility}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleToggle(o._id, 'featured')}
                        style={{
                          border: 'none', background: 'none', cursor: 'pointer', padding: 4,
                          color: o.featured ? '#F59E0B' : '#D1D5DB',
                        }}
                        title={o.featured ? 'Remove from featured' : 'Mark as featured'}
                      >
                        <LuStar size={16} fill={o.featured ? '#F59E0B' : 'none'} />
                      </button>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleToggle(o._id, 'isPopular')}
                        style={{
                          border: 'none', background: 'none', cursor: 'pointer', padding: 4,
                          color: o.isPopular ? '#EF4444' : '#D1D5DB',
                        }}
                        title={o.isPopular ? 'Remove from popular' : 'Mark as popular'}
                      >
                        <LuHeart size={16} fill={o.isPopular ? '#EF4444' : 'none'} />
                      </button>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleToggle(o._id, 'bookingEnabled')}
                        title={o.bookingEnabled ? 'Disable booking' : 'Enable booking'}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2 }}
                      >
                        {o.bookingEnabled
                          ? <LuToggleRight size={20} style={{ color: '#10B981' }} />
                          : <LuToggleLeft size={20} style={{ color: '#D1D5DB' }} />
                        }
                      </button>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <select
                          value={o.status}
                          onChange={(e) => handleStatusChange(o._id, e.target.value, o.visibility)}
                          style={{
                            height: 26, borderRadius: 6, border: '1px solid #E7D7BE',
                            fontSize: 10, fontFamily: "'Inter', sans-serif", cursor: 'pointer',
                            padding: '0 4px',
                          }}
                          title="Change status"
                        >
                          {STATUSES.map((st) => <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>)}
                        </select>
                        <button onClick={() => openEdit(o)} className={s.btnSm} title="Edit">
                          <LuPencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ id: o._id, name: o.name })}
                          className={`${s.btnSm} ${s.btnDanger || ''}`}
                          title="Archive"
                          disabled={deletingId === o._id}
                        >
                          <LuTrash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--color-border-light)' }}>
              <button
                className={s.btn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{ height: 30, fontSize: 11, opacity: page <= 1 ? 0.4 : 1 }}
              >
                Previous
              </button>
              <span style={{ fontSize: 11, color: '#6B5E4E' }}>Page {page} of {pages}</span>
              <button
                className={s.btn}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                style={{ height: 30, fontSize: 11, opacity: page >= pages ? 0.4 : 1 }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit fullscreen sheet */}
      {showDrawer && createPortal(
      <div className={s.sheetBackdrop} onClick={closeSheet}>
        <div className={s.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={editingId ? 'Edit offering' : 'New offering'}>
          <div className={s.sheetHeader}>
            <div className={s.sheetTitleWrap}>
              <span className={s.sheetAvatar}>{(form.name || '?')[0].toUpperCase()}</span>
              <div>
                <h3>{editingId ? 'Edit Offering' : 'New Offering'}</h3>
                <p>{editingId ? 'Update details — changes go live where published.' : 'Describe it once — publish everywhere. Nothing saves until you confirm.'}</p>
              </div>
            </div>
            <button className={s.modalClose} onClick={closeSheet} aria-label="Close"><LuX size={18} /></button>
          </div>

          <form onSubmit={handleSubmit} className={s.sheetBody}>
            <div className={s.sheetGrid}>
              {/* LEFT — identity + live preview */}
              <section className={`${s.sheetSection} ${s.sheetSectionDark}`}>
                <h4><span className={s.stepNum}>1</span> Identity</h4>
                <div className={s.previewCard}>
                  {form.image ? (
                    <img src={form.image} alt="" className={s.previewThumb} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <span className={s.previewAvatar}>{(form.name || '?')[0].toUpperCase()}</span>
                  )}
                  <div className={s.previewInfo}>
                    <strong>{form.name || 'Untitled offering'}</strong>
                    <span>{catLabel}{form.price ? ` · KES ${Number(form.price).toLocaleString()}` : ''}</span>
                  </div>
                  <span className={s.ring} style={{ '--p': form.status === 'available' ? 100 : form.status === 'upcoming' ? 60 : 25 }} title={`Status: ${form.status}`}>
                    <em>{form.status === 'available' ? '●' : '○'}</em>
                  </span>
                </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Sunrise Vinyasa Flow"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Subtitle</label>
                <input
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  placeholder="Short tagline or subtitle"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detailed description of this offering..."
                  rows={4}
                  style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
                />
              </div>
            </div>

          {/* Media — previewed above */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#F4B400', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Media
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>Image URL</label>
                <input
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Gallery URLs (one per line)</label>
                <textarea
                  value={form.galleryUrls}
                  onChange={(e) => setForm({ ...form, galleryUrls: e.target.value })}
                  placeholder={"https://example.com/gallery1.jpg&#10;https://example.com/gallery2.jpg"}
                  rows={3}
                  style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>
              </section>

              {/* RIGHT — classification, pricing & publishing */}
              <section className={s.sheetSection}>
                <h4><span className={s.stepNum}>2</span> Details & publishing</h4>

          {/* Classification */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#F97316', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Classification
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={inputStyle}
                >
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Subcategory</label>
                <input
                  value={form.subcategory}
                  onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                  placeholder="e.g. beginner, prenatal"
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>Tags (comma-separated)</label>
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="e.g. yoga, flow, morning"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Pricing */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#F97316', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Pricing & Sessions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Price (KES)</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0"
                  min="0"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Original Price (KES)</label>
                <input
                  type="number"
                  value={form.originalPrice}
                  onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                  placeholder="0"
                  min="0"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Number of Sessions</label>
                <input
                  type="number"
                  value={form.sessions}
                  onChange={(e) => setForm({ ...form, sessions: e.target.value })}
                  placeholder="0"
                  min="0"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Session Duration (min)</label>
                <input
                  type="number"
                  value={form.sessionDuration}
                  onChange={(e) => setForm({ ...form, sessionDuration: e.target.value })}
                  placeholder="60"
                  min="0"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Validity Duration</label>
                <input
                  type="number"
                  value={form.validityDuration}
                  onChange={(e) => setForm({ ...form, validityDuration: e.target.value })}
                  placeholder="30"
                  min="0"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Validity Unit</label>
                <select
                  value={form.validityUnit}
                  onChange={(e) => setForm({ ...form, validityUnit: e.target.value })}
                  style={inputStyle}
                >
                  {VALIDITY_UNITS.map((u) => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Details */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#F97316', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Details
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>What's Included (one per line)</label>
                <textarea
                  value={form.whatIncluded}
                  onChange={(e) => setForm({ ...form, whatIncluded: e.target.value })}
                  placeholder={"Mat rental&#10;Water bottle&#10;Towel service"}
                  rows={3}
                  style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Benefits (one per line)</label>
                <textarea
                  value={form.benefits}
                  onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                  placeholder={"Improved flexibility&#10;Stress relief&#10;Better sleep"}
                  rows={3}
                  style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Scheduling & Capacity */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#F97316', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Scheduling & Capacity
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>End Date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Capacity</label>
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="0 = unlimited"
                  min="0"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Display Order</label>
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                  placeholder="0"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Status & Visibility */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#F97316', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Status & Visibility
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  style={inputStyle}
                >
                  {STATUSES.map((st) => <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Visibility</label>
                <select
                  value={form.visibility}
                  onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                  style={inputStyle}
                >
                  {VISIBILITIES.map((v) => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                />
                <LuStar size={14} style={{ color: form.featured ? '#F59E0B' : '#9C8E7C' }} />
                Featured
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={form.isPopular}
                  onChange={(e) => setForm({ ...form, isPopular: e.target.checked })}
                />
                <LuHeart size={14} style={{ color: form.isPopular ? '#EF4444' : '#9C8E7C' }} />
                Popular
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={form.bookingEnabled}
                  onChange={(e) => setForm({ ...form, bookingEnabled: e.target.checked })}
                />
                <LuCalendarDays size={14} style={{ color: form.bookingEnabled ? '#10B981' : '#9C8E7C' }} />
                Booking Enabled
              </label>
            </div>
          </div>

          {/* Footer */}
              </section>
            </div>
            <div className={s.sheetFooter}>
              <span className={s.sheetFooterHint}>
                {form.status === 'available' && form.visibility === 'public'
                  ? 'Will appear on the website immediately after saving.'
                  : 'Saved as ' + form.status + ' — switch to Available + Public to publish.'}
              </span>
              <div className={s.modalActions}>
                <button type="button" onClick={closeSheet} className={`${s.btn} ${s.btnGhost}`} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Offering' : 'Create Offering'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>,
      document.body
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && createPortal(
        <div className={s.sheetBackdrop} onClick={() => setDeleteConfirm(null)}>
          <div className={s.sheetCompact} onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-label="Archive offering">
            <div className={s.sheetCompactHead}>
              <span className={s.sheetCompactIcon} style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}><LuTrash2 size={20} /></span>
              <div>
                <div className={s.sheetCompactTitle}>Archive Offering</div>
                <div className={s.sheetCompactSub}>
                  Archive <strong>"{deleteConfirm.name}"</strong>? It moves to archived status and hides from public view.
                </div>
              </div>
            </div>
            <div className={s.sheetCompactBody}>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setDeleteConfirm(null)} className={`${s.btn} ${s.btnGhost}`}>
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className={`${s.btn} ${s.btnDanger}`}
                  disabled={deletingId === deleteConfirm.id}
                >
                  {deletingId === deleteConfirm.id ? 'Archiving...' : 'Archive'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
