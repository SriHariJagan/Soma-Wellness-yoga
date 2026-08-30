import React, { useState, useEffect, useMemo } from 'react';
import s from './CoursesPlans.module.css';
import { coursesApi, membershipPlansApi } from '../api/AdminServices.js';
import {
  LuGraduationCap, LuPlus, LuTrash2, LuCheck, LuCrown, LuBookOpen, LuPencil,
  LuEye, LuEyeOff, LuRefreshCw, LuSearch, LuLayoutGrid, LuTable, LuX,
  LuClock, LuUsers, LuDollarSign, LuTag, LuSparkles, LuSettings, LuInfo,
  LuCalendar, LuAward, LuTrendingUp, LuFilter, LuChevronDown, LuCopy
} from 'react-icons/lu';

// ─────────────────────────────────────────────────────────
// Professional constants
// ─────────────────────────────────────────────────────────
const MODE_OPTIONS = ['Online', 'Hybrid', 'Studio', 'Self-paced'];
const CATEGORY_OPTIONS = ['academy', 'group', 'other'];
const CURRENCY_OPTIONS = ['KES'];
const BADGE_OPTIONS = ['', 'Most Popular', 'Recommended', 'Best Value', 'Limited', 'New'];
const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', desc: 'Visible to everyone' },
  { value: 'private', label: 'Private', desc: 'Via direct link only' },
  { value: 'hidden', label: 'Hidden', desc: 'Not visible to users' },
];
const TIER_OPTIONS = ['', 'JUA', 'AMANI', 'UZIMA', 'FAMILY'];

const COURSE_ICONS = ['🧘', '🕉️', '🌅', '💪', '🌿', '🔥', '📚', '🎓'];

const EMPTY_COURSE = {
  title: '', duration: '', mode: 'Online', price: '', currency: 'KES',
  category: 'academy', hours: '', earlyPrice: '', earlyCap: '',
  installmentsAllowed: false, description: '', active: true,
};

const EMPTY_PLAN = {
  name: '', description: '', price: '', currency: 'KES', durationMonths: '', pauseDays: '',
  benefits: '', badge: '', isPopular: false, isRecommended: false,
  visibility: 'public', active: true, displayOrder: '', tier: '', originalPrice: '',
};

export default function CoursesPlans({ onChanged } = {}) {
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'plans'
  const [courses, setCourses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  // Courses state
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [courseFilterMode, setCourseFilterMode] = useState('all');
  const [courseView, setCourseView] = useState('grid');
  const [savingCourse, setSavingCourse] = useState(false);

  // Plans state
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planSearch, setPlanSearch] = useState('');
  const [planFilterVis, setPlanFilterVis] = useState('all');
  const [planView, setPlanView] = useState('grid');
  const [savingPlan, setSavingPlan] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const flash = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [co, pl] = await Promise.all([coursesApi.list(), membershipPlansApi.list()]);
      setCourses(co || []);
      setPlans(pl || []);
    } catch (err) {
      setError(err.message || 'Could not load courses & plans. Check your server connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Derived ──
  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchSearch = !courseSearch || c.title?.toLowerCase().includes(courseSearch.toLowerCase()) || c.description?.toLowerCase().includes(courseSearch.toLowerCase());
      const matchMode = courseFilterMode === 'all' || c.mode === courseFilterMode;
      return matchSearch && matchMode;
    });
  }, [courses, courseSearch, courseFilterMode]);

  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const matchSearch = !planSearch || p.name?.toLowerCase().includes(planSearch.toLowerCase()) || p.description?.toLowerCase().includes(planSearch.toLowerCase());
      const matchVis = planFilterVis === 'all' || p.visibility === planFilterVis;
      return matchSearch && matchVis;
    });
  }, [plans, planSearch, planFilterVis]);

  const courseStats = useMemo(() => ({
    total: courses.length,
    active: courses.filter(c => c.active !== false).length,
    online: courses.filter(c => c.mode === 'Online').length,
    avgPrice: courses.length ? Math.round(courses.reduce((a, c) => a + (Number(c.price) || 0), 0) / courses.length) : 0,
  }), [courses]);

  const planStats = useMemo(() => ({
    total: plans.length,
    active: plans.filter(p => p.active !== false).length,
    popular: plans.filter(p => p.isPopular).length,
    avgPrice: plans.length ? Math.round(plans.reduce((a, p) => a + (Number(p.price) || 0), 0) / plans.length) : 0,
  }), [plans]);

  // ── Course handlers ──
  const openCourseModal = (course = null) => {
    if (course) {
      setEditingCourse(course);
      setCourseForm({
        title: course.title || '',
        duration: course.duration || '',
        mode: course.mode || 'Online',
        price: String(course.price ?? ''),
        currency: course.currency || 'KES',
        category: course.category || 'academy',
        hours: String(course.hours ?? ''),
        earlyPrice: String(course.earlyPrice ?? ''),
        earlyCap: String(course.earlyCap ?? ''),
        installmentsAllowed: course.installmentsAllowed || false,
        description: course.description || '',
        active: course.active !== false,
      });
    } else {
      setEditingCourse(null);
      setCourseForm(EMPTY_COURSE);
    }
    setShowCourseModal(true);
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.title.trim()) { flash('Course title is required.', 'error'); return; }
    if (!courseForm.price || Number(courseForm.price) < 0) { flash('Valid price is required.', 'error'); return; }
    setSavingCourse(true);
    try {
      const payload = {
        title: courseForm.title.trim(),
        duration: courseForm.duration.trim(),
        mode: courseForm.mode,
        price: Number(courseForm.price) || 0,
        currency: courseForm.currency,
        category: courseForm.category,
        hours: courseForm.hours ? Number(courseForm.hours) : null,
        earlyPrice: courseForm.earlyPrice ? Number(courseForm.earlyPrice) : null,
        earlyCap: courseForm.earlyCap ? Number(courseForm.earlyCap) : null,
        installmentsAllowed: courseForm.installmentsAllowed,
        description: courseForm.description.trim(),
        active: courseForm.active,
      };
      let data;
      if (editingCourse) {
        data = await coursesApi.update(editingCourse._id, payload);
        setCourses(prev => prev.map(c => c._id === data._id ? data : c));
        flash(`Course "${data.title}" updated successfully.`);
      } else {
        data = await coursesApi.create(payload);
        setCourses(prev => [data, ...prev]);
        flash(`Course "${data.title}" created successfully.`);
      }
      setShowCourseModal(false);
      setEditingCourse(null);
      setCourseForm(EMPTY_COURSE);
      onChanged?.();
    } catch (err) {
      flash(err.message || 'Failed to save course.', 'error');
    } finally {
      setSavingCourse(false);
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
    } catch { flash('Failed to delete course.', 'error'); }
    finally { setDeletingId(null); }
  };

  const handleDuplicateCourse = async (course) => {
    try {
      const data = await coursesApi.create({
        title: `${course.title} (Copy)`,
        duration: course.duration,
        mode: course.mode,
        price: course.price,
        currency: course.currency,
        category: course.category,
        hours: course.hours,
        description: course.description,
        active: false,
      });
      setCourses(prev => [data, ...prev]);
      flash(`Course duplicated as "${data.title}".`);
    } catch (err) { flash(err.message || 'Failed to duplicate.', 'error'); }
  };

  // ── Plan handlers ──
  const openPlanModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name || '',
        description: plan.description || '',
        price: String(plan.price ?? ''),
        currency: plan.currency || 'KES',
        durationMonths: String(plan.durationMonths ?? ''),
        pauseDays: String(plan.pauseDays ?? ''),
        benefits: Array.isArray(plan.benefits) ? plan.benefits.join(', ') : (plan.benefits || ''),
        badge: plan.badge || '',
        isPopular: plan.isPopular || false,
        isRecommended: plan.isRecommended || false,
        visibility: plan.visibility || 'public',
        active: plan.active !== false,
        displayOrder: String(plan.displayOrder ?? ''),
        tier: plan.tier || '',
        originalPrice: String(plan.originalPrice ?? ''),
      });
    } else {
      setEditingPlan(null);
      setPlanForm(EMPTY_PLAN);
    }
    setShowPlanModal(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!planForm.name.trim() || planForm.durationMonths === '') {
      flash('Plan name and duration are required.', 'error'); return;
    }
    setSavingPlan(true);
    try {
      const payload = {
        name: planForm.name.trim(),
        description: planForm.description.trim(),
        price: Number(planForm.price) || 0,
        currency: planForm.currency,
        durationMonths: Number(planForm.durationMonths),
        pauseDays: Number(planForm.pauseDays) || 0,
        benefits: planForm.benefits ? planForm.benefits.split(',').map(b => b.trim()).filter(Boolean) : [],
        badge: planForm.badge || '',
        isPopular: planForm.isPopular,
        isRecommended: planForm.isRecommended,
        visibility: planForm.visibility,
        active: planForm.active,
        displayOrder: planForm.displayOrder ? Number(planForm.displayOrder) : 0,
        tier: planForm.tier || null,
        originalPrice: planForm.originalPrice ? Number(planForm.originalPrice) : null,
      };
      let data;
      if (editingPlan) {
        data = await membershipPlansApi.update(editingPlan._id, payload);
        setPlans(prev => prev.map(p => p._id === data._id ? data : p));
        flash(`Plan "${data.name}" updated.`);
      } else {
        data = await membershipPlansApi.create(payload);
        setPlans(prev => [data, ...prev]);
        flash(`Plan "${data.name}" created.`);
      }
      setShowPlanModal(false);
      setEditingPlan(null);
      setPlanForm(EMPTY_PLAN);
      onChanged?.();
    } catch (err) { flash(err.message || 'Failed to save plan.', 'error'); }
    finally { setSavingPlan(false); }
  };

  const handleDeletePlan = async (id, name) => {
    if (!window.confirm(`Delete plan "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await membershipPlansApi.remove(id);
      setPlans(prev => prev.filter(p => p._id !== id));
      flash(`Plan "${name}" deleted.`);
      onChanged?.();
    } catch { flash('Failed to delete plan.', 'error'); }
    finally { setDeletingId(null); }
  };

  const handleDuplicatePlan = async (plan) => {
    try {
      const data = await membershipPlansApi.create({
        name: `${plan.name} (Copy)`, description: plan.description, price: plan.price,
        currency: plan.currency, durationMonths: plan.durationMonths, pauseDays: plan.pauseDays,
        benefits: plan.benefits, badge: '', isPopular: false, isRecommended: false,
        visibility: 'hidden', active: false, displayOrder: 0, tier: plan.tier,
      });
      setPlans(prev => [data, ...prev]);
      flash(`Plan duplicated as "${data.title || data.name}".`);
    } catch (err) { flash(err.message || 'Failed to duplicate.', 'error'); }
  };

  const togglePlanActive = async (plan) => {
    try {
      const data = await membershipPlansApi.update(plan._id, { active: !plan.active });
      setPlans(prev => prev.map(p => p._id === data._id ? data : p));
      flash(`Plan "${data.name}" ${data.active ? 'enabled' : 'disabled'}.`);
    } catch (err) { flash(err.message || 'Failed to toggle.', 'error'); }
  };

  const handleSyncOfficial = async () => {
    if (!window.confirm('Reset to official 4 plans? Custom plans will be removed.')) return;
    setSyncing(true);
    try {
      const result = await membershipPlansApi.syncOfficial();
      setPlans(result.plans || []);
      flash(`Synced ${result.plans?.length || 0} official plans.`);
      onChanged?.();
    } catch (err) { flash(err.message || 'Sync failed.', 'error'); }
    finally { setSyncing(false); }
  };

  const fmtPrice = (n, cur = 'KES') => `${cur} ${Number(n || 0).toLocaleString('en-KE')}`;

  return (
    <div>
      {/* Header */}
      <div className={s.pageHeader}>
        <div className={s.pageTitleGroup}>
          <h1 className={s.pageTitle}>
            <span className={s.pageTitleIcon}><LuGraduationCap /></span>
            Courses & Membership
          </h1>
          <p className={s.pageSubtitle}>Manage your academy curriculum and membership tiers — all changes are saved live to the database and reflected on the website instantly.</p>
        </div>
        <div className={s.pageActions}>
          <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={fetchAll}><LuRefreshCw size={14} /> Refresh</button>
          {activeTab === 'courses'
            ? <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => openCourseModal()}><LuPlus size={14} /> New Course</button>
            : <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => openPlanModal()}><LuPlus size={14} /> New Plan</button>
          }
        </div>
      </div>

      {/* Stats */}
      <div className={s.statsGrid}>
        <div className={`${s.statCard} ${s.statCardAccent}`}>
          <div className={s.statTop}><span className={s.statIcon}><LuBookOpen size={16} /></span><span className={s.statLabel}>{activeTab === 'courses' ? 'Total Courses' : 'Total Plans'}</span></div>
          <div className={s.statValue}>{activeTab === 'courses' ? courseStats.total : planStats.total}</div>
          <div className={s.statSub}>{activeTab === 'courses' ? `${courseStats.active} active` : `${planStats.active} active`}</div>
        </div>
        <div className={`${s.statCard} ${s.statCardGold}`}>
          <div className={s.statTop}><span className={`${s.statIcon} ${s.statIconGold}`}><LuUsers size={16} /></span><span className={s.statLabel}>{activeTab === 'courses' ? 'Online' : 'Popular'}</span></div>
          <div className={s.statValue}>{activeTab === 'courses' ? courseStats.online : planStats.popular}</div>
          <div className={s.statSub}>{activeTab === 'courses' ? 'Online mode' : 'Marked popular'}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statTop}><span className={`${s.statIcon} ${s.statIconGreen}`}><LuDollarSign size={16} /></span><span className={s.statLabel}>Avg Price</span></div>
          <div className={s.statValue}>{fmtPrice(activeTab === 'courses' ? courseStats.avgPrice : planStats.avgPrice).replace('KES ', '')}</div>
          <div className={s.statSub}>KES average</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statTop}><span className={`${s.statIcon} ${s.statIconBlue}`}><LuTrendingUp size={16} /></span><span className={s.statLabel}>{activeTab === 'courses' ? 'Categories' : 'Display Order'}</span></div>
          <div className={s.statValue}>{activeTab === 'courses' ? new Set(courses.map(c=>c.category)).size : Math.max(0, ...plans.map(p=>p.displayOrder||0))}</div>
          <div className={s.statSub}>{activeTab === 'courses' ? 'Unique categories' : 'Max order'}</div>
        </div>
      </div>

      {feedback.message && (
        <div className={`${s.feedback} ${feedback.type === 'success' ? s.feedbackSuccess : s.feedbackError}`}>
          <span>{feedback.type === 'success' ? <LuCheck size={14} /> : '⚠'}</span> {feedback.message}
        </div>
      )}
      {error && (
        <div className={`${s.feedback} ${s.feedbackError}`}>
          {error} <button type="button" className={`${s.btn} ${s.btnSmall}`} style={{ marginLeft: 12 }} onClick={fetchAll}>Retry</button>
        </div>
      )}

      {/* Tabs */}
      <div className={s.tabs}>
        <button type="button" className={`${s.tab} ${activeTab === 'courses' ? s.tabActive : ''}`} onClick={() => setActiveTab('courses')}>
          <LuBookOpen size={14} /> Courses <span className={s.tabCount}>{courses.length}</span>
        </button>
        <button type="button" className={`${s.tab} ${activeTab === 'plans' ? s.tabActive : ''}`} onClick={() => setActiveTab('plans')}>
          <LuCrown size={14} /> Membership Plans <span className={s.tabCount}>{plans.length}</span>
        </button>
      </div>

      {/* ── COURSES TAB ── */}
      {activeTab === 'courses' && (
        <>
          <div className={s.toolbar}>
            <div className={s.searchWrap}>
              <LuSearch className={s.searchIcon} size={14} />
              <input className={s.searchInput} placeholder="Search courses by title or description…" value={courseSearch} onChange={e => setCourseSearch(e.target.value)} />
            </div>
            <div className={s.filterGroup}>
              <select className={s.filterSelect} value={courseFilterMode} onChange={e => setCourseFilterMode(e.target.value)}>
                <option value="all">All Modes</option>
                {MODE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <div className={s.viewToggle}>
                <button type="button" className={`${s.viewBtn} ${courseView === 'grid' ? s.viewBtnActive : ''}`} onClick={() => setCourseView('grid')} title="Grid view"><LuLayoutGrid size={14} /></button>
                <button type="button" className={`${s.viewBtn} ${courseView === 'table' ? s.viewBtnActive : ''}`} onClick={() => setCourseView('table')} title="Table view"><LuTable size={14} /></button>
              </div>
            </div>
          </div>

          <div className={s.sectionHeader}>
            <div>
              <h3 className={s.sectionTitle}><span className={s.sectionTitleIcon}><LuBookOpen /></span>Course Catalog <span style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', background:'var(--surface-3)', padding:'3px 8px', borderRadius:20, border:'1px solid var(--line-2)' }}>{filteredCourses.length} courses</span></h3>
              <div className={s.sectionDesc}>Professional curriculum — each course appears on the public catalog when active.</div>
            </div>
          </div>

          {loading ? (
            <div className={s.cardsGrid}>{[...Array(3)].map((_, i) => <div key={i} style={{ height: 200, background:'var(--surface-3)', borderRadius:16, animation:'pulse 1.4s infinite' }} />)}</div>
          ) : filteredCourses.length === 0 ? (
            <div className={s.emptyState}><div className={s.emptyIcon}><LuBookOpen /></div><div className={s.emptyTitle}>{courseSearch || courseFilterMode !== 'all' ? 'No matching courses' : 'No courses yet'}</div><div className={s.emptyText}>{courseSearch ? 'Try a different search or filter.' : 'Create your first professional course to start enrolling students.'}</div><button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => openCourseModal()}><LuPlus size={14} /> Add Course</button></div>
          ) : courseView === 'grid' ? (
            <div className={s.cardsGrid}>
              {filteredCourses.map((c, i) => (
                <div key={c._id} className={s.card}>
                  <div className={s.cardCover}>
                    <span className={s.cardCoverIcon}>{COURSE_ICONS[i % COURSE_ICONS.length]}</span>
                    {c.mode && <span className={s.cardBadge}>{c.mode}</span>}
                    {!c.active && <span className={s.cardBadge} style={{ background:'#6b7280', right: c.mode ? 72 : 10 }}>Inactive</span>}
                  </div>
                  <div className={s.cardBody}>
                    <div className={s.cardHeader}>
                      <div className={s.cardTitle}>{c.title}</div>
                      {c.hours && <span className={s.cardMeta}><LuClock size={10} /> {c.hours}h</span>}
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', fontSize:11, color:'var(--text-3)' }}>
                      {c.duration && <span style={{display:'inline-flex',alignItems:'center',gap:4}}><LuCalendar size={11} />{c.duration}</span>}
                      {c.category && <span style={{display:'inline-flex',alignItems:'center',gap:4}}><LuTag size={11} />{c.category}</span>}
                      {c.installmentsAllowed && <span style={{background:'rgba(46,125,91,0.10)', color:'#2E7D5B', padding:'2px 6px', borderRadius:6, fontWeight:700, border:'1px solid rgba(46,125,91,0.14)'}}>Instalments</span>}
                    </div>
                    {c.description && <div className={s.cardDesc}>{c.description}</div>}
                    {c.earlyPrice && <div style={{fontSize:11, color:'#92400e', background:'rgba(244,180,0,0.12)', padding:'6px 8px', borderRadius:8, border:'1px solid rgba(244,180,0,0.18)'}}>Early: KES {Number(c.earlyPrice).toLocaleString('en-KE')} {c.earlyCap ? `· Cap ${c.earlyCap}` : ''}</div>}
                    <div className={s.cardFooter}>
                      <div><div className={s.cardPrice}>{fmtPrice(c.price, c.currency)}</div><div className={s.cardPriceSub}>{c.currency || 'KES'} · {c.active ? 'Active' : 'Draft'}</div></div>
                      <div className={s.cardActions}>
                        <button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnGhost} ${s.btnIcon}`} onClick={() => handleDuplicateCourse(c)} title="Duplicate"><LuCopy size={13} /></button>
                        <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => openCourseModal(c)}><LuPencil size={12} /> Edit</button>
                        <button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnDanger} ${s.btnIcon}`} onClick={() => handleDeleteCourse(c._id, c.title)} disabled={deletingId===c._id}>{deletingId===c._id?'…':<LuTrash2 size={12} />}</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead><tr><th>Course</th><th>Mode</th><th>Duration</th><th>Hours</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredCourses.map(c => (
                    <tr key={c._id}>
                      <td><div style={{fontWeight:700}}>{c.title}</div><div style={{fontSize:11, color:'var(--text-3)'}}>{c.category}</div></td>
                      <td><span className={s.cardMeta}>{c.mode}</span></td>
                      <td>{c.duration || '—'}</td>
                      <td>{c.hours ? `${c.hours}h` : '—'}</td>
                      <td style={{fontWeight:700}}>{fmtPrice(c.price, c.currency)}</td>
                      <td><span style={{fontSize:11, padding:'3px 8px', borderRadius:20, background: c.active?'rgba(22,163,74,0.12)':'rgba(107,114,128,0.12)', color: c.active?'#15803D':'#6b7280', border:'1px solid currentColor', opacity:0.9}}>{c.active?'Active':'Draft'}</span></td>
                      <td><div style={{display:'flex', gap:6}}><button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={()=>openCourseModal(c)}><LuPencil size={12} /></button><button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnDanger}`} onClick={()=>handleDeleteCourse(c._id,c.title)}><LuTrash2 size={12} /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── PLANS TAB ── */}
      {activeTab === 'plans' && (
        <>
          <div className={s.toolbar}>
            <div className={s.searchWrap}>
              <LuSearch className={s.searchIcon} size={14} />
              <input className={s.searchInput} placeholder="Search plans by name or description…" value={planSearch} onChange={e => setPlanSearch(e.target.value)} />
            </div>
            <div className={s.filterGroup}>
              <select className={s.filterSelect} value={planFilterVis} onChange={e => setPlanFilterVis(e.target.value)}>
                <option value="all">All Visibility</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="hidden">Hidden</option>
              </select>
              <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={handleSyncOfficial} disabled={syncing} title="Reset to official plans"><LuRefreshCw size={12} className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing…' : 'Sync Official'}</button>
              <div className={s.viewToggle}>
                <button type="button" className={`${s.viewBtn} ${planView === 'grid' ? s.viewBtnActive : ''}`} onClick={() => setPlanView('grid')}><LuLayoutGrid size={14} /></button>
                <button type="button" className={`${s.viewBtn} ${planView === 'table' ? s.viewBtnActive : ''}`} onClick={() => setPlanView('table')}><LuTable size={14} /></button>
              </div>
            </div>
          </div>

          <div className={s.sectionHeader}>
            <div>
              <h3 className={s.sectionTitle}><span className={s.sectionTitleIcon}><LuCrown /></span>Membership Plans <span style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', background:'var(--surface-3)', padding:'3px 8px', borderRadius:20, border:'1px solid var(--line-2)' }}>{filteredPlans.length} plans</span></h3>
              <div className={s.sectionDesc}>Tiered membership — benefits, badge, and visibility control how plans appear on the pricing page.</div>
            </div>
          </div>

          {loading ? (
            <div className={s.cardsGrid}>{[...Array(3)].map((_,i)=><div key={i} style={{height:240, background:'var(--surface-3)', borderRadius:16}} />)}</div>
          ) : filteredPlans.length === 0 ? (
            <div className={s.emptyState}><div className={s.emptyIcon}><LuCrown /></div><div className={s.emptyTitle}>{planSearch || planFilterVis!=='all' ? 'No matching plans' : 'No plans yet'}</div><div className={s.emptyText}>Create a professional membership plan with pricing, benefits, and badge.</div><button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={()=>openPlanModal()}><LuPlus size={14} /> Add Plan</button></div>
          ) : planView === 'grid' ? (
            <div className={s.cardsGrid}>
              {filteredPlans.map(p => {
                const benefits = Array.isArray(p.benefits) ? p.benefits : [];
                return (
                  <div key={p._id} className={`${s.card} ${p.isPopular ? s.planPopular : ''}`}>
                    {p.isPopular && <div className={s.popularRibbon}>Popular</div>}
                    {p.badge && !p.isPopular && <span className={s.cardBadge} style={{background:'linear-gradient(135deg,#F4B400,#FFD54F)', color:'#183D2D'}}>{p.badge}</span>}
                    <div className={s.cardBody}>
                      <div className={s.cardHeader}>
                        <div className={s.cardTitle}>{p.name}</div>
                        {p.tier && <span className={s.planBadge}><LuAward size={10} />{p.tier}</span>}
                      </div>
                      <div style={{display:'flex', alignItems:'baseline', gap:6}}>
                        <span className={s.cardPrice}>{fmtPrice(p.price, p.currency)}</span>
                        <span className={s.cardPriceSub}>/ {p.durationMonths} mo · {p.pauseDays||0}d pause</span>
                      </div>
                      {p.originalPrice && <div style={{fontSize:11, color:'var(--text-3)'}}><span style={{textDecoration:'line-through'}}>{fmtPrice(p.originalPrice, p.currency)}</span> <span style={{color:'#16A34A', fontWeight:700}}>Save {fmtPrice(p.originalPrice - p.price, '')}</span></div>}
                      <div style={{fontSize:12, color:'var(--text-2)', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden'}}>{p.description || `${p.durationMonths} months access`}</div>
                      <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                        <span style={{fontSize:11, padding:'3px 8px', borderRadius:20, background: p.visibility==='hidden'?'rgba(220,38,38,0.10)': p.visibility==='private'?'rgba(59,130,246,0.10)':'rgba(22,163,74,0.10)', color: p.visibility==='hidden'?'#B91C1C': p.visibility==='private'?'#1D4ED8':'#15803D', border:'1px solid currentColor', opacity:0.9}}>{p.visibility==='hidden'?'🔒 Hidden': p.visibility==='private'?'🔗 Private':'🌐 Public'}</span>
                        {p.active===false && <span style={{fontSize:11, padding:'3px 8px', borderRadius:20, background:'rgba(107,114,128,0.12)', color:'#6b7280'}}>Inactive</span>}
                        {p.displayOrder!==undefined && <span style={{fontSize:11, padding:'3px 8px', borderRadius:20, background:'var(--surface-3)', color:'var(--text-2)', border:'1px solid var(--line-2)'}}>Order {p.displayOrder}</span>}
                      </div>
                      <ul style={{listStyle:'none', padding:0, margin:'4px 0 0', display:'flex', flexDirection:'column', gap:6}}>
                        {(benefits.length?benefits:['Full studio access','Live & recorded']).slice(0,4).map((b,i)=><li key={i} style={{display:'flex', gap:8, fontSize:12, color:'var(--text-2)'}}><span style={{width:16,height:16, borderRadius:'50%', background:'rgba(46,125,91,0.10)', color:'#2E7D5B', display:'grid', placeItems:'center', flexShrink:0, marginTop:1, border:'1px solid rgba(46,125,91,0.14)'}}><LuCheck size={10} /></span>{b}</li>)}
                        {benefits.length>4 && <li style={{fontSize:11, color:'var(--text-3)'}}>+{benefits.length-4} more benefits</li>}
                      </ul>
                      <div className={s.cardFooter}>
                        <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                          <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={()=>openPlanModal(p)}><LuPencil size={12} /> Edit</button>
                          <button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnGhost}`} onClick={()=>togglePlanActive(p)} title={p.active?'Disable':'Enable'}>{p.active?<LuEyeOff size={12} />:<LuEye size={12} />} {p.active?'Disable':'Enable'}</button>
                        </div>
                        <div style={{display:'flex', gap:6}}>
                          <button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnGhost} ${s.btnIcon}`} onClick={()=>handleDuplicatePlan(p)} title="Duplicate"><LuCopy size={12} /></button>
                          <button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnDanger} ${s.btnIcon}`} onClick={()=>handleDeletePlan(p._id,p.name)} disabled={deletingId===p._id}>{deletingId===p._id?'…':<LuTrash2 size={12} />}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead><tr><th>Plan</th><th>Price</th><th>Duration</th><th>Badge</th><th>Visibility</th><th>Active</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredPlans.map(p=>(
                    <tr key={p._id}>
                      <td><div style={{fontWeight:700}}>{p.name}</div><div style={{fontSize:11, color:'var(--text-3)'}}>{p.description?.slice(0,40)||'—'}</div></td>
                      <td style={{fontWeight:700}}>{fmtPrice(p.price, p.currency)}</td>
                      <td>{p.durationMonths} mo</td>
                      <td>{p.badge || (p.isPopular?'Popular': p.isRecommended?'Recommended':'—')}</td>
                      <td><span style={{fontSize:11, padding:'3px 8px', borderRadius:20, background: p.visibility==='hidden'?'rgba(220,38,38,0.10)':'rgba(22,163,74,0.10)', color: p.visibility==='hidden'?'#B91C1C':'#15803D'}}>{p.visibility}</span></td>
                      <td>{p.active!==false?'Yes':'No'}</td>
                      <td><div style={{display:'flex', gap:6}}><button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={()=>openPlanModal(p)}><LuPencil size={12} /></button><button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnDanger}`} onClick={()=>handleDeletePlan(p._id,p.name)}><LuTrash2 size={12} /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Course Modal ── */}
      {showCourseModal && (
        <div className={s.modalOverlay} onClick={()=>setShowCourseModal(false)}>
          <div className={`${s.modal} ${s.modalLarge}`} onClick={e=>e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div>
                <h3 className={s.modalTitle}><span className={s.modalTitleIcon}><LuBookOpen /></span>{editingCourse ? 'Edit Course' : 'New Course'}</h3>
                <div className={s.modalSubtitle}>{editingCourse ? 'Update course details — changes go live immediately.' : 'Create a professional course for the academy catalog.'}</div>
              </div>
              <button type="button" className={s.modalClose} onClick={()=>setShowCourseModal(false)}><LuX size={16} /></button>
            </div>
            <form onSubmit={handleSaveCourse} className={s.modalBody}>
              <div className={s.formSection}>
                <div className={s.formSectionTitle}><LuInfo size={12} /> Basic Information</div>
                <div className={s.formGrid}>
                  <div className={`${s.formField} ${s.formFieldFull}`}>
                    <label className={`${s.formLabel} ${s.formLabelRequired}`}>Course Title</label>
                    <input className={s.formInput} placeholder="e.g. 200hr Teacher Training" value={courseForm.title} onChange={e=>setCourseForm({...courseForm, title:e.target.value})} />
                  </div>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Category</label>
                    <select className={s.formSelect} value={courseForm.category} onChange={e=>setCourseForm({...courseForm, category:e.target.value})}>
                      {CATEGORY_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Mode</label>
                    <select className={s.formSelect} value={courseForm.mode} onChange={e=>setCourseForm({...courseForm, mode:e.target.value})}>
                      {MODE_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className={`${s.formField} ${s.formFieldFull}`}>
                    <label className={s.formLabel}>Description</label>
                    <textarea className={s.formTextarea} placeholder="Short description shown on catalog cards and detail page…" value={courseForm.description} onChange={e=>setCourseForm({...courseForm, description:e.target.value})} rows={3} />
                    <span className={s.formHelper}>60-140 characters recommended for best display.</span>
                  </div>
                </div>
              </div>

              <div className={s.formSection}>
                <div className={s.formSectionTitle}><LuCalendar size={12} /> Curriculum Details</div>
                <div className={s.formGrid}>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Duration</label>
                    <input className={s.formInput} placeholder="e.g. 3 Weeks, 2 Months" value={courseForm.duration} onChange={e=>setCourseForm({...courseForm, duration:e.target.value})} />
                  </div>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Hours</label>
                    <input className={s.formInput} type="number" placeholder="e.g. 200" value={courseForm.hours} onChange={e=>setCourseForm({...courseForm, hours:e.target.value})} />
                  </div>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Currency</label>
                    <select className={s.formSelect} value={courseForm.currency} onChange={e=>setCourseForm({...courseForm, currency:e.target.value})}>
                      {CURRENCY_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Status</label>
                    <select className={s.formSelect} value={courseForm.active ? 'active' : 'draft'} onChange={e=>setCourseForm({...courseForm, active:e.target.value==='active'})}>
                      <option value="active">Active — visible on site</option>
                      <option value="draft">Draft — hidden</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={s.formSection}>
                <div className={s.formSectionTitle}><LuDollarSign size={12} /> Pricing & Offers</div>
                <div className={s.formGrid}>
                  <div className={s.formField}>
                    <label className={`${s.formLabel} ${s.formLabelRequired}`}>Price ({courseForm.currency})</label>
                    <input className={s.formInput} type="number" placeholder="e.g. 42000" value={courseForm.price} onChange={e=>setCourseForm({...courseForm, price:e.target.value})} />
                  </div>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Early Price <span className={s.formLabelHint}>(optional)</span></label>
                    <input className={s.formInput} type="number" placeholder="e.g. 38000" value={courseForm.earlyPrice} onChange={e=>setCourseForm({...courseForm, earlyPrice:e.target.value})} />
                  </div>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Early Cap <span className={s.formLabelHint}>(seats)</span></label>
                    <input className={s.formInput} type="number" placeholder="e.g. 12" value={courseForm.earlyCap} onChange={e=>setCourseForm({...courseForm, earlyCap:e.target.value})} />
                  </div>
                  <div className={s.formField}>
                    <label className={s.formLabel} style={{marginTop:22}}>
                      <input type="checkbox" checked={courseForm.installmentsAllowed} onChange={e=>setCourseForm({...courseForm, installmentsAllowed:e.target.checked})} style={{accentColor:'var(--c-primary)'}} /> Allow installments
                    </label>
                  </div>
                </div>
              </div>
            </form>
            <div className={s.modalFooter}>
              <button type="button" className={s.btn} onClick={()=>setShowCourseModal(false)}>Cancel</button>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleSaveCourse} disabled={savingCourse}>{savingCourse ? 'Saving…' : editingCourse ? 'Update Course' : 'Create Course'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Plan Modal ── */}
      {showPlanModal && (
        <div className={s.modalOverlay} onClick={()=>setShowPlanModal(false)}>
          <div className={`${s.modal} ${s.modalLarge}`} onClick={e=>e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div>
                <h3 className={s.modalTitle}><span className={s.modalTitleIcon}><LuCrown /></span>{editingPlan ? 'Edit Plan' : 'New Membership Plan'}</h3>
                <div className={s.modalSubtitle}>{editingPlan ? 'Update pricing, benefits, and visibility.' : 'Create a professional membership tier for the pricing page.'}</div>
              </div>
              <button type="button" className={s.modalClose} onClick={()=>setShowPlanModal(false)}><LuX size={16} /></button>
            </div>
            <form onSubmit={handleSavePlan} className={s.modalBody}>
              <div className={s.formSection}>
                <div className={s.formSectionTitle}><LuSparkles size={12} /> Basic Information</div>
                <div className={s.formGrid}>
                  <div className={`${s.formField} ${s.formFieldFull}`}>
                    <label className={`${s.formLabel} ${s.formLabelRequired}`}>Plan Name</label>
                    <input className={s.formInput} placeholder="e.g. 6 Month Membership" value={planForm.name} onChange={e=>setPlanForm({...planForm, name:e.target.value})} />
                  </div>
                  <div className={`${s.formField} ${s.formFieldFull}`}>
                    <label className={s.formLabel}>Description</label>
                    <textarea className={s.formTextarea} placeholder="Short description shown on pricing cards (60-120 chars)…" value={planForm.description} onChange={e=>setPlanForm({...planForm, description:e.target.value})} rows={2} />
                  </div>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Tier <span className={s.formLabelHint}>(optional)</span></label>
                    <select className={s.formSelect} value={planForm.tier} onChange={e=>setPlanForm({...planForm, tier:e.target.value})}>
                      {TIER_OPTIONS.map(o=><option key={o} value={o}>{o||'No tier'}</option>)}
                    </select>
                  </div>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Badge</label>
                    <select className={s.formSelect} value={planForm.badge} onChange={e=>setPlanForm({...planForm, badge:e.target.value})}>
                      {BADGE_OPTIONS.map(o=><option key={o} value={o}>{o||'No badge'}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className={s.formSection}>
                <div className={s.formSectionTitle}><LuDollarSign size={12} /> Pricing & Duration</div>
                <div className={s.formGrid3}>
                  <div className={s.formField}>
                    <label className={`${s.formLabel} ${s.formLabelRequired}`}>Price</label>
                    <input className={s.formInput} type="number" placeholder="e.g. 7000" value={planForm.price} onChange={e=>setPlanForm({...planForm, price:e.target.value})} />
                  </div>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Currency</label>
                    <select className={s.formSelect} value={planForm.currency} onChange={e=>setPlanForm({...planForm, currency:e.target.value})}>
                      {CURRENCY_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Original Price <span className={s.formLabelHint}>(strikethrough)</span></label>
                    <input className={s.formInput} type="number" placeholder="e.g. 9000" value={planForm.originalPrice} onChange={e=>setPlanForm({...planForm, originalPrice:e.target.value})} />
                  </div>
                </div>
                <div className={s.formGrid3}>
                  <div className={s.formField}>
                    <label className={`${s.formLabel} ${s.formLabelRequired}`}>Duration (months)</label>
                    <input className={s.formInput} type="number" placeholder="e.g. 6" value={planForm.durationMonths} onChange={e=>setPlanForm({...planForm, durationMonths:e.target.value})} />
                  </div>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Pause Days</label>
                    <input className={s.formInput} type="number" placeholder="e.g. 30" value={planForm.pauseDays} onChange={e=>setPlanForm({...planForm, pauseDays:e.target.value})} />
                    <span className={s.formHelper}>Allowed pause during membership</span>
                  </div>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Display Order</label>
                    <input className={s.formInput} type="number" placeholder="e.g. 3" value={planForm.displayOrder} onChange={e=>setPlanForm({...planForm, displayOrder:e.target.value})} />
                  </div>
                </div>
              </div>

              <div className={s.formSection}>
                <div className={s.formSectionTitle}><LuAward size={12} /> Features & Benefits</div>
                <div className={s.formField}>
                  <label className={s.formLabel}>Benefits <span className={s.formLabelHint}>(comma separated, 3-6 recommended)</span></label>
                  <textarea className={s.formTextarea} placeholder="e.g. Unlimited Yoga Classes, Community Support, Membership Pause up to 30 Days, Free Personal Consultation" value={planForm.benefits} onChange={e=>setPlanForm({...planForm, benefits:e.target.value})} rows={3} />
                  <span className={s.formHelper}>Separate benefits with commas. First 4-5 shown on cards.</span>
                </div>
              </div>

              <div className={s.formSection}>
                <div className={s.formSectionTitle}><LuSettings size={12} /> Display & Visibility</div>
                <div className={s.formGrid}>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Visibility</label>
                    <select className={s.formSelect} value={planForm.visibility} onChange={e=>setPlanForm({...planForm, visibility:e.target.value})}>
                      {VISIBILITY_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label} — {o.desc}</option>)}
                    </select>
                  </div>
                  <div className={s.formField}>
                    <label className={s.formLabel}>Status</label>
                    <select className={s.formSelect} value={planForm.active ? 'active' : 'inactive'} onChange={e=>setPlanForm({...planForm, active: e.target.value==='active'})}>
                      <option value="active">Active — purchasable</option>
                      <option value="inactive">Inactive — hidden from checkout</option>
                    </select>
                  </div>
                </div>
                <div className={s.checkboxGroup}>
                  <label className={`${s.checkboxLabel} ${planForm.isPopular ? s.checkboxLabelChecked : ''}`}>
                    <input type="checkbox" checked={planForm.isPopular} onChange={e=>setPlanForm({...planForm, isPopular:e.target.checked})} /> <LuCrown size={12} /> Popular (highlighted)
                  </label>
                  <label className={`${s.checkboxLabel} ${planForm.isRecommended ? s.checkboxLabelChecked : ''}`}>
                    <input type="checkbox" checked={planForm.isRecommended} onChange={e=>setPlanForm({...planForm, isRecommended:e.target.checked})} /> <LuAward size={12} /> Recommended
                  </label>
                </div>
              </div>
            </form>
            <div className={s.modalFooter}>
              <button type="button" className={s.btn} onClick={()=>setShowPlanModal(false)}>Cancel</button>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleSavePlan} disabled={savingPlan}>{savingPlan ? 'Saving…' : editingPlan ? 'Update Plan' : 'Create Plan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
