import React, { useState, useEffect } from 'react';
import s from './YogaAdmin.module.css';
import { PageHeader } from './ui/Primitives';
import { coursesApi, membershipPlansApi } from '../api/AdminServices.js';
import { LuRefreshCw } from 'react-icons/lu';
import { LuGraduationCap, LuPlus, LuTrash2, LuCheck, LuCrown, LuBookOpen, LuPencil, LuEye, LuEyeOff, LuToggleLeft, LuToggleRight } from 'react-icons/lu';

const EMPTY_COURSE = { title: '', duration: '', mode: 'Online', price: '', description: '' };
const EMPTY_PLAN = { name: '', description: '', price: '', durationMonths: '', pauseDays: '', benefits: '', badge: '', isPopular: false, isRecommended: false, visibility: 'public' };

const COURSE_ICONS = ['🧘', '🕉️', '🌅', '💪', '🌿', '🔥'];

const BADGE_OPTIONS = ['', 'Most Popular', 'Recommended', 'Best Value'];

export default function CoursesPlans({ onChanged } = {}) {
  const [courses, setCourses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);
  const [savingCourse, setSavingCourse] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const flash = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [co, pl] = await Promise.all([coursesApi.list(), membershipPlansApi.list()]);
      setCourses(co);
      setPlans(pl);
    } catch (err) {
      setError(err.message || 'Could not load courses & plans. Check your server connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.title) { flash('Course title is required.', 'error'); return; }
    setSavingCourse(true);
    try {
      const data = await coursesApi.create({
        title: courseForm.title,
        duration: courseForm.duration,
        mode: courseForm.mode,
        price: Number(courseForm.price) || 0,
        description: courseForm.description,
      });
      setCourses(prev => [data, ...prev]);
      setCourseForm(EMPTY_COURSE);
      flash(`Course "${data.title}" added.`);
      onChanged?.();
    } catch (err) {
      flash(err.message || 'Failed to add course.', 'error');
    } finally {
      setSavingCourse(false);
    }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!planForm.name || planForm.durationMonths === '') {
      flash('Plan name and duration (months) are required.', 'error');
      return;
    }

    const payload = {
      name: planForm.name,
      description: planForm.description || '',
      price: Number(planForm.price) || 0,
      durationMonths: Number(planForm.durationMonths),
      pauseDays: Number(planForm.pauseDays) || 0,
      benefits: planForm.benefits
        ? planForm.benefits.split(',').map(b => b.trim()).filter(Boolean)
        : [],
      badge: planForm.badge || '',
      isPopular: planForm.isPopular,
      isRecommended: planForm.isRecommended,
      visibility: planForm.visibility || 'public',
    };

    setSavingPlan(true);
    try {
      if (editingPlan) {
        const data = await membershipPlansApi.update(editingPlan._id, payload);
        setPlans(prev => prev.map(p => p._id === data._id ? data : p));
        flash(`Plan "${data.name}" updated.`);
      } else {
        const data = await membershipPlansApi.create(payload);
        setPlans(prev => [data, ...prev]);
        flash(`Plan "${data.name}" added.`);
      }
      setPlanForm(EMPTY_PLAN);
      setEditingPlan(null);
      onChanged?.();
    } catch (err) {
      flash(err.message || 'Failed to save plan.', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (id, name) => {
    if (!window.confirm(`Delete plan "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await membershipPlansApi.remove(id);
      setPlans(prev => prev.filter(p => p._id !== id));
      flash(`Plan "${name}" deleted.`);
      onChanged?.();
    } catch {
      flash('Failed to delete plan.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const startEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name || '',
      description: plan.description || '',
      price: String(plan.price || ''),
      durationMonths: String(plan.durationMonths || ''),
      pauseDays: String(plan.pauseDays || ''),
      benefits: Array.isArray(plan.benefits) ? plan.benefits.join(', ') : '',
      badge: plan.badge || '',
      isPopular: plan.isPopular || false,
      isRecommended: plan.isRecommended || false,
      visibility: plan.visibility || 'public',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingPlan(null);
    setPlanForm(EMPTY_PLAN);
  };

  const togglePlanActive = async (plan) => {
    try {
      const data = await membershipPlansApi.update(plan._id, { active: !plan.active });
      setPlans(prev => prev.map(p => p._id === data._id ? data : p));
      flash(`Plan "${data.name}" ${data.active ? 'enabled' : 'disabled'}.`);
      onChanged?.();
    } catch (err) {
      flash(err.message || 'Failed to toggle plan.', 'error');
    }
  };

  const togglePlanVisibility = async (plan) => {
    const newVis = plan.visibility === 'hidden' ? 'public' : 'hidden';
    try {
      const data = await membershipPlansApi.update(plan._id, { visibility: newVis });
      setPlans(prev => prev.map(p => p._id === data._id ? data : p));
      flash(`Plan "${data.name}" is now ${newVis}.`);
      onChanged?.();
    } catch (err) {
      flash(err.message || 'Failed to update plan visibility.', 'error');
    }
  };

  const handleSyncOfficial = async () => {
    if (!window.confirm('This will reset all plans to the official 4 offerings. Any custom plans you created will be removed. Continue?')) return;
    setSyncing(true);
    try {
      const result = await membershipPlansApi.syncOfficial();
      setPlans(result.plans || []);
      flash(`Synced ${result.plans?.length || 0} official plans.`, 'success');
      onChanged?.();
    } catch (err) {
      flash(err.message || 'Failed to sync plans.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteCourse = async (id, title) => {
    if (!window.confirm(`Delete course "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await coursesApi.remove(id);
      setCourses(prev => prev.filter(c => c._id !== id));
      flash(`Course "${title}" deleted.`);
      onChanged?.();
    } catch {
      flash('Failed to delete course.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const fmtPrice = (n) => Number(n || 0).toLocaleString('en-IN');

  return (
    <div>
      <PageHeader title="Product Catalog" subtitle="Manage curriculum and membership tiers — saved to the database" />

      {feedback.message && (
        <div className={`${s.feedbackInline} ${feedback.type === 'success' ? s.bannerSuccess : s.bannerError}`}>
          <span className={s.bannerIcon}>{feedback.type === 'success' ? '✓' : '⚠'}</span>{feedback.message}
        </div>
      )}
      {error && (
        <div className={`${s.feedbackInline} ${s.bannerError}`}>
          {error}
          <button type="button" className={`${s.btn} ${s.btnSm}`} style={{ marginLeft: 12 }} onClick={fetchAll}>Retry</button>
        </div>
      )}

      {/* Courses */}
      <form onSubmit={handleSaveCourse} className={s.card}>
        <h3 className={s.cardTitle}><span className={s.cardTitleIcon}><LuBookOpen /></span>Add Course</h3>
        <div className={s.grid3} style={{ marginBottom: '10px' }}>
          <input type="text" placeholder="Course title *" value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} />
          <input type="text" placeholder="Duration (e.g. 3 Weeks)" value={courseForm.duration} onChange={e => setCourseForm({ ...courseForm, duration: e.target.value })} />
          <select value={courseForm.mode} onChange={e => setCourseForm({ ...courseForm, mode: e.target.value })}>
            <option value="Online">Online</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Studio">Studio</option>
          </select>
          <input type="number" placeholder="Price (₹)" value={courseForm.price} onChange={e => setCourseForm({ ...courseForm, price: e.target.value })} />
          <input type="text" placeholder="Short description (optional)" value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} style={{ gridColumn: 'span 2' }} />
        </div>
        <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={savingCourse}>
          {savingCourse ? 'Saving…' : 'Add Course'}
        </button>
      </form>

      <h3 className={s.cardTitle} style={{ margin: '6px 2px 14px' }}><span className={s.cardTitleIcon}><LuGraduationCap /></span>Course Catalog</h3>
      {loading ? (
        <div className={s.catalogGrid}>{[...Array(3)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelCard}`} style={{ height: 200 }} />)}</div>
      ) : courses.length === 0 ? (
        <div className={`${s.card} ${s.emptyState}`}><div className={s.emptyIcon}>📚</div>No courses yet — add one above.</div>
      ) : (
        <div className={s.catalogGrid} style={{ marginBottom: 26 }}>
          {courses.map((c, i) => (
            <div key={c._id} className={s.productCard}>
              <div className={s.productCover}>{COURSE_ICONS[i % COURSE_ICONS.length]}</div>
              <div className={s.productBody}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div className={s.productTitle}>{c.title}</div>
                  {c.mode && <span className={s.catTag}>{c.mode}</span>}
                </div>
                <div className={s.productMeta}>{[c.duration].filter(Boolean).join(' · ') || 'Self-paced'}</div>
                {c.description && <div className={s.productMeta} style={{ color: 'var(--text-3)' }}>{c.description}</div>}
                <div className={s.productFoot}>
                  <div className={s.productPrice}>₹{fmtPrice(c.price)}</div>
                  <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} onClick={() => handleDeleteCourse(c._id, c.title)} disabled={deletingId === c._id}>
                    {deletingId === c._id ? '…' : <LuTrash2 size={13} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plans */}
      <form onSubmit={handleSavePlan} className={s.card}>
        <h3 className={s.cardTitle}>
          <span className={s.cardTitleIcon}><LuCrown /></span>
          {editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Add Membership Pass'}
        </h3>

        <div className={s.grid2} style={{ marginBottom: '10px' }}>
          <input type="text" placeholder="Plan name *" value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} />
          <input type="number" placeholder="Price (₹)" value={planForm.price} onChange={e => setPlanForm({ ...planForm, price: e.target.value })} />
          <input type="number" placeholder="Duration (months) *" value={planForm.durationMonths} onChange={e => setPlanForm({ ...planForm, durationMonths: e.target.value })} />
          <input type="number" placeholder="Pause days allowed" value={planForm.pauseDays} onChange={e => setPlanForm({ ...planForm, pauseDays: e.target.value })} />
        </div>

        <textarea
          placeholder="Short description (shown on pricing cards)"
          value={planForm.description}
          onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
          style={{ width: '100%', minHeight: 60, marginBottom: 10, padding: 10, borderRadius: 10, border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: 13, resize: 'vertical' }}
        />

        <input
          type="text" placeholder="Benefits (comma separated)"
          value={planForm.benefits}
          onChange={e => setPlanForm({ ...planForm, benefits: e.target.value })}
          style={{ marginBottom: 10 }}
        />

        <div className={s.grid3} style={{ marginBottom: '10px' }}>
          <select value={planForm.badge} onChange={e => setPlanForm({ ...planForm, badge: e.target.value })}>
            {BADGE_OPTIONS.map(b => <option key={b} value={b}>{b || 'No badge'}</option>)}
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={planForm.isPopular} onChange={e => setPlanForm({ ...planForm, isPopular: e.target.checked })} />
            Popular
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={planForm.isRecommended} onChange={e => setPlanForm({ ...planForm, isRecommended: e.target.checked })} />
            Recommended
          </label>

          <select value={planForm.visibility} onChange={e => setPlanForm({ ...planForm, visibility: e.target.value })}>
            <option value="public">Public</option>
            <option value="private">Private (via link)</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={savingPlan}>
            {savingPlan ? 'Saving…' : editingPlan ? 'Update Plan' : 'Add Plan'}
          </button>
          {editingPlan && (
            <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={cancelEdit}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 2px 14px' }}>
        <h3 className={s.cardTitle} style={{ margin: 0 }}><span className={s.cardTitleIcon}><LuCrown /></span>Membership Passes</h3>
        <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnSecondary}`} onClick={handleSyncOfficial} disabled={syncing} title="Reset to official plans">
          <LuRefreshCw size={13} className={syncing ? s.spin : ''} style={syncing ? { animation: 'spin 1s linear infinite' } : {}} /> {syncing ? 'Syncing…' : 'Sync Official'}
        </button>
      </div>
      {loading ? (
        <div className={s.catalogGrid}>{[...Array(3)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelCard}`} style={{ height: 220 }} />)}</div>
      ) : plans.length === 0 ? (
        <div className={`${s.card} ${s.emptyState}`}><div className={s.emptyIcon}>💳</div>No plans yet — add one above.</div>
      ) : (
        <div className={s.catalogGrid}>
          {plans.map((p) => {
            const benefits = Array.isArray(p.benefits) ? p.benefits : [];
            return (
              <div key={p._id} className={`${s.planCard} ${p.isPopular ? s.planPopular : ''}`}>
                {p.badge && <span className={s.popularBadge}><LuCrown size={11} style={{ verticalAlign: '-1px' }} /> {p.badge}</span>}
                <div className={s.planName}>{p.name}</div>
                <div className={s.planPrice}>₹{fmtPrice(p.price)}<span className={s.planPriceUnit}> / {p.durationMonths} mo</span></div>
                <div className={s.productMeta}>
                  {p.description ? `${p.description.slice(0, 60)}${p.description.length > 60 ? '…' : ''}` : `${p.durationMonths} Month${p.durationMonths > 1 ? 's' : ''} access`}
                </div>

                {p.visibility && (
                  <div style={{ fontSize: 11, color: p.visibility === 'hidden' ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
                    {p.visibility === 'hidden' ? '🔒 Hidden' : p.visibility === 'private' ? '🔗 Private' : '🌐 Public'}
                  </div>
                )}

                <ul className={s.planFeatures}>
                  {(benefits.length ? benefits : ['Full studio access', 'Live & recorded sessions']).slice(0, 5).map((b, i) => (
                    <li key={i} className={s.planFeat}><span className={s.planFeatCheck}><LuCheck size={14} /></span>{b}</li>
                  ))}
                </ul>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnSecondary}`} onClick={() => startEditPlan(p)}>
                    <LuPencil size={13} /> Edit
                  </button>
                  <button type="button" className={`${s.btn} ${s.btnSm} ${p.active ? s.btnWarning : s.btnSuccess}`} onClick={() => togglePlanActive(p)} title={p.active ? 'Disable plan' : 'Enable plan'}>
                    {p.active ? <LuToggleLeft size={14} /> : <LuToggleRight size={14} />} {p.active ? 'Disable' : 'Enable'}
                  </button>
                  <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnSecondary}`} onClick={() => togglePlanVisibility(p)} title={p.visibility === 'hidden' ? 'Make visible' : 'Hide plan'}>
                    {p.visibility === 'hidden' ? <LuEye size={13} /> : <LuEyeOff size={13} />}
                  </button>
                  <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} onClick={() => handleDeletePlan(p._id, p.name)} disabled={deletingId === p._id}>
                    {deletingId === p._id ? '…' : <><LuTrash2 size={13} /> Delete</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
