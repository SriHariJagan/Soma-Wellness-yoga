import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { receptionApi } from '../../api/AdminServices';
import {
  LuCheck, LuX, LuCalendarDays, LuCalendarCheck, LuRefreshCw, LuClock, LuUser,
} from 'react-icons/lu';
import s from '../../Admin/YogaAdmin.module.css';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(d) {
  if (!d) return 'â€”';
  return new Date(d).toLocaleDateString('en-KE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
  const st = String(status || '').toLowerCase();
  const cls = st === 'present' || st === 'zoom' ? s.badgeGreen : st === 'absent' ? s.badgeRed : s.badgeAmber;
  return <span className={`${s.badge} ${cls}`}>{status || 'Not marked'}</span>;
}

export default function AttendanceTab() {
  const { hasAnyPermission } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [roster, setRoster] = useState([]);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);

  const canView = hasAnyPermission('attendance.view', 'classes.attendance');
  const canMark = hasAnyPermission('attendance.create', 'classes.attendance.create');

  const loadOverview = useCallback(async () => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    try {
      setOverview(await receptionApi.attendance.overview());
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load attendance' });
    }
    setLoading(false);
  }, [canView]);

  // Classes (invites) available on the chosen date.
  const loadInvites = useCallback(async (d, preselectFirst = false) => {
    if (!canView) return;
    setInvitesLoading(true);
    try {
      const data = await receptionApi.attendance.invites({ date: d });
      const list = Array.isArray(data) ? data : [];
      setInvites(list);
      // Auto-select today's class (first of the day) for the simple flow.
      if (preselectFirst) {
        setSelectedId(list.length > 0 ? String(list[0]._id) : '');
        if (list.length === 0) { setRoster([]); setInviteInfo(null); setMarks({}); }
      } else {
        setSelectedId((prev) => (list.some((inv) => String(inv._id) === prev) ? prev : ''));
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load classes for date' });
    }
    setInvitesLoading(false);
  }, [canView]);

  // Roster (students + recorded attendance) for the selected class.
  const loadRoster = useCallback(async (inviteId) => {
    if (!canView || !inviteId) { setRoster([]); setInviteInfo(null); setMarks({}); return; }
    setRosterLoading(true);
    try {
      const data = await receptionApi.attendance.students(inviteId);
      const rows = Array.isArray(data?.students) ? data.students : [];
      setRoster(rows);
      setInviteInfo(data?.invite || null);
      const initial = {};
      for (const row of rows) {
        const id = String(row.student?._id || '');
        if (!id) continue;
        const recorded = row.attendance?.status;
        initial[id] = recorded === 'absent' ? 'absent' : 'present';
      }
      setMarks(initial);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load class roster' });
    }
    setRosterLoading(false);
  }, [canView]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { loadInvites(todayISO(), true); }, [loadInvites]);
  useEffect(() => { loadRoster(selectedId); }, [selectedId, loadRoster]);

  const handleDateChange = (d) => {
    setDate(d);
    setSelectedId('');
    setRoster([]);
    setInviteInfo(null);
    setMarks({});
    loadInvites(d, true);
  };

  const markedCount = useMemo(
    () => roster.filter((r) => r.attendance).length,
    [roster]
  );
  const presentPicked = useMemo(
    () => Object.values(marks).filter((m) => m === 'present').length,
    [marks]
  );

  const handleSave = async (markAll = false) => {
    if (!selectedId) return;
    setSaving(true);
    try {
      if (markAll) {
        await receptionApi.attendance.markAll(selectedId);
      } else {
        const attendanceData = roster
          .map((row) => ({ user: String(row.student?._id || ''), status: marks[String(row.student?._id || '')] || 'present' }))
          .filter((item) => item.user);
        if (attendanceData.length === 0) {
          setFeedback({ type: 'error', message: 'No students in this class to mark.' });
          setSaving(false);
          return;
        }
        await receptionApi.attendance.bulkMark({ inviteId: selectedId, attendanceData });
      }
      setFeedback({ type: 'success', message: markAll ? 'Everyone marked present.' : 'Attendance saved successfully.' });
      await loadRoster(selectedId);
      await loadOverview();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save attendance.' });
    }
    setSaving(false);
  };

  if (!canView) {
    return (
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}><LuCalendarCheck size={20} /> Attendance</h2>
        </div>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>ðŸ”’</div>
          <h3 className={s.emptyTitle}>No access</h3>
          <p className={s.emptyDesc}>You don't have permission to view attendance. Contact an admin to grant attendance.view access.</p>
        </div>
      </div>
    );
  }

  const summary = [
    { label: 'Present today', value: overview?.presentToday ?? 0 },
    { label: 'Absent today', value: overview?.absentToday ?? 0 },
    { label: 'Rate', value: `${overview?.attendanceRate ?? 0}%` },
    { label: 'Marked in class', value: roster.length > 0 ? `${markedCount}/${roster.length}` : 'â€”' },
  ];

  return (
    <div className={s.recPage}>
      {/* â”€â”€ Header â”€â”€ */}
      <div className={s.sectionHeader}>
        <h2 className={s.sectionTitle}>
          <LuCalendarCheck size={20} /> Attendance
          <span className={s.chipCount} style={{ fontSize: 12 }}>Â· {formatDate(date)}</span>
        </h2>
        <div className={s.toolbar}>
          <button
            type="button" className={`${s.btn} ${s.btnSm}`}
            onClick={() => { loadOverview(); loadInvites(date, false); loadRoster(selectedId); }}
            disabled={loading} title="Refresh"
          >
            <LuRefreshCw size={14} className={loading ? s.spin : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* â”€â”€ One main card â”€â”€ */}
      <div className={`${s.card} ${s.cardNoPad}`}>
        <div style={{ padding: '18px 20px 0' }}>
          {/* slim summary bar */}
          <div className={s.recSummary} style={{ marginBottom: 14 }}>
            {summary.map((item) => (
              <div key={item.label} className={s.recSummaryCell}>
                <div className={s.statLabel}>{item.label}</div>
                <div className={s.recSummaryValue}>
                  {loading ? 'â€“' : item.value}
                </div>
              </div>
            ))}
          </div>

          {/* class + date selectors */}
          <div className={s.filterBar} style={{ marginBottom: 14 }}>
            <label className={s.fieldLabel} style={{ margin: 0, minWidth: 150 }}>
              Date
              <input type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} aria-label="Attendance date" />
            </label>
            <label className={s.fieldLabel} style={{ margin: 0, flex: 1, minWidth: 220 }}>
              Class
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={invitesLoading}
                aria-label="Select class"
              >
                <option value="">{invitesLoading ? 'Loading classesâ€¦' : invites.length === 0 ? 'No classes on this date' : 'Select a classâ€¦'}</option>
                {invites.map((inv) => (
                  <option key={inv._id} value={String(inv._id)}>
                    {(inv.title || 'Untitled class')}{inv.startTime ? ` Â· ${inv.startTime}` : ''} ({inv.totalRecipients ?? 0} students)
                  </option>
                ))}
              </select>
            </label>
          </div>

          {inviteInfo && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14, fontSize: 13 }}>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{inviteInfo.title}</span>
              <span className={s.chip}>
                <LuClock size={12} /> {inviteInfo.startTime || 'â€”'}{inviteInfo.endTime ? `â€“${inviteInfo.endTime}` : ''}
              </span>
              {inviteInfo.instructor && <span className={s.chip}><LuUser size={12} /> {inviteInfo.instructor}</span>}
              <span className={s.chip}>{presentPicked} present picked</span>
            </div>
          )}

          {feedback && (
            <div className={`${s.feedbackInline} ${feedback.type === 'success' ? s.bannerSuccess : s.bannerError}`} style={{ marginBottom: 14 }}>
              <span>{feedback.type === 'success' ? 'âœ“' : 'âš '}</span>
              <span>{feedback.message}</span>
              <button type="button" className={s.btnGhost} onClick={() => setFeedback(null)} aria-label="Dismiss">
                <LuX size={14} />
              </button>
            </div>
          )}
        </div>

        {/* roster */}
        {!selectedId ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}><LuCalendarDays size={40} /></div>
            <h3 className={s.emptyTitle}>{invites.length === 0 ? 'No classes on this date' : 'Select a class'}</h3>
            <p className={s.emptyDesc}>
              {invites.length === 0
                ? 'Pick another date to view previous attendance, or create a class invite first.'
                : 'Choose a class above to see its students and mark attendance.'}
            </p>
          </div>
        ) : rosterLoading ? (
          <div style={{ padding: 22 }}>
            {[...Array(5)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} />)}
          </div>
        ) : roster.length === 0 ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>ðŸ‘¥</div>
            <h3 className={s.emptyTitle}>No students in this class</h3>
            <p className={s.emptyDesc}>This class has no invited students yet.</p>
          </div>
        ) : (
          <>
            <div className={s.recTableScroll}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Recorded</th>
                    <th style={{ textAlign: 'right' }}>{canMark ? 'Mark' : ''}</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((row) => {
                    const id = String(row.student?._id || '');
                    const picked = marks[id] || 'present';
                    return (
                      <tr key={id}>
                        <td>
                          <div className={s.cellUser}>
                            <div className={`${s.receptionStudentAvatar} ${s.av0}`}>
                              {((row.student?.name || '?')).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700 }}>{row.student?.name || 'â€”'}</div>
                              {row.student?.email && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{row.student.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td>{row.attendance ? statusBadge(row.attendance.status) : <span style={{ color: 'var(--text-3)', fontSize: 12.5 }}>Not marked</span>}</td>
                        <td>
                          {canMark ? (
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className={`${s.btn} ${s.btnSm} ${picked === 'present' ? s.btnPrimary : ''}`}
                                onClick={() => setMarks((m) => ({ ...m, [id]: 'present' }))}
                              >
                                <LuCheck size={14} /> Present
                              </button>
                              <button
                                type="button"
                                className={`${s.btn} ${s.btnSm} ${picked === 'absent' ? s.btnDanger : ''}`}
                                onClick={() => setMarks((m) => ({ ...m, [id]: 'absent' }))}
                              >
                                <LuX size={14} /> Absent
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={s.tableFooter} style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <span>{roster.length} student{roster.length !== 1 ? 's' : ''} Â· {presentPicked} present picked</span>
              {canMark && (
                <span style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleSave(true)} disabled={saving}>
                    Mark all present
                  </button>
                  <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnPrimary}`} onClick={() => handleSave(false)} disabled={saving}>
                    {saving ? 'Savingâ€¦' : <><LuCheck size={14} /> Save attendance</>}
                  </button>
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {!canMark && (
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 12 }}>
          You don't have permission to mark attendance. Contact an admin to grant attendance.create access.
        </p>
      )}
    </div>
  );
}
