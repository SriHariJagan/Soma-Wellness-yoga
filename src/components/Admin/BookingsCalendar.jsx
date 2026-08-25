import React, { useState, useEffect } from 'react';
import s from './YogaAdmin.module.css';
import Badge from './Badge';
import { PageHeader, KpiCard, Avatar } from './ui/Primitives';
import { getBookings, updateBookingStatus, deleteBooking } from '../api/AdminServices.js';
import {
  LuRefreshCw, LuCalendarClock, LuClock, LuCircleCheck, LuCircleX,
  LuList, LuLayoutGrid, LuTrash2,
} from 'react-icons/lu';

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Cancelled'];
const KANBAN = ['Pending', 'Confirmed', 'Cancelled'];

export default function BookingsCalendar({ onChanged } = {}) {
  const [bookings, setBookings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [filter, setFilter]         = useState('All');
  const [view, setView]             = useState('list');
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback]     = useState({ message: '', type: '' });

  const flash = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      setBookings(await getBookings());
    } catch (err) {
      setError(err.message || 'Could not load bookings. Check your server connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      const data = await updateBookingStatus(id, status);
      setBookings(prev => prev.map(b => b._id === id ? data : b));
      flash(`Booking marked as ${status}.`);
      onChanged?.();
    } catch {
      flash('Failed to update status.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete booking for ${name}?`)) return;
    setDeletingId(id);
    try {
      await deleteBooking(id);
      setBookings(prev => prev.filter(b => b._id !== id));
      flash('Booking deleted.');
      onChanged?.();
    } catch {
      flash('Failed to delete booking.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = filter === 'All' ? bookings : bookings.filter(b => b.status === filter);
  const counts = {
    All:       bookings.length,
    Pending:   bookings.filter(b => b.status === 'Pending').length,
    Confirmed: bookings.filter(b => b.status === 'Confirmed').length,
    Cancelled: bookings.filter(b => b.status === 'Cancelled').length,
  };

  const cardCls = (st) => st === 'Confirmed' ? s.bookCardConfirmed : st === 'Cancelled' ? s.bookCardCancelled : s.bookCardPending;

  const BookingCard = ({ b, compact }) => (
    <div className={`${s.bookCard} ${cardCls(b.status)}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className={s.cellUser}>
          <Avatar name={b.name} size={s.avatarSm} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{b.name}</div>
            {b.city && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{b.city}</div>}
          </div>
        </div>
        <Badge label={b.status} />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{b.courseName}</div>
      {b.courseTime && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{b.courseTime}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontWeight: 800, color: 'var(--c-primary)', fontFamily: 'var(--font-display)' }}>{b.coursePrice}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{b.paymentMethod}</span>
      </div>
      {!compact && b.email && <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 8 }}>{b.email}{b.phone ? ` · ${b.phone}` : ''}</div>}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 12 }}>
        {STATUS_OPTIONS.filter(st => st !== b.status).map(st => (
          <button key={st} type="button" className={`${s.btn} ${s.btnSm}`} style={{ fontSize: 11, padding: '4px 9px' }}
            disabled={updatingId === b._id} onClick={() => handleStatus(b._id, st)}>{st}</button>
        ))}
        <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} style={{ fontSize: 11, padding: '4px 9px', marginLeft: 'auto' }}
          disabled={deletingId === b._id} onClick={() => handleDelete(b._id, b.name)}>
          {deletingId === b._id ? '…' : <LuTrash2 size={12} />}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Booking Management Center" subtitle="Manage & confirm student course bookings">
        <div className={s.segment}>
          <button type="button" className={`${s.segBtn} ${view === 'list' ? s.segActive : ''}`} onClick={() => setView('list')}><LuList size={14} /> List</button>
          <button type="button" className={`${s.segBtn} ${view === 'kanban' ? s.segActive : ''}`} onClick={() => setView('kanban')}><LuLayoutGrid size={14} /> Kanban</button>
        </div>
        <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={fetchBookings}><LuRefreshCw size={14} /> Refresh</button>
      </PageHeader>

      {feedback.message && (
        <div className={`${s.feedbackInline} ${feedback.type === 'success' ? s.bannerSuccess : s.bannerError}`}>
          <span className={s.bannerIcon}>{feedback.type === 'success' ? '✓' : '⚠'}</span>{feedback.message}
        </div>
      )}

      <div className={s.statsGrid} style={{ marginBottom: '20px' }}>
        <KpiCard icon={<LuCalendarClock />} accent="orange" label="Total Bookings" value={loading ? 0 : counts.All} spark={[counts.All * 0.3 || 1, counts.All * 0.5 || 2, counts.All * 0.7 || 3, counts.All * 0.8 || 4, counts.All * 0.9 || 5, counts.All || 6]} />
        <KpiCard icon={<LuClock />} accent="amber" label="Pending" value={loading ? 0 : counts.Pending} spark={[counts.Pending * 0.3 || 1, counts.Pending * 0.5 || 2, counts.Pending * 0.7 || 3, counts.Pending * 0.8 || 4, counts.Pending * 0.9 || 5, counts.Pending || 6]} />
        <KpiCard icon={<LuCircleCheck />} accent="green" label="Confirmed" value={loading ? 0 : counts.Confirmed} spark={[counts.Confirmed * 0.3 || 1, counts.Confirmed * 0.5 || 2, counts.Confirmed * 0.7 || 3, counts.Confirmed * 0.8 || 4, counts.Confirmed * 0.9 || 5, counts.Confirmed || 6]} />
        <KpiCard icon={<LuCircleX />} accent="blue" label="Cancelled" value={loading ? 0 : counts.Cancelled} spark={[counts.Cancelled * 0.3 || 1, counts.Cancelled * 0.5 || 2, counts.Cancelled * 0.7 || 3, counts.Cancelled * 0.8 || 4, counts.Cancelled * 0.9 || 5, counts.Cancelled || 6]} />
      </div>

      {view === 'list' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {['All', 'Pending', 'Confirmed', 'Cancelled'].map(f => (
            <button key={f} type="button" className={`${s.chip} ${filter === f ? s.chipActive : ''}`} onClick={() => setFilter(f)}>
              {f} <span className={s.chipCount}>{counts[f] ?? 0}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className={s.bookGrid}>{[...Array(4)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelCard}`} style={{ height: 150 }} />)}</div>
      ) : error ? (
        <div className={`${s.card} ${s.emptyState} ${s.stateError}`}>
          {error}<br />
          <button type="button" className={`${s.btn} ${s.btnSm}`} style={{ marginTop: '12px' }} onClick={fetchBookings}>Retry</button>
        </div>
      ) : view === 'kanban' ? (
        <div className={s.kanban} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {KANBAN.map(col => {
            const colBookings = bookings.filter(b => b.status === col);
            return (
              <div key={col} className={s.leadCol}>
                <div className={s.leadColHead}>
                  <div className={s.leadColTitle}>
                    <span className={col === 'Confirmed' ? s.leadColDotG : col === 'Cancelled' ? s.leadColDotB : s.leadColDotA} />{col}
                  </div>
                  <span className={s.leadColCount}>{colBookings.length}</span>
                </div>
                {colBookings.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '12px 0', textAlign: 'center' }}>No bookings</div>}
                {colBookings.map(b => <BookingCard key={b._id} b={b} compact />)}
              </div>
            );
          })}
        </div>
      ) : filtered.length === 0 ? (
        <div className={`${s.card} ${s.emptyState}`}><div className={s.emptyIcon}>📅</div>{filter === 'All' ? 'No bookings yet.' : `No ${filter} bookings.`}</div>
      ) : (
        <div className={s.bookGrid}>
          {filtered.map(b => <BookingCard key={b._id} b={b} />)}
        </div>
      )}
    </div>
  );
}
