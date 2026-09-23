import React, { useState, useEffect } from 'react';
import s from './YogaAdmin.module.css';
import { PageHeader } from './ui/Primitives';
import {
  servicesApi, instructorsApi, serviceAssignmentsApi, somaCatalogAdminApi,
} from '../api/AdminServices.js';
import {
  LuSparkles, LuUsers, LuListChecks, LuTrash2, LuPlus, LuCheck, LuSearch, LuRefreshCw,
  LuPencil, LuX,
} from 'react-icons/lu';
import PhoneInput from '../common/PhoneInput.jsx';
import { validatePhone, normalizePhone } from '../../lib/phone.js';

const EMPTY_SERVICE = {
  name: '', description: '', category: 'General', type: '',
  mode: 'offline', instructor: '', price: '', durationWeeks: '',
  totalSessions: '', scheduleDays: '', scheduleTime: '',
  pricingModel: 'flat', sessionDuration: '60', validityDuration: '',
  validityUnit: 'weeks', contactEmail: '', icon: '', images: '',
  slug: '', featured: false, visibility: 'public', timeSlots: '',
};
const EMPTY_INSTRUCTOR = { name: '', email: '', phone: '', bio: '', specialties: '' };
const EMPTY_ASSIGNMENT = { studentId: '', serviceId: '', price: '', paymentStatus: 'paid', method: 'UPI' };

export default function ServicesManagement({ onChanged } = {}) {
  const [activeTab, setActiveTab] = useState('catalog');
  const [services, setServices] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE);
  const [instructorForm, setInstructorForm] = useState(EMPTY_INSTRUCTOR);
  const [assignmentForm, setAssignmentForm] = useState(EMPTY_ASSIGNMENT);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editingInstructorId, setEditingInstructorId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dailyMonthly, setDailyMonthly] = useState('');
  const [dailyAnnual, setDailyAnnual] = useState('');
  const [dailySaving, setDailySaving] = useState(false);

  const flash = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [svc, inst, asgn, anl] = await Promise.all([
        servicesApi.list().catch(() => []),
        instructorsApi.list().catch(() => []),
        serviceAssignmentsApi.list({ search, status: statusFilter }).catch(() => []),
        serviceAssignmentsApi.analytics().catch(() => null),
      ]);
      setServices(svc);
      setInstructors(inst);
      setAssignments(asgn);
      setAnalytics(anl);
      try {
        const cat = await somaCatalogAdminApi.get();
        setDailyMonthly(cat?.settingsSoma?.dailyMonthly ?? cat?.somaDaily?.MONTHLY ?? '');
        setDailyAnnual(cat?.settingsSoma?.dailyAnnual ?? cat?.somaDaily?.ANNUAL ?? '');
      } catch {}
    } catch (err) {
      setError(err.message || 'Could not load services data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [search, statusFilter]);

  const buildServicePayload = (f) => {
    const timeSlots = f.timeSlots
      ? f.timeSlots.split('\n').filter(Boolean).map(line => {
          const parts = line.split('|').map(p => p.trim());
          return { day: parts[0] || '', time: parts[1] || '', label: parts[2] || '' };
        })
      : [];
    return {
      name: f.name,
      slug: f.slug || undefined,
      description: f.description,
      category: f.category,
      type: f.type,
      mode: f.mode,
      instructor: f.instructor || undefined,
      price: Number(f.price) || 0,
      pricingModel: f.pricingModel,
      sessionDuration: Number(f.sessionDuration) || 60,
      durationWeeks: Number(f.durationWeeks) || 0,
      totalSessions: Number(f.totalSessions) || 0,
      validityDuration: f.validityDuration ? Number(f.validityDuration) : undefined,
      validityUnit: f.validityUnit,
      contactEmail: f.contactEmail || undefined,
      icon: f.icon || undefined,
      images: f.images ? f.images.split(',').map(s => s.trim()).filter(Boolean) : [],
      featured: f.featured,
      visibility: f.visibility,
      timeSlots,
      scheduleDays: f.scheduleDays
        ? f.scheduleDays.split(',').map(d => d.trim()).filter(Boolean)
        : [],
      scheduleTime: f.scheduleTime,
    };
  };

  const startEditService = (svc) => {
    setEditingServiceId(svc._id);
    setServiceForm({
      ...EMPTY_SERVICE,
      name: svc.name || '',
      description: svc.description || '',
      category: svc.category || 'General',
      type: svc.type || '',
      mode: svc.mode || 'offline',
      instructor: typeof svc.instructor === 'object' ? (svc.instructor?._id || '') : (svc.instructor || ''),
      price: svc.price ?? '',
      pricingModel: svc.pricingModel || 'flat',
      sessionDuration: svc.sessionDuration ?? '60',
      durationWeeks: svc.durationWeeks ?? '',
      totalSessions: svc.totalSessions ?? '',
      validityDuration: svc.validityDuration ?? '',
      validityUnit: svc.validityUnit || 'weeks',
      contactEmail: svc.contactEmail || '',
      icon: svc.icon || '',
      images: Array.isArray(svc.images) ? svc.images.join(', ') : (svc.images || ''),
      slug: svc.slug || '',
      featured: !!svc.featured,
      visibility: svc.visibility || 'public',
      timeSlots: Array.isArray(svc.timeSlots) ? svc.timeSlots.map(t => [t.day, t.time, t.label].filter(Boolean).join(' | ')).join('\n') : '',
      scheduleDays: Array.isArray(svc.scheduleDays) ? svc.scheduleDays.join(', ') : (svc.scheduleDays || ''),
      scheduleTime: svc.scheduleTime || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditService = () => {
    setEditingServiceId(null);
    setServiceForm(EMPTY_SERVICE);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!serviceForm.name) { flash('Service name is required.', 'error'); return; }
    setSaving(true);
    try {
      if (editingServiceId) {
        const data = await servicesApi.update(editingServiceId, buildServicePayload(serviceForm));
        setServices(prev => prev.map(sv => (sv._id === editingServiceId ? data : sv)));
        flash(`Service "${data.name}" updated.`);
      } else {
        const data = await servicesApi.create(buildServicePayload(serviceForm));
        setServices(prev => [data, ...prev]);
        flash(`Service "${data.name}" created.`);
      }
      setServiceForm(EMPTY_SERVICE);
      setEditingServiceId(null);
      onChanged?.();
    } catch (err) {
      flash(err.message || (editingServiceId ? 'Failed to update service.' : 'Failed to create service.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const startEditInstructor = (inst) => {
    setEditingInstructorId(inst._id);
    setInstructorForm({
      name: inst.name || '',
      email: inst.email || '',
      phone: inst.phone || '',
      bio: inst.bio || '',
      specialties: Array.isArray(inst.specialties) ? inst.specialties.join(', ') : (inst.specialties || ''),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditInstructor = () => {
    setEditingInstructorId(null);
    setInstructorForm(EMPTY_INSTRUCTOR);
  };

  const handleSaveInstructor = async (e) => {
    e.preventDefault();
    if (!instructorForm.name) { flash('Instructor name is required.', 'error'); return; }
    if (instructorForm.phone) {
      const err = validatePhone(instructorForm.phone);
      if (err) { flash(err, 'error'); return; }
    }
    setSaving(true);
    try {
      const payload = {
        name: instructorForm.name,
        email: instructorForm.email,
        phone: instructorForm.phone ? normalizePhone(instructorForm.phone) : '',
        bio: instructorForm.bio,
        specialties: instructorForm.specialties
          ? instructorForm.specialties.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      };
      if (editingInstructorId) {
        const data = await instructorsApi.update(editingInstructorId, payload);
        setInstructors(prev => prev.map(i => (i._id === editingInstructorId ? data : i)));
        flash(`Instructor "${data.name}" updated.`);
      } else {
        const data = await instructorsApi.create(payload);
        setInstructors(prev => [data, ...prev]);
        flash(`Instructor "${data.name}" created.`);
      }
      setInstructorForm(EMPTY_INSTRUCTOR);
      setEditingInstructorId(null);
      onChanged?.();
    } catch (err) {
      flash(err.message || (editingInstructorId ? 'Failed to update instructor.' : 'Failed to create instructor.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignService = async (e) => {
    e.preventDefault();
    if (!assignmentForm.studentId || !assignmentForm.serviceId) {
      flash('Student and Service are required.', 'error'); return;
    }
    setSaving(true);
    try {
      await serviceAssignmentsApi.assign({
        studentId: assignmentForm.studentId,
        serviceId: assignmentForm.serviceId,
        price: assignmentForm.price ? Number(assignmentForm.price) : undefined,
        paymentStatus: assignmentForm.paymentStatus,
        method: assignmentForm.method,
      });
      setAssignmentForm(EMPTY_ASSIGNMENT);
      flash('Service assigned successfully.');
      fetchAll();
      onChanged?.();
    } catch (err) {
      flash(err.message || 'Failed to assign service.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (id, name) => {
    if (!window.confirm(`Delete service "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await servicesApi.remove(id);
      setServices(prev => prev.filter(s => s._id !== id));
      if (editingServiceId === id) { setEditingServiceId(null); setServiceForm(EMPTY_SERVICE); }
      flash(`Service "${name}" deleted.`);
      onChanged?.();
    } catch { flash('Failed to delete service.', 'error'); }
    finally { setDeletingId(null); }
  };

  const handleDeleteInstructor = async (id, name) => {
    if (!window.confirm(`Delete instructor "${name}"?`)) return;
    setDeletingId(id);
    try {
      await instructorsApi.remove(id);
      setInstructors(prev => prev.filter(i => i._id !== id));
      if (editingInstructorId === id) { setEditingInstructorId(null); setInstructorForm(EMPTY_INSTRUCTOR); }
      flash(`Instructor "${name}" deleted.`);
    } catch { flash('Failed to delete instructor.', 'error'); }
    finally { setDeletingId(null); }
  };

  const handleRenewAssignment = async (id) => {
    if (!window.confirm('Renew this service enrollment?')) return;
    setDeletingId(id);
    try {
      await serviceAssignmentsApi.renew(id);
      flash('Service enrollment renewed.');
      fetchAll();
    } catch { flash('Failed to renew.', 'error'); }
    finally { setDeletingId(null); }
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm('Remove this service enrollment?')) return;
    setDeletingId(id);
    try {
      await serviceAssignmentsApi.remove(id);
      flash('Service enrollment removed.');
      fetchAll();
    } catch { flash('Failed to remove.', 'error'); }
    finally { setDeletingId(null); }
  };

  const tabs = [
    { key: 'catalog',      icon: <LuSparkles size={15} />,  label: 'Catalog' },
    { key: 'instructors',  icon: <LuUsers size={15} />,     label: 'Instructors' },
    { key: 'enrollments',  icon: <LuListChecks size={15} />, label: 'Enrollments' },
  ];
  const fmtPrice = (n) => Number(n || 0).toLocaleString('en-KE');

  return (
    <div>
      <PageHeader title="Services Management" subtitle="Create, assign, and manage wellness services, instructors, and enrollments" />

      {feedback.message && (
        <div className={`${s.feedbackInline} ${feedback.type === 'success' ? s.bannerSuccess : s.bannerError}`}>
          <span className={s.bannerIcon}>{feedback.type === 'success' ? '✓' : '⚠'}</span>{feedback.message}
        </div>
      )}

      {/* SOMA DAILY subscription pricing (VAT-inclusive KES) */}
      <div className={s.card} style={{ marginBottom: 18 }}>
        <h3 className={s.cardTitle}><span className={s.cardTitleIcon}><LuSparkles /></span>SOMA DAILY Pricing</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600 }}>
            Monthly (KES)
            <input type="number" min="0" value={dailyMonthly} onChange={(e) => setDailyMonthly(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', width: 160 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600 }}>
            Annual (KES)
            <input type="number" min="0" value={dailyAnnual} onChange={(e) => setDailyAnnual(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', width: 160 }} />
          </label>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={dailySaving}
            onClick={async () => {
              setDailySaving(true);
              try {
                await somaCatalogAdminApi.update({ dailyMonthly: Number(dailyMonthly) || 0, dailyAnnual: Number(dailyAnnual) || 0 });
                flash('SOMA DAILY pricing updated.');
              } catch { flash('Failed to update pricing.', 'error'); }
              finally { setDailySaving(false); }
            }}>
            {dailySaving ? 'Saving…' : 'Save Pricing'}
          </button>
        </div>
      </div>

      <div className={s.tabRow} style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
        {tabs.map(t => (
          <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
              border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500,
              color: activeTab === t.key ? '#2E7D5B' : '#6B5E4E',
              background: activeTab === t.key ? 'rgba(46,125,91,0.10)' : 'transparent',
              transition: 'all .15s',
            }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ═══════════ CATALOG TAB ═══════════ */}
      {activeTab === 'catalog' && (
        <>
          <form onSubmit={handleSaveService} className={s.card}>
            <h3 className={s.cardTitle}><span className={s.cardTitleIcon}>{editingServiceId ? <LuPencil /> : <LuSparkles />}</span>{editingServiceId ? 'Edit Service' : 'Add Service'}</h3>
            <div className={s.grid3} style={{ marginBottom: 10 }}>
              <input type="text" placeholder="Service name *" value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} />
              <input type="text" placeholder="Slug (auto if empty)" value={serviceForm.slug} onChange={e => setServiceForm({ ...serviceForm, slug: e.target.value })} />
              <select value={serviceForm.category} onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })}>
                <option value="Group">Group</option>
                <option value="Personal">Personal</option>
                <option value="Corporate">Corporate</option>
                <option value="Therapy">Therapy</option>
                <option value="Mama">Mama</option>
                <option value="Academy">Academy</option>
                <option value="General">General</option>
              </select>
              <select value={serviceForm.mode} onChange={e => setServiceForm({ ...serviceForm, mode: e.target.value })}>
                <option value="offline">Offline</option>
                <option value="online">Online</option>
                <option value="home">Home</option>
                <option value="center">Center</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <input type="text" placeholder="Type (e.g. Hatha)" value={serviceForm.type} onChange={e => setServiceForm({ ...serviceForm, type: e.target.value })} />
              <select value={serviceForm.pricingModel} onChange={e => setServiceForm({ ...serviceForm, pricingModel: e.target.value })}>
                <option value="flat">Flat (one-time)</option>
                <option value="monthly">Monthly</option>
                <option value="per_session">Per Session</option>
                <option value="contact">Contact (enquiry)</option>
              </select>
              <input type="number" placeholder="Price (KES )" value={serviceForm.price} onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })} />
              <input type="number" placeholder="Session duration (min)" value={serviceForm.sessionDuration} onChange={e => setServiceForm({ ...serviceForm, sessionDuration: e.target.value })} />
              <input type="number" placeholder="Total sessions" value={serviceForm.totalSessions} onChange={e => setServiceForm({ ...serviceForm, totalSessions: e.target.value })} />
              <input type="number" placeholder="Validity duration" value={serviceForm.validityDuration} onChange={e => setServiceForm({ ...serviceForm, validityDuration: e.target.value })} />
              <select value={serviceForm.validityUnit} onChange={e => setServiceForm({ ...serviceForm, validityUnit: e.target.value })}>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
              <input type="number" placeholder="Duration (weeks)" value={serviceForm.durationWeeks} onChange={e => setServiceForm({ ...serviceForm, durationWeeks: e.target.value })} />
              <input type="text" placeholder="Schedule days (Mon,Wed,Fri)" value={serviceForm.scheduleDays} onChange={e => setServiceForm({ ...serviceForm, scheduleDays: e.target.value })} />
              <input type="text" placeholder="Schedule time (e.g. 06:30 AM)" value={serviceForm.scheduleTime} onChange={e => setServiceForm({ ...serviceForm, scheduleTime: e.target.value })} />
              <input type="email" placeholder="Contact email (for contact pricing)" value={serviceForm.contactEmail} onChange={e => setServiceForm({ ...serviceForm, contactEmail: e.target.value })} />
              <input type="text" placeholder="Icon class (e.g. ti-brand-yoga)" value={serviceForm.icon} onChange={e => setServiceForm({ ...serviceForm, icon: e.target.value })} />
              <input type="text" placeholder="Image URLs (comma separated)" value={serviceForm.images} onChange={e => setServiceForm({ ...serviceForm, images: e.target.value })} />
              <select value={serviceForm.instructor} onChange={e => setServiceForm({ ...serviceForm, instructor: e.target.value })}>
                <option value="">Select instructor</option>
                {instructors.map(inst => <option key={inst._id} value={inst._id}>{inst.name}</option>)}
              </select>
              <select value={serviceForm.visibility} onChange={e => setServiceForm({ ...serviceForm, visibility: e.target.value })}>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="hidden">Hidden</option>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6B5E4E' }}>
                <input type="checkbox" checked={serviceForm.featured} onChange={e => setServiceForm({ ...serviceForm, featured: e.target.checked })} />
                Featured
              </label>
              <textarea placeholder="Description" value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} style={{ gridColumn: 'span 2', minHeight: 60, border: '1px solid #E7D7BE', borderRadius: 10, padding: '10px 14px', fontSize: 13, resize: 'vertical' }} />
              <textarea placeholder="Time slots (one per line: day | time | label)" value={serviceForm.timeSlots} onChange={e => setServiceForm({ ...serviceForm, timeSlots: e.target.value })} style={{ gridColumn: 'span 2', minHeight: 60, border: '1px solid #E7D7BE', borderRadius: 10, padding: '10px 14px', fontSize: 13, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
                {saving ? 'Saving…' : editingServiceId ? 'Save Changes' : 'Add Service'}
              </button>
              {editingServiceId && (
                <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={cancelEditService} disabled={saving}>
                  <LuX size={14} /> Cancel
                </button>
              )}
            </div>
          </form>

          <h3 className={s.cardTitle} style={{ margin: '6px 2px 14px' }}>
            <span className={s.cardTitleIcon}><LuSparkles /></span>Service Catalog
            <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8 }}>
              <button type="button" onClick={async () => {
                try {
                  const res = await servicesApi.syncOfferings();
                  flash(`Website updated: ${res.mirrored} service(s) pushed to the Services page.`);
                  fetchAll();
                } catch (err) {
                  flash(err.message || 'Push failed', 'error');
                }
              }} className={`${s.btn} ${s.btnSm}`} title="Push all service edits to the public Services page" style={{ border: '1px solid #2E7D5B', borderRadius: 8, background: '#2E7D5B', cursor: 'pointer', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 12 }}>
                <LuRefreshCw size={13} /> Push to Website
              </button>
              <button type="button" onClick={async () => {
                try {
                  await servicesApi.syncOfficial();
                  flash('Official services synced.');
                  fetchAll();
                } catch (err) {
                  flash(err.message || 'Sync failed', 'error');
                }
              }} className={`${s.btn} ${s.btnSm}`} style={{ border: '1px solid #E7D7BE', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#6B5E4E', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 12 }}>
                <LuRefreshCw size={13} /> Sync Official
              </button>
            </span>
          </h3>
          {loading ? (
            <div className={s.catalogGrid}>{[1,2,3].map(i => <div key={i} className={`${s.skel} ${s.skelCard}`} style={{ height: 200 }} />)}</div>
          ) : services.length === 0 ? (
            <div className={`${s.card} ${s.emptyState}`}><div className={s.emptyIcon}>📋</div>No services yet — add one above.</div>
          ) : (
            <div className={s.catalogGrid} style={{ marginBottom: 26 }}>
              {services.map((svc) => {
                const inst = svc.instructor ? (typeof svc.instructor === 'object' ? svc.instructor.name : '') : '';
                const priceLabel = svc.pricingModel === 'monthly' ? '/mo' : svc.pricingModel === 'per_session' ? '/session' : svc.pricingModel === 'contact' ? '(Contact)' : '';
                const isActive = svc.active !== false && svc.visibility !== 'hidden';
                return (
                  <div key={svc._id} className={s.productCard} style={{ opacity: isActive ? 1 : 0.55 }}>
                    <div className={s.productCover}>
                      {svc.mode === 'online' ? '🌐' : svc.mode === 'home' ? '🏠' : svc.mode === 'center' ? '🏛' : svc.mode === 'hybrid' ? '🔄' : '🧘'}
                    </div>
                    <div className={s.productBody}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div className={s.productTitle}>{svc.name}</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {svc.featured && <span className={s.catTag} style={{ background: 'rgba(46,125,91,0.15)', color: '#2E7D5B' }}>Featured</span>}
                          {svc.isPopular && <span className={s.catTag} style={{ background: 'rgba(46,125,91,0.10)', color: '#D97706' }}>Popular</span>}
                          {svc.visibility === 'hidden' && <span className={s.catTag} style={{ background: 'rgba(220,38,38,0.10)', color: '#DC2626' }}>Hidden</span>}
                          <span className={s.catTag}>{svc.mode}</span>
                        </div>
                      </div>
                      <div className={s.productMeta}>{[svc.category, svc.type].filter(Boolean).join(' · ') || svc.mode}</div>
                      {svc.description && <div className={s.productMeta} style={{ color: 'var(--text-3)' }}>{svc.description}</div>}
                      <div className={s.productMeta}>
                        {svc.pricingModel && <span style={{ textTransform: 'capitalize' }}>{svc.pricingModel.replace('_', ' ')} · </span>}
                        {svc.sessionDuration > 0 && `${svc.sessionDuration} min · `}
                        {svc.totalSessions > 0 && `${svc.totalSessions} sessions · `}
                        {svc.validityDuration > 0 && `${svc.validityDuration} ${svc.validityUnit}`}
                        {inst && ` · ${inst}`}
                      </div>
                      <div className={s.productFoot}>
                        <div className={s.productPrice}>KES {fmtPrice(svc.price)} <span style={{ fontSize: 11, fontWeight: 400, color: '#9C8E7C' }}>{priceLabel}</span></div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" className={`${s.btn} ${s.btnSm}`} title="Edit service" onClick={() => startEditService(svc)}>
                            <LuPencil size={13} /> Edit
                          </button>
                          <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} onClick={() => handleDeleteService(svc._id, svc.name)} disabled={deletingId === svc._id}>
                            {deletingId === svc._id ? '…' : <LuTrash2 size={13} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════ INSTRUCTORS TAB ═══════════ */}
      {activeTab === 'instructors' && (
        <>
          <form onSubmit={handleSaveInstructor} className={s.card}>
            <h3 className={s.cardTitle}><span className={s.cardTitleIcon}>{editingInstructorId ? <LuPencil /> : <LuUsers />}</span>{editingInstructorId ? 'Edit Instructor' : 'Add Instructor'}</h3>
            <div className={s.grid3} style={{ marginBottom: 10 }}>
              <input type="text" placeholder="Instructor name *" value={instructorForm.name} onChange={e => setInstructorForm({ ...instructorForm, name: e.target.value })} />
              <input type="email" placeholder="Email" value={instructorForm.email} onChange={e => setInstructorForm({ ...instructorForm, email: e.target.value })} />
              <PhoneInput value={instructorForm.phone} onChange={(v) => setInstructorForm({ ...instructorForm, phone: v })} label="Phone" id="instructor-phone" />
              <input type="text" placeholder="Specialties (comma separated)" value={instructorForm.specialties} onChange={e => setInstructorForm({ ...instructorForm, specialties: e.target.value })} style={{ gridColumn: 'span 2' }} />
              <input type="text" placeholder="Bio (optional)" value={instructorForm.bio} onChange={e => setInstructorForm({ ...instructorForm, bio: e.target.value })} style={{ gridColumn: 'span 2' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
                {saving ? 'Saving…' : editingInstructorId ? 'Save Changes' : 'Add Instructor'}
              </button>
              {editingInstructorId && (
                <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={cancelEditInstructor} disabled={saving}>
                  <LuX size={14} /> Cancel
                </button>
              )}
            </div>
          </form>

          <h3 className={s.cardTitle} style={{ margin: '6px 2px 14px' }}><span className={s.cardTitleIcon}><LuUsers /></span>Instructors</h3>
          {loading ? (
            <div className={s.catalogGrid}>{[1,2,3].map(i => <div key={i} className={`${s.skel} ${s.skelCard}`} style={{ height: 160 }} />)}</div>
          ) : instructors.length === 0 ? (
            <div className={`${s.card} ${s.emptyState}`}><div className={s.emptyIcon}>👤</div>No instructors yet — add one above.</div>
          ) : (
            <div className={s.catalogGrid}>
              {instructors.map(inst => (
                <div key={inst._id} className={s.productCard}>
                  <div className={s.productCover}>👤</div>
                  <div className={s.productBody}>
                    <div className={s.productTitle}>{inst.name}</div>
                    <div className={s.productMeta}>{[inst.email, inst.phone].filter(Boolean).join(' · ') || '—'}</div>
                    {Array.isArray(inst.specialties) && inst.specialties.length > 0 && (
                      <div className={s.productMeta} style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {inst.specialties.map((sp, i) => <span key={i} className={s.catTag}>{sp}</span>)}
                      </div>
                    )}
                    {inst.bio && <div className={s.productMeta} style={{ color: 'var(--text-3)' }}>{inst.bio}</div>}
                      <div className={s.productFoot}>
                        <div className={s.productPrice} style={{ color: inst.active ? 'var(--green)' : 'var(--danger)', fontSize: 12 }}>
                          {inst.active ? 'Active' : 'Inactive'}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" className={`${s.btn} ${s.btnSm}`} title="Edit instructor" onClick={() => startEditInstructor(inst)}>
                            <LuPencil size={13} /> Edit
                          </button>
                          <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} onClick={() => handleDeleteInstructor(inst._id, inst.name)} disabled={deletingId === inst._id}>
                            {deletingId === inst._id ? '…' : <LuTrash2 size={13} />}
                          </button>
                        </div>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════ ENROLLMENTS TAB ═══════════ */}
      {activeTab === 'enrollments' && (
        <>
          {analytics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 18 }}>
              <div className={s.statCard} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: '#6B5E4E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Enrollments</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#2D1406', marginTop: 4 }}>{analytics.totalEnrollments}</div>
              </div>
              <div className={s.statCard} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: '#6B5E4E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#16A34A', marginTop: 4 }}>{analytics.activeEnrollments}</div>
              </div>
              <div className={s.statCard} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: '#6B5E4E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Revenue</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#2E7D5B', marginTop: 4 }}>KES {fmtPrice(analytics.totalRevenue)}</div>
              </div>
              <div className={s.statCard} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: '#6B5E4E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Expiring</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: analytics.expiringSoon > 0 ? '#D97706' : '#16A34A', marginTop: 4 }}>{analytics.expiringSoon}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleAssignService} className={s.card}>
            <h3 className={s.cardTitle}><span className={s.cardTitleIcon}><LuPlus /></span>Assign Service to Student</h3>
            <div className={s.grid3} style={{ marginBottom: 10 }}>
              <input type="text" placeholder="Student ID *" value={assignmentForm.studentId} onChange={e => setAssignmentForm({ ...assignmentForm, studentId: e.target.value })} />
              <select value={assignmentForm.serviceId} onChange={e => setAssignmentForm({ ...assignmentForm, serviceId: e.target.value })}>
                <option value="">Select service *</option>
                {services.map(svc => <option key={svc._id} value={svc._id}>{svc.name}</option>)}
              </select>
              <input type="number" placeholder="Price (leave blank for default)" value={assignmentForm.price} onChange={e => setAssignmentForm({ ...assignmentForm, price: e.target.value })} />
              <select value={assignmentForm.paymentStatus} onChange={e => setAssignmentForm({ ...assignmentForm, paymentStatus: e.target.value })}>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <select value={assignmentForm.method} onChange={e => setAssignmentForm({ ...assignmentForm, method: e.target.value })}>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
              </select>
            </div>
            <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
              {saving ? 'Assigning…' : 'Assign Service'}
            </button>
          </form>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
              <LuSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9C8E7C' }} />
              <input type="text" placeholder="Search by student name or email…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 36, width: '100%', border: '1px solid #E7D7BE', borderRadius: 10, padding: '10px 14px 10px 36px', fontSize: 13, background: '#fff' }}
              />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ border: '1px solid #E7D7BE', borderRadius: 10, padding: '10px 14px', fontSize: 13, background: '#fff' }}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {loading ? (
            <div className={`${s.skel} ${s.skelCard}`} style={{ height: 240 }} />
          ) : assignments.length === 0 ? (
            <div className={`${s.card} ${s.emptyState}`}><div className={s.emptyIcon}>📋</div>No enrollments found.</div>
          ) : (
            <div className={s.card} style={{ overflowX: 'auto', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E7D7BE', background: '#F8F4EC' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6B5E4E', whiteSpace: 'nowrap' }}>Student</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6B5E4E', whiteSpace: 'nowrap' }}>Service</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6B5E4E', whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6B5E4E', whiteSpace: 'nowrap' }}>Sessions</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6B5E4E', whiteSpace: 'nowrap' }}>Expiry</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6B5E4E', whiteSpace: 'nowrap' }}>Payment</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6B5E4E', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map(asgn => {
                    const studentName = asgn.user?.name || asgn.user?.email || '—';
                    const serviceName = asgn.serviceName || '—';
                    const isActive = asgn.isActive;
                    return (
                      <tr key={asgn._id} style={{ borderBottom: '1px solid rgba(231,215,190,0.4)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#2D1406' }}>{studentName}</td>
                        <td style={{ padding: '12px 16px', color: '#2D1406' }}>{serviceName}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px',
                            borderRadius: 20, fontSize: 11.5, fontWeight: 600,
                            color: isActive ? '#15803d' : '#b91c1c',
                            background: isActive ? 'rgba(34,197,94,0.13)' : 'rgba(239,68,68,0.12)',
                            textTransform: 'capitalize',
                          }}>{asgn.status}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6B5E4E' }}>{asgn.usedSessions || 0} / {asgn.totalSessions || 0}</td>
                        <td style={{ padding: '12px 16px', color: '#6B5E4E', whiteSpace: 'nowrap' }}>
                          {asgn.expiryDate ? new Date(asgn.expiryDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          {asgn.daysLeft != null && asgn.daysLeft > 0 && <span style={{ color: '#16A34A', marginLeft: 4 }}>({asgn.daysLeft}d)</span>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px',
                            borderRadius: 20, fontSize: 11.5, fontWeight: 600,
                            color: asgn.paymentStatus === 'paid' ? '#15803d' : asgn.paymentStatus === 'pending' ? '#b45309' : '#b91c1c',
                            background: asgn.paymentStatus === 'paid' ? 'rgba(34,197,94,0.13)' : asgn.paymentStatus === 'pending' ? 'rgba(245,158,11,0.14)' : 'rgba(239,68,68,0.12)',
                            textTransform: 'capitalize',
                          }}>{asgn.paymentStatus}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleRenewAssignment(asgn._id)} disabled={deletingId === asgn._id}
                              style={{ padding: '4px 10px', fontSize: 11.5, border: '1px solid #E7D7BE', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#6B5E4E' }}>
                              <LuRefreshCw size={12} />
                            </button>
                            <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleDeleteAssignment(asgn._id)} disabled={deletingId === asgn._id}
                              style={{ padding: '4px 10px', fontSize: 11.5, border: '1px solid #DC2626', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#DC2626' }}>
                              <LuTrash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
