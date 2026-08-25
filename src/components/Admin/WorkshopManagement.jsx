import React, { useState, useEffect } from 'react';
import s from './YogaAdmin.module.css';
import Badge from './Badge';
import { PageHeader, KpiCard, Avatar, Drawer } from './ui/Primitives';
import { workshopsApi, membershipPlansApi } from '../api/AdminServices.js';
import WorkshopStatsDrawer from './WorkshopStatsDrawer';
import {
  LuCalendar, LuClock, LuUsers, LuPlus, LuTrash2,
  LuEye, LuEyeOff, LuArchive, LuArchiveRestore, LuChartBar,
  LuLayoutGrid, LuTable, LuRefreshCw,
  LuCheck, LuX, LuSettings2,
} from 'react-icons/lu';

const EMPTY_FORM = {
  name: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  duration: '',
  instructor: '',
  zoomLink: '',
  image: '',
  capacity: 50,
  registrationDeadline: '',
  isPaid: false,
  price: 0,
  allowedPlans: [],
  isPublished: false,
  status: 'available',
};

const formatDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateInput = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toISOString().slice(0, 10);
};

const formatDateTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const getWorkshopStatus = (wk) => {
  if (wk.archived) return 'Archived';
  if (wk.status === 'completed') return 'Completed';
  if (wk.isPublished) return 'Published';
  return 'Draft';
};

export default function WorkshopManagement({ onChanged } = {}) {
  const [workshops, setWorkshops] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [view, setView] = useState('grid');
  const [statsDrawer, setStatsDrawer] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const flash = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const fetchWorkshops = async () => {
    setLoading(true);
    setError('');
    try {
      setWorkshops(await workshopsApi.list());
    } catch (err) {
      setError(err.message || 'Could not load workshops. Check your server connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const allPlans = await membershipPlansApi.list();
      setPlans(allPlans || []);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    fetchWorkshops();
    fetchPlans();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleEdit = (wk) => {
    setForm({
      name: wk.name || '',
      description: wk.description || '',
      date: wk.date ? formatDateInput(wk.date) : '',
      startTime: wk.startTime || '',
      endTime: wk.endTime || '',
      duration: wk.duration || '',
      instructor: wk.instructor || '',
      zoomLink: wk.zoomLink || '',
      image: wk.image || '',
      capacity: wk.capacity || 50,
      registrationDeadline: wk.registrationDeadline ? formatDateInput(wk.registrationDeadline) : '',
      isPaid: wk.isPaid || false,
      price: wk.price || 0,
      allowedPlans: wk.allowedPlans || [],
      isPublished: wk.isPublished || false,
      status: wk.status || 'available',
    });
    setEditingId(wk._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.date) {
      flash('Workshop name and date are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: form.isPaid ? (form.price || 0) : 0,
        date: form.date ? new Date(form.date).toISOString() : null,
        registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : null,
      };

      if (editingId) {
        await workshopsApi.update(editingId, payload);
        flash('Workshop updated successfully!');
      } else {
        const data = await workshopsApi.create(payload);
        flash(`Workshop "${data.name}" created successfully!`);
      }
      resetForm();
      await fetchWorkshops();
      onChanged?.();
    } catch (err) {
      flash(err.message || 'Failed to save workshop', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmAction) return;
    const { id, name } = confirmAction;
    setDeletingId(id);
    setConfirmAction(null);
    try {
      await workshopsApi.remove(id);
      setWorkshops(prev => prev.filter(w => w._id !== id));
      flash(`Workshop "${name}" deleted.`);
      onChanged?.();
    } catch {
      flash('Failed to delete workshop. Try again.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublish = async (wk) => {
    try {
      const updated = await workshopsApi.togglePublish(wk._id);
      setWorkshops(prev => prev.map(w => w._id === wk._id ? updated : w));
      flash(`"${wk.name}" published & notifications sent!`);
    } catch (err) {
      flash(err.message || 'Failed to toggle publish', 'error');
    }
  };

  const handleToggleArchive = async (wk) => {
    try {
      const updated = await workshopsApi.toggleArchive(wk._id);
      setWorkshops(prev => prev.map(w => w._id === wk._id ? updated : w));
      flash(updated.archived ? `"${wk.name}" archived.` : `"${wk.name}" restored.`);
    } catch (err) {
      flash(err.message || 'Failed to toggle archive', 'error');
    }
  };

  const handleViewStats = async (wk) => {
    setStatsDrawer(wk._id);
    setStatsData(null);
    setStatsLoading(true);
    try {
      const data = await workshopsApi.getStats(wk._id);
      setStatsData(data);
    } catch {
      flash('Failed to load workshop stats', 'error');
    } finally {
      setStatsLoading(false);
    }
  };

  const handlePlanToggle = (planName) => {
    setForm(prev => ({
      ...prev,
      allowedPlans: prev.allowedPlans.includes(planName)
        ? prev.allowedPlans.filter(p => p !== planName)
        : [...prev.allowedPlans, planName],
    }));
  };

  const occOf = (wk) => {
    const total = wk.registrations?.length || 0;
    const cap = wk.capacity || 1;
    return Math.min(100, Math.round((total / cap) * 100));
  };

  return (
    <div>
      <PageHeader title="Workshop Management" subtitle="Create, publish, and manage workshops with plan-based access control">
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
        <KpiCard icon={<LuCalendar />} accent="orange" label="Total Workshops" value={workshops.length} />
        <KpiCard icon={<LuEye />} accent="green" label="Published" value={workshops.filter(w => w.isPublished && !w.archived && w.status !== 'completed').length} />
        <KpiCard icon={<LuUsers />} accent="blue" label="Total Registrations" value={workshops.reduce((a, w) => a + (w.registrations?.length || 0), 0)} />
        <KpiCard icon={<LuArchive />} accent="amber" label="Archived" value={workshops.filter(w => w.archived).length} />
      </div>

      {/* Create / Edit Form */}
      <form onSubmit={handleSave} className={s.card} style={{ marginBottom: '20px' }}>
        <h3 className={s.cardTitle}>
          <span className={s.cardTitleIcon}>{editingId ? <LuSettings2 /> : <LuPlus />}</span>
          {editingId ? 'Edit Workshop' : 'Create New Workshop'}
          {editingId && (
            <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={resetForm} style={{ marginLeft: 'auto' }}>
              <LuX size={13} /> Cancel
            </button>
          )}
        </h3>

        <div className={s.grid2} style={{ marginBottom: '12px' }}>
          <div>
            <label className={s.fieldLabel}>Workshop Name *</label>
            <input type="text" placeholder="e.g. Sound Healing Immersion" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className={s.fieldLabel}>Date *</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className={s.fieldLabel}>Start Time</label>
            <input type="text" placeholder="e.g. 10:00 AM" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
          </div>
          <div>
            <label className={s.fieldLabel}>End Time</label>
            <input type="text" placeholder="e.g. 12:00 PM" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
          </div>
          <div>
            <label className={s.fieldLabel}>Duration</label>
            <input type="text" placeholder="e.g. 2 hours" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
          </div>
          <div>
            <label className={s.fieldLabel}>Instructor / Acharya</label>
            <input type="text" placeholder="e.g. Guru Prakash" value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })} />
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label className={s.fieldLabel}>Description</label>
          <textarea className={s.textarea} placeholder="Describe the workshop, what students will learn, prerequisites, etc." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>

        <div className={s.grid2} style={{ marginBottom: '12px' }}>
          <div>
            <label className={s.fieldLabel}>Zoom Link (optional)</label>
            <input type="url" placeholder="https://zoom.us/j/..." value={form.zoomLink} onChange={e => setForm({ ...form, zoomLink: e.target.value })} />
          </div>
          <div>
            <label className={s.fieldLabel}>Image URL (optional)</label>
            <input type="url" placeholder="https://example.com/banner.jpg" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} />
          </div>
          <div>
            <label className={s.fieldLabel}>Maximum Capacity</label>
            <input type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} />
          </div>
          <div>
            <label className={s.fieldLabel}>Registration Deadline</label>
            <input type="date" value={form.registrationDeadline} onChange={e => setForm({ ...form, registrationDeadline: e.target.value })} />
          </div>
        </div>

        {/* Paid / Free Toggle */}
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label className={s.checkLabel}>
            <input type="checkbox" className={s.checkInput} checked={form.isPaid} onChange={e => setForm({ ...form, isPaid: e.target.checked })} />
            Paid Workshop
          </label>
          {form.isPaid && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label className={s.fieldLabel} style={{ margin: 0 }}>Price (₹)</label>
              <input type="number" min="0" style={{ width: '140px' }} value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
          )}
        </div>

        {/* Membership Plan Access Selector */}
        <div style={{ marginBottom: '12px' }}>
          <label className={s.fieldLabel}>Membership Plan Access (select plans that can access this workshop)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
            {plans.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>No membership plans found in the database.</span>
            ) : (
              plans.map((plan) => (
                <button
                  key={plan._id}
                  type="button"
                  className={`${s.chip} ${form.allowedPlans.includes(plan.name) ? s.chipActive : ''}`}
                  onClick={() => handlePlanToggle(plan.name)}
                >
                  {plan.name}
                  {form.allowedPlans.includes(plan.name) && <LuCheck size={12} style={{ marginLeft: 4 }} />}
                </button>
              ))
            )}
            {form.allowedPlans.length === 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-3)', alignSelf: 'center' }}>
                (None selected — workshop will be visible to all students)
              </span>
            )}
          </div>
        </div>

        {/* Publish toggle - only shown for new or draft workshops */}
        {(!editingId || !form.isPublished) && (
          <div style={{ marginBottom: '16px' }}>
            <label className={s.checkLabel}>
              <input type="checkbox" className={s.checkInput} checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} />
              Publish immediately (eligible students will be notified)
            </label>
          </div>
        )}

        <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
          {saving ? (editingId ? 'Updating…' : 'Creating…') : (editingId ? 'Update Workshop' : 'Create Workshop')}
        </button>
      </form>

      {/* Workshop List */}
      {loading ? (
        <div className={s.catalogGrid}>{[...Array(4)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelCard}`} style={{ height: 200 }} />)}</div>
      ) : error ? (
        <div className={`${s.card} ${s.emptyState} ${s.stateError}`}>
          {error}<br />
          <button type="button" className={`${s.btn} ${s.btnSm}`} style={{ marginTop: '12px' }} onClick={fetchWorkshops}><LuRefreshCw size={13} /> Retry</button>
        </div>
      ) : workshops.length === 0 ? (
        <div className={`${s.card} ${s.emptyState}`}>
          <div className={s.emptyIcon}><LuCalendar /></div>
          No workshops yet — create one above!
        </div>
      ) : view === 'grid' ? (
        <div className={s.catalogGrid}>
          {workshops.map(wk => {
            const occ = occOf(wk);
            const ws = getWorkshopStatus(wk);
            const isArchived = wk.archived;
            const isCompleted = wk.status === 'completed';
            const canPublish = !isArchived && !isCompleted && !wk.isPublished;
            return (
              <div key={wk._id} className={s.productCard} style={{ opacity: isArchived ? 0.65 : 1 }}>
                <div className={s.productBody}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className={s.productTitle}>{wk.name}</div>
                    <Badge label={ws} />
                  </div>
                  <div className={s.productMeta}>
                    <LuCalendar size={12} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                    {formatDate(wk.date)}
                    {wk.startTime && <> · <LuClock size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />{wk.startTime}{wk.endTime ? `–${wk.endTime}` : ''}</>}
                  </div>
                  {wk.instructor && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 4 }}>
                      <Avatar name={wk.instructor} size={s.avatarSm} />
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{wk.instructor}</span>
                    </div>
                  )}
                  {wk.duration && <div className={s.productMeta} style={{ marginTop: 4 }}>Duration: {wk.duration}</div>}
                  {wk.allowedPlans?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                      {wk.allowedPlans.slice(0, 3).map(p => <span key={p} className={`${s.permBadge} ${s.permPlan}`}>{p}</span>)}
                      {wk.allowedPlans.length > 3 && <span className={`${s.permBadge} ${s.permPlan}`}>+{wk.allowedPlans.length - 3}</span>}
                    </div>
                  )}

                  {/* Occupancy bar */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-2)', marginBottom: 5 }}>
                      <span>Capacity</span><span style={{ fontWeight: 700 }}>{wk.registrations?.length || 0}/{wk.capacity || 50}</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 6, background: 'var(--surface-3)', overflow: 'hidden' }}>
                      <div style={{ width: `${occ}%`, height: '100%', background: 'var(--c-grad)' }} />
                    </div>
                  </div>

                  {/* Price */}
                  {wk.isPaid && <div className={s.productMeta} style={{ marginTop: 4, fontWeight: 700 }}>₹{wk.price?.toLocaleString('en-IN')}</div>}

                  {/* Actions */}
                  <div className={s.productFoot}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleEdit(wk)} title="Edit">
                        <LuSettings2 size={13} />
                      </button>
                      <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleViewStats(wk)} title="Stats">
                        <LuChartBar size={13} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {canPublish && (
                        <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnPrimary}`} onClick={() => handleTogglePublish(wk)} title="Publish">
                          <LuEye size={13} /> Publish
                        </button>
                      )}
                      {!canPublish && (isCompleted || ws === 'Published') && (
                        <span className={`${s.badge} ${s.badgeGreen}`} style={{ fontSize: 11, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <LuCheck size={12} /> {isCompleted ? 'Completed' : 'Published'}
                        </span>
                      )}
                      <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleToggleArchive(wk)} title={isArchived ? 'Restore' : 'Archive'}>
                        {isArchived ? <LuArchiveRestore size={13} /> : <LuArchive size={13} />}
                      </button>
                      <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} onClick={() => setConfirmAction({ id: wk._id, name: wk.name })} disabled={deletingId === wk._id} title="Delete">
                        {deletingId === wk._id ? '…' : <LuTrash2 size={13} />}
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
                  <th>Workshop Name</th>
                  <th>Date</th>
                  <th>Instructor</th>
                  <th>Registered</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {workshops.map(wk => {
                  const ws = getWorkshopStatus(wk);
                  const canPublish = !wk.archived && wk.status !== 'completed' && !wk.isPublished;
                  return (
                    <tr key={wk._id}>
                      <td><strong>{wk.name}</strong></td>
                      <td className={s.tdMuted}>{formatDate(wk.date)}</td>
                      <td><div className={s.cellUser}><Avatar name={wk.instructor || '—'} size={s.avatarSm} />{wk.instructor || '—'}</div></td>
                      <td>{wk.registrations?.length || 0}</td>
                      <td>{wk.capacity || 50}</td>
                      <td><Badge label={ws} /></td>
                      <td>{wk.isPaid ? `₹${wk.price?.toLocaleString('en-IN')}` : 'Free'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleEdit(wk)} title="Edit"><LuSettings2 size={13} /></button>
                          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleViewStats(wk)} title="Stats"><LuChartBar size={13} /></button>
                          {canPublish ? (
                            <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnPrimary}`} onClick={() => handleTogglePublish(wk)} title="Publish">
                              <LuEye size={13} />
                            </button>
                          ) : (
                            <span className={`${s.badge} ${s.badgeGreen}`} style={{
                              fontSize: 10, padding: '4px 8px', whiteSpace: 'nowrap',
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              minWidth: 70, justifyContent: 'center',
                            }}>
                              <LuCheck size={10} /> {ws === 'Completed' ? 'Done' : 'Live'}
                            </span>
                          )}
                          <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} onClick={() => setConfirmAction({ id: wk._id, name: wk.name })} disabled={deletingId === wk._id}>
                            {deletingId === wk._id ? '…' : <LuTrash2 size={14} />}
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
          <div className={s.modalBox} onClick={e => e.stopPropagation()}>
            <div className={s.modalIcon}><LuTrash2 /></div>
            <h3 className={s.modalTitle}>Delete Workshop</h3>
            <p className={s.modalText}>
              Are you sure you want to delete <strong>"{confirmAction.name}"</strong>?<br />
              This will permanently remove the workshop and all registrations. This cannot be undone.
            </p>
            <div className={s.modalActions}>
              <button type="button" className={s.btnCancel} onClick={() => setConfirmAction(null)}>Cancel</button>
              <button type="button" className={s.btnConfirmLogout} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Drawer - Premium Analytics Dashboard */}
      <WorkshopStatsDrawer
        open={!!statsDrawer}
        statsData={statsData}
        statsLoading={statsLoading}
        onClose={() => { setStatsDrawer(null); setStatsData(null); }}
      />
    </div>
  );
}


