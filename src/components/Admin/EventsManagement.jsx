import React, { useState, useEffect } from 'react';
import s from './YogaAdmin.module.css';
import Badge from './Badge';
import { PageHeader, KpiCard, Avatar } from './ui/Primitives';
import { eventsApi } from '../api/AdminServices.js';
import {
  LuCalendar, LuClock, LuUsers, LuPlus, LuTrash2, LuMapPin,
  LuEye, LuLayoutGrid, LuTable, LuRefreshCw,
  LuX, LuSettings2, LuUserCheck,
} from 'react-icons/lu';

const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  instructor: '',
  image: '',
  capacity: 0,
  registrationDeadline: '',
  isPublished: false,
  status: 'available',
};

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateInput = (d) => {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
};

const formatDateTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const getEventStatus = (ev) => {
  if (ev.status === 'cancelled') return 'Cancelled';
  if (ev.status === 'completed') return 'Completed';
  if (ev.isPublished) return 'Published';
  return 'Draft';
};

export default function EventsManagement({ onChanged } = {}) {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [view, setView] = useState('grid');
  const [confirmAction, setConfirmAction] = useState(null);

  // Registrations modal
  const [regModal, setRegModal] = useState(null); // { id, title }
  const [regLoading, setRegLoading] = useState(false);
  const [regData, setRegData] = useState(null);

  const flash = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    try {
      setEvents(await eventsApi.list());
    } catch (err) {
      setError(err.message || 'Could not load events. Check your server connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleEdit = (ev) => {
    setForm({
      title: ev.title || '',
      description: ev.description || '',
      date: ev.date ? formatDateInput(ev.date) : '',
      startTime: ev.startTime || '',
      endTime: ev.endTime || '',
      location: ev.location || '',
      instructor: ev.instructor || '',
      image: ev.image || '',
      capacity: ev.capacity || 0,
      registrationDeadline: ev.registrationDeadline ? formatDateInput(ev.registrationDeadline) : '',
      isPublished: ev.isPublished || false,
      status: ev.status || 'available',
    });
    setEditingId(ev._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date) {
      flash('Event title and date are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity) || 0,
        date: form.date ? new Date(form.date).toISOString() : null,
        registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : null,
      };
      if (editingId) {
        await eventsApi.update(editingId, payload);
        flash('Event updated successfully!');
      } else {
        const data = await eventsApi.create(payload);
        flash(`Event "${data.title}" created successfully!`);
      }
      resetForm();
      await fetchEvents();
      onChanged?.();
    } catch (err) {
      flash(err.message || 'Failed to save event', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmAction) return;
    const { id, title } = confirmAction;
    setDeletingId(id);
    setConfirmAction(null);
    try {
      await eventsApi.remove(id);
      setEvents((prev) => prev.filter((e) => e._id !== id));
      flash(`Event "${title}" deleted.`);
      onChanged?.();
    } catch {
      flash('Failed to delete event. Try again.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const openRegistrations = async (ev) => {
    setRegModal({ id: ev._id, title: ev.title });
    setRegData(null);
    setRegLoading(true);
    try {
      setRegData(await eventsApi.getRegistrations(ev._id));
    } catch {
      flash('Failed to load registrations', 'error');
    } finally {
      setRegLoading(false);
    }
  };

  const occOf = (ev) => {
    const total = ev.registrations?.length || 0;
    const cap = ev.capacity || 0;
    if (!cap) return 0;
    return Math.min(100, Math.round((total / cap) * 100));
  };

  const totalRegistrations = events.reduce((a, e) => a + (e.registrations?.length || 0), 0);

  return (
    <div>
      <PageHeader title="Events Management" subtitle="Create and publish community events. Published events appear on the website calendar and in the student dashboard.">
        <div className={s.segment}>
          <button type="button" className={`${s.segBtn} ${view === 'grid' ? s.segActive : ''}`} onClick={() => setView('grid')}><LuLayoutGrid size={14} /> Cards</button>
          <button type="button" className={`${s.segBtn} ${view === 'table' ? s.segActive : ''}`} onClick={() => setView('table')}><LuTable size={14} /> Table</button>
        </div>
      </PageHeader>

      {feedback.message && (
        <div className={`${s.feedbackInline} ${feedback.type === 'success' ? s.bannerSuccess : s.bannerError}`}>
          <span className={s.bannerIcon}>{feedback.type === 'success' ? '✓' : '⚠'}</span>{feedback.message}
        </div>
      )}

      <div className={s.statsGrid} style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '20px' }}>
        <KpiCard icon={<LuCalendar />} accent="orange" label="Total Events" value={events.length} />
        <KpiCard icon={<LuEye />} accent="green" label="Published" value={events.filter((e) => e.isPublished && e.status === 'available').length} />
        <KpiCard icon={<LuUsers />} accent="blue" label="Total Registrations" value={totalRegistrations} />
        <KpiCard icon={<LuClock />} accent="amber" label="Drafts" value={events.filter((e) => !e.isPublished).length} />
      </div>

      {/* Create / Edit Form */}
      <form onSubmit={handleSave} className={s.card} style={{ marginBottom: '20px' }}>
        <h3 className={s.cardTitle}>
          <span className={s.cardTitleIcon}>{editingId ? <LuSettings2 /> : <LuPlus />}</span>
          {editingId ? 'Edit Event' : 'Create New Event'}
          {editingId && (
            <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={resetForm} style={{ marginLeft: 'auto' }}>
              <LuX size={13} /> Cancel
            </button>
          )}
        </h3>

        <div className={s.grid2} style={{ marginBottom: '12px' }}>
          <div>
            <label className={s.fieldLabel}>Event Title *</label>
            <input type="text" placeholder="e.g. International Yoga Day Celebration" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className={s.fieldLabel}>Date *</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className={s.fieldLabel}>Start Time</label>
            <input type="text" placeholder="e.g. 10:00 AM" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </div>
          <div>
            <label className={s.fieldLabel}>End Time</label>
            <input type="text" placeholder="e.g. 12:00 PM" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
          <div>
            <label className={s.fieldLabel}>Location / Venue</label>
            <input type="text" placeholder="e.g. Rishikesh Ashram or Online (Zoom)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <label className={s.fieldLabel}>Host / Instructor</label>
            <input type="text" placeholder="e.g. Guru Prakash" value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} />
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label className={s.fieldLabel}>Description</label>
          <textarea className={s.textarea} placeholder="Describe the event, what attendees can expect, agenda, etc." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div className={s.grid2} style={{ marginBottom: '12px' }}>
          <div>
            <label className={s.fieldLabel}>Image URL (optional)</label>
            <input type="url" placeholder="https://example.com/banner.jpg" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
          </div>
          <div>
            <label className={s.fieldLabel}>Capacity (0 = unlimited)</label>
            <input type="number" min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
          </div>
          <div>
            <label className={s.fieldLabel}>Registration Deadline</label>
            <input type="date" value={form.registrationDeadline} onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })} />
          </div>
          <div>
            <label className={s.fieldLabel}>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="available">Available</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className={s.checkLabel}>
            <input type="checkbox" className={s.checkInput} checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            Publish (show on the website calendar &amp; student dashboard)
          </label>
        </div>

        <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
          {saving ? (editingId ? 'Updating…' : 'Creating…') : (editingId ? 'Update Event' : 'Create Event')}
        </button>
      </form>

      {/* Event List */}
      {loading ? (
        <div className={s.catalogGrid}>{[...Array(4)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelCard}`} style={{ height: 200 }} />)}</div>
      ) : error ? (
        <div className={`${s.card} ${s.emptyState} ${s.stateError}`}>
          {error}<br />
          <button type="button" className={`${s.btn} ${s.btnSm}`} style={{ marginTop: '12px' }} onClick={fetchEvents}><LuRefreshCw size={13} /> Retry</button>
        </div>
      ) : events.length === 0 ? (
        <div className={`${s.card} ${s.emptyState}`}>
          <div className={s.emptyIcon}><LuCalendar /></div>
          No events yet — create one above!
        </div>
      ) : view === 'grid' ? (
        <div className={s.catalogGrid}>
          {events.map((ev) => {
            const occ = occOf(ev);
            const status = getEventStatus(ev);
            const regCount = ev.registrations?.length || 0;
            return (
              <div key={ev._id} className={s.productCard}>
                <div className={s.productBody}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className={s.productTitle}>{ev.title}</div>
                    <Badge label={status} />
                  </div>
                  <div className={s.productMeta}>
                    <LuCalendar size={12} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                    {formatDate(ev.date)}
                    {ev.startTime && <> · <LuClock size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />{ev.startTime}{ev.endTime ? `–${ev.endTime}` : ''}</>}
                  </div>
                  {ev.location && (
                    <div className={s.productMeta} style={{ marginTop: 4 }}>
                      <LuMapPin size={12} style={{ verticalAlign: '-2px', marginRight: 6 }} />{ev.location}
                    </div>
                  )}
                  {ev.instructor && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 4 }}>
                      <Avatar name={ev.instructor} size={s.avatarSm} />
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{ev.instructor}</span>
                    </div>
                  )}

                  {/* Registrations bar */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-2)', marginBottom: 5 }}>
                      <span>Registered</span>
                      <span style={{ fontWeight: 700 }}>{regCount}{ev.capacity ? `/${ev.capacity}` : ''}</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 6, background: 'var(--surface-3)', overflow: 'hidden' }}>
                      <div style={{ width: `${ev.capacity ? occ : (regCount ? 100 : 0)}%`, height: '100%', background: 'var(--c-grad)' }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={s.productFoot}>
                    <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => openRegistrations(ev)} title="View registrations">
                      <LuUserCheck size={13} /> Registrations ({regCount})
                    </button>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleEdit(ev)} title="Edit">
                        <LuSettings2 size={13} />
                      </button>
                      <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} onClick={() => setConfirmAction({ id: ev._id, title: ev.title })} disabled={deletingId === ev._id} title="Delete">
                        {deletingId === ev._id ? '…' : <LuTrash2 size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`${s.card} ${s.cardNoPad}`}>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Event Title</th>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const status = getEventStatus(ev);
                  const regCount = ev.registrations?.length || 0;
                  return (
                    <tr key={ev._id}>
                      <td><strong>{ev.title}</strong></td>
                      <td className={s.tdMuted}>{formatDate(ev.date)}</td>
                      <td className={s.tdMuted}>{ev.location || '—'}</td>
                      <td>{regCount}{ev.capacity ? `/${ev.capacity}` : ''}</td>
                      <td><Badge label={status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => openRegistrations(ev)} title="Registrations"><LuUserCheck size={13} /></button>
                          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleEdit(ev)} title="Edit"><LuSettings2 size={13} /></button>
                          <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} onClick={() => setConfirmAction({ id: ev._id, title: ev.title })} disabled={deletingId === ev._id}>
                            {deletingId === ev._id ? '…' : <LuTrash2 size={14} />}
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
      )}

      {/* Confirm Delete Modal */}
      {confirmAction && (
        <div className={s.modalOverlay} onClick={() => setConfirmAction(null)}>
          <div className={s.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalIcon}><LuTrash2 /></div>
            <h3 className={s.modalTitle}>Delete Event</h3>
            <p className={s.modalText}>
              Are you sure you want to delete <strong>"{confirmAction.title}"</strong>?<br />
              This permanently removes the event and all its registrations. This cannot be undone.
            </p>
            <div className={s.modalActions}>
              <button type="button" className={s.btnCancel} onClick={() => setConfirmAction(null)}>Cancel</button>
              <button type="button" className={s.btnConfirmLogout} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Registrations Modal */}
      {regModal && (
        <div className={s.modalOverlay} onClick={() => setRegModal(null)}>
          <div className={s.modalBox} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: '100%', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 className={s.modalTitle} style={{ margin: 0, textAlign: 'left' }}>
                Registrations — {regModal.title}
              </h3>
              <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => setRegModal(null)}><LuX size={14} /></button>
            </div>
            {regLoading ? (
              <p className={s.modalText} style={{ textAlign: 'left' }}>Loading registrations…</p>
            ) : !regData || regData.count === 0 ? (
              <div className={s.emptyState} style={{ padding: '24px 8px' }}>
                <div className={s.emptyIcon}><LuUsers /></div>
                No students have registered yet.
              </div>
            ) : (
              <div className={s.tableWrap} style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Registered On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regData.registrations.map((r) => (
                      <tr key={r._id}>
                        <td><div className={s.cellUser}><Avatar name={r.name} size={s.avatarSm} />{r.name}</div></td>
                        <td className={s.tdMuted}>{r.email}</td>
                        <td className={s.tdMuted}>{r.phone || '—'}</td>
                        <td className={s.tdMuted}>{formatDateTime(r.registeredAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
