import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EventCalendar.module.css';

const API_DOMAIN = import.meta.env.VITE_API_URL || '';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Seats left for an event, or null when capacity is unlimited (0).
function seatsLeft(ev) {
  if (!ev.capacity) return null;
  return Math.max(0, ev.capacity - (ev.totalRegistrations || 0));
}

function isPastDeadline(ev) {
  if (!ev.registrationDeadline) return false;
  return new Date(ev.registrationDeadline) < new Date();
}

const EventCalendar = () => {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_DOMAIN}/api/public/events`);
      if (!res.ok) throw new Error('Failed to load events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Send the visitor to register: logged-in students go straight to the
  // Events page of their dashboard; guests log in / sign up first and are
  // returned to the same place.
  const handleRegister = () => {
    const isAuth = !!localStorage.getItem('token');
    const dest = '/studentdashboard?tab=events';
    if (isAuth) navigate(dest);
    else navigate('/login?redirectTo=' + encodeURIComponent(dest));
  };

  const eventsByDate = {};
  events.forEach((ev) => {
    const key = dateKey(new Date(ev.date));
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(ev);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const calendarDays = [];
  for (let i = firstDay - 1; i >= 0; i--) calendarDays.push({ day: prevMonthDays - i, other: true });
  for (let i = 1; i <= daysInMonth; i++) {
    const key = dateKey(new Date(year, month, i));
    calendarDays.push({ day: i, other: false, key, hasEvents: !!eventsByDate[key] });
  }
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push({ day: calendarDays.length - firstDay - daysInMonth + 1, other: true });
  }

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  const goToday = () => {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelectedDate(d);
  };

  const handleDateClick = (day, other) => {
    if (other) return;
    setSelectedDate(new Date(year, month, day));
  };

  const selectedKey = selectedDate ? dateKey(selectedDate) : null;
  const selectedEvents = selectedKey ? (eventsByDate[selectedKey] || []) : [];

  const weekRows = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weekRows.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={prevMonth} aria-label="Previous month">‹</button>
        <span className={styles.headerTitle}>{MONTHS[month]} {year}</span>
        <button className={styles.navBtn} onClick={nextMonth} aria-label="Next month">›</button>
        <button className={styles.todayBtn} onClick={goToday}>Today</button>
      </div>

      <div className={styles.weekRow}>
        {DAYS.map((d) => (
          <div key={d} className={styles.weekDay}>{d}</div>
        ))}
      </div>

      {loading ? (
        <div className={styles.center}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading events…</p>
        </div>
      ) : error ? (
        <div className={styles.center}>
          <p className={styles.errorText}>{error}</p>
          <button className={styles.retryBtn} onClick={fetchEvents}>Retry</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {weekRows.map((week, wi) => (
            <div key={wi} className={styles.weekRow}>
              {week.map((cell, ci) => {
                const isToday = sameDay(new Date(year, month, cell.day), today);
                const isSelected = selectedDate && sameDay(new Date(year, month, cell.day), selectedDate);
                const cls = [
                  styles.day,
                  cell.other ? styles.otherMonth : '',
                  isToday ? styles.today : '',
                  isSelected ? styles.selected : '',
                  cell.hasEvents ? styles.hasEvents : '',
                ].filter(Boolean).join(' ');
                return (
                  <button
                    key={ci}
                    className={cls}
                    onClick={() => handleDateClick(cell.day, cell.other)}
                    disabled={cell.other}
                  >
                    {cell.day}
                    {cell.hasEvents && <span className={styles.dot} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {selectedEvents.length > 0 && (
        <div className={styles.eventsPanel}>
          <h3 className={styles.eventsTitle}>
            Events on {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>
          <div className={styles.eventsList}>
            {selectedEvents.map((ev) => {
              const seats = seatsLeft(ev);
              const full = seats === 0;
              const pastDeadline = isPastDeadline(ev);
              return (
                <div key={ev._id} className={styles.eventCard}>
                  <div className={styles.eventHeader}>
                    <h4 className={styles.eventName}>{ev.title}</h4>
                    {full && <span className={styles.badgeFull}>Fully Booked</span>}
                    {pastDeadline && !full && <span className={styles.badgeDeadline}>Registration Closed</span>}
                  </div>
                  {ev.location && <p className={styles.eventDetail}>📍 {ev.location}</p>}
                  {ev.instructor && <p className={styles.eventDetail}>Host: {ev.instructor}</p>}
                  {(ev.startTime || ev.endTime) && (
                    <p className={styles.eventDetail}>
                      {fmtTime(ev.startTime)}{ev.endTime ? ` – ${fmtTime(ev.endTime)}` : ''}
                    </p>
                  )}
                  {ev.description && <p className={styles.eventDesc}>{ev.description}</p>}
                  <div className={styles.eventFooter}>
                    {seats !== null
                      ? <span className={styles.seats}>{seats} / {ev.capacity} seats left</span>
                      : <span className={styles.seats}>Open registration</span>}
                    {!full && !pastDeadline && (
                      <button className={styles.bookBtn} onClick={handleRegister}>
                        Register
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedDate && selectedEvents.length === 0 && !loading && (
        <div className={styles.eventsPanel}>
          <p className={styles.emptyText}>No events on {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      )}

      {!selectedDate && events.length === 0 && !loading && !error && (
        <div className={styles.center}>
          <p className={styles.emptyText}>No upcoming events at this time.</p>
        </div>
      )}
    </div>
  );
};

export default EventCalendar;
