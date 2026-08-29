import React, { useState, useEffect, useCallback } from 'react';
import s from './YogaAdmin.module.css';
import { PageHeader, KpiCard } from './ui/Primitives';
import Badge from './Badge';
import {
  getFreeTrials, getTrialStats, getTrialDetail,
  createTrialSession, updateTrialSession,
  markSessionAttendance, sendTrialNotification,
  broadcastToActiveTrials, cancelTrial, expireTrials,
  createBulkSessions,
} from '../api/AdminServices.js';
import {
  LuGift, LuUsers, LuCalendarCheck, LuCalendarX,
  LuRefreshCw, LuSearch, LuX, LuCheck, LuClock,
  LuBell, LuSend, LuTrash2, LuPlus, LuChevronLeft,
  LuMessageSquare, LuMegaphone, LuCalendar, LuUser,
  LuLink, LuHistory, LuLoader, LuLayers,
} from 'react-icons/lu';

const EMPTY_SESSION = { trialId: '', title: '', description: '', date: '', startTime: '', endTime: '', duration: 60, meetingPlatform: 'Zoom', meetingLink: '', instructor: '', notes: '' };

const STATUS_BADGE_MAP = { active: 'Active', expired: 'Expired', converted: 'Converted', cancelled: 'Cancelled' };

function statusBadgeTone(s) {
  if (s === 'active') return 'badgeGreen';
  if (s === 'converted') return 'badgeBlue';
  if (s === 'expired') return 'badgeRed';
  return 'badgeAmber';
}

function statusTagCls(s) {
  if (s === 'active') return 'tagGreen';
  if (s === 'converted') return 'tagBlue';
  if (s === 'expired') return 'tagRed';
  return 'tagGray';
}

function avatarCls(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return `av${Math.abs(h) % 6}`;
}

export default function FreeTrialManagement({ onChanged } = {}) {
  const [activeView, setActiveView] = useState('overview');
  const [trials, setTrials] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedTrial, setSelectedTrial] = useState(null);
  const [detailSessions, setDetailSessions] = useState([]);
  const [detailNotifications, setDetailNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', date: '', time: '', instructor: '', meetingLink: '' });
  const [notifForm, setNotifForm] = useState({ trialId: '', title: '', body: '' });
  const [broadcastForm, setBroadcastForm] = useState({ title: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStudents, setBulkStudents] = useState([]);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkPage, setBulkPage] = useState(1);
  const [bulkPages, setBulkPages] = useState(1);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkAudience, setBulkAudience] = useState('all'); // 'all' | 'selected'
  const [bulkSelectedIds, setBulkSelectedIds] = useState([]);
  const [bulkSelectAll, setBulkSelectAll] = useState(false);
  const [bulkSession, setBulkSession] = useState({ title: '', description: '', date: '', startTime: '', endTime: '', duration: 60, meetingPlatform: 'Zoom', meetingLink: '', instructor: '', notes: '' });
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSubmitStage, setBulkSubmitStage] = useState('form'); // 'form' | 'preview' | 'submitting'

  const flash = (msg, type = 'success') => {
    setFeedback({ message: msg, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const loadTrials = useCallback(async (p = page) => {
    try {
      const data = await getFreeTrials({ page: p, limit: 20, search, status: statusFilter });
      setTrials(data.trials || []);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch (err) {
      setError(err.message);
    }
  }, [search, statusFilter]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [st] = await Promise.all([
        getTrialStats().catch(() => null),
        loadTrials(1),
      ]);
      setStats(st);
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [loadTrials]);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!loading) loadTrials(1);
  }, [search, statusFilter]);

  async function handleSelectTrial(id) {
    setLoading(true);
    try {
      const data = await getTrialDetail(id);
      setSelectedTrial(data.trial || data);
      setDetailSessions(data.sessions || []);
      setDetailNotifications(data.notifications || []);
      setActiveView('detail');
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSession(e) {
    e.preventDefault();
    if (!sessionForm.title || !sessionForm.date || !sessionForm.startTime) {
      flash('Title, date, and time are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        trialId: sessionForm.trialId,
        title: sessionForm.title,
        description: sessionForm.description || undefined,
        date: sessionForm.date,
        startTime: sessionForm.startTime,
        endTime: sessionForm.endTime || undefined,
        duration: sessionForm.duration || 60,
        meetingPlatform: sessionForm.meetingPlatform || 'Zoom',
        instructor: sessionForm.instructor || undefined,
        meetingLink: sessionForm.meetingLink || undefined,
        notes: sessionForm.notes || undefined,
      };
      await createTrialSession(payload);
      flash('Session created.');
      setSessionForm(EMPTY_SESSION);
      if (selectedTrial) await handleSelectTrial(selectedTrial._id);
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkOpen() {
    setBulkOpen(true);
    setBulkLoading(true);
    setBulkSearch('');
    setBulkSelectedIds([]);
    setBulkSelectAll(false);
    setBulkAudience('all');
    setBulkSubmitStage('form');
    setBulkSession({ title: '', description: '', date: '', startTime: '', endTime: '', duration: 60, meetingPlatform: 'Zoom', meetingLink: '', instructor: '', notes: '' });
    try {
      const data = await getFreeTrials({ status: 'active', page: 1, limit: 20 });
      setBulkStudents(data.trials || []);
      setBulkTotal(data.total || 0);
      setBulkPages(data.pages || 1);
      setBulkPage(1);
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setBulkLoading(false);
    }
  }

  async function loadBulkPage(p) {
    setBulkLoading(true);
    try {
      const data = await getFreeTrials({ status: 'active', page: p, limit: 20, search: bulkSearch });
      setBulkStudents(data.trials || []);
      setBulkTotal(data.total || 0);
      setBulkPages(data.pages || 1);
      setBulkPage(p);
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkSearchChange(val) {
    setBulkSearch(val);
    setBulkLoading(true);
    try {
      const data = await getFreeTrials({ status: 'active', page: 1, limit: 20, search: val });
      setBulkStudents(data.trials || []);
      setBulkTotal(data.total || 0);
      setBulkPages(data.pages || 1);
      setBulkPage(1);
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setBulkLoading(false);
    }
  }

  function toggleBulkStudent(id) {
    setBulkSelectedIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  function toggleBulkSelectAll() {
    if (bulkSelectAll) {
      setBulkSelectedIds([]);
      setBulkSelectAll(false);
    } else {
      const ids = bulkStudents.map(t => t.user?._id || t.user).filter(Boolean);
      setBulkSelectedIds(ids);
      setBulkSelectAll(true);
    }
  }

  function goToBulkPreview() {
    if (!bulkSession.title || !bulkSession.date || !bulkSession.startTime) {
      flash('Session title, date, and time are required.', 'error');
      return;
    }
    if (bulkAudience === 'selected' && bulkSelectedIds.length === 0) {
      flash('Select at least one student or choose "All Active Students".', 'error');
      return;
    }
    setBulkSubmitStage('preview');
  }

  async function handleBulkCreate() {
    let studentIds = bulkSelectedIds;
    if (bulkAudience === 'all') {
      const data = await getFreeTrials({ status: 'active', limit: 1000 });
      studentIds = (data.trials || []).map(t => t.user?._id || t.user).filter(Boolean);
    }
    if (studentIds.length === 0) {
      flash('No students to create sessions for.', 'error');
      return;
    }
    setBulkSubmitStage('submitting');
    try {
      const payload = {
        studentIds,
        sessions: [bulkSession],
      };
      const result = await createBulkSessions(payload);
      if (result.errors && result.errors.length > 0) {
        flash(`Created ${result.created} sessions${result.errors.length ? `, ${result.errors.length} errors` : ''}.`, result.errors.length ? 'warning' : 'success');
      } else {
        flash(`Successfully created ${result.created} sessions for ${studentIds.length} students.`);
      }
      setBulkOpen(false);
      if (selectedTrial) await handleSelectTrial(selectedTrial._id);
      await loadTrials();
      await loadAll();
    } catch (err) {
      flash(err.message, 'error');
      setBulkSubmitStage('preview');
    }
  }

  function getTargetStudentCount() {
    if (bulkAudience === 'all') return bulkTotal;
    return bulkSelectedIds.length;
  }

  async function handleUpdateSession(e) {
    e.preventDefault();
    if (!editForm.title) { flash('Title is required.', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        title: editForm.title,
        date: editForm.date,
        startTime: editForm.time,
        instructor: editForm.instructor || '',
        meetingLink: editForm.meetingLink || '',
        adminNotes: editForm.adminNotes || '',
        notes: editForm.notes || '',
      };
      await updateTrialSession(editingSessionId, payload);
      flash('Session updated.');
      setEditingSessionId(null);
      setEditForm({ title: '', date: '', time: '', instructor: '', meetingLink: '', adminNotes: '', notes: '', status: '', rescheduledTo: '' });
      if (selectedTrial) await handleSelectTrial(selectedTrial._id);
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(sess) {
    setEditingSessionId(sess._id);
    setEditForm({
      title: sess.title || '',
      date: sess.date ? new Date(sess.date).toISOString().split('T')[0] : '',
      time: sess.startTime || '',
      instructor: sess.instructor || '',
      meetingLink: sess.meetingLink || '',
      adminNotes: sess.adminNotes || '',
      notes: sess.notes || '',
    });
  }

  function cancelEdit() {
    setEditingSessionId(null);
    setEditForm({ title: '', date: '', time: '', instructor: '', meetingLink: '', adminNotes: '', notes: '' });
  }

  async function handleMarkAttendance(sessionId, action) {
    if (action === 'cancelled' && !window.confirm('Cancel this session?')) return;
    if (action === 'rescheduled' && !window.confirm('Mark this session as rescheduled?')) return;
    const payload = {};
    if (action === 'present') { payload.attendance = 'present'; payload.status = 'completed'; }
    else if (action === 'absent') { payload.attendance = 'absent'; payload.status = 'missed'; }
    else if (action === 'cancelled') { payload.status = 'cancelled'; }
    else if (action === 'rescheduled') { payload.status = 'rescheduled'; }
    else return;
    try {
      await markSessionAttendance(sessionId, payload);
      flash(`Session marked as ${action}`);
      if (selectedTrial) await handleSelectTrial(selectedTrial._id);
    } catch (err) {
      flash(err.message, 'error');
    }
  }

  async function handleSendNotification(e) {
    e.preventDefault();
    if (!notifForm.title) { flash('Title is required.', 'error'); return; }
    setSaving(true);
    try {
      await sendTrialNotification(notifForm);
      flash('Notification sent.');
      setNotifForm({ trialId: '', title: '', body: '' });
      if (selectedTrial) await handleSelectTrial(selectedTrial._id);
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleBroadcast(e) {
    e.preventDefault();
    if (!broadcastForm.title) { flash('Title is required.', 'error'); return; }
    setSaving(true);
    try {
      await broadcastToActiveTrials(broadcastForm);
      flash('Broadcast sent to all active trials.');
      setBroadcastForm({ title: '', body: '' });
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelTrial(id) {
    if (!window.confirm('Cancel this trial?')) return;
    try {
      await cancelTrial(id);
      flash('Trial cancelled.');
      setSelectedTrial(null);
      setActiveView('overview');
      loadAll();
    } catch (err) {
      flash(err.message, 'error');
    }
  }

  async function handleExpireTrials() {
    if (!window.confirm('Manually expire all overdue trials?')) return;
    try {
      const result = await expireTrials();
      flash(`Expired ${result?.expired || 0} trials.`);
      loadAll();
    } catch (err) {
      flash(err.message, 'error');
    }
  }

  function handleBack() {
    setSelectedTrial(null);
    setDetailSessions([]);
    setDetailNotifications([]);
    setActiveView('overview');
  }

  const FILTERS = [
    { value: '', label: 'All Trials' },
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'converted', label: 'Converted' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  if (loading && !trials.length && !selectedTrial) {
    return (
      <div>
        <PageHeader title="Free Trial Management" subtitle="Manage student trial memberships, sessions, and communications." />
        <div className={s.card}>
          {[...Array(5)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} style={{ marginBottom: 10 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {activeView === 'overview' && (
        <>
          <PageHeader title="Free Trial Management" subtitle="Manage student trial memberships, sessions, and communications.">
            <button className={`${s.btn} ${s.btnSm}`} onClick={handleExpireTrials}>
              <LuRefreshCw size={14} /> Expire Overdue
            </button>
            {stats?.active > 0 && (
              <button className={`${s.btnPrimary} ${s.btnSm}`} onClick={() => { setActiveView('broadcast'); }}>
                <LuMegaphone size={14} /> Broadcast
              </button>
            )}
            <button className={`${s.btn} ${s.btnSm}`} onClick={handleBulkOpen} style={{ fontWeight: 600 }}>
              <LuLayers size={14} /> Bulk Trial Session
            </button>
          </PageHeader>

          {feedback.message && (
            <div className={`${s.bannerSuccess} ${feedback.type === 'error' ? s.bannerError : ''}`} style={{ marginBottom: 18 }}>
              {feedback.message}
            </div>
          )}

          {stats && (
            <div className={s.statsGrid} style={{ marginBottom: 22 }}>
              <KpiCard icon={<LuGift />} accent="orange" label="Active Trials" value={stats.active || 0}
                spark={[stats.active * 0.2 || 1, stats.active * 0.4 || 2, stats.active * 0.6 || 3, stats.active * 0.8 || 4, stats.active || 5]} />
              <KpiCard icon={<LuCalendarCheck />} accent="green" label="Completed Trials" value={stats.converted || 0}
                spark={[stats.converted * 0.2 || 1, stats.converted * 0.4 || 2, stats.converted * 0.6 || 3, stats.converted * 0.8 || 4, stats.converted || 5]} />
              <KpiCard icon={<LuCalendarX />} accent="amber" label="Expired Trials" value={stats.expired || 0}
                spark={[stats.expired * 0.2 || 1, stats.expired * 0.4 || 2, stats.expired * 0.6 || 3, stats.expired * 0.8 || 4, stats.expired || 5]} />
              <KpiCard icon={<LuUsers />} accent="blue" label="Total Trial Students" value={(stats.active || 0) + (stats.converted || 0) + (stats.expired || 0) + (stats.cancelled || 0)}
                spark={[]} />
            </div>
          )}

          <div className={s.card} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className={s.searchWrapper} style={{ minWidth: 280 }}>
                <LuSearch className={s.searchIcon} size={16} />
                <input
                  className={s.searchInput}
                  placeholder="Search student by name or email…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
                {search && (
                  <button className={s.searchClear} onClick={() => setSearch('')}><LuX size={14} /></button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    className={`${s.chip} ${statusFilter === f.value ? s.chipActive : ''}`}
                    onClick={() => { setStatusFilter(f.value); setPage(1); }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`${s.card} ${s.cardNoPad}`}>
            {error ? (
              <div className={`${s.emptyState} ${s.stateError}`}>
                {error}<br />
                <button type="button" className={`${s.btn} ${s.btnSm}`} style={{ marginTop: 12 }} onClick={loadAll}>Retry</button>
              </div>
            ) : (
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 180 }}>Student</th>
                      <th>Status</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th style={{ minWidth: 140 }}>Progress</th>
                      <th style={{ width: 80 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trials.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <div className={s.emptyState}>
                            <div className={s.emptyIcon}><LuGift size={40} /></div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>
                              {search || statusFilter ? 'No trials match your filters.' : 'No trials yet.'}
                            </div>
                            <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                              {search || statusFilter ? 'Try adjusting your search or filter.' : 'Students will appear here once they start a free trial.'}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : trials.map((t) => {
                      const pct = t.progressPct || 0;
                      return (
                        <tr key={t._id} className={s.rowClickable} onClick={() => handleSelectTrial(t._id)}>
                          <td>
                            <div className={s.cellUser}>
                              <div className={`${s.avatar} ${s.avatarSm} ${s[avatarCls(t.user?.name)]}`}>
                                {(t.user?.name || '?')[0]?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t.user?.name || 'Unknown'}</div>
                                <div className={s.tdMuted} style={{ fontSize: 11.5 }}>{t.user?.email || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td><Badge label={STATUS_BADGE_MAP[t.status] || t.status} /></td>
                          <td className={s.tdMuted}>{t.startDate ? new Date(t.startDate).toLocaleDateString('en-KE') : '—'}</td>
                          <td className={s.tdMuted}>{t.endDate ? new Date(t.endDate).toLocaleDateString('en-KE') : '—'}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden', maxWidth: 100 }}>
                                <div style={{ height: '100%', borderRadius: 4, background: pct >= 90 ? 'var(--c-danger)' : pct >= 70 ? 'var(--c-warning)' : 'var(--c-primary)', width: `${pct}%`, transition: 'width 0.4s ease' }} />
                              </div>
                              <span className={s.tdMuted} style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>
                                {t.sessionsLeft ?? '—'} sessions left
                              </span>
                            </div>
                          </td>
                          <td>
                            <button
                              className={`${s.btn} ${s.btnSm}`}
                              onClick={(e) => { e.stopPropagation(); handleSelectTrial(t._id); }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px 18px', borderTop: '1px solid var(--line)' }}>
                <button
                  className={`${s.btn} ${s.btnSm}`}
                  disabled={page <= 1}
                  onClick={() => loadTrials(page - 1)}
                >
                  Previous
                </button>
                <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600 }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  className={`${s.btn} ${s.btnSm}`}
                  disabled={page >= totalPages}
                  onClick={() => loadTrials(page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {activeView === 'broadcast' && (
        <div>
          <div style={{ marginBottom: 18 }}>
            <button className={`${s.btn} ${s.btnSm}`} onClick={() => setActiveView('overview')}>
              <LuChevronLeft size={14} /> Back to Overview
            </button>
          </div>
          <PageHeader title="Broadcast to Active Trials" subtitle="Send a notification to every student with an active trial." />
          <div className={s.card} style={{ maxWidth: 560 }}>
            <form onSubmit={handleBroadcast} className={s.formStack}>
              <div>
                <label className={s.fieldLabel}>Title</label>
                <input
                  placeholder="e.g. Special Live Session Tomorrow"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className={s.fieldLabel}>Message Body</label>
                <textarea
                  className={s.textarea}
                  placeholder="Optional message content…"
                  value={broadcastForm.body}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, body: e.target.value })}
                  rows={3}
                />
              </div>
              <button type="submit" className={`${s.btnPrimary}`} disabled={saving}>
                {saving ? <><LuLoader size={14} className={s.spin} /> Sending…</> : <><LuSend size={14} /> Send Broadcast</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeView === 'detail' && selectedTrial && (
        <div>
          <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className={`${s.btn} ${s.btnSm}`} onClick={handleBack}>
              <LuChevronLeft size={14} /> Back
            </button>
          </div>

          {feedback.message && (
            <div className={`${s.bannerSuccess} ${feedback.type === 'error' ? s.bannerError : ''}`} style={{ marginBottom: 18 }}>
              {feedback.message}
            </div>
          )}

          <div className={s.card}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
              <div className={`${s.avatar} ${s.avatarLg} ${s[avatarCls(selectedTrial.user?.name)]}`}>
                {(selectedTrial.user?.name || '?')[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>
                    {selectedTrial.user?.name || 'Unknown'}
                  </h3>
                  <Badge label={STATUS_BADGE_MAP[selectedTrial.status] || selectedTrial.status} />
                </div>
                <div className={s.tdMuted} style={{ fontSize: 13, marginBottom: 12 }}>{selectedTrial.user?.email || ''}</div>
                <div className={s.grid3} style={{ marginBottom: 14 }}>
                  <div>
                    <div className={s.statLabel}>Start Date</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginTop: 3 }}>
                      {selectedTrial.startDate ? new Date(selectedTrial.startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className={s.statLabel}>End Date</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginTop: 3 }}>
                      {selectedTrial.endDate ? new Date(selectedTrial.endDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className={s.statLabel}>Sessions Remaining</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--c-primary)', marginTop: 3 }}>
                      {selectedTrial.sessionsLeft ?? '—'}
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div className={s.statLabel} style={{ marginBottom: 5 }}>Progress</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, height: 8, background: 'var(--surface-3)', borderRadius: 6, overflow: 'hidden', maxWidth: 300 }}>
                      <div style={{
                        height: '100%', borderRadius: 6,
                        background: (selectedTrial.progressPct || 0) >= 90 ? 'var(--c-danger)' : (selectedTrial.progressPct || 0) >= 70 ? 'var(--c-warning)' : 'var(--c-primary)',
                        width: `${selectedTrial.progressPct || 0}%`,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>{selectedTrial.progressPct || 0}%</span>
                  </div>
                </div>
              </div>
              {selectedTrial.status === 'active' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <button
                    className={`${s.btn} ${s.btnDanger} ${s.btnSm}`}
                    onClick={() => handleCancelTrial(selectedTrial._id)}
                  >
                    <LuTrash2 size={13} /> Cancel Trial
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={s.gridDash} style={{ marginTop: 4 }}>
            <div>
              <div className={s.card}>
                <h3 className={s.cardTitle}>
                  <span className={s.cardTitleIcon}><LuCalendar /></span>
                  Trial Sessions
                </h3>

                  <details style={{ marginBottom: 16 }}>
                    <summary style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--c-primary)', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                      <LuPlus size={14} /> Add Trial Session
                    </summary>
                    <form onSubmit={handleCreateSession} className={s.formStack} style={{ marginTop: 12, padding: 16, background: 'var(--surface-2)', borderRadius: 'var(--r-md)', border: '1px solid var(--line)' }}>
                      <input type="hidden" name="trialId" value={selectedTrial._id} />
                      <div>
                        <label className={s.fieldLabel}>Session Title *</label>
                        <input
                          placeholder="e.g. Intro to Hatha Yoga"
                          value={sessionForm.title}
                          onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value, trialId: selectedTrial._id })}
                          required
                        />
                      </div>
                      <div>
                        <label className={s.fieldLabel}>Description</label>
                        <textarea
                          className={s.textarea}
                          placeholder="Brief description of the session (optional)"
                          value={sessionForm.description}
                          onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <div className={s.grid3}>
                        <div>
                          <label className={s.fieldLabel}>Date *</label>
                          <input type="date" value={sessionForm.date}
                            onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value, trialId: selectedTrial._id })}
                            required />
                        </div>
                        <div>
                          <label className={s.fieldLabel}>Start Time *</label>
                          <input type="time" value={sessionForm.startTime}
                            onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value, trialId: selectedTrial._id })}
                            required />
                        </div>
                        <div>
                          <label className={s.fieldLabel}>End Time</label>
                          <input type="time" value={sessionForm.endTime}
                            onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })} />
                        </div>
                      </div>
                      <div className={s.grid3}>
                        <div>
                          <label className={s.fieldLabel}>Duration (min)</label>
                          <input type="number" min={15} max={180} step={5} value={sessionForm.duration}
                            onChange={(e) => setSessionForm({ ...sessionForm, duration: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className={s.fieldLabel}>Meeting Platform</label>
                          <select value={sessionForm.meetingPlatform}
                            onChange={(e) => setSessionForm({ ...sessionForm, meetingPlatform: e.target.value })}>
                            <option value="Zoom">Zoom</option>
                            <option value="Google Meet">Google Meet</option>
                            <option value="In-Person">In-Person</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className={s.fieldLabel}>Instructor</label>
                          <input placeholder="Instructor name" value={sessionForm.instructor}
                            onChange={(e) => setSessionForm({ ...sessionForm, instructor: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <label className={s.fieldLabel}>Meeting Link</label>
                        <input placeholder="https://zoom.us/j/… or Google Meet link (optional)" value={sessionForm.meetingLink}
                          onChange={(e) => setSessionForm({ ...sessionForm, meetingLink: e.target.value })} />
                      </div>
                      <div>
                        <label className={s.fieldLabel}>Notes for Student</label>
                        <textarea className={s.textarea} placeholder="What the student should know before the session (optional)"
                          value={sessionForm.notes} onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })} rows={2} />
                      </div>
                      <button type="submit" className={`${s.btnPrimary}`} disabled={saving}>
                        {saving ? <><LuLoader size={14} className={s.spin} /> Creating…</> : <><LuPlus size={14} /> Create Session</>}
                      </button>
                    </form>
                  </details>

                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>Session Title</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Instructor</th>
                        <th>Meeting Link</th>
                        <th>Attendance</th>
                        <th style={{ width: 100 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailSessions.length === 0 ? (
                        <tr>
                          <td colSpan={7}>
                            <div className={s.emptyState}>
                              <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}><LuCalendar size={32} /></div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>No sessions scheduled yet.</div>
                              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Use the form above to add a trial session.</div>
                            </div>
                          </td>
                        </tr>
                      ) : detailSessions.map((sess) => (
                        editingSessionId === sess._id ? (
                          <tr key={sess._id}>
                            <td colSpan={7} style={{ padding: '12px 18px', background: 'var(--surface-2)' }}>
                              <form onSubmit={handleUpdateSession} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 130 }}>
                                  <label className={s.fieldLabel}>Title</label>
                                  <input style={{ fontSize: 12, padding: '7px 10px' }} value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
                                </div>
                                <div style={{ minWidth: 110 }}>
                                  <label className={s.fieldLabel}>Date</label>
                                  <input style={{ fontSize: 12, padding: '7px 10px' }} type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} required />
                                </div>
                                <div style={{ minWidth: 80 }}>
                                  <label className={s.fieldLabel}>Time</label>
                                  <input style={{ fontSize: 12, padding: '7px 10px' }} type="time" value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} required />
                                </div>
                                <div style={{ minWidth: 110 }}>
                                  <label className={s.fieldLabel}>Instructor</label>
                                  <input style={{ fontSize: 12, padding: '7px 10px' }} value={editForm.instructor} onChange={(e) => setEditForm({ ...editForm, instructor: e.target.value })} />
                                </div>
                                <div style={{ minWidth: 80 }}>
                                  <label className={s.fieldLabel}>Link</label>
                                  <input style={{ fontSize: 12, padding: '7px 10px' }} value={editForm.meetingLink} onChange={(e) => setEditForm({ ...editForm, meetingLink: e.target.value })} placeholder="Meeting link" />
                                </div>
                                <div style={{ minWidth: 120 }}>
                                  <label className={s.fieldLabel}>Admin Notes</label>
                                  <input style={{ fontSize: 12, padding: '7px 10px' }} value={editForm.adminNotes} onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })} placeholder="Internal notes" />
                                </div>
                                <div style={{ display: 'flex', gap: 4, paddingBottom: 1 }}>
                                  <button type="submit" className={`${s.btn} ${s.btnSm}`} style={{ background: 'var(--c-primary)', color: '#fff', borderColor: 'transparent' }} disabled={saving}>
                                    {saving ? <LuLoader size={12} className={s.spin} /> : <LuCheck size={12} />} Save
                                  </button>
                                  <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={cancelEdit}>Cancel</button>
                                </div>
                              </form>
                            </td>
                          </tr>
                        ) : (
                        <tr key={sess._id}>
                          <td><strong>{sess.title}</strong></td>
                          <td className={s.tdMuted}>{sess.date ? new Date(sess.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '—'}</td>
                          <td className={s.tdMuted}>{sess.startTime || '—'}</td>
                          <td className={s.tdMuted}>{sess.instructor?.name || sess.instructor || '—'}</td>
                          <td>
                            {sess.meetingLink ? (
                              <a href={sess.meetingLink} target="_blank" rel="noreferrer" style={{ color: 'var(--c-primary)', fontSize: 12, fontWeight: 600 }}><LuLink size={12} style={{ marginRight: 3 }} /> Join</a>
                            ) : <span className={s.tdMuted}>—</span>}
                          </td>
                          <td>
                            <Badge label={
                              sess.computedStatus === 'cancelled' ? 'Cancelled' :
                              sess.computedStatus === 'rescheduled' ? 'Rescheduled' :
                              sess.computedStatus === 'completed' ? 'Completed' :
                              sess.computedStatus === 'missed' ? 'Missed' :
                              sess.computedStatus === 'live' ? 'Live Now' :
                              sess.computedStatus === 'pending_attendance' ? 'Pending Attendance' : 'Upcoming'
                            } />
                          </td>
                          <td style={{ minWidth: 160 }}>
                            {(() => {
                              const ALL_ACTIONS = [
                                { action: 'present', label: 'Present', icon: LuCheck, bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
                                { action: 'absent', label: 'Absent', icon: LuX, bg: 'rgba(220,38,38,0.1)', color: '#DC2626' },
                                { action: 'rescheduled', label: 'Reschedule', icon: LuClock, bg: 'rgba(217,119,6,0.1)', color: '#B45309' },
                                { action: 'cancelled', label: 'Cancel', icon: LuCalendarX, bg: 'var(--surface-3)', color: 'var(--text-2)' },
                              ];
                              const STATUS_ACTION_MAP = { completed: 'present', missed: 'absent', cancelled: 'cancelled', rescheduled: 'rescheduled' };
                              const NON_TERMINAL = ['upcoming', 'live', 'pending_attendance'];
                              const isTerminal = !NON_TERMINAL.includes(sess.computedStatus);
                              const currentAction = STATUS_ACTION_MAP[sess.computedStatus];
                              const displayedActions = isTerminal
                                ? ALL_ACTIONS.filter(a => a.action !== currentAction)
                                : ALL_ACTIONS;
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                                    {isTerminal && currentAction ? (
                                      <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                        padding: '5px 12px', borderRadius: 20,
                                        background: ALL_ACTIONS.find(a => a.action === currentAction)?.bg || 'var(--surface-3)',
                                        color: ALL_ACTIONS.find(a => a.action === currentAction)?.color || 'var(--text-2)',
                                        fontSize: 12, fontWeight: 700, letterSpacing: '0.03em',
                                        border: '1px solid transparent',
                                      }}>
                                        {React.createElement(ALL_ACTIONS.find(a => a.action === currentAction)?.icon || LuCheck, { size: 14 })}
                                        {ALL_ACTIONS.find(a => a.action === currentAction)?.label || currentAction}
                                      </span>
                                    ) : (
                                      <Badge label={
                                        sess.computedStatus === 'live' ? 'Live Now' :
                                        sess.computedStatus === 'upcoming' ? 'Upcoming' : 'Pending Attendance'
                                      } />
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {displayedActions.map(a => (
                                      <button key={a.action} className={`${s.btn} ${s.btnSm}`}
                                        style={{ background: a.bg, color: a.color, borderColor: 'transparent', fontSize: 11, padding: '3px 8px' }}
                                        onClick={() => handleMarkAttendance(sess._id, a.action)}
                                        title={`Mark as ${a.label}`}>
                                        {React.createElement(a.icon, { size: 12 })} {a.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={s.card}>
                <h3 className={s.cardTitle}>
                  <span className={s.cardTitleIcon}><LuBell /></span>
                  Notifications
                </h3>

                <form onSubmit={handleSendNotification} className={s.formStack} style={{ marginBottom: 20, padding: 16, background: 'var(--surface-2)', borderRadius: 'var(--r-md)', border: '1px solid var(--line)' }}>
                  <input type="hidden" name="trialId" value={selectedTrial._id} />
                  <div>
                    <label className={s.fieldLabel}>Title *</label>
                    <input
                      placeholder="e.g. Reminder: Your trial session today"
                      value={notifForm.title}
                      onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value, trialId: selectedTrial._id })}
                      required
                    />
                  </div>
                  <div>
                    <label className={s.fieldLabel}>Message</label>
                    <textarea
                      className={s.textarea}
                      placeholder="Optional message body…"
                      value={notifForm.body}
                      onChange={(e) => setNotifForm({ ...notifForm, body: e.target.value, trialId: selectedTrial._id })}
                      rows={2}
                    />
                  </div>
                  <button type="submit" className={`${s.btnPrimary}`} disabled={saving} style={{ alignSelf: 'flex-start' }}>
                    {saving ? <><LuLoader size={14} className={s.spin} /> Sending…</> : <><LuSend size={14} /> Send Notification</>}
                  </button>
                </form>

                {detailNotifications.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detailNotifications.map((n) => (
                      <div key={n._id} style={{
                        display: 'flex', gap: 12, padding: '12px 14px',
                        background: n.read ? 'var(--surface-2)' : 'rgba(46,125,91,0.04)',
                        borderRadius: 'var(--r-md)',
                        border: `1px solid ${n.read ? 'var(--line)' : 'rgba(46,125,91,0.2)'}`,
                        transition: 'all 0.15s',
                      }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--c-primary-soft)', color: 'var(--c-primary)', display: 'grid', placeItems: 'center', fontSize: 15, flexShrink: 0 }}>
                          <LuBell />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: 13 }}>{n.title}</strong>
                            {!n.read && <span className={s.badge} style={{ background: 'rgba(46,125,91,0.1)', color: '#2E7D5B', borderColor: 'rgba(46,125,91,0.2)' }}>New</span>}
                          </div>
                          {n.body && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>{n.body}</div>}
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                            {n.createdAt ? new Date(n.createdAt).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={s.emptyState} style={{ padding: '24px 12px' }}>
                    <div className={s.emptyIcon} style={{ fontSize: 28 }}><LuBell size={28} /></div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>No notifications sent yet.</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>Use the form above to send a notification.</div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className={s.card}>
                <h3 className={s.cardTitle}>
                  <span className={s.cardTitleIcon}><LuHistory /></span>
                  Trial History
                </h3>
                {selectedTrial.history?.length > 0 ? (
                  <div className={s.timeline}>
                    {selectedTrial.history.map((h, i) => {
                      const action = h.action || '';
                      const isCreate = action.includes('create') || action.includes('start') || action.includes('started');
                      const isCancel = action.includes('cancel') || action.includes('cancelled');
                      const isSession = action.includes('session');
                      const isNotif = action.includes('notif');
                      const isExpire = action.includes('expire');
                      const iconCls = isCancel ? s.timeIconAmber : isCreate ? s.timeIconGreen : isNotif ? s.timeIconBlue : '';
                      const IconTag = isCancel ? LuCalendarX : isCreate ? LuGift : isNotif ? LuBell : isSession ? LuCalendar : LuClock;
                      return (
                        <div key={i} className={s.timeItem}>
                          <div className={`${s.timeIcon} ${iconCls}`}><IconTag size={15} /></div>
                          <div className={s.timeBody}>
                            <div className={s.timeTitle} style={{ textTransform: 'capitalize' }}>{action.replace(/_/g, ' ')}</div>
                            {h.note && <div className={s.timeMeta}>{h.note}</div>}
                            <div className={s.timeMeta}>
                              {h.at ? new Date(h.at).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                              {h.by && <span> &middot; by {h.by}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={s.emptyState} style={{ padding: '20px 12px' }}>
                    <div className={s.emptyIcon} style={{ fontSize: 28 }}><LuHistory size={28} /></div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>No history entries yet.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Create Sessions Modal ── */}
      {bulkOpen && (
        <div className={s.modalOverlay} onClick={() => setBulkOpen(false)} style={{ zIndex: 1100 }}>
          <div className={s.modalBox} style={{ maxWidth: 820, width: '95vw', maxHeight: '95vh', overflow: 'auto', textAlign: 'left', padding: 28 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--c-primary-soft)', color: 'var(--c-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LuLayers size={18} />
                  </span>
                  Bulk Trial Session
                </h2>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>Create a session for multiple trial students at once</div>
              </div>
              <button type="button" onClick={() => setBulkOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 6, borderRadius: 8 }}><LuX size={20} /></button>
            </div>

            {bulkSubmitStage === 'form' && (
              <>
                {/* ── Section 1: Audience Selection ── */}
                <div className={s.card} style={{ marginBottom: 18 }}>
                  <h3 className={s.cardTitle} style={{ marginBottom: 14 }}><LuUsers size={15} /> Target Audience</h3>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    {['all', 'selected'].map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setBulkAudience(mode)}
                        style={{
                          flex: 1, padding: '12px 16px', borderRadius: 'var(--r-md)', cursor: 'pointer',
                          border: `2px solid ${bulkAudience === mode ? 'var(--c-primary)' : 'var(--line)'}`,
                          background: bulkAudience === mode ? 'var(--c-primary-soft)' : 'var(--surface-2)',
                          color: bulkAudience === mode ? 'var(--c-primary)' : 'var(--text-2)',
                          fontWeight: bulkAudience === mode ? 700 : 500, fontSize: 13,
                          transition: 'all 0.15s', textAlign: 'left',
                        }}
                      >
                        <div style={{ fontSize: 15, marginBottom: 2 }}>
                          {mode === 'all' ? '🎯' : '👤'}
                        </div>
                        <div>{mode === 'all' ? 'All Active Free Trial Students' : 'Selected Students'}</div>
                        <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>
                          {mode === 'all' ? `${bulkTotal} student(s) will receive this session` : 'Choose specific students from the list'}
                        </div>
                      </button>
                    ))}
                  </div>

                  {bulkAudience === 'selected' && (
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <LuSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                          <input
                            placeholder="Search students by name or email…"
                            value={bulkSearch}
                            onChange={(e) => handleBulkSearchChange(e.target.value)}
                            style={{ paddingLeft: 30 }}
                          />
                        </div>
                        <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={toggleBulkSelectAll} style={{ whiteSpace: 'nowrap' }}>
                          {bulkSelectAll ? 'Clear Selection' : `Select All (${bulkStudents.length})`}
                        </button>
                      </div>
                      <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                        <div style={{ maxHeight: 260, overflow: 'auto' }}>
                          {bulkLoading ? (
                            <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)' }}><LuLoader size={20} className={s.spin} /> Loading students…</div>
                          ) : bulkStudents.length === 0 ? (
                            <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)' }}>No active trials found.</div>
                          ) : (
                            <table className={s.table}>
                              <thead>
                                <tr>
                                  <th style={{ width: 36 }}></th>
                                  <th>Student</th>
                                  <th>Trial Started</th>
                                  <th>Trial Ends</th>
                                  <th>Progress</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bulkStudents.map((trial) => {
                                  const uid = trial.user?._id || trial.user;
                                  const checked = bulkSelectedIds.includes(uid);
                                  return (
                                    <tr key={trial._id} onClick={() => toggleBulkStudent(uid)} style={{ cursor: 'pointer', background: checked ? 'rgba(46,125,91,0.04)' : undefined }}>
                                      <td><input type="checkbox" checked={checked} onChange={() => toggleBulkStudent(uid)} /></td>
                                      <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <div className={`${s.avatar} ${s.avatarSm} ${s[avatarCls(trial.user?.name)]}`}>
                                            {(trial.user?.name || '?')[0]}
                                          </div>
                                          <div>
                                            <div style={{ fontSize: 13, fontWeight: 500 }}>{trial.user?.name || 'Unknown'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{trial.user?.email || '-'}</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{trial.startDate ? new Date(trial.startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '-'}</td>
                                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{trial.endDate ? new Date(trial.endDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '-'}</td>
                                      <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <div style={{ width: 60, height: 5, background: 'var(--line)', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{ width: `${Math.min(100, trial.sessionsProgressPct || 0)}%`, height: '100%', background: 'var(--c-primary)', borderRadius: 3 }} />
                                          </div>
                                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{trial.completedSessions || 0}/{trial.maxSessions || 7}</span>
                                        </div>
                                      </td>
                                      <td><Badge status={trial.status || 'active'} /></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                        {bulkPages > 1 && (
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '8px 12px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                            {Array.from({ length: bulkPages }, (_, i) => i + 1).map(p => (
                              <button
                                key={p}
                                type="button"
                                className={`${s.btn} ${s.btnSm}`}
                                onClick={() => loadBulkPage(p)}
                                style={{
                                  minWidth: 28, padding: '4px 6px',
                                  background: p === bulkPage ? 'var(--c-primary)' : 'transparent',
                                  color: p === bulkPage ? '#fff' : 'var(--text-2)',
                                  border: 'none',
                                }}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{bulkSelectedIds.length} student(s) selected</span>
                        {bulkSelectedIds.length > 0 && (
                          <button type="button" onClick={() => { setBulkSelectedIds([]); setBulkSelectAll(false); }} style={{ background: 'none', border: 'none', color: 'var(--c-primary)', cursor: 'pointer', fontSize: 12 }}>
                            Clear selection
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Section 2: Session Form ── */}
                <div className={s.card} style={{ marginBottom: 18 }}>
                  <h3 className={s.cardTitle} style={{ marginBottom: 14 }}><LuCalendar size={15} /> Session Details</h3>
                  <div className={s.formStack}>
                    <div>
                      <label className={s.fieldLabel}>Session Title *</label>
                      <input placeholder="e.g. Intro to Hatha Yoga" value={bulkSession.title}
                        onChange={(e) => setBulkSession({ ...bulkSession, title: e.target.value })} required />
                    </div>
                    <div>
                      <label className={s.fieldLabel}>Description</label>
                      <textarea className={s.textarea} placeholder="Brief description of the session (optional)"
                        value={bulkSession.description} onChange={(e) => setBulkSession({ ...bulkSession, description: e.target.value })} rows={2} />
                    </div>
                    <div className={s.grid3}>
                      <div>
                        <label className={s.fieldLabel}>Session Date *</label>
                        <input type="date" value={bulkSession.date}
                          onChange={(e) => setBulkSession({ ...bulkSession, date: e.target.value })} required />
                      </div>
                      <div>
                        <label className={s.fieldLabel}>Start Time *</label>
                        <input type="time" value={bulkSession.startTime}
                          onChange={(e) => setBulkSession({ ...bulkSession, startTime: e.target.value })} required />
                      </div>
                      <div>
                        <label className={s.fieldLabel}>End Time</label>
                        <input type="time" value={bulkSession.endTime}
                          onChange={(e) => setBulkSession({ ...bulkSession, endTime: e.target.value })} />
                      </div>
                    </div>
                    <div className={s.grid3}>
                      <div>
                        <label className={s.fieldLabel}>Duration (min)</label>
                        <input type="number" min={15} max={180} step={5} value={bulkSession.duration}
                          onChange={(e) => setBulkSession({ ...bulkSession, duration: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className={s.fieldLabel}>Meeting Platform</label>
                        <select value={bulkSession.meetingPlatform}
                          onChange={(e) => setBulkSession({ ...bulkSession, meetingPlatform: e.target.value })}>
                          <option value="Zoom">Zoom</option>
                          <option value="Google Meet">Google Meet</option>
                          <option value="In-Person">In-Person</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className={s.fieldLabel}>Instructor</label>
                        <input placeholder="Instructor name" value={bulkSession.instructor}
                          onChange={(e) => setBulkSession({ ...bulkSession, instructor: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className={s.fieldLabel}>Meeting Link</label>
                      <input placeholder="https://zoom.us/j/… or Google Meet link (optional)" value={bulkSession.meetingLink}
                        onChange={(e) => setBulkSession({ ...bulkSession, meetingLink: e.target.value })} />
                    </div>
                    <div>
                      <label className={s.fieldLabel}>Notes for Student</label>
                      <textarea className={s.textarea} placeholder="What the student should know before the session (optional)"
                        value={bulkSession.notes} onChange={(e) => setBulkSession({ ...bulkSession, notes: e.target.value })} rows={2} />
                    </div>
                  </div>
                </div>

                {/* ── Footer ── */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className={`${s.btn}`} onClick={() => setBulkOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className={`${s.btnPrimary}`} onClick={goToBulkPreview}>
                    <LuCheck size={14} /> Review &amp; Create
                  </button>
                </div>
              </>
            )}

            {bulkSubmitStage === 'preview' && (
              <>
                {/* ── Section 3: Preview & Confirmation ── */}
                <div className={s.card} style={{ marginBottom: 18, borderColor: 'var(--c-primary-line)' }}>
                  <h3 className={s.cardTitle} style={{ marginBottom: 14, color: 'var(--c-primary)' }}>
                    <LuCheck size={15} /> Confirmation Summary
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                    <div style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Target Students</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--c-primary)' }}>{getTargetStudentCount()}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                        {bulkAudience === 'all' ? 'All active free trial students' : 'Selected students'}
                      </div>
                    </div>
                    <div style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Session</div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{bulkSession.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                        {bulkSession.date} at {bulkSession.startTime} &middot; {bulkSession.duration} min
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {bulkSession.description && (
                      <div style={{ fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>Description:</span> {bulkSession.description}
                      </div>
                    )}
                    {bulkSession.instructor && (
                      <div style={{ fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>Instructor:</span> {bulkSession.instructor}
                      </div>
                    )}
                    <div style={{ fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>Platform:</span> {bulkSession.meetingPlatform}
                      {bulkSession.meetingLink && <span> &middot; <a href={bulkSession.meetingLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-primary)' }}>{bulkSession.meetingLink}</a></span>}
                    </div>
                    {bulkSession.notes && (
                      <div style={{ fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>Notes:</span> {bulkSession.notes}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: 12, background: 'rgba(46,125,91,0.06)', borderRadius: 'var(--r-md)', border: '1px solid rgba(46,125,91,0.15)', fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
                    <strong>What will happen:</strong> A separate session record will be created for each of the {getTargetStudentCount()} student(s). Each student will receive an independent document in MongoDB with its own attendance, rescheduling, and completion status. All students will be notified about the newly scheduled session.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className={`${s.btn}`} onClick={() => setBulkSubmitStage('form')} disabled={bulkSubmitStage === 'submitting'}>
                    <LuChevronLeft size={14} /> Back
                  </button>
                  <button type="button" className={`${s.btnPrimary}`} onClick={handleBulkCreate} disabled={bulkSubmitStage === 'submitting'}>
                    {bulkSubmitStage === 'submitting' ? (
                      <><LuLoader size={14} className={s.spin} /> Creating Sessions…</>
                    ) : (
                      <><LuLayers size={14} /> Create for {getTargetStudentCount()} Student(s)</>
                    )}
                  </button>
                </div>
              </>
            )}

            {bulkSubmitStage === 'submitting' && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <LuLoader size={36} className={s.spin} style={{ color: 'var(--c-primary)' }} />
                <div style={{ marginTop: 16, fontSize: 15, fontWeight: 600 }}>Creating Sessions</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
                  Creating individual session records for {getTargetStudentCount()} student(s)…
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
