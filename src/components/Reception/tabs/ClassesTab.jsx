import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { receptionApi } from '../../api/AdminServices';
import { LuBookOpen, LuRefreshCw, LuSearch, LuX } from 'react-icons/lu';
import s from '../../Admin/YogaAdmin.module.css';

// â”€â”€ Safe render helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// The classsessions collection contains legacy documents where fields like
// `schedule` are objects ({days, startTime, endTime, timezone}). Rendering
// an object directly crashes React ("Objects are not valid as a React
// child"), so every DB-driven value goes through these formatters.
function safeText(value, fallback = 'â€”') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

function formatDays(days) {
  if (!Array.isArray(days) || days.length === 0) return '';
  const short = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
  return days.map((d) => short[d] || d).join(', ');
}

export function formatSchedule(schedule, timing, time) {
  if (typeof timing === 'string' && timing) return timing;
  if (typeof time === 'string' && time) return time;
  if (!schedule) return 'â€”';
  if (typeof schedule === 'string') return schedule;
  if (typeof schedule === 'object') {
    const parts = [];
    const days = formatDays(schedule.days);
    if (days) parts.push(days);
    if (schedule.startTime) {
      parts.push(schedule.endTime ? `${schedule.startTime}â€“${schedule.endTime}` : schedule.startTime);
    }
    return parts.length > 0 ? parts.join(' Â· ') : 'â€”';
  }
  return 'â€”';
}

export default function ClassesTab() {
  const { hasAnyPermission } = useAuth();
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coursesError, setCoursesError] = useState('');
  const [classesError, setClassesError] = useState('');
  const [view, setView] = useState('classes');
  const [searchInput, setSearchInput] = useState('');

  const canViewCourses = hasAnyPermission('courses.view');
  const canViewClasses = hasAnyPermission('classes.view');
  const showToggle = canViewCourses && canViewClasses;
  const activeView = showToggle ? view : (canViewClasses ? 'classes' : 'courses');

  const loadData = useCallback(async () => {
    setLoading(true);
    setCoursesError('');
    setClassesError('');
    const tasks = [];
    if (canViewCourses) {
      tasks.push(
        receptionApi.courses.list()
          .then((co) => setCourses(Array.isArray(co) ? co : []))
          .catch((err) => setCoursesError(err.message || 'Failed to load courses'))
      );
    }
    if (canViewClasses) {
      tasks.push(
        receptionApi.classes.list()
          .then((cl) => setClasses(Array.isArray(cl) ? cl : (cl?.classes || [])))
          .catch((err) => setClassesError(err.message || 'Failed to load classes'))
      );
    }
    await Promise.all(tasks);
    setLoading(false);
  }, [canViewCourses, canViewClasses]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!canViewCourses && !canViewClasses) {
    return (
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}><LuBookOpen size={20} /> Classes & Courses</h2>
        </div>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>ðŸ”’</div>
          <h3 className={s.emptyTitle}>No access</h3>
          <p className={s.emptyDesc}>You don't have permission to view classes or courses. Contact an admin to grant classes.view or courses.view access.</p>
        </div>
      </div>
    );
  }

  const q = searchInput.trim().toLowerCase();
  const visibleClasses = q
    ? classes.filter((cl) =>
        (cl.name || '').toLowerCase().includes(q) ||
        (cl.instructor || cl.trainer || '').toLowerCase().includes(q) ||
        (cl.location || '').toLowerCase().includes(q))
    : classes;
  const visibleCourses = q
    ? courses.filter((c) =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.duration || '').toLowerCase().includes(q))
    : courses;
  const error = activeView === 'classes' ? classesError : coursesError;

  return (
    <div className={s.recPage}>
      {/* â”€â”€ Header â”€â”€ */}
      <div className={s.sectionHeader}>
        <h2 className={s.sectionTitle}>
          <LuBookOpen size={20} /> Classes & Courses
          <span className={s.chipCount} style={{ fontSize: 12 }}>
            Â· {canViewClasses ? `${classes.length} classes` : ''}{showToggle ? ' Â· ' : ''}{canViewCourses ? `${courses.length} courses` : ''}
          </span>
        </h2>
        <div className={s.toolbar}>
          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={loadData} disabled={loading} title="Refresh">
            <LuRefreshCw size={14} className={loading ? s.spin : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* â”€â”€ One main card â”€â”€ */}
      <div className={`${s.card} ${s.cardNoPad}`}>
        <div style={{ padding: '18px 20px 0' }}>
          <div className={s.filterBar} style={{ marginBottom: 14 }}>
            {showToggle && (
              <div className={s.tabGroup}>
                <button
                  type="button"
                  className={`${s.tabBtn} ${activeView === 'classes' ? s.tabActive : ''}`}
                  onClick={() => setView('classes')}
                >
                  Classes ({classes.length})
                </button>
                <button
                  type="button"
                  className={`${s.tabBtn} ${activeView === 'courses' ? s.tabActive : ''}`}
                  onClick={() => setView('courses')}
                >
                  Courses ({courses.length})
                </button>
              </div>
            )}
            <div className={s.searchWrapper} style={{ maxWidth: 320 }}>
              <span className={s.searchIcon}><LuSearch size={16} /></span>
              <input
                className={s.searchInput}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={activeView === 'classes' ? 'Search class, instructor or venueâ€¦' : 'Search coursesâ€¦'}
                aria-label="Search"
              />
              {searchInput && (
                <button type="button" className={s.searchClear} onClick={() => setSearchInput('')} aria-label="Clear search">
                  <LuX size={14} />
                </button>
              )}
            </div>
          </div>
          {error && <p style={{ fontSize: 12.5, color: '#DC2626', margin: '0 0 12px' }}>{error}</p>}
        </div>

        {loading ? (
          <div style={{ padding: 22 }}>
            {[...Array(4)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} />)}
          </div>
        ) : activeView === 'courses' ? (
          visibleCourses.length === 0 && !coursesError ? (
            <div className={s.emptyState}>
              <div className={s.emptyIcon}>ðŸ“š</div>
              <h3 className={s.emptyTitle}>No courses found</h3>
              <p className={s.emptyDesc}>{q ? 'Try a different search term.' : 'No published courses right now.'}</p>
            </div>
          ) : (
            <>
              <div className={s.recTableScroll}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Duration</th>
                      <th style={{ textAlign: 'right' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCourses.map((c) => (
                      <tr key={c._id}>
                        <td style={{ fontWeight: 700 }}>{safeText(c.title, 'Untitled course')}</td>
                        <td>{safeText(c.duration, 'â€”')}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          KES {typeof c.price === 'number' ? c.price.toLocaleString() : safeText(c.price, '0')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={s.tableFooter}>
                {visibleCourses.length} course{visibleCourses.length !== 1 ? 's' : ''}{q ? ` matching "${searchInput.trim()}"` : ''}
              </div>
            </>
          )
        ) : (
          visibleClasses.length === 0 && !classesError ? (
            <div className={s.emptyState}>
              <div className={s.emptyIcon}>ðŸ§˜</div>
              <h3 className={s.emptyTitle}>No classes found</h3>
              <p className={s.emptyDesc}>{q ? 'Try a different search term.' : 'No classes scheduled right now.'}</p>
            </div>
          ) : (
            <>
              <div className={s.recTableScroll}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Instructor</th>
                      <th>Schedule</th>
                      <th>Venue</th>
                      <th style={{ textAlign: 'right' }}>Seats</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleClasses.map((cl) => {
                      const enrolled = typeof cl.enrolled === 'number' ? cl.enrolled : (cl.enrolledUsers?.length ?? null);
                      const seats = typeof cl.capacity === 'number'
                        ? (enrolled !== null ? `${enrolled}/${cl.capacity}` : `${cl.capacity}`)
                        : 'â€”';
                      return (
                        <tr key={cl._id}>
                          <td style={{ fontWeight: 700 }}>{safeText(cl.name, 'Unnamed class')}</td>
                          <td>{safeText(cl.instructor || cl.trainer, 'â€”')}</td>
                          <td style={{ fontSize: 12.5 }}>{formatSchedule(cl.schedule, cl.timing, cl.time)}</td>
                          <td>{safeText(cl.location, 'â€”')}</td>
                          <td style={{ textAlign: 'right' }}>{seats}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={s.tableFooter}>
                {visibleClasses.length} class{visibleClasses.length !== 1 ? 'es' : ''}{q ? ` matching "${searchInput.trim()}"` : ''}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
