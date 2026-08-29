import React, { useState, useEffect, useCallback } from 'react';
import s from './YogaAdmin.module.css';
import { PageHeader, Avatar } from './ui/Primitives';
import Badge from './Badge';
import FeedbackBanner from './FeedbackBanner';
import {
  getAttendanceEnrollmentTypes,
  getAttendanceEnrollmentItems,
  getAttendanceClassInvites,
  getAttendanceStudents,
  getMembershipAttendanceStudents,
  getAllMembershipInvites,
  getActiveMembersForInvite,
  bulkMarkAttendance,
  markAllPresent,
  resetAttendance,
} from '../api/AdminServices.js';
import {
  LuLoader, LuRefreshCw, LuX, LuCheck, LuArrowLeft,
  LuCalendarCheck, LuCalendarX, LuLink, LuSearch,
} from 'react-icons/lu';

const TYPE_META = {
  plan:     { icon: 'ti-shield-check', color: '#F97316', label: 'Plan' },
  service:  { icon: 'ti-package',      color: '#16A34A', label: 'Service' },
  course:   { icon: 'ti-books',        color: '#2563EB', label: 'Course' },
  workshop: { icon: 'ti-award',        color: '#7C3AED', label: 'Workshop' },
  trial:    { icon: 'ti-gift',         color: '#EC4899', label: 'Free Trial' },
  batch:    { icon: 'ti-radio-tower',  color: '#0891B2', label: 'Batch' },
  yttc:     { icon: 'ti-certificate',  color: '#059669', label: 'YTTC' },
};

export default function AttendanceManagement({ onChanged } = {}) {
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [invites, setInvites] = useState([]);

  // Modal state (for non-plan types)
  const [modalInvite, setModalInvite] = useState(null);
  const [modalInviteInfo, setModalInviteInfo] = useState(null);
  const [modalStudents, setModalStudents] = useState([]);

  // Full-page membership attendance view
  const [membershipView, setMembershipView] = useState(null);
  const [membershipStudents, setMembershipStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [loadingTypes, setLoadingTypes] = useState(true);
  const [typesError, setTypesError] = useState(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const flash = (msg, type = 'success') => setFeedback({ message: msg, type });

  const loadTypes = useCallback(async () => {
    setLoadingTypes(true);
    setTypesError(null);
    try {
      const data = await getAttendanceEnrollmentTypes();
      setTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      setTypesError(err.message || 'Failed to load enrollment types');
      setTypes([]);
    }
    setLoadingTypes(false);
  }, []);

  useEffect(() => { loadTypes(); }, [loadTypes]);

  const handleSelectType = async (type) => {
    setSelectedType(type);
    setSelectedItem(null);
    setInvites([]);
    setModalInvite(null);
    setMembershipView(null);
    setLoadingItems(true);
    try {
      const data = await getAttendanceEnrollmentItems(type);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
      flash('Failed to load enrollment items', 'error');
    }
    setLoadingItems(false);
  };

  const handleSelectItem = async (item) => {
    setSelectedItem(item);
    setInvites([]);
    setModalInvite(null);
    setMembershipView(null);
    setLoadingInvites(true);
    try {
      // Virtual "Members" item — fetch all membership invites
      const data = item._id === '__all_members__'
        ? await getAllMembershipInvites()
        : await getAttendanceClassInvites(selectedType, item._id);
      setInvites(Array.isArray(data) ? data : []);
    } catch {
      setInvites([]);
      flash('Failed to load class invites', 'error');
    }
    setLoadingInvites(false);
  };

  // Open modal for non-plan types
  const handleOpenModal = async (invite) => {
    setModalInvite(invite);
    setLoadingModal(true);
    try {
      const data = await getAttendanceStudents(invite._id);
      setModalInviteInfo(data.invite || data);
      setModalStudents(
        (data.students || []).map(st => ({
          ...st,
          markStatus: st.attendance?.status || null,
        }))
      );
    } catch {
      flash('Failed to load student data', 'error');
      setModalInvite(null);
    }
    setLoadingModal(false);
  };

  // Full-page membership attendance view
  const handleOpenMembershipView = async (invite) => {
    setLoadingMembership(true);
    try {
      // Virtual "Members" item uses the all-members endpoint
      const isAllMembers = selectedItem._id === '__all_members__';
      const data = isAllMembers
        ? await getActiveMembersForInvite(invite._id)
        : await getMembershipAttendanceStudents(selectedItem._id, invite._id);
      setMembershipView(data);
      setMembershipStudents(
        (data.students || []).map(st => ({
          ...st,
          markStatus: st.attendance?.status || null,
        }))
      );
      setSearchQuery('');
    } catch {
      flash('Failed to load membership attendance data', 'error');
    }
    setLoadingMembership(false);
  };

  const handleToggleStatus = (studentId, status, source = 'modal') => {
    const setter = source === 'modal' ? setModalStudents : setMembershipStudents;
    setter(prev =>
      prev.map(st =>
        st.student._id === studentId
          ? { ...st, markStatus: st.markStatus === status ? null : status }
          : st
      )
    );
  };

  const handleSaveModal = async () => {
    const toMark = modalStudents.filter(st => st.markStatus);
    if (!toMark.length) { flash('No changes to save', 'error'); return; }
    setSaving(true);
    try {
      await bulkMarkAttendance({
        inviteId: modalInvite._id,
        attendanceData: toMark.map(st => ({ user: st.student._id, status: st.markStatus })),
      });
      flash(`Saved attendance for ${toMark.length} student${toMark.length > 1 ? 's' : ''}`, 'success');
      setModalInvite(null);
      setModalStudents([]);
      setModalInviteInfo(null);
      handleSelectItem(selectedItem);
      if (onChanged) onChanged();
    } catch (err) {
      flash(err.message || 'Save failed', 'error');
    }
    setSaving(false);
  };

  const handleAllPresentModal = async () => {
    setSaving(true);
    try {
      await markAllPresent(modalInvite._id);
      flash('All students marked Present', 'success');
      const data = await getAttendanceStudents(modalInvite._id);
      setModalStudents(
        (data.students || []).map(st => ({
          ...st,
          markStatus: st.attendance?.status || null,
        }))
      );
      if (onChanged) onChanged();
    } catch (err) {
      flash(err.message || 'Failed', 'error');
    }
    setSaving(false);
  };

  // Membership attendance helpers
  const handleMembershipToggle = (studentId, status) =>
    handleToggleStatus(studentId, status, 'membership');

  const handleMembershipSave = async () => {
    const toMark = membershipStudents.filter(st => st.markStatus);
    if (!toMark.length) { flash('No changes to save', 'error'); return; }
    setSaving(true);
    try {
      await bulkMarkAttendance({
        inviteId: membershipView.invite._id,
        attendanceData: toMark.map(st => ({ user: st.student._id, status: st.markStatus })),
      });
      flash(`Saved attendance for ${toMark.length} student${toMark.length > 1 ? 's' : ''}`, 'success');
      const isAllMembers = selectedItem._id === '__all_members__';
      const data = isAllMembers
        ? await getActiveMembersForInvite(membershipView.invite._id)
        : await getMembershipAttendanceStudents(selectedItem._id, membershipView.invite._id);
      setMembershipView(data);
      setMembershipStudents(
        (data.students || []).map(st => ({
          ...st,
          markStatus: st.attendance?.status || null,
        }))
      );
      handleSelectItem(selectedItem);
      if (onChanged) onChanged();
    } catch (err) {
      flash(err.message || 'Save failed', 'error');
    }
    setSaving(false);
  };

  const handleMembershipAllPresent = async () => {
    setSaving(true);
    try {
      await markAllPresent(membershipView.invite._id);
      flash('All students marked Present', 'success');
      const isAllMembers = selectedItem._id === '__all_members__';
      const data = isAllMembers
        ? await getActiveMembersForInvite(membershipView.invite._id)
        : await getMembershipAttendanceStudents(selectedItem._id, membershipView.invite._id);
      setMembershipView(data);
      setMembershipStudents(
        (data.students || []).map(st => ({
          ...st,
          markStatus: st.attendance?.status || null,
        }))
      );
      if (onChanged) onChanged();
    } catch (err) {
      flash(err.message || 'Failed to mark all present', 'error');
    }
    setSaving(false);
  };

  const handleMembershipAllAbsent = () => {
    setMembershipStudents(prev =>
      prev.map(st => ({ ...st, markStatus: 'absent' }))
    );
  };

  const handleMembershipReset = async () => {
    if (!window.confirm('Reset all attendance for this session? This cannot be undone.')) return;
    setSaving(true);
    try {
      await resetAttendance(membershipView.invite._id);
      flash('Attendance reset', 'success');
      setMembershipStudents(prev => prev.map(st => ({ ...st, markStatus: null, attendance: null })));
      if (onChanged) onChanged();
    } catch (err) {
      flash(err.message || 'Failed to reset', 'error');
    }
    setSaving(false);
  };

  const isPast = (dateStr) => dateStr && new Date(dateStr) <= new Date();

  const filteredMembershipStudents = membershipStudents.filter(st =>
    !searchQuery ||
    st.student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    st.student.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Loading state ──
  if (loadingTypes) {
    return (
      <div>
        <PageHeader title="Attendance Management" subtitle="Enrollment Type → Items → Classes → Mark Attendance" />
        <div className={s.card}>
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className={`${s.skel} ${s.skelRow}`} style={{ marginBottom: 10 }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Full-page Membership Attendance View ──
  if (membershipView && !loadingMembership) {
    const inv = membershipView.invite;
    return (
      <div>
        <PageHeader title="Membership Attendance" subtitle={`${membershipView.plan?.name || 'All Members'} — ${inv.title}`}>
          <button className={`${s.btn} ${s.btnOutline}`} onClick={() => { setMembershipView(null); setMembershipStudents([]); }}>
            <LuArrowLeft size={15} /> Back to Classes
          </button>
        </PageHeader>

        {feedback.message && (
          <div style={{ marginBottom: 16 }}>
            <FeedbackBanner message={feedback.message} type={feedback.type} />
          </div>
        )}

        {/* Class Info Card */}
        <div className={s.card} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)', marginBottom: 8 }}>{inv.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8 }}>
                <span><i className="ti ti-calendar" /> {new Date(inv.date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {inv.startTime && <span style={{ marginLeft: 14 }}><i className="ti ti-clock" /> {inv.startTime}{inv.endTime ? ` - ${inv.endTime}` : ''}</span>}
                {inv.duration && <span style={{ marginLeft: 14 }}><i className="ti ti-clock-hour" /> {inv.duration} min</span>}
                <br />
                {inv.instructor && <span><i className="ti ti-user" /> {inv.instructor}</span>}
                <span style={{ marginLeft: 14 }}><i className="ti ti-device-laptop" /> {inv.platform || '—'}</span>
                {inv.meetingLink && <span style={{ marginLeft: 14 }}><a href={inv.meetingLink} target="_blank" rel="noreferrer" style={{ color: '#F97316', textDecoration: 'none' }}><LuLink size={13} style={{ marginRight: 3 }} /> Join</a></span>}
                <br />
                <span><i className="ti ti-users" /> {inv.totalRecipients || 0} invited, {inv.totalMembers || 0} active members</span>
                <span style={{ marginLeft: 14 }}><Badge tone={inv.status === 'completed' ? 'badgeGreen' : 'badgeBlue'}>{inv.status}</Badge></span>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <LuSearch size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)' }} />
            <input
              type="text" placeholder="Search by name or email..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1.5px solid var(--line-2)', fontSize: 13, background: 'var(--surface)', color: 'var(--text-1)' }}
            />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{filteredMembershipStudents.length} student{filteredMembershipStudents.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Student Table */}
        <div className={`${s.card} ${s.cardNoPad}`}>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>Student</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Plan</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th style={{ minWidth: 170 }}>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembershipStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className={s.emptyState}>
                        <div className={s.emptyIcon}><i className="ti ti-users" /></div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                          {searchQuery ? 'No students match your search' : 'No active members found'}
                        </p>
                        <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4 }}>
                          {searchQuery ? 'Try a different search term.' : 'Students with an active membership for this plan who received this invite will appear here.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredMembershipStudents.map(st => {
                  const current = st.markStatus || st.attendance?.status;
                  const progPct = st.totalSessions ? Math.min(100, Math.round((st.completedSessions / st.totalSessions) * 100)) : 0;
                  return (
                    <tr key={st.student._id}>
                      <td>
                        <div className={s.cellUser}>
                          <Avatar name={st.student.name} />
                          <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-1)' }}>{st.student.name}</span>
                        </div>
                      </td>
                      <td className={s.tdMuted}>{st.student.email}</td>
                      <td className={s.tdMuted}>{st.student.phone || '—'}</td>
                      <td className={s.tdMuted}>{st.planType || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>
                        {st.totalSessions != null
                          ? `${st.completedSessions}/${st.totalSessions} (${progPct}%)`
                          : `${st.completedSessions} completed`}
                      </td>
                      <td>
                        <Badge tone={st.recipientStatus === 'joined' ? 'badgeGreen' : st.recipientStatus === 'read' ? 'badgeBlue' : 'badgeAmber'}>
                          {st.recipientStatus}
                        </Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleMembershipToggle(st.student._id, 'present')} style={{
                            padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap',
                            background: st.markStatus === 'present' ? '#16A34A' : 'rgba(22,163,74,0.1)',
                            color: st.markStatus === 'present' ? '#fff' : '#16A34A',
                            transition: 'all .2s',
                          }}>
                            <i className="ti ti-circle-check" style={{ marginRight: 4 }} /> Present
                          </button>
                          <button onClick={() => handleMembershipToggle(st.student._id, 'absent')} style={{
                            padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap',
                            background: st.markStatus === 'absent' ? '#EF4444' : 'rgba(239,68,68,0.1)',
                            color: st.markStatus === 'absent' ? '#fff' : '#EF4444',
                            transition: 'all .2s',
                          }}>
                            <i className="ti ti-circle-x" style={{ marginRight: 4 }} /> Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bulk Actions */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={handleMembershipAllPresent} disabled={saving}
              className={`${s.btn} ${s.btnSm}`}
              style={{ background: '#16A34A', color: '#fff', borderColor: 'transparent' }}>
              <LuCalendarCheck size={13} /> All Present
            </button>
            <button onClick={handleMembershipAllAbsent} disabled={saving}
              className={`${s.btn} ${s.btnSm}`}
              style={{ background: '#EF4444', color: '#fff', borderColor: 'transparent' }}>
              <LuCalendarX size={13} /> All Absent
            </button>
            <button onClick={handleMembershipReset} disabled={saving}
              className={`${s.btn} ${s.btnSm} ${s.btnDanger}`}>
              <LuX size={13} /> Reset
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
              {membershipStudents.filter(st => st.markStatus).length > 0
                ? <><i className="ti ti-edit" style={{ marginRight: 4 }} />{membershipStudents.filter(st => st.markStatus).length} to update</>
                : <span style={{ fontStyle: 'italic' }}>No pending changes</span>}
            </span>
            <button onClick={handleMembershipSave} disabled={saving || !membershipStudents.some(st => st.markStatus)}
              className={`${s.btn} ${s.btnSm}`}
              style={{
                background: (saving || !membershipStudents.some(st => st.markStatus)) ? 'var(--text-2)' : '#F97316',
                color: '#fff', borderColor: 'transparent',
              }}>
              {saving ? <><LuLoader size={13} className={s.spin} /> Saving...</> : <><LuCheck size={13} /> Save Attendance</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal Step-by-Step View ──

  return (
    <div>
      <PageHeader title="Attendance Management" subtitle="Enrollment Type → Items → Classes → Mark Attendance">
        <button className={`${s.btn} ${s.btnOutline}`} onClick={loadTypes}>
          <LuRefreshCw size={15} /> Refresh
        </button>
      </PageHeader>

      {feedback.message && (
        <div style={{ marginBottom: 16 }}>
          <FeedbackBanner message={feedback.message} type={feedback.type} />
        </div>
      )}

      {/* Loading membership view */}
      {loadingMembership && (
        <div className={s.card}>
          {[0,1,2,3,4,5].map(i => <div key={i} className={`${s.skel} ${s.skelRow}`} style={{ marginBottom: 10 }} />)}
        </div>
      )}

      {!loadingMembership && <>
        {/* Step 1 — Enrollment Type Selector */}
        {!selectedType && (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16, fontWeight: 500 }}>
              Choose the type of enrollment to manage attendance for:
            </p>
            {typesError ? (
              <div className={s.emptyState}>
                <div className={s.emptyIcon}><i className="ti ti-alert-circle" /></div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>Failed to load</p>
                <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 12 }}>{typesError}</p>
                <button className={`${s.btn} ${s.btnPrimary}`} onClick={loadTypes}>
                  <LuRefreshCw size={14} /> Retry
                </button>
              </div>
            ) : types.length === 0 ? (
              <div className={s.emptyState}>
                <div className={s.emptyIcon}><i className="ti ti-building-store" /></div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>No enrollment types available</p>
                <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4 }}>
                  Create membership plans, services, or courses first in the admin panel.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {types.map(t => {
                  const meta = TYPE_META[t.type] || { icon: 'ti-building', color: '#6B7280' };
                  return (
                    <button key={t.type} onClick={() => handleSelectType(t.type)} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                      padding: '24px 16px', borderRadius: 16, cursor: 'pointer',
                      background: 'var(--surface)', border: '1.5px solid var(--line-2)',
                      transition: 'all .2s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.boxShadow = `0 4px 20px ${meta.color}20`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: `${meta.color}12`, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                        <i className={`ti ${meta.icon}`} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>{t.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{t.count} active</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Enrollment Items */}
        {selectedType && !selectedItem && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={() => { setSelectedType(null); setSelectedItem(null); setInvites([]); setModalInvite(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 4, display: 'flex' }}>
                <LuArrowLeft size={18} />
              </button>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>
                <i className={`ti ${TYPE_META[selectedType]?.icon || 'ti-building'}`} style={{ marginRight: 6, color: TYPE_META[selectedType]?.color }} />
                {types.find(t => t.type === selectedType)?.label || selectedType}
              </span>
            </div>
            {loadingItems ? (
              <div className={s.card}>
                {[0,1,2,3].map(i => <div key={i} className={`${s.skel} ${s.skelRow}`} style={{ marginBottom: 10 }} />)}
              </div>
            ) : items.length === 0 ? (
              <div className={s.emptyState}>
                <div className={s.emptyIcon}><i className="ti ti-box" /></div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>No items found</p>
                <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4 }}>No active {selectedType}s found.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {items.map(item => {
                  const isVirtual = item.isVirtual;
                  const color = isVirtual ? '#7C3AED' : (TYPE_META[selectedType]?.color || '#6B7280');
                  const icon = isVirtual ? 'ti-users' : (TYPE_META[selectedType]?.icon || 'ti-building');
                  const isSelected = selectedItem?._id === item._id;
                  return (
                    <button key={item._id} onClick={() => handleSelectItem(item)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12,
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                      background: isSelected ? `${color}08` : 'var(--surface)',
                      border: `1.5px solid ${isSelected ? color : 'var(--line-2)'}`,
                      transition: 'all .2s',
                      ...(isVirtual ? { borderLeft: `3px solid ${color}` } : {}),
                    }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}12`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        <i className={`ti ${icon}`} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-1)' }}>
                          {item.name}
                          {isVirtual && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Virtual</span>}
                        </div>
                        {item.userEmail && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{item.userEmail}</div>}
                      </div>
                      {isSelected && <LuCheck size={16} color={color} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Class Invites Table */}
        {selectedItem && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={() => { setSelectedItem(null); setInvites([]); setModalInvite(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 4, display: 'flex' }}>
                <LuArrowLeft size={18} />
              </button>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>
                {selectedItem.name} — Classes
              </span>
            </div>
            {loadingInvites ? (
              <div className={s.card}>
                {[0,1,2].map(i => <div key={i} className={`${s.skel} ${s.skelRow}`} style={{ marginBottom: 10 }} />)}
              </div>
            ) : invites.length === 0 ? (
              <div className={s.emptyState}>
                <div className={s.emptyIcon}><i className="ti ti-calendar-off" /></div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>No class invites found</p>
                <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4 }}>
                  Create a class invite for this enrollment to start tracking attendance.
                </p>
              </div>
            ) : (
              <div className={`${s.card} ${s.cardNoPad}`}>
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: 160 }}>Class Title</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Instructor</th>
                        <th>Platform</th>
                        <th>Meeting Link</th>
                        <th>Recipients</th>
                        <th>Status</th>
                        <th style={{ width: 100 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites.map(inv => {
                        const past = isPast(inv.date);
                        const marked = inv.attendanceMarked;
                        let statusLabel = 'Upcoming';
                        let badgeTone = 'badgeBlue';
                        if (past && marked) { statusLabel = 'Completed'; badgeTone = 'badgeGreen'; }
                        else if (past) { statusLabel = 'Pending'; badgeTone = 'badgeAmber'; }
                        return (
                          <tr key={inv._id}>
                            <td><span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-1)' }}>{inv.title}</span></td>
                            <td className={s.tdMuted}>{new Date(inv.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td className={s.tdMuted}>{inv.startTime}{inv.endTime ? ` - ${inv.endTime}` : ''}</td>
                            <td className={s.tdMuted}>{inv.instructor || '—'}</td>
                            <td className={s.tdMuted}>{inv.platform || '—'}</td>
                            <td>{inv.meetingLink ? <a href={inv.meetingLink} target="_blank" rel="noreferrer" style={{ color: '#F97316', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}><LuLink size={13} /> Join</a> : <span className={s.tdMuted}>—</span>}</td>
                            <td className={s.tdMuted}>{inv.presentCount || 0}/{inv.totalRecipients || 0}</td>
                            <td><Badge tone={badgeTone}>{statusLabel}</Badge></td>
                            <td>
                              {past ? (
                                <button
                                  className={`${s.btn} ${s.btnSm}`}
                                  onClick={() => selectedType === 'plan' ? handleOpenMembershipView(inv) : handleOpenModal(inv)}
                                  style={marked ? { background: 'rgba(22,163,74,0.1)', color: '#16A34A', borderColor: 'transparent' } : { background: '#F97316', color: '#fff', borderColor: 'transparent' }}
                                >
                                  {marked ? 'Edit' : 'Mark'}
                                </button>
                              ) : (
                                <span style={{ fontSize: 11.5, color: 'var(--text-2)', fontStyle: 'italic' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4 — Modal (for non-plan types) */}
        {modalInvite && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: 20,
          }}>
            <div className={s.card} style={{
              width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', padding: 0, borderRadius: 20,
            }}>
              {/* Modal Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>Mark Attendance</div>
                    {modalInviteInfo && (
                      <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
                        <strong style={{ color: 'var(--text-1)', fontSize: 14 }}>{modalInviteInfo.title}</strong><br />
                        <span><i className="ti ti-calendar" /> {new Date(modalInviteInfo.date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {modalInviteInfo.startTime && <span style={{ marginLeft: 12 }}><i className="ti ti-clock" /> {modalInviteInfo.startTime}{modalInviteInfo.endTime ? ` - ${modalInviteInfo.endTime}` : ''}</span>}
                        {modalInviteInfo.instructor && <span style={{ marginLeft: 12 }}><i className="ti ti-user" /> {modalInviteInfo.instructor}</span>}
                        <br />
                        <span><i className="ti ti-device-laptop" /> {modalInviteInfo.platform || '—'}</span>
                        {modalInviteInfo.entityLabel && <span style={{ marginLeft: 12 }}>| {modalInviteInfo.entityLabel}</span>}
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setModalInvite(null); setModalStudents([]); setModalInviteInfo(null); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 4, flexShrink: 0 }}>
                    <LuX size={20} />
                  </button>
                </div>
              </div>

              {/* Student List */}
              <div style={{ flex: 1, overflow: 'auto', padding: '12px 24px' }}>
                {loadingModal ? (
                  <div className={s.card}>
                    {[0,1,2,3].map(i => <div key={i} className={`${s.skel} ${s.skelRow}`} style={{ marginBottom: 10 }} />)}
                  </div>
                ) : modalStudents.length === 0 ? (
                  <div className={s.emptyState}>
                    <div className={s.emptyIcon}><i className="ti ti-users" /></div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>No students</p>
                    <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4 }}>This class has no recipients.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      {['present', 'absent', 'not_marked'].map(status => {
                        const count = modalStudents.filter(st => {
                          const s = st.markStatus || st.attendance?.status || 'not_marked';
                          return s === status;
                        }).length;
                        if (count === 0) return null;
                        const color = status === 'present' ? '#16A34A' : status === 'absent' ? '#EF4444' : '#9CA3AF';
                        return (
                          <span key={status} className={s.chip} style={{ borderLeft: `3px solid ${color}` }}>
                            {status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : 'Not Marked'}: {count}
                          </span>
                        );
                      })}
                    </div>
                    <div className={`${s.cardNoPad}`}>
                      <div className={s.tableWrap}>
                        <table className={s.table}>
                          <thead>
                            <tr>
                              <th style={{ minWidth: 180 }}>Student</th>
                              <th>Email</th>
                              <th>Status</th>
                              <th style={{ minWidth: 170 }}>Attendance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modalStudents.map(st => (
                              <tr key={st.student._id}>
                                <td>
                                  <div className={s.cellUser}>
                                    <Avatar name={st.student.name} />
                                    <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-1)' }}>{st.student.name}</span>
                                  </div>
                                </td>
                                <td className={s.tdMuted}>{st.student.email}</td>
                                <td><Badge tone={st.recipientStatus === 'joined' ? 'badgeGreen' : st.recipientStatus === 'read' ? 'badgeBlue' : 'badgeAmber'}>{st.recipientStatus}</Badge></td>
                                <td>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => handleToggleStatus(st.student._id, 'present')} style={{
                                      padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                      fontWeight: 600, fontSize: 12,
                                      background: st.markStatus === 'present' ? '#16A34A' : 'rgba(22,163,74,0.1)',
                                      color: st.markStatus === 'present' ? '#fff' : '#16A34A',
                                    }}>
                                      <i className="ti ti-circle-check" style={{ marginRight: 4 }} /> Present
                                    </button>
                                    <button onClick={() => handleToggleStatus(st.student._id, 'absent')} style={{
                                      padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                      fontWeight: 600, fontSize: 12,
                                      background: st.markStatus === 'absent' ? '#EF4444' : 'rgba(239,68,68,0.1)',
                                      color: st.markStatus === 'absent' ? '#fff' : '#EF4444',
                                    }}>
                                      <i className="ti ti-circle-x" style={{ marginRight: 4 }} /> Absent
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  {modalStudents.filter(st => st.markStatus).length > 0
                    ? <><i className="ti ti-edit" style={{ marginRight: 4 }} />{modalStudents.filter(st => st.markStatus).length} to update</>
                    : <span style={{ fontStyle: 'italic' }}>Click Present or Absent</span>}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleAllPresentModal} disabled={saving} style={{
                    padding: '8px 16px', borderRadius: 10, border: '1.5px solid #16A34A', cursor: 'pointer',
                    background: 'transparent', color: '#16A34A', fontWeight: 600, fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.5 : 1,
                  }}>
                    <LuCalendarCheck size={14} /> All Present
                  </button>
                  <button onClick={handleSaveModal} disabled={saving || !modalStudents.some(st => st.markStatus)} style={{
                    padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: (saving || !modalStudents.some(st => st.markStatus)) ? 'var(--text-2)' : '#F97316',
                    color: '#fff', fontWeight: 600, fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 6, opacity: (saving || !modalStudents.some(st => st.markStatus)) ? 0.5 : 1,
                  }}>
                    {saving ? <><LuLoader size={14} className={s.spin} /> Saving...</> : <><LuCheck size={14} /> Save</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>}
    </div>
  );
}
