import React, { useState, useEffect, useRef } from 'react';
import s from './YogaAdmin.module.css';
import Badge from './Badge';
import { PageHeader, KpiCard, Avatar } from './ui/Primitives';
import { getStudents, deleteStudent, serviceAssignmentsApi } from '../api/AdminServices.js';
import StudentProfileWorkspace from './StudentProfileWorkspace';
import PhoneInput from '../common/PhoneInput.jsx';
import {
  LuUserPlus, LuX, LuSearch, LuTrash2, LuUsers, LuBadgeCheck, LuClock, LuLayers, LuSparkles,
} from 'react-icons/lu';

export default function StudentsHistory({ form, setForm, onSave, onChanged, feedback, selectedStudentId }) {
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [quickFilter, setQuickFilter] = useState('all');
  const [selected, setSelected]     = useState(null);
  const [localFeedback, setLocalFeedback] = useState({ message: '', type: '' });
  const [serviceMap, setServiceMap] = useState({});

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (err) {
      setError(err.message || 'Could not load students. Check your server connection.');
    } finally {
      setLoading(false);
    }
  };

  // Guard against concurrent / repeated service-assignments fetches.
  // Previously three effects fired this on mount (StrictMode doubles it),
  // hammering GET /api/admin/service-assignments with a heavy populate query.
  const serviceFetchInflight = useRef(false);
  const refreshServiceMap = async () => {
    if (serviceFetchInflight.current) return;
    serviceFetchInflight.current = true;
    try {
      const data = await serviceAssignmentsApi.list();
      const list = Array.isArray(data) ? data : data?.assignments || data?.data || [];
      const map = {};
      list.forEach(a => {
        const uid = String(a.user?._id || a.user || a.userId || '');
        if (!uid) return;
        if (!map[uid]) map[uid] = [];
        map[uid].push(a);
      });
      setServiceMap(map);
    } catch {
      // Leave previous map intact so the Services column keeps last good data
    } finally {
      serviceFetchInflight.current = false;
    }
  };

  useEffect(() => { fetchStudents(); }, []);
  // Single mount fetch for the Services column (in-flight guarded)
  useEffect(() => { refreshServiceMap(); }, []);

  useEffect(() => {
    if (feedback?.type === 'success') {
      fetchStudents();
      setShowForm(false);
    }
  }, [feedback]);

  useEffect(() => {
    if (selectedStudentId && students.length > 0) {
      const found = students.find((s) => s._id === selectedStudentId);
      if (found) setSelected(found);
    }
  }, [selectedStudentId, students]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name} from the system? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteStudent(id);
      setStudents(prev => prev.filter(st => st._id !== id));
      setSelected(prev => (prev && prev._id === id ? null : prev));
      onChanged?.();
    } catch {
      setLocalFeedback({ message: 'Failed to delete student. Try again.', type: 'error' });
      setTimeout(() => setLocalFeedback({ message: '', type: '' }), 4000);
    } finally {
      setDeletingId(null);
    }
  };

  // Membership is strictly Bronze (3mo) / Silver (6mo) / Gold (12mo) — other services show only in Services column
  const getMembershipLabel = (st) => {
    if (st.planMonths === 3) return 'Bronze';
    if (st.planMonths === 6) return 'Silver';
    if (st.planMonths === 12) return 'Gold';
    return 'No Membership';
  };
  const getPlanStatus = (st) => {
    if (st.planMonths === 3) return 'Bronze — Membership';
    if (st.planMonths === 6) return 'Silver — Membership';
    if (st.planMonths === 12) return 'Gold — Membership';
    return 'No Membership';
  };

  const bySearch = students.filter(st =>
    st.name.toLowerCase().includes(search.toLowerCase()) ||
    st.email.toLowerCase().includes(search.toLowerCase()) ||
    (st.city || '').toLowerCase().includes(search.toLowerCase())
  );
  const isMembership = (st) => st.planMonths === 3 || st.planMonths === 6 || st.planMonths === 12;
  const filtered = bySearch.filter(st => {
    if (quickFilter === 'active') return isMembership(st);
    if (quickFilter === 'pending') return !isMembership(st);
    return true;
  });

  const counts = {
    all: students.length,
    active: students.filter(isMembership).length,
    pending: students.filter(st => !isMembership(st)).length,
  };

  return (
    <div>
      <PageHeader title="Users" subtitle="Manage profiles, history & memberships">
        <button
          type="button"
          className={`${s.btn} ${showForm ? '' : s.btnPrimary} ${s.btnSm}`}
          onClick={() => setShowForm(v => !v)}
        >
          {showForm ? <><LuX size={14} /> Cancel</> : <><LuUserPlus size={14} /> Add User</>}
        </button>
      </PageHeader>

      {(feedback?.message || localFeedback.message) && (
        <div className={`${s.feedbackInline} ${(feedback?.type || localFeedback.type) === 'success' ? s.bannerSuccess : s.bannerError}`}>
          <span className={s.bannerIcon}>{(feedback?.type || localFeedback.type) === 'success' ? '✓' : '⚠'}</span>{feedback?.message || localFeedback.message}
        </div>
      )}

      {showForm && (
        <form onSubmit={onSave} className={s.card} style={{ marginBottom: '20px' }}>
          <h3 className={s.cardTitle}><span className={s.cardTitleIcon}><LuUserPlus /></span>Register New User</h3>
          <div className={s.grid3} style={{ marginBottom: '12px' }}>
            <input type="text"  placeholder="Full name *"     value={form.name}  onChange={e => setForm({ ...form, name: e.target.value })}  required />
            <input type="email" placeholder="Email address *" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            <PhoneInput value={form.phone || ''} onChange={(v) => setForm({ ...form, phone: v })} required id="studentshistory-phone" />
          </div>
          <div className={s.grid3} style={{ marginBottom: '16px' }}>
            <input type="text" placeholder="City"       value={form.city}  onChange={e => setForm({ ...form, city: e.target.value })}  />
            <input type="text" placeholder="Practice Style" value={form.style} onChange={e => setForm({ ...form, style: e.target.value })} />
            <input type="text" placeholder="Level"      value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} />
          </div>
          <button type="submit" className={`${s.btn} ${s.btnPrimary}`}>Save Profile</button>
        </form>
      )}

      <div className={s.statsGrid} style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '20px' }}>
        <KpiCard icon={<LuUsers />} accent="orange" label="Total Users" value={counts.all} spark={[counts.all * 0.3 || 1, counts.all * 0.5 || 2, counts.all * 0.7 || 3, counts.all * 0.8 || 4, counts.all * 0.9 || 5, counts.all || 6]} />
        <KpiCard icon={<LuBadgeCheck />} accent="green" label="Active Plans" value={counts.active} spark={[counts.active * 0.3 || 1, counts.active * 0.5 || 2, counts.active * 0.7 || 3, counts.active * 0.8 || 4, counts.active * 0.9 || 5, counts.active || 6]} />
        <KpiCard icon={<LuClock />} accent="amber" label="No Plan Yet" value={counts.pending} spark={[counts.pending * 0.3 || 1, counts.pending * 0.5 || 2, counts.pending * 0.7 || 3, counts.pending * 0.8 || 4, counts.pending * 0.9 || 5, counts.pending || 6]} />
      </div>

      {/* Search + quick filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className={s.topSearch} style={{ maxWidth: 360, display: 'flex', height: 42 }}>
          <LuSearch size={16} />
          <input placeholder="Search by name, email or city…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['all', 'All'], ['active', 'On Plan'], ['pending', 'No Membership']].map(([k, lbl]) => (
            <button key={k} type="button" className={`${s.chip} ${quickFilter === k ? s.chipActive : ''}`} onClick={() => setQuickFilter(k)}>
              {lbl} <span className={s.chipCount}>{counts[k]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`${s.card} ${s.cardNoPad}`}>
        {loading ? (
          <div style={{ padding: 22 }}>
            {[...Array(5)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} />)}
          </div>
        ) : error ? (
          <div className={`${s.emptyState} ${s.stateError}`}>
            {error}<br />
            <button type="button" className={`${s.btn} ${s.btnSm}`} style={{ marginTop: '12px' }} onClick={fetchStudents}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>👤</div>
            {search || quickFilter !== 'all' ? 'No users match your filters.' : 'No users registered yet — add one above!'}
          </div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>User</th><th>Contact</th><th>City</th><th>Style / Level</th><th>Membership</th><th>Services</th><th>Status</th><th>Joined</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(st => (
                  <tr key={st._id} className={s.rowClickable} onClick={() => setSelected(st)}>
                    <td>
                      <div className={s.cellUser}>
                        <Avatar name={st.name} size={s.avatarSm} />
                        <strong>{st.name}</strong>
                      </div>
                    </td>
                    <td className={s.tdMuted}>
                      <div>{st.email}</div>
                      {st.phone && <div style={{ fontSize: '11px', marginTop: '2px' }}>{st.phone}</div>}
                    </td>
                    <td>{st.city || '—'}</td>
                    <td>
                      <div>{st.style || '—'}</div>
                      {st.level && <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>{st.level}</div>}
                    </td>
                    <td>
                      {(() => {
                        const label = getMembershipLabel(st);
                        const isNoMem = label === 'No Membership';
                        const isMembershipTier = ['Bronze','Silver','Gold'].includes(label);
                        return isNoMem
                          ? <span className={s.tdMuted}>No Membership</span>
                          : <span style={{ fontWeight: 700, color: '#2D1406' }}>{label} <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 11 }}>· {isMembershipTier ? 'Membership' : 'Service'}</span></span>;
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const svcs = serviceMap[st._id] || [];
                        if (svcs.length === 0) return <span className={s.tdMuted} style={{ fontSize: 11 }}>—</span>;
                        const active = svcs.filter(x => x.status === 'active' || x.isActive);
                        const displayList = active.length > 0 ? active : svcs;
                        const first = displayList[0];
                        // Robust name resolution: serviceName > populated service/offering > offeringName > fallback to ID
                        const name = first.serviceName
                          || first.service?.name
                          || first.offering?.name
                          || first.offeringName
                          || (first.service ? String(first.service).slice(-6) : '')
                          || (first.offering ? String(first.offering).slice(-6) : '')
                          || 'Service';
                        const count = displayList.length;
                        const total = svcs.length;
                        const isActive = active.length > 0;
                        const svcId = first._id ? String(first._id).slice(-6) : '';
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }} title={`${name} — ${svcId ? `ID: ${svcId}` : ''} — ${first.status || ''}`}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: isActive ? 'rgba(37,99,235,0.10)' : 'rgba(100,116,139,0.08)', color: isActive ? '#2563EB' : '#64748b', border: `1px solid ${isActive ? 'rgba(37,99,235,0.14)' : 'rgba(100,116,139,0.12)'}`, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}><LuSparkles size={10} />{count}{total !== count ? `/${total}` : ''}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}{count>1 ? ` +${count-1}` : ''}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td><Badge label={getPlanStatus(st)} /></td>
                    <td className={s.tdMuted} style={{ fontSize: '11px' }}>
                      {st.createdAt
                        ? new Date(st.createdAt).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`${s.btn} ${s.btnSm} ${s.btnDanger}`}
                        onClick={() => handleDelete(st._id, st.name)}
                        disabled={deletingId === st._id}
                      >
                        {deletingId === st._id ? '…' : <LuTrash2 size={14} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Profile Workspace Drawer */}
      {selected && (
        <StudentProfileWorkspace
          student={selected}
          onClose={() => { setSelected(null); refreshServiceMap(); onChanged?.(); }}
          onRefresh={() => { refreshServiceMap(); onChanged?.(); }}
        />
      )}
    </div>
  );
}
