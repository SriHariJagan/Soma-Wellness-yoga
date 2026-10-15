import React, { useState, useEffect, useCallback } from 'react';
import ReceptionModal from '../Modal.jsx';
import { useAuth } from '../../../context/AuthContext';
import { receptionApi } from '../../api/AdminServices';
import { LuLock, LuCheck, LuTriangleAlert, LuAward, LuRefreshCw, LuSearch, LuX, LuEye, LuMapPin, LuClock, LuUserPlus, LuWallet } from 'react-icons/lu';
import PaymentFields from './PaymentFields.jsx';
import { isPaymentComplete } from './paymentMethods.js';
import { DetailHero, RegRow, EmptyRegs, SectionTitle } from './DetailHero.jsx';
import s from '../../Admin/YogaAdmin.module.css';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-KE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function formatKES(n) {
  return `KES ${Number(n || 0).toLocaleString('en-KE')}`;
}

export default function WorkshopsTab() {
  const { hasAnyPermission } = useAuth();
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  // Registrations viewer
  const [detail, setDetail] = useState(null);
  const [regs, setRegs] = useState(null);
  const [regsLoading, setRegsLoading] = useState(false);
  // Book-a-user flow
  const [booking, setBooking] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [studentsSearching, setStudentsSearching] = useState(false);
  const [pickedStudent, setPickedStudent] = useState(null);
  const [payMethod, setPayMethod] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [payNote, setPayNote] = useState('');
  const [bookingNow, setBookingNow] = useState(false);
  // Existing registrations for the workshop being booked ({ id, list }).
  // Lets the modal show "already registered" the moment a student is
  // picked, instead of failing after Confirm.
  const [bookRegs, setBookRegs] = useState(null);

  const canView = hasAnyPermission('courses.view');
  const canBook = hasAnyPermission('courses.booking', 'bookings.create');
  const canListStudents = hasAnyPermission('customers.view', 'users.view');

  const loadWorkshops = useCallback(async () => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await receptionApi.workshops.list();
      setWorkshops(Array.isArray(data) ? data : []);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load workshops.' });
    }
    setLoading(false);
  }, [canView]);

  useEffect(() => { loadWorkshops(); }, [loadWorkshops]);

  // Debounced student search for the booking modal.
  useEffect(() => {
    const q = studentSearch.trim();
    if (!booking || !q || !canListStudents) { setStudentResults([]); return; }
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
  }, [studentSearch, booking, canListStudents]);

  const q = searchInput.trim().toLowerCase();
  const visible = q
    ? workshops.filter((w) =>
        (w.name || '').toLowerCase().includes(q) ||
        (w.instructor || '').toLowerCase().includes(q))
    : workshops;
  const upcoming = workshops.filter((w) => w.date && new Date(w.date) >= new Date(new Date().setHours(0, 0, 0, 0))).length;

  const handleView = async (w) => {
    setDetail(w);
    setRegs(null);
    setRegsLoading(true);
    try {
      const data = await receptionApi.workshops.registrations(w._id);
      setRegs(Array.isArray(data) ? data : []);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load registrations.' });
    }
    setRegsLoading(false);
  };

  // Registrations for the workshop currently being booked (null while
  // loading or when the response belongs to a different workshop).
  const bookRegList = bookRegs && booking && bookRegs.id === String(booking._id) ? bookRegs.list : null;
  const alreadyBooked = !!(
    pickedStudent && bookRegList &&
    bookRegList.some((r) => String(r.user?._id || r.user || '') === String(pickedStudent._id))
  );

  const openBooking = (w) => {
    setBooking(w);
    setStudentSearch('');
    setStudentResults([]);
    setPickedStudent(null);
    setPayMethod('Cash');
    setPayRef('');
    setPayNote('');
    // Preload the registration list so an already-booked student is flagged
    // on pick. Keyed by workshop id — a stale response never leaks into a
    // newer modal. The backend remains the source of truth (409 on races).
    setBookRegs(null);
    receptionApi.workshops.registrations(w._id)
      .then((data) => setBookRegs({ id: String(w._id), list: Array.isArray(data) ? data : [] }))
      .catch(() => setBookRegs({ id: String(w._id), list: [] }));
  };

  const handleBook = async (e) => {
    e?.preventDefault();
    if (!booking || !pickedStudent) {
      setFeedback({ type: 'error', message: 'Select the student to book.' });
      return;
    }
    if (alreadyBooked) {
      setFeedback({ type: 'error', message: `${pickedStudent.name} is already booked into this workshop.` });
      return;
    }
    if (!isPaymentComplete(payMethod, payRef)) {
      setFeedback({ type: 'error', message: `${payMethod} payments require a transaction / reference ID.` });
      return;
    }
    setBookingNow(true);
    try {
      const res = await receptionApi.purchases.create(pickedStudent._id, {
        kind: 'workshop',
        itemId: booking._id,
        paymentMethod: Number(booking.price || 0) > 0 ? payMethod : 'Cash',
        paymentReference: payRef.trim(),
        note: payNote.trim(),
      });
      const ref = res?.payment?.paymentReference || payRef.trim();
      setFeedback({
        type: 'success',
        message: `${pickedStudent.name} booked into ${booking.name}${ref ? ` — ${payMethod} ref ${ref}` : ''}.`,
      });
      setBooking(null);
      setPickedStudent(null);
      await loadWorkshops();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Booking failed.' });
    }
    setBookingNow(false);
  };

  if (!canView) {
    return (
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}><LuAward size={20} /> Workshops</h2>
        </div>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}><LuLock size={40} /></div>
          <h3 className={s.emptyTitle}>No access</h3>
          <p className={s.emptyDesc}>You don't have permission to view workshops. Contact an admin to grant courses.view access.</p>
        </div>
      </div>
    );
  }

  const bookingIsFree = booking && Number(booking.price || 0) <= 0;

  return (
    <div className={s.recPage}>
      <div className={s.sectionHeader}>
        <h2 className={s.sectionTitle}>
          <LuAward size={20} /> Workshops
          <span className={s.chipCount} style={{ fontSize: 12 }}>· {workshops.length} total · {upcoming} upcoming</span>
        </h2>
        <div className={s.toolbar}>
          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={loadWorkshops} disabled={loading} title="Refresh">
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
            placeholder="Search workshops by name or instructor…"
            aria-label="Search workshops"
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
            <div className={s.emptyIcon}><LuAward size={40} /></div>
            <h3 className={s.emptyTitle}>No workshops found</h3>
            <p className={s.emptyDesc}>{q ? 'Try a different search term.' : 'No published workshops right now. New workshops hosted by the admin appear here.'}</p>
          </div>
        ) : (
          <>
            <div className={s.recTableScroll}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Workshop</th>
                    <th>Date</th>
                    <th>Price</th>
                    <th>Seats</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((w) => (
                    <tr key={w._id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{w.name || '—'}</div>
                        {w.instructor && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{w.instructor}</div>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
                          <LuClock size={12} /> {formatDate(w.date)}{w.startTime ? ` · ${w.startTime}` : ''}
                        </div>
                        {w.location && <div style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}><LuMapPin size={11} /> {w.location}</div>}
                      </td>
                      <td style={{ fontWeight: 700 }}>{Number(w.price || 0) > 0 ? formatKES(w.price) : 'Free'}</td>
                      <td style={{ fontSize: 12.5 }}>
                        {w.capacity > 0 ? `${w.totalRegistrations ?? 0}/${w.capacity}` : `${w.totalRegistrations ?? 0} registered`}
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleView(w)} title="View registrations">
                            <LuEye size={14} /> Registrations
                          </button>
                          {canBook && (
                            <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => openBooking(w)} title="Book a user into this workshop">
                              <LuUserPlus size={14} /> Book user
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
              Showing {visible.length} of {workshops.length} workshop{workshops.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>

      {detail && (
        <ReceptionModal
          title={detail.name || 'Workshop'}
          subtitle={`${formatDate(detail.date)}${detail.startTime ? ` · ${detail.startTime}${detail.endTime ? `–${detail.endTime}` : ''}` : ''}`}
          icon={<LuAward size={20} />}
          onClose={() => { setDetail(null); setRegs(null); }}
          footer={(
            <>
              <button type="button" className={s.btn} onClick={() => { setDetail(null); setRegs(null); }}>Close</button>
              {canBook && (
                <button
                  type="button"
                  className={`${s.btn} ${s.btnPrimary}`}
                  onClick={() => { const w = detail; setDetail(null); setRegs(null); openBooking(w); }}
                >
                  <LuUserPlus size={14} /> Book user
                </button>
              )}
            </>
          )}
        >
          <DetailHero
            eyebrow="Workshop"
            title={detail.name}
            sub={detail.instructor ? `Led by ${detail.instructor}` : ''}
            chips={[
              <span key="d" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><LuClock size={12} /> {formatDate(detail.date)}{detail.startTime ? ` · ${detail.startTime}${detail.endTime ? `–${detail.endTime}` : ''}` : ''}</span>,
              <span key="v" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><LuMapPin size={12} /> {detail.location || 'Soma Wellness Studio'}</span>,
              <span key="p" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><LuWallet size={12} /> {Number(detail.price || 0) > 0 ? formatKES(detail.price) : 'Free entry'}</span>,
            ]}
            filled={detail.totalRegistrations ?? regs?.length ?? 0}
            capacity={detail.capacity || 0}
          />
          {detail.description && (
            <div style={{ marginBottom: 18 }}>
              <SectionTitle>About this workshop</SectionTitle>
              <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: 0, lineHeight: 1.65 }}>{detail.description}</p>
            </div>
          )}
          <div>
            <SectionTitle>Registrations{regs ? ` · ${regs.length}` : ''}</SectionTitle>
            {regsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...Array(3)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} style={{ height: 56 }} />)}
              </div>
            ) : !regs || regs.length === 0 ? (
              <EmptyRegs
                icon={<LuAward size={24} />}
                title="No registrations yet"
                hint="Be the desk that fills the room — book the first student."
                actionLabel={canBook ? 'Book the first user' : undefined}
                onAction={canBook ? () => { const w = detail; setDetail(null); setRegs(null); openBooking(w); } : undefined}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {regs.map((r, i) => (
                  <RegRow
                    key={r._id || i}
                    name={r.user?.name || '—'}
                    meta={r.user?.email || ''}
                    right={(
                      <span style={{
                        fontSize: 10.5, fontWeight: 800, padding: '3px 10px', borderRadius: 99,
                        background: r.paid ? 'rgba(22,163,74,0.12)' : 'rgba(217,119,6,0.12)',
                        color: r.paid ? '#15803D' : '#B45309',
                      }}>
                        {r.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </ReceptionModal>
      )}

      {booking && (
        <ReceptionModal
          title={`Book user · ${booking.name}`}
          subtitle={`${formatDate(booking.date)} · ${Number(booking.price || 0) > 0 ? formatKES(booking.price) : 'Free'}`}
          icon={<LuUserPlus size={20} />}
          onClose={() => { setBooking(null); setPickedStudent(null); }}
          footer={(
            <>
              <button type="button" className={s.btn} onClick={() => { setBooking(null); setPickedStudent(null); }}>Cancel</button>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleBook} disabled={bookingNow || !pickedStudent || alreadyBooked || (!bookingIsFree && !isPaymentComplete(payMethod, payRef))}>
                <LuWallet size={14} /> {bookingNow ? 'Booking…' : `Confirm booking${bookingIsFree ? '' : ` · ${formatKES(booking.price)}`}`}
              </button>
            </>
          )}
        >
          {!canListStudents ? (
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>You don't have permission to look up customers. Contact an admin to grant customers.view access.</p>
          ) : (
            <form onSubmit={handleBook}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <span className={s.chip}>
                  {booking.capacity > 0
                    ? `${booking.totalRegistrations ?? 0}/${booking.capacity} seats filled`
                    : `${booking.totalRegistrations ?? 0} registered`}
                </span>
                <span className={s.chip}>{bookingIsFree ? 'Free entry' : formatKES(booking.price)}</span>
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
                  {bookRegList === null ? (
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '8px 0 0' }}>Checking existing bookings…</p>
                  ) : alreadyBooked ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '9px 12px', borderRadius: 10, background: 'rgba(217,119,6,0.10)', border: '1px solid rgba(217,119,6,0.25)', fontSize: 12.5, fontWeight: 600, color: '#B45309' }}>
                      <LuTriangleAlert size={15} /> Already registered — {pickedStudent.name} is already booked into this workshop.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '9px 12px', borderRadius: 10, background: 'rgba(22,163,74,0.10)', border: '1px solid rgba(22,163,74,0.25)', fontSize: 12.5, fontWeight: 600, color: '#15803D' }}>
                      <LuCheck size={15} /> Ready to book — not yet registered.
                    </div>
                  )}
                </>
              )}
              {!bookingIsFree && pickedStudent && !alreadyBooked && (
                <div style={{ marginTop: 12 }}>
                  <PaymentFields
                    amountText={`${formatKES(booking.price)} · ${booking.name}`}
                    methods={['Cash', 'M-Pesa', 'Card', 'Bank transfer']}
                    method={payMethod}
                    onMethodChange={(m) => { setPayMethod(m); setPayRef(''); }}
                    reference={payRef}
                    onReferenceChange={setPayRef}
                    note={payNote}
                    onNoteChange={setPayNote}
                  />
                </div>
              )}
              {bookingIsFree && pickedStudent && (
                <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 10 }}>Free workshop — no payment needed.</p>
              )}
            </form>
          )}
        </ReceptionModal>
      )}
    </div>
  );
}
