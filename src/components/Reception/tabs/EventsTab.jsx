import React, { useState, useEffect, useCallback } from 'react';
import ReceptionModal from '../Modal.jsx';
import { useAuth } from '../../../context/AuthContext';
import { receptionApi } from '../../api/AdminServices';
import { LuCalendarDays, LuRefreshCw, LuSearch, LuX, LuEye, LuMapPin, LuClock } from 'react-icons/lu';
import s from '../../Admin/YogaAdmin.module.css';

function eventBadge(ev) {
  const st = String(ev.status || '').toLowerCase();
  const cls = st === 'available' ? s.badgeGreen : st === 'cancelled' ? s.badgeRed : s.badgeAmber;
  return <span className={`${s.badge} ${cls}`}>{ev.status || 'â€”'}</span>;
}

function formatDate(d) {
  if (!d) return 'â€”';
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

  const canView = hasAnyPermission('courses.view');

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

  if (!canView) {
    return (
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}><LuCalendarDays size={20} /> Events</h2>
        </div>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>ðŸ”’</div>
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
          <span className={s.chipCount} style={{ fontSize: 12 }}>Â· {events.length} total Â· {upcoming} upcoming</span>
        </h2>
        <div className={s.toolbar}>
          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={loadEvents} disabled={loading} title="Refresh">
            <LuRefreshCw size={14} className={loading ? s.spin : ''} /> Refresh
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`${s.feedbackInline} ${feedback.type === 'success' ? s.bannerSuccess : s.bannerError}`}>
          <span>{feedback.type === 'success' ? 'âœ“' : 'âš '}</span>
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
            placeholder="Search events by title or venueâ€¦"
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
            <div className={s.emptyIcon}>ðŸ“…</div>
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
                        <div style={{ fontWeight: 700 }}>{ev.title || 'â€”'}</div>
                        {ev.instructor && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{ev.instructor}</div>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
                          <LuClock size={12} /> {formatDate(ev.date)}{ev.startTime ? ` Â· ${ev.startTime}` : ''}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
                          <LuMapPin size={12} /> {ev.location || 'â€”'}
                        </div>
                      </td>
                      <td>{eventBadge(ev)}</td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleView(ev)} title="View registrations">
                            <LuEye size={14} /> Registrations
                          </button>
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
          icon={<LuCalendarDays size={20} />}
          onClose={() => { setDetail(null); setRegistrations(null); }}
        >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {eventBadge(detail)}
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  {formatDate(detail.date)}{detail.startTime ? ` Â· ${detail.startTime}${detail.endTime ? `â€“${detail.endTime}` : ''}` : ''}
                </span>
              </div>
              {detail.description && <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: 0 }}>{detail.description}</p>}
              <div>
                <div className={s.sectionLabel}>
                  Registrations{registrations ? ` (${registrations.count ?? registrations.registrations?.length ?? 0})` : ''}
                </div>
                {regsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...Array(3)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} style={{ height: 40 }} />)}
                  </div>
                ) : !registrations || (registrations.registrations || []).length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>No registrations yet.</p>
                ) : (
                  <ul className={s.list}>
                    {registrations.registrations.map((r) => (
                      <li key={r._id} className={s.listItem}>
                        <span>{r.name || 'â€”'}</span>
                        <span className={s.listMeta}>{r.email || ''}{r.phone ? ` Â· ${r.phone}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className={s.modalActions}>
                <button type="button" className={s.btn} onClick={() => { setDetail(null); setRegistrations(null); }}>Close</button>
              </div>
        </ReceptionModal>
      )}
    </div>
  );
}
