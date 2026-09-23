import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReceptionModal from '../Modal.jsx';
import { useAuth } from '../../../context/AuthContext';
import { receptionApi } from '../../api/AdminServices';
import {
  LuLock, LuCheck, LuTriangleAlert, LuPlus, LuX, LuMail, LuRefreshCw,
  LuSearch, LuEye, LuUsers, LuSend, LuCopy, LuCalendarDays, LuClock, LuSparkles,
} from 'react-icons/lu';
import s from '../../Admin/YogaAdmin.module.css';

const EMPTY_CREATE = {
  title: '', date: new Date().toISOString().slice(0, 10),
  startTime: '07:00', endTime: '', instructor: '',
  platform: 'Zoom', meetingLink: '', notes: '',
};

const SOURCE_TABS = [
  { id: 'custom', label: 'Pick students', icon: <LuSearch size={13} /> },
  { id: 'service', label: 'By service', icon: <LuSparkles size={13} /> },
  { id: 'membership', label: 'By membership', icon: <LuUsers size={13} /> },
  { id: 'all', label: 'Everyone', icon: <LuMail size={13} /> },
];

const TIERS = ['Bronze', 'Silver', 'Gold'];

const PLATFORM_STYLE = {
  Zoom: { bg: 'rgba(45,122,219,0.10)', fg: '#2563EB', border: 'rgba(45,122,219,0.20)' },
  Offline: { bg: 'rgba(22,163,74,0.10)', fg: '#15803D', border: 'rgba(22,163,74,0.20)' },
  Hybrid: { bg: 'rgba(124,58,237,0.10)', fg: '#6D28D9', border: 'rgba(124,58,237,0.20)' },
};

function inviteBadge(status) {
  const st = String(status || '').toLowerCase();
  const cls = st === 'active' ? s.badgeGreen : st === 'cancelled' ? s.badgeRed : st === 'completed' ? s.badgeBlue : s.badgeAmber;
  return <span className={`${s.badge} ${cls}`}>{status || 'pending'}</span>;
}

function formatInviteDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-KE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function PickRow({ id, name, sub, badge, checked, onToggle, disabled }) {
  return (
    <label className={`${s.recPickItem} ${checked ? s['recPickItem--on'] : ''}`} style={disabled ? { cursor: 'default', opacity: 0.6 } : undefined}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={() => onToggle(id)} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className={s.recPickName}>{name}</span>
        {sub && <span className={s.recPickSub}>{sub}</span>}
      </span>
      {badge}
    </label>
  );
}

export default function ClassInvitesTab() {
  const { hasAnyPermission } = useAuth();
  const [invites, setInvites] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [source, setSource] = useState('custom');
  const [selectedIds, setSelectedIds] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [serviceOptions, setServiceOptions] = useState([]);
  const [serviceId, setServiceId] = useState('');
  const [serviceStudents, setServiceStudents] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [tier, setTier] = useState('Silver');
  const [tierStudents, setTierStudents] = useState([]);
  const [tierLoading, setTierLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [actioningId, setActioningId] = useState(null);

  const canView = hasAnyPermission('bookings.view', 'sections.view');
  const canCreate = hasAnyPermission('bookings.create', 'sections.booking');
  const canCancel = hasAnyPermission('bookings.cancel');
  const canListStudents = hasAnyPermission('customers.view', 'users.view');

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const loadData = useCallback(async () => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    try {
      const [inv, st] = await Promise.all([
        receptionApi.classInvites.list({ search, status: statusFilter !== 'all' ? statusFilter : undefined, limit: 50 }).catch(() => []),
        receptionApi.classInvites.stats().catch(() => null),
      ]);
      setInvites(Array.isArray(inv) ? inv : (inv?.invites || []));
      setStats(st);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load class invites.' });
    }
    setLoading(false);
  }, [search, statusFilter, canView]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = async () => {
    setCreateForm(EMPTY_CREATE);
    setSource('custom');
    setSelectedIds([]);
    setStudentSearch('');
    setServiceId('');
    setServiceStudents([]);
    setTierStudents([]);
    setShowCreate(true);
    if (canListStudents && allStudents.length === 0) {
      setStudentsLoading(true);
      try {
        const all = await receptionApi.students.list({});
        setAllStudents(Array.isArray(all) ? all : []);
      } catch {
        setAllStudents([]);
      }
      setStudentsLoading(false);
    }
    try {
      const catalog = await receptionApi.catalog().catch(() => null);
      if (catalog && Array.isArray(catalog.services)) setServiceOptions(catalog.services);
    } catch {
      setServiceOptions([]);
    }
  };

  const customPool = useMemo(() => {
    const list = allStudents.filter((st) => st.status !== 'banned');
    const q = studentSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((st) =>
      (st.name || '').toLowerCase().includes(q) ||
      (st.email || '').toLowerCase().includes(q) ||
      (st.phone || '').includes(q)
    );
  }, [allStudents, studentSearch]);

  const loadServiceStudents = async (sid) => {
    setServiceId(sid);
    setServiceStudents([]);
    if (!sid) return;
    setServiceLoading(true);
    try {
      const res = await receptionApi.classInvites.getServiceEligibleStudents(sid);
      const list = Array.isArray(res?.students) ? res.students : [];
      setServiceStudents(list);
      setSelectedIds(list.map((st) => String(st._id)));
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load service members.' });
    }
    setServiceLoading(false);
  };

  const loadTierStudents = async (t) => {
    setTier(t);
    setTierStudents([]);
    setTierLoading(true);
    try {
      const res = await receptionApi.classInvites.recipients({ type: 'all_members', planType: t });
      const list = Array.isArray(res) ? res : [];
      setTierStudents(list);
      setSelectedIds(list.map((st) => String(st._id)));
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load members.' });
    }
    setTierLoading(false);
  };

  const toggleId = (id) => {
    const sid = String(id);
    setSelectedIds((prev) => (prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]));
  };

  const selectAllVisible = (list) => {
    const ids = list.map((st) => String(st._id || st.id)).filter(Boolean);
    setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
  };

  const switchSource = (id) => {
    setSource(id);
    setSelectedIds([]);
    if (id === 'membership' && tierStudents.length === 0 && !tierLoading) loadTierStudents(tier);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.date || !createForm.startTime) {
      setFeedback({ type: 'error', message: 'Title, date and start time are required.' });
      return;
    }
    let studentIds = [...selectedIds];
    let recipientType = 'custom';
    let recipientFilter = {};
    if (source === 'all') {
      const pool = allStudents.filter((st) => st.status !== 'banned');
      studentIds = pool.map((st) => String(st._id));
    } else if (source === 'service' && serviceId) {
      recipientType = 'service_members';
      recipientFilter = { serviceId };
    } else if (source === 'membership') {
      recipientType = 'all_members';
      recipientFilter = { planType: tier };
    }
    if (studentIds.length === 0) {
      setFeedback({ type: 'error', message: 'Select at least one student for this invite.' });
      return;
    }
    setSaving(true);
    try {
      await receptionApi.classInvites.create({
        title: createForm.title.trim(),
        date: createForm.date,
        startTime: createForm.startTime,
        endTime: createForm.endTime || undefined,
        instructor: createForm.instructor.trim() || undefined,
        platform: createForm.platform || 'Zoom',
        meetingLink: createForm.meetingLink.trim() || undefined,
        notes: createForm.notes.trim() || undefined,
        recipientType,
        ...(Object.keys(recipientFilter).length > 0 ? { recipientFilter } : {}),
        studentIds,
      });
      setShowCreate(false);
      setSelectedIds([]);
      setFeedback({ type: 'success', message: `Invite sent to ${studentIds.length} student${studentIds.length !== 1 ? 's' : ''}.` });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create class invite.' });
    }
    setSaving(false);
  };

  const handleCancel = async (inv) => {
    if (!window.confirm(`Cancel invite "${inv.title}"? Invited students will be notified.`)) return;
    setActioningId(inv._id);
    try {
      await receptionApi.classInvites.cancel(inv._id);
      setFeedback({ type: 'success', message: 'Invite cancelled.' });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to cancel invite.' });
    }
    setActioningId(null);
  };

  const handleResend = async (inv) => {
    setActioningId(inv._id);
    try {
      const res = await receptionApi.classInvites.resend(inv._id);
      setFeedback({ type: 'success', message: `Reminder resent to ${res?.sentCount ?? 'pending'} student(s).` });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to resend invite.' });
    }
    setActioningId(null);
  };

  const handleDuplicate = async (inv) => {
    setActioningId(inv._id);
    try {
      await receptionApi.classInvites.duplicate(inv._id);
      setFeedback({ type: 'success', message: `Invite "${inv.title}" duplicated.` });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to duplicate invite.' });
    }
    setActioningId(null);
  };

  const handleView = async (inv) => {
    try {
      const full = await receptionApi.classInvites.get(inv._id);
      setDetail(full?.invite || full);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load invite details.' });
    }
  };

  if (!canView) {
    return (
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}><LuMail size={20} /> Class Invites</h2>
        </div>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}><LuLock size={40} /></div>
          <h3 className={s.emptyTitle}>No access</h3>
          <p className={s.emptyDesc}>You don't have permission to view class invites. Contact an admin to grant bookings.view access.</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total invites', value: stats?.total ?? invites.length, icon: <LuMail size={18} /> },
    { label: 'Active', value: stats?.active ?? 0, icon: <LuSend size={18} /> },
    { label: 'Upcoming', value: stats?.upcoming ?? 0, icon: <LuCalendarDays size={18} /> },
    { label: 'Cancelled', value: stats?.cancelled ?? 0, icon: <LuX size={18} /> },
  ];

  return (
    <div className={s.recPage}>
      <div className={s.sectionHeader}>
        <h2 className={s.sectionTitle}>
          <LuMail size={20} /> Class Invites
          <span className={s.chipCount} style={{ fontSize: 12 }}>· {stats?.total ?? invites.length} total</span>
        </h2>
        <div className={s.toolbar}>
          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={loadData} disabled={loading} title="Refresh">
            <LuRefreshCw size={14} className={loading ? s.spin : ''} /> Refresh
          </button>
          {canCreate && (
            <button type="button" className={s.topCreate} onClick={openCreate}>
              <LuPlus size={16} /> New Invite
            </button>
          )}
        </div>
      </div>

      <div className={s.recSummary}>
        {statCards.map((st) => (
          <div key={st.label} className={s.recSummaryCell}>
            <div className={s.statLabel}>{st.label}</div>
            <div className={s.recSummaryValue}>{st.value}</div>
          </div>
        ))}
      </div>

      {feedback && (
        <div className={`${s.feedbackInline} ${feedback.type === 'success' ? s.bannerSuccess : s.bannerError}`}>
          <span>{feedback.type === 'success' ? <LuCheck size={15} /> : <LuTriangleAlert size={15} />}</span>
          <span>{feedback.message}</span>
          <button type="button" className={s.btnGhost} onClick={() => setFeedback(null)} aria-label="Dismiss">
            <LuX size={14} />
          </button>
        </div>
      )}

      <div className={s.filterBar} style={{ marginBottom: 16 }}>
        <div className={s.searchWrapper} style={{ maxWidth: 420 }}>
          <span className={s.searchIcon}><LuSearch size={16} /></span>
          <input
            className={s.searchInput}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title or instructor…"
            aria-label="Search invites"
          />
          {searchInput && (
            <button type="button" className={s.searchClear} onClick={() => setSearchInput('')} aria-label="Clear search">
              <LuX size={14} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            ['all', 'All'],
            ['active', 'Active'],
            ['cancelled', 'Cancelled'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`${s.chip} ${statusFilter === key ? s.chipActive : ''}`}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${s.card} ${s.cardNoPad}`}>
        {loading ? (
          <div style={{ padding: 22 }}>
            {[...Array(5)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} />)}
          </div>
        ) : invites.length === 0 ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}><LuMail size={40} /></div>
            <h3 className={s.emptyTitle}>No invites found</h3>
            <p className={s.emptyDesc}>
              {search || statusFilter !== 'all' ? 'Try a different search or filter.' : 'Create your first class invite to get started.'}
            </p>
            {canCreate && !search && statusFilter === 'all' && (
              <button type="button" className={s.topCreate} onClick={openCreate}>
                <LuPlus size={16} /> New Invite
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={s.recTableScroll}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Schedule</th>
                    <th>Mode</th>
                    <th style={{ textAlign: 'center' }}>Students</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.slice(0, 50).map((inv) => {
                    const busy = actioningId === inv._id;
                    const plat = PLATFORM_STYLE[inv.platform] || PLATFORM_STYLE.Zoom;
                    return (
                      <tr key={inv._id}>
                        <td>
                          <div className={s.cellUser}>
                            <div className={s.receptionStudentAvatar} style={{ background: 'var(--c-grad)' }}>
                              <LuMail size={14} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700 }}>{inv.title || '—'}</div>
                              {inv.instructor && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{inv.instructor}</div>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, whiteSpace: 'nowrap' }}>
                            <LuCalendarDays size={12} />
                            {inv.date ? new Date(inv.date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
                            <LuClock size={11} /> {inv.startTime || '—'}{inv.endTime ? `–${inv.endTime}` : ''}
                          </div>
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: plat.bg, color: plat.fg, border: `1px solid ${plat.border}` }}>
                            {inv.platform || 'Zoom'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: 13 }}>
                            <LuUsers size={13} /> {inv.totalRecipients ?? inv.recipients?.length ?? 0}
                          </span>
                        </td>
                        <td>{inviteBadge(inv.status)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleView(inv)} title="View details">
                              <LuEye size={14} />
                            </button>
                            {canCreate && (
                              <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleResend(inv)} disabled={busy} title="Resend reminder">
                                <LuSend size={14} />
                              </button>
                            )}
                            {canCreate && (
                              <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleDuplicate(inv)} disabled={busy} title="Duplicate this invite">
                                <LuCopy size={14} />
                              </button>
                            )}
                            {canCancel && inv.status !== 'cancelled' && (
                              <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} onClick={() => handleCancel(inv)} disabled={busy} title="Cancel invite">
                                <LuX size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={s.tableFooter}>
              Showing {Math.min(invites.length, 50)} of {stats?.total ?? invites.length} invite{(stats?.total ?? invites.length) !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>

      {!canCreate && (
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 12 }}>
          You don't have permission to create class invites. Contact an admin to grant bookings.create access.
        </p>
      )}

      {showCreate && (
        <ReceptionModal
          title="New Class Invite"
          subtitle="Class details left · recipients right"
          icon={<LuMail size={20} />}
          size="xl"
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          footer={(
            <>
              <button type="button" className={s.btn} onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving || selectedIds.length === 0}>
                {saving ? 'Sending…' : <><LuSend size={15} /> Send invite · {selectedIds.length}</>}
              </button>
            </>
          )}
        >
          <div className={s.recSplit}>
          <div className={s.recSection}>
            <div className={s.recSectionHead}><LuCalendarDays size={13} /> 1 · Class details</div>
            <div className={s.recSectionBody}>
              <label className={s.fieldLabel}>
                Title *
                <input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} required placeholder="e.g. Morning Flow — 7 AM" />
              </label>
              <label className={s.fieldLabel}>
                Date *
                <input type="date" value={createForm.date} onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })} required />
              </label>
              <div className={s.recFormGrid}>
                <label className={s.fieldLabel}>
                  Start time *
                  <input type="time" value={createForm.startTime} onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })} required />
                </label>
                <label className={s.fieldLabel}>
                  End time
                  <input type="time" value={createForm.endTime} onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })} />
                </label>
              </div>
              <div className={s.recFormGrid}>
                <label className={s.fieldLabel}>
                  Instructor
                  <input value={createForm.instructor} onChange={(e) => setCreateForm({ ...createForm, instructor: e.target.value })} placeholder="Instructor name" />
                </label>
                <label className={s.fieldLabel}>
                  Platform
                  <select value={createForm.platform} onChange={(e) => setCreateForm({ ...createForm, platform: e.target.value })}>
                    <option>Zoom</option>
                    <option>Offline</option>
                    <option>Hybrid</option>
                  </select>
                </label>
              </div>
              <label className={s.fieldLabel}>
                Meeting link
                <input value={createForm.meetingLink} onChange={(e) => setCreateForm({ ...createForm, meetingLink: e.target.value })} placeholder="https://…" />
              </label>
              <label className={s.fieldLabel}>
                Notes
                <textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} rows={2} placeholder="Optional note for students…" />
              </label>
            </div>
          </div>

          <div className={s.recSection}>
            <div className={s.recSectionHead}><LuUsers size={13} /> 2 · Recipients · {selectedIds.length} selected</div>
            <div className={s.recSectionBody}>
              <div className={s.tabGroup} style={{ marginBottom: 12 }}>
                {SOURCE_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`${s.tabBtn} ${source === t.id ? s.tabActive : ''}`}
                    onClick={() => { setSource(t.id); setSelectedIds([]); if (t.id === 'membership') loadTierStudents(tier); }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {source === 'custom' && (
                <>
                  {!canListStudents ? (
                    <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0 }}>You need customers.view access to pick students.</p>
                  ) : studentsLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[...Array(3)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} style={{ height: 36 }} />)}
                    </div>
                  ) : (
                    <>
                      <div className={s.searchWrapper} style={{ marginBottom: 8 }}>
                        <span className={s.searchIcon}><LuSearch size={14} /></span>
                        <input
                          className={s.searchInput}
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder="Search students by name, email or phone…"
                          aria-label="Search students"
                        />
                        {studentSearch && (
                          <button type="button" className={s.searchClear} onClick={() => setStudentSearch('')} aria-label="Clear student search">
                            <LuX size={13} />
                          </button>
                        )}
                      </div>
                      <div className={s.recPickGrid}>
                        {customPool.length === 0 ? (
                          <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0, padding: 10, gridColumn: '1 / -1' }}>No students found.</p>
                        ) : (
                          customPool.slice(0, 100).map((st) => {
                            const sid = String(st._id);
                            const checked = selectedIds.includes(sid);
                            return (
                              <label key={sid} className={`${s.recPickItem} ${checked ? s['recPickItem--on'] : ''}`}>
                                <input type="checkbox" checked={checked} onChange={() => toggleId(sid)} />
                                <span style={{ flex: 1, minWidth: 0 }}>
                                  <span className={s.recPickName}>{st.name}</span>
                                  <span className={s.recPickSub}>{st.email}{st.phone ? ` · ${st.phone}` : ''}</span>
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                        <button type="button" className={s.linkBtn} onClick={() => selectAllVisible(customPool.slice(0, 100))}>Select all shown</button>
                        {selectedIds.length > 0 && <button type="button" className={s.linkBtn} onClick={() => setSelectedIds([])}>Clear</button>}
                      </div>
                    </>
                  )}
                </>
              )}

              {source === 'service' && (
                <>
                  <label className={s.fieldLabel}>
                    Service
                    <select value={serviceId} onChange={(e) => loadServiceStudents(e.target.value)}>
                      <option value="">Select a service…</option>
                      {serviceOptions.map((sv) => (
                        <option key={sv._id} value={String(sv._id)}>{sv.name}</option>
                      ))}
                    </select>
                  </label>
                  {serviceLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[...Array(3)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} style={{ height: 36 }} />)}
                    </div>
                  ) : serviceId && serviceStudents.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0 }}>No eligible students for this service (needs an active, paid enrollment with sessions left).</p>
                  ) : (
                    <div className={s.recPickGrid}>
                      {serviceStudents.map((st) => {
                        const sid = String(st._id);
                        const checked = selectedIds.includes(sid);
                        return (
                          <label key={sid} className={`${s.recPickItem} ${checked ? s['recPickItem--on'] : ''}`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleId(sid)} />
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span className={s.recPickName}>{st.name}</span>
                              <span className={s.recPickSub}>{st.email} · {st.remainingSessions ?? 0} sessions left</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {serviceStudents.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button type="button" className={s.linkBtn} onClick={() => selectAllVisible(serviceStudents)}>Select all</button>
                      <button type="button" className={s.linkBtn} onClick={() => setSelectedIds([])}>Clear</button>
                    </div>
                  )}
                </>
              )}

              {source === 'membership' && (
                <>
                  <div className={s.tabGroup} style={{ marginBottom: 12 }}>
                    {TIERS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`${s.tabBtn} ${tier === t ? s.tabActive : ''}`}
                        onClick={() => loadTierStudents(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {tierLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[...Array(3)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} style={{ height: 36 }} />)}
                    </div>
                  ) : tierStudents.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0 }}>No active {tier} members found.</p>
                  ) : (
                    <>
                      <div className={s.recPickGrid}>
                        {tierStudents.map((st) => {
                          const sid = String(st._id);
                          const checked = selectedIds.includes(sid);
                          return (
                            <label key={sid} className={`${s.recPickItem} ${checked ? s['recPickItem--on'] : ''}`}>
                              <input type="checkbox" checked={checked} onChange={() => toggleId(sid)} />
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span className={s.recPickName}>{st.name}</span>
                                <span className={s.recPickSub}>{st.email}{st.phone ? ` · ${st.phone}` : ''}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button type="button" className={s.linkBtn} onClick={() => selectAllVisible(tierStudents)}>Select all</button>
                        <button type="button" className={s.linkBtn} onClick={() => setSelectedIds([])}>Clear</button>
                      </div>
                    </>
                  )}
                </>
              )}

              {source === 'all' && (
                <div className={s.recModalInfoBox}>
                  The invite will go to <strong>all {allStudents.filter((st) => st.status !== 'banned').length} active students</strong>. Banned accounts are excluded automatically.
                </div>
              )}
            </div>
          </div>
          </div>
        </ReceptionModal>
      )}

      {detail && (
        <ReceptionModal
          title={detail.title || 'Invite details'}
          subtitle={`${detail.date ? new Date(detail.date).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}${detail.startTime ? ` · ${detail.startTime}` : ''}${detail.endTime ? `–${detail.endTime}` : ''}`}
          icon={<LuMail size={20} />}
          onClose={() => setDetail(null)}
          footer={(
            <button type="button" className={s.btn} onClick={() => setDetail(null)}>Close</button>
          )}
        >
          <div className={s.recProfileHead}>
            <div className={s.recProfileAvatar}><LuMail size={22} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={s.recProfileName}>{detail.title}</div>
              <div className={s.recProfileSub}>{detail.instructor ? `Instructor - ${detail.instructor}` : 'Class invite'}</div>
              <div className={s.recProfileTags}>
                {inviteBadge(detail.status)}
                <span className={s.badge} style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
                  {detail.totalRecipients ?? detail.recipients?.length ?? 0} recipients
                </span>
              </div>
            </div>
          </div>
          {detail.meetingLink && (
            <div className={s.recSection}>
              <div className={s.recSectionHead}>Meeting link</div>
              <div className={s.recSectionBody}>
                <div style={{ fontSize: 13, overflowWrap: 'anywhere', padding: '8px 0', color: 'var(--c-primary)', fontWeight: 600 }}>{detail.meetingLink}</div>
              </div>
            </div>
          )}
          {Array.isArray(detail.recipients) && detail.recipients.length > 0 && (
            <div className={s.recSection}>
              <div className={s.recSectionHead}>Recipients · first {Math.min(detail.recipients.length, 20)} of {detail.recipients.length}</div>
              <div className={s.recSectionBody}>
                {detail.recipients.slice(0, 20).map((r, i) => (
                  <div key={r._id || i} className={s.recKV}>
                    <span className={s.recKVIcon}><LuMail size={13} /></span>
                    <span className={s.recKVLabel}>{r.name || r.user?.name || r.email || '—'}</span>
                    <span className={s.recKVValue} style={{ fontWeight: 500, fontSize: 12 }}>{r.status || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ReceptionModal>
      )}
    </div>
  );
}
