import React, { useState, useEffect, useCallback } from 'react';
import ReceptionModal from '../Modal.jsx';
import { useAuth } from '../../../context/AuthContext';
import { receptionApi } from '../../api/AdminServices';
import { LuLock, LuCheck, LuTriangleAlert, LuCalendarDays, LuRefreshCw, LuSearch, LuX, LuEye, LuMapPin, LuClock, LuUserPlus } from 'react-icons/lu';
import s from '../../Admin/YogaAdmin.module.css';
import { DetailHero, RegRow, EmptyRegs, SectionTitle } from './DetailHero.jsx';

function eventBadge(ev) {
  const st = String(ev.status || '').toLowerCase();
  const cls = st === 'available' ? s.badgeGreen : st === 'cancelled' ? s.badgeRed : s.badgeAmber;
  return <span className={`${s.badge} ${cls}`}>{ev.status || '—'}</span>;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-KE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function EventsTab() {
  const { hasAnyPermission } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [detail, setDetail] = useState(null);
  const [registrations, setRegistrations] = useState(null);
  const [regsLoading, setRegsLoading] = useState(false);
  // Register-a-user flow
  const [registering, setRegistering] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [studentsSearching, setStudentsSearching] = useState(false);
  const [pickedStudent, setPickedStudent] = useState(null);
  const [registeringNow, setRegisteringNow] = useState(false);
  // Existing registrations for the event being booked ({ id, list }) —
  // shows "already registered" on pick instead of failing after Confirm.
  const [regCheck, setRegCheck] = useState(null);

  const canView = hasAnyPermission('courses.view');
  const canBook = hasAnyPermission('bookings.create', 'sections.booking');
  const canListStudents = hasAnyPermission('customers.view', 'users.view');

  const loadEvents = useCallback(async () => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await receptionApi.events.list();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load events.' });
    }
    setLoading(false);
  }, [canView]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Debounced student search for the registration modal.
  useEffect(() => {
    const q = studentSearch.trim();
    if (!registering || !q || !canListStudents) { setStudentResults([]); return; }
    setStudentsSearching(true);
    const id = setTimeout(async () => {
      try {
        const data = await receptionApi.students.list({ search: q });
        setStudentResults(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch {
        setStudentResults([]);
      }
      setStudentsSearching(false);
    }, 350);
    return () => clearTimeout(id);
  }, [studentSearch, registering, canListStudents]);

  const q = searchInput.trim().toLowerCase();
  const visible = q
    ? events.filter((ev) => (ev.title || '').toLowerCase().includes(q) || (ev.location || '').toLowerCase().includes(q))
    : events;

  const upcoming = events.filter((ev) => ev.date && new Date(ev.date) >= new Date(new Date().setHours(0, 0, 0, 0))).length;

  const handleView = async (ev) => {
    setDetail(ev);
    setRegistrations(null);
    setRegsLoading(true);
    try {
      const data = await receptionApi.events.registrations(ev._id);
      setRegistrations(data);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load registrations.' });
    }
    setRegsLoading(false);
  };

  // Registrations for the event currently being booked (null while
  // loading or when the response belongs to a different event).
  const regCheckList = regCheck && registering && regCheck.id === String(registering._id) ? regCheck.list : null;
  const alreadyRegistered = !!(
    pickedStudent && regCheckList &&
    regCheckList.some((r) =>
      String(r.user || '') === String(pickedStudent._id) ||
      (pickedStudent.email && r.email && String(r.email).toLowerCase() === String(pickedStudent.email).toLowerCase())
    )
  );

  const openRegister = (ev) => {
    setRegistering(ev);
    setStudentSearch('');
    setStudentResults([]);
    setPickedStudent(null);
    // Preload registrations so an already-registered student is flagged on
    // pick. Keyed by event id — a stale response never leaks into a newer
    // modal. The backend remains the source of truth on Confirm.
    setRegCheck(null);
    receptionApi.events.registrations(ev._id)
      .then((data) => setRegCheck({ id: String(ev._id), list: Array.isArray(data?.registrations) ? data.registrations : [] }))
      .catch(() => setRegCheck({ id: String(ev._id), list: [] }));
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    if (!registering || !pickedStudent) {
      setFeedback({ type: 'error', message: 'Select the student to register.' });
      return;
    }
    if (alreadyRegistered) {
      setFeedback({ type: 'error', message: `${pickedStudent.name} is already registered for this event.` });
      return;
    }
    setRegisteringNow(true);
    try {
      const res = await receptionApi.events.register(registering._id, pickedStudent._id);
      setFeedback({ type: 'success', message: res?.msg || `${pickedStudent.name} registered.` });
      setRegistering(null);
      setPickedStudent(null);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Registration failed.' });
    }
    setRegisteringNow(false);
  };

  if (!canView) {
    return (
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}><LuCalendarDays size={20} /> Events</h2>
        </div>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}><LuLock size={40} /></div>
          <h3 className={s.emptyTitle}>No access</h3>
          <p className={s.emptyDesc}>You don't have permission to view events. Contact an admin to grant courses.view access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={s.recPage}>
      <div className={s.sectionHeader}>
        <h2 className={s.sectionTitle}>
          <LuCalendarDays size={20} /> Events
          <span className={s.chipCount} style={{ fontSize: 12 }}>· {events.length} total · {upcoming} upcoming</span>
        </h2>
        <div className={s.toolbar}>
          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={loadEvents} disabled={loading} title="Refresh">
            <LuRefreshCw size={14} className={loading ? s.spin : ''} /> Refresh
          </button>
        </div>
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
            placeholder="Search events by title or venue…"
            aria-label="Search events"
          />
          {searchInput && (
            <button type="button" className={s.searchClear} onClick={() => setSearchInput('')} aria-label="Clear search">
              <LuX size={14} />
            </button>
          )}
        </div>
      </div>

      <div className={`${s.card} ${s.cardNoPad}`}>
        {loading ? (
          <div style={{ padding: 22 }}>
            {[...Array(4)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} />)}
          </div>
        ) : visible.length === 0 ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}><LuCalendarDays size={40} /></div>
            <h3 className={s.emptyTitle}>No events found</h3>
            <p className={s.emptyDesc}>{q ? 'Try a different search term.' : 'No community events have been created yet.'}</p>
          </div>
        ) : (
          <>
            <div className={s.recTableScroll}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Date</th>
                    <th>Venue</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((ev) => (
                    <tr key={ev._id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{ev.title || '—'}</div>
                        {ev.instructor && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{ev.instructor}</div>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
                          <LuClock size={12} /> {formatDate(ev.date)}{ev.startTime ? ` · ${ev.startTime}` : ''}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
                          <LuMapPin size={12} /> {ev.location || '—'}
                        </div>
                      </td>
                      <td>{eventBadge(ev)}</td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleView(ev)} title="View registrations">
                            <LuEye size={14} /> Registrations
                          </button>
                          {canBook && (
                            <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => openRegister(ev)} title="Register a user for this event">
                              <LuUserPlus size={14} /> Register user
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={s.tableFooter}>
              Showing {visible.length} of {events.length} event{events.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>

      {detail && (
        <ReceptionModal
          title={detail.title || 'Event'}
          subtitle={`${formatDate(detail.date)}${detail.startTime ? ` · ${detail.startTime}${detail.endTime ? `–${detail.endTime}` : ''}` : ''}`}
          icon={<LuCalendarDays size={20} />}
          onClose={() => { setDetail(null); setRegistrations(null); }}
          footer={(
            <>
              <button type="button" className={s.btn} onClick={() => { setDetail(null); setRegistrations(null); }}>Close</button>
              {canBook && (
                <button
                  type="button"
                  className={`${s.btn} ${s.btnPrimary}`}
                  onClick={() => { const ev = detail; setDetail(null); setRegistrations(null); openRegister(ev); }}
                >
                  <LuUserPlus size={14} /> Register user
                </button>
              )}
            </>
          )}
        >
              <DetailHero
                eyebrow="Community Event"
                title={detail.title}
                sub={detail.instructor ? `Hosted by ${detail.instructor}` : ''}
                chips={[
                  <span key="d" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><LuClock size={12} /> {formatDate(detail.date)}{detail.startTime ? ` · ${detail.startTime}${detail.endTime ? `–${detail.endTime}` : ''}` : ''}</span>,
                  <span key="v" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><LuMapPin size={12} /> {detail.location || 'Soma Wellness Studio'}</span>,
                ]}
                statusBadge={eventBadge(detail)}
                filled={registrations?.count ?? registrations?.registrations?.length ?? 0}
                capacity={detail.capacity || 0}
              />
              {detail.description && (
                <div style={{ marginBottom: 18 }}>
                  <SectionTitle>About this event</SectionTitle>
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: 0, lineHeight: 1.65 }}>{detail.description}</p>
                </div>
              )}
              <div>
                <SectionTitle>
                  Registrations{registrations ? ` · ${registrations.count ?? registrations.registrations?.length ?? 0}` : ''}
                </SectionTitle>
                {regsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...Array(3)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} style={{ height: 56 }} />)}
                  </div>
                ) : !registrations || (registrations.registrations || []).length === 0 ? (
                  <EmptyRegs
                    icon={<LuCalendarDays size={24} />}
                    title="No registrations yet"
                    hint="Be the desk that fills the room — register the first guest."
                    actionLabel={canBook ? 'Register the first user' : undefined}
                    onAction={canBook ? () => { const ev = detail; setDetail(null); setRegistrations(null); openRegister(ev); } : undefined}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {registrations.registrations.map((r) => (
                      <RegRow
                        key={r._id}
                        name={r.name || '—'}
                        meta={[r.email, r.phone].filter(Boolean).join(' · ')}
                        right={r.registeredAt ? <span style={{ fontSize: 11, color: '#7C6A58' }}>{formatDate(r.registeredAt)}</span> : null}
                      />
                    ))}
                  </div>
                )}
              </div>
        </ReceptionModal>
      )}

      {registering && (
        <ReceptionModal
          title={`Register user · ${registering.title}`}
          subtitle={formatDate(registering.date)}
          icon={<LuUserPlus size={20} />}
          onClose={() => { setRegistering(null); setPickedStudent(null); }}
          footer={(
            <>
              <button type="button" className={s.btn} onClick={() => { setRegistering(null); setPickedStudent(null); }}>Cancel</button>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleRegister} disabled={registeringNow || !pickedStudent || alreadyRegistered}>
                <LuCheck size={14} /> {registeringNow ? 'Registering…' : 'Confirm registration'}
              </button>
            </>
          )}
        >
          {!canListStudents ? (
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>You don't have permission to look up customers. Contact an admin to grant customers.view access.</p>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <span className={s.chip}>
                  {registering.capacity > 0
                    ? `${regCheckList ? regCheckList.length : '…'}/${registering.capacity} seats filled`
                    : `${regCheckList ? regCheckList.length : '…'} registered`}
                </span>
                <span className={s.chip}>{registering.location || 'Soma Wellness Studio'}</span>
              </div>
              <label className={s.fieldLabel} style={{ display: 'block', marginBottom: 8 }}>
                Find student
                <input
                  className={s.searchInput}
                  value={studentSearch}
                  onChange={(e) => { setStudentSearch(e.target.value); setPickedStudent(null); }}
                  placeholder="Search name, email or phone…"
                  aria-label="Search student"
                  style={{ marginTop: 6, width: '100%' }}
                />
              </label>
              {studentsSearching && <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Searching…</p>}
              {!studentsSearching && studentResults.length > 0 && !pickedStudent && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  {studentResults.map((st) => (
                    <button
                      key={st._id}
                      type="button"
                      onClick={() => setPickedStudent(st)}
                      className={`${s.btn} ${s.btnSm}`}
                      style={{ justifyContent: 'flex-start' }}
                    >
                      <LuCheck size={13} /> {st.name} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>· {st.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {pickedStudent && (
                <>
                  <div className={s.recKV} style={{ marginTop: 8 }}>
                    <span className={s.recKVIcon}><LuCheck size={13} /></span>
                    <span className={s.recKVLabel}>{pickedStudent.name}</span>
                    <span className={s.recKVValue} style={{ fontSize: 12 }}>{pickedStudent.email}</span>
                  </div>
                  {regCheckList === null ? (
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '8px 0 0' }}>Checking existing registrations…</p>
                  ) : alreadyRegistered ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '9px 12px', borderRadius: 10, background: 'rgba(217,119,6,0.10)', border: '1px solid rgba(217,119,6,0.25)', fontSize: 12.5, fontWeight: 600, color: '#B45309' }}>
                      <LuTriangleAlert size={15} /> Already registered — {pickedStudent.name} is already on the list for this event.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '9px 12px', borderRadius: 10, background: 'rgba(22,163,74,0.10)', border: '1px solid rgba(22,163,74,0.25)', fontSize: 12.5, fontWeight: 600, color: '#15803D' }}>
                      <LuCheck size={15} /> Ready to register — not yet on the list.
                    </div>
                  )}
                </>
              )}
            </form>
          )}
        </ReceptionModal>
      )}
    </div>
  );
}
