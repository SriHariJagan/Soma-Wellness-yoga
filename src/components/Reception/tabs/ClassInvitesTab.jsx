import React, { useState, useEffect, useCallback } from 'react';
import ReceptionModal from '../Modal.jsx';
import { useAuth } from '../../../context/AuthContext';
import { receptionApi } from '../../api/AdminServices';
import { LuPlus, LuX, LuMail, LuRefreshCw, LuSearch, LuEye } from 'react-icons/lu';
import s from '../../Admin/YogaAdmin.module.css';

const EMPTY_CREATE = {
  title: '', date: new Date().toISOString().slice(0, 10),
  startTime: '07:00', endTime: '', instructor: '',
  platform: 'Zoom', meetingLink: '', notes: '', studentIds: '',
};

function inviteBadge(status) {
  const st = String(status || '').toLowerCase();
  const cls = st === 'active' ? s.badgeGreen : st === 'cancelled' ? s.badgeRed : s.badgeAmber;
  return <span className={`${s.badge} ${cls}`}>{status || 'pending'}</span>;
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
  const [sendToAll, setSendToAll] = useState(false);
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
        receptionApi.classInvites.list({ search, status: statusFilter !== 'all' ? statusFilter : undefined }).catch(() => []),
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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.date || !createForm.startTime) {
      setFeedback({ type: 'error', message: 'Title, date and start time are required.' });
      return;
    }
    setSaving(true);
    try {
      let studentIds = createForm.studentIds
        .split(/[\s,]+/)
        .map((id) => id.trim())
        .filter(Boolean);
      // "Send to all" â€” resolve every active student server-side list.
      if (sendToAll) {
        const all = await receptionApi.students.list({});
        const list = Array.isArray(all) ? all : [];
        studentIds = list.map((st) => String(st._id));
        if (studentIds.length === 0) {
          setFeedback({ type: 'error', message: 'No students found to invite.' });
          setSaving(false);
          return;
        }
      }
      await receptionApi.classInvites.create({
        title: createForm.title.trim(),
        date: createForm.date,
        startTime: createForm.startTime,
        endTime: createForm.endTime || undefined,
        instructor: createForm.instructor.trim() || undefined,
        platform: createForm.platform || 'Zoom',
        meetingLink: createForm.meetingLink.trim() || undefined,
        notes: createForm.notes.trim() || undefined,
        recipientType: 'custom',
        ...(studentIds.length > 0 ? { studentIds } : {}),
      });
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE);
      setSendToAll(false);
      setFeedback({ type: 'success', message: 'Class invite created successfully.' });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create class invite.' });
    }
    setSaving(false);
  };

  const handleCancel = async (inv) => {
    if (!window.confirm(`Cancel invite "${inv.title}"?`)) return;
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
          <div className={s.emptyIcon}>ðŸ”’</div>
          <h3 className={s.emptyTitle}>No access</h3>
          <p className={s.emptyDesc}>You don't have permission to view class invites. Contact an admin to grant bookings.view access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={s.recPage}>
      {/* â”€â”€ Header â”€â”€ */}
      <div className={s.sectionHeader}>
        <h2 className={s.sectionTitle}>
          <LuMail size={20} /> Class Invites
          <span className={s.chipCount} style={{ fontSize: 12 }}>Â· {stats?.total ?? invites.length} total</span>
        </h2>
        <div className={s.toolbar}>
          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={loadData} disabled={loading} title="Refresh">
            <LuRefreshCw size={14} className={loading ? s.spin : ''} /> Refresh
          </button>
          {canCreate && (
            <button type="button" className={s.topCreate} onClick={() => { setSendToAll(false); setShowCreate(true); }}>
              <LuPlus size={16} /> New Invite
            </button>
          )}
        </div>
      </div>

      {/* â”€â”€ Summary strip â”€â”€ */}
      <div className={s.recSummary}>
        <div className={s.recSummaryCell}>
          <div className={s.statLabel}>Total</div>
          <div className={s.recSummaryValue}>{stats?.total ?? invites.length}</div>
        </div>
        <div className={s.recSummaryCell}>
          <div className={s.statLabel}>Active</div>
          <div className={s.recSummaryValue}>{stats?.active ?? 0}</div>
        </div>
        <div className={s.recSummaryCell}>
          <div className={s.statLabel}>Upcoming</div>
          <div className={s.recSummaryValue}>{stats?.upcoming ?? 0}</div>
        </div>
        <div className={s.recSummaryCell}>
          <div className={s.statLabel}>Cancelled</div>
          <div className={s.recSummaryValue}>{stats?.cancelled ?? 0}</div>
        </div>
      </div>

      {/* â”€â”€ Feedback â”€â”€ */}
      {feedback && (
        <div className={`${s.feedbackInline} ${feedback.type === 'success' ? s.bannerSuccess : s.bannerError}`}>
          <span>{feedback.type === 'success' ? 'âœ“' : 'âš '}</span>
          <span>{feedback.message}</span>
          <button type="button" className={s.btnGhost} onClick={() => setFeedback(null)} aria-label="Dismiss">
            <LuX size={14} />
          </button>
        </div>
      )}

      {/* â”€â”€ Search + status filter â”€â”€ */}
      <div className={s.filterBar} style={{ marginBottom: 16 }}>
        <div className={s.searchWrapper} style={{ maxWidth: 420 }}>
          <span className={s.searchIcon}><LuSearch size={16} /></span>
          <input
            className={s.searchInput}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title or instructorâ€¦"
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

      {/* â”€â”€ List â”€â”€ */}
      <div className={`${s.card} ${s.cardNoPad}`}>
        {loading ? (
          <div style={{ padding: 22 }}>
            {[...Array(5)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} />)}
          </div>
        ) : invites.length === 0 ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>âœ‰ï¸</div>
            <h3 className={s.emptyTitle}>No invites found</h3>
            <p className={s.emptyDesc}>
              {search || statusFilter !== 'all' ? 'Try a different search or filter.' : 'Create your first class invite to get started.'}
            </p>
            {canCreate && !search && statusFilter === 'all' && (
              <button type="button" className={s.topCreate} onClick={() => { setSendToAll(false); setShowCreate(true); }}>
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
                    <th>Title</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Recipients</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.slice(0, 50).map((inv) => {
                    const busy = actioningId === inv._id;
                    return (
                      <tr key={inv._id}>
                        <td style={{ fontWeight: 700 }}>{inv.title || 'â€”'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-2)' }}>
                          {inv.date ? new Date(inv.date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : 'â€”'}
                        </td>
                        <td>{inv.startTime || 'â€”'}</td>
                        <td>{inv.totalRecipients ?? inv.recipients?.length ?? 'â€”'}</td>
                        <td>{inviteBadge(inv.status)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleView(inv)} title="View details">
                              <LuEye size={14} /> View
                            </button>
                            {canCreate && (
                              <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleResend(inv)} disabled={busy} title="Resend reminder">
                                Resend
                              </button>
                            )}
                            {canCancel && inv.status !== 'cancelled' && (
                              <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} onClick={() => handleCancel(inv)} disabled={busy} title="Cancel invite">
                                Cancel
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

      {/* â”€â”€ Create modal â”€â”€ */}
      {showCreate && (
        <ReceptionModal
          title="New Class Invite"
          subtitle="Invite students to a class session"
          icon={<LuMail size={20} />}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        >
              <label className={s.fieldLabel}>
                Title *
                <input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} required placeholder="e.g. Morning Flow â€” 7 AM" />
              </label>
              <div className={s.grid3}>
                <label className={s.fieldLabel}>
                  Date *
                  <input type="date" value={createForm.date} onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })} required />
                </label>
                <label className={s.fieldLabel}>
                  Start time *
                  <input type="time" value={createForm.startTime} onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })} required />
                </label>
                <label className={s.fieldLabel}>
                  End time
                  <input type="time" value={createForm.endTime} onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })} />
                </label>
              </div>
              <div className={s.grid2}>
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
                <input value={createForm.meetingLink} onChange={(e) => setCreateForm({ ...createForm, meetingLink: e.target.value })} placeholder="https://â€¦" />
              </label>
              <label className={s.fieldLabel}>
                Student IDs
                <textarea
                  value={createForm.studentIds}
                  onChange={(e) => setCreateForm({ ...createForm, studentIds: e.target.value })}
                  rows={2}
                  placeholder="Comma-separated _ids from Customers â†’ View (blank = default filter)"
                  disabled={sendToAll}
                />
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={sendToAll}
                  onChange={(e) => setSendToAll(e.target.checked)}
                  disabled={!canListStudents}
                  style={{ width: 16, height: 16, accentColor: 'var(--c-primary)' }}
                />
                Send to all active students
                {!canListStudents && <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(needs customers.view)</span>}
              </label>
              <label className={s.fieldLabel}>
                Notes
                <textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} rows={2} placeholder="Optional note for studentsâ€¦" />
              </label>
              <div className={s.modalActions}>
                <button type="button" className={s.btn} onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
                  {saving ? 'Creatingâ€¦' : <><LuPlus size={15} /> Create invite</>}
                </button>
              </div>
        </ReceptionModal>
      )}

      {/* â”€â”€ Detail modal â”€â”€ */}
      {detail && (
        <ReceptionModal
          title={detail.title || 'Invite details'}
          icon={<LuEye size={20} />}
          onClose={() => setDetail(null)}
        >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {inviteBadge(detail.status)}
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  {detail.date ? new Date(detail.date).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
                  {detail.startTime ? ` Â· ${detail.startTime}` : ''}{detail.endTime ? `â€“${detail.endTime}` : ''}
                </span>
              </div>
              <div className={s.grid2}>
                <div>
                  <div className={s.sectionLabel}>Instructor</div>
                  <div style={{ fontSize: 14 }}>{detail.instructor || 'â€”'}</div>
                </div>
                <div>
                  <div className={s.sectionLabel}>Recipients</div>
                  <div style={{ fontSize: 14 }}>{detail.totalRecipients ?? detail.recipients?.length ?? 0}</div>
                </div>
              </div>
              {detail.meetingLink && (
                <div>
                  <div className={s.sectionLabel}>Meeting link</div>
                  <div style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{detail.meetingLink}</div>
                </div>
              )}
              {Array.isArray(detail.recipients) && detail.recipients.length > 0 && (
                <div>
                  <div className={s.sectionLabel}>Recipients (first 20)</div>
                  <ul className={s.list}>
                    {detail.recipients.slice(0, 20).map((r, i) => (
                      <li key={r._id || i} className={s.listItem}>
                        <span>{r.name || r.user?.name || r.email || 'â€”'}</span>
                        <span className={s.listMeta}>{r.status || ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className={s.modalActions}>
                <button type="button" className={s.btn} onClick={() => setDetail(null)}>Close</button>
              </div>
        </ReceptionModal>
      )}
    </div>
  );
}
