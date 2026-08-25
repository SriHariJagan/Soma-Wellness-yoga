import { useState, useEffect, useRef, useCallback } from 'react';
import s from './YogaAdmin.module.css';
import FeedbackBanner from './FeedbackBanner';
import { PageHeader } from './ui/Primitives';
import {
  listNotifications, getNotificationDetail, getNotificationStats,
  sendNotification, getRecipientsByCategory,
} from '../api/AdminServices.js';
import {
  LuSend, LuBell, LuUsers, LuSearch, LuCheck, LuX, LuEye,
  LuClock, LuChevronDown, LuChevronUp, LuInfo, LuTriangleAlert,
  LuCircleAlert, LuMegaphone, LuMail, LuMessageSquare,
  LuBookOpen, LuCalendar, LuCreditCard, LuActivity,
  LuRefreshCw,
} from 'react-icons/lu';

const CATEGORY_CHIPS = [
  { id: 'all',                 label: 'All Students',           icon: <LuUsers size={14} /> },
  { id: 'membership_plan',     label: 'Membership Plan Members',icon: <LuCreditCard size={14} /> },
  { id: 'service_member',      label: 'Service Members',        icon: <LuActivity size={14} /> },
  { id: 'course_student',      label: 'Course Students',        icon: <LuBookOpen size={14} /> },
  { id: 'workshop_participant',label: 'Workshop Participants',  icon: <LuCalendar size={14} /> },
  { id: 'trial_student',       label: 'Trial Students',         icon: <LuClock size={14} /> },
  { id: 'expired_membership',  label: 'Expired Memberships',    icon: <LuTriangleAlert size={14} /> },
  { id: 'pending_payment',     label: 'Pending Payments',       icon: <LuCircleAlert size={14} /> },
  { id: 'active_membership',   label: 'Active Memberships',     icon: <LuCheck size={14} /> },
  { id: 'custom',              label: 'Custom Selection',       icon: <LuSearch size={14} /> },
];

const NOTIF_TYPES = [
  { value: 'general',           label: 'General',           icon: <LuBell size={14} /> },
  { value: 'information',       label: 'Information',       icon: <LuInfo size={14} /> },
  { value: 'reminder',          label: 'Reminder',          icon: <LuClock size={14} /> },
  { value: 'payment_reminder',  label: 'Payment Reminder',  icon: <LuCreditCard size={14} /> },
  { value: 'membership_expiry', label: 'Membership Expiry', icon: <LuTriangleAlert size={14} /> },
  { value: 'membership_activated',label: 'Membership Activated', icon: <LuCheck size={14} /> },
  { value: 'course_update',     label: 'Course Update',     icon: <LuBookOpen size={14} /> },
  { value: 'service_update',    label: 'Service Update',    icon: <LuActivity size={14} /> },
  { value: 'workshop_update',   label: 'Workshop Update',   icon: <LuCalendar size={14} /> },
  { value: 'attendance',        label: 'Attendance',        icon: <LuCheck size={14} /> },
  { value: 'promotional',       label: 'Promotional',       icon: <LuMegaphone size={14} /> },
  { value: 'emergency',         label: 'Emergency',         icon: <LuCircleAlert size={14} /> },
];

const PRIORITIES = [
  { value: 'low',    label: 'Low',    color: '#6B7280' },
  { value: 'normal', label: 'Normal', color: '#F97316' },
  { value: 'high',   label: 'High',   color: '#DC2626' },
  { value: 'urgent', label: 'Urgent', color: '#991B1B' },
];

const TYPE_META = {
  general:           { icon: <LuBell size={16} />,        color: '#6B7280' },
  information:       { icon: <LuInfo size={16} />,        color: '#3B82F6' },
  reminder:          { icon: <LuClock size={16} />,       color: '#F97316' },
  payment_reminder:  { icon: <LuCreditCard size={16} />,  color: '#10B981' },
  membership_expiry: { icon: <LuTriangleAlert size={16} />,color: '#DC2626' },
  membership_activated:{icon: <LuCheck size={16} />,      color: '#10B981' },
  course_update:     { icon: <LuBookOpen size={16} />,    color: '#8B5CF6' },
  service_update:    { icon: <LuActivity size={16} />,    color: '#F97316' },
  workshop_update:   { icon: <LuCalendar size={16} />,    color: '#EC4899' },
  attendance:        { icon: <LuCheck size={16} />,       color: '#10B981' },
  promotional:       { icon: <LuMegaphone size={16} />,   color: '#F59E0B' },
  emergency:         { icon: <LuCircleAlert size={16} />, color: '#DC2626' },
};

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CommsWebConfig({ feedback: parentFeedback }) {
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  /* ── Notification data ── */
  const [stats, setStats] = useState({ totalSent: 0, totalRecipients: 0, totalRead: 0, recentNotifications: [] });
  const [notifications, setNotifications] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [selectedNotifDetail, setSelectedNotifDetail] = useState(null);

  /* ── Composer state ── */
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notifType, setNotifType] = useState('general');
  const [priority, setPriority] = useState('normal');
  const [url, setUrl] = useState('');
  const [route, setRoute] = useState('');

  /* ── Recipient state ── */
  const [category, setCategory] = useState('all');
  const [entityId, setEntityId] = useState('');
  const [entityOptions, setEntityOptions] = useState([]);
  const [loadingEntity, setLoadingEntity] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const searchTimer = useRef(null);

  const flash = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4500);
  };

  /* ── Load data ── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, notifData] = await Promise.all([
        getNotificationStats(),
        listNotifications(1, 50),
      ]);
      setStats(statsData);
      setNotifications(notifData.notifications || []);
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── Fetch recipients when category or entity changes ── */
  const fetchRecipients = useCallback(async (cat, eid) => {
    if (cat === 'custom') return;
    setLoadingEntity(true);
    try {
      const data = await getRecipientsByCategory({ category: cat, entityId: eid || '' });
      if (data.plans) { setEntityOptions(data.plans); setStudents([]); return; }
      if (data.services) { setEntityOptions(data.services); setStudents([]); return; }
      if (data.courses) { setEntityOptions(data.courses); setStudents([]); return; }
      if (data.workshops) { setEntityOptions(data.workshops); setStudents([]); return; }
      setEntityOptions([]);
      setStudents(data.students || []);
    } catch (err) {
      flash(err.message, 'error');
      setStudents([]);
    } finally {
      setLoadingEntity(false);
    }
  }, []);

  useEffect(() => {
    if (category && category !== 'custom') {
      fetchRecipients(category, entityId);
    }
  }, [category, entityId, fetchRecipients]);

  /* ── Custom search ── */
  useEffect(() => {
    if (category !== 'custom') return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (search.length < 2) { setStudents([]); return; }
    searchTimer.current = setTimeout(async () => {
      setLoadingEntity(true);
      try {
        const data = await getRecipientsByCategory({ category: 'custom', search });
        setStudents(data.students || []);
      } catch { setStudents([]); }
      finally { setLoadingEntity(false); }
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search, category]);

  /* ── Handle category chip click ── */
  const handleCategoryClick = (catId) => {
    setCategory(catId);
    setEntityId('');
    setEntityOptions([]);
    setSearch('');
    if (catId !== 'custom') setSelectedIds(new Set());
  };

  /* ── Handle entity selection (dropdown) ── */
  const handleEntityChange = (eid) => {
    setEntityId(eid);
    setSelectedIds(new Set());
    if (eid) fetchRecipients(category, eid);
  };

  /* ── Toggle student selection ── */
  const toggleStudent = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(students.map((s) => s._id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  /* ── Send notification ── */
  const handleSend = async (e) => {
    e.preventDefault();
    const recipientIds = Array.from(selectedIds);
    if (recipientIds.length === 0) { flash('Select at least one recipient.', 'error'); return; }
    if (!title.trim()) { flash('Enter a notification title.', 'error'); return; }
    if (!message.trim()) { flash('Enter a notification message.', 'error'); return; }

    setSending(true);
    try {
      await sendNotification({
        title: title.trim(),
        message: message.trim(),
        type: notifType,
        priority,
        url: url.trim() || undefined,
        route: route.trim() || undefined,
        recipientIds,
      });
      flash(`Notification sent to ${recipientIds.length} students.`, 'success');
      setTitle('');
      setMessage('');
      setUrl('');
      setRoute('');
      setNotifType('general');
      setPriority('normal');
      setSelectedIds(new Set());
      setStudents([]);
      await loadAll();
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  /* ── View notification detail ── */
  const handleViewDetail = async (notifId) => {
    try {
      const data = await getNotificationDetail(notifId);
      setSelectedNotif(notifId);
      setSelectedNotifDetail(data);
    } catch (err) {
      flash(err.message, 'error');
    }
  };

  const canSend = selectedIds.size > 0 && title.trim() && message.trim() && !sending;

  const priorityColor = PRIORITIES.find((p) => p.value === priority)?.color || '#F97316';

  return (
    <div>
      <PageHeader title="Communication Hub" subtitle="Send targeted notifications to students" />

      {(feedback?.message || parentFeedback?.message) && (
        <FeedbackBanner message={feedback.message || parentFeedback.message} type={feedback.type || parentFeedback.type} />
      )}

      <div className={s.grid2} style={{ marginBottom: 20 }}>
        {/* ── LEFT: Recipient Selection + Composer ── */}
        <div>
          {/* Recipient Selection */}
          <div className={s.card} style={{ marginBottom: 16 }}>
            <h3 className={s.cardTitle}>
              <span className={s.cardTitleIcon}><LuUsers /></span>
              Recipients
              {selectedIds.size > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#F97316', background: 'rgba(249,115,22,0.1)', padding: '3px 10px', borderRadius: 20 }}>
                  {selectedIds.size} student{selectedIds.size > 1 ? 's' : ''} selected
                </span>
              )}
            </h3>

            {/* Category chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {CATEGORY_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleCategoryClick(chip.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    border: category === chip.id ? '1.5px solid #F97316' : '1px solid #E7D7BE',
                    background: category === chip.id ? 'rgba(249,115,22,0.08)' : '#fff',
                    color: category === chip.id ? '#F97316' : '#6B5E4E',
                    cursor: 'pointer', transition: 'all 0.15s',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {chip.icon}
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Entity dropdown (for membership plan, service, course, workshop) */}
            {entityOptions.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B5E4E', display: 'block', marginBottom: 4 }}>
                  Select {category === 'membership_plan' ? 'Membership Plan' :
                           category === 'service_member' ? 'Service' :
                           category === 'course_student' ? 'Course' : 'Workshop'}
                </label>
                <select
                  value={entityId}
                  onChange={(e) => handleEntityChange(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                    border: '1px solid #E7D7BE', background: '#FDFBF7', color: '#2D1406',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <option value="">-- Select --</option>
                  {category === 'membership_plan' && entityOptions.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} ({p.durationMonths}mo)</option>
                  ))}
                  {category === 'service_member' && entityOptions.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                  {category === 'course_student' && entityOptions.map((c) => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                  {category === 'workshop_participant' && entityOptions.map((w) => (
                    <option key={w._id} value={w._id}>{w.name} — {new Date(w.date).toLocaleDateString('en-IN')}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom search */}
            {category === 'custom' && (
              <div style={{ marginBottom: 14, position: 'relative' }}>
                <LuSearch size={16} style={{ position: 'absolute', left: 14, top: 16, color: '#9C8E7C' }} />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px 12px 42px', borderRadius: 10, fontSize: 13,
                    border: '1px solid #E7D7BE', background: '#FDFBF7', color: '#2D1406',
                    fontFamily: "'Inter', sans-serif", outline: 'none',
                  }}
                />
              </div>
            )}

            {/* Student list */}
            {loadingEntity ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#9C8E7C', fontSize: 13 }}>
                Loading students...
              </div>
            ) : students.length > 0 ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#9C8E7C' }}>{students.length} students found</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={selectAllVisible}
                      style={{ background: 'none', border: 'none', color: '#F97316', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                      Select all
                    </button>
                    <button type="button" onClick={clearSelection}
                      style={{ background: 'none', border: 'none', color: '#9C8E7C', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                      Clear
                    </button>
                  </div>
                </div>
                <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid #E7D7BE', borderRadius: 10 }}>
                  {students.map((stu) => {
                    const selected = selectedIds.has(stu._id);
                    return (
                      <div
                        key={stu._id}
                        onClick={() => toggleStudent(stu._id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                          cursor: 'pointer', borderBottom: '1px solid #F0EBE3',
                          background: selected ? 'rgba(249,115,22,0.05)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = selected ? 'rgba(249,115,22,0.08)' : '#F8F4EC'}
                        onMouseLeave={(e) => e.currentTarget.style.background = selected ? 'rgba(249,115,22,0.05)' : 'transparent'}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected ? '#F97316' : '#D4C9B8'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          background: selected ? '#F97316' : 'transparent', transition: 'all 0.15s',
                        }}>
                          {selected && <LuCheck size={12} color="#fff" />}
                        </div>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg, #2E7D5B, #81B29A)', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700,
                        }}>
                          {stu.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#2D1406' }}>{stu.name}</div>
                          <div style={{ fontSize: 11.5, color: '#9C8E7C', display: 'flex', gap: 8 }}>
                            <span>{stu.email}</span>
                            {stu.phone && <span>· {stu.phone}</span>}
                          </div>
                        </div>
                        {stu.membershipStatus && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                            background: stu.membershipStatus === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(156,142,124,0.1)',
                            color: stu.membershipStatus === 'Active' ? '#10B981' : '#9C8E7C',
                            whiteSpace: 'nowrap',
                          }}>
                            {stu.membershipStatus}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : category !== 'custom' && entityOptions.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#9C8E7C', fontSize: 13 }}>
                {category === 'all' ? 'All students will be selected. Click "Select all" above.' :
                 entityId ? 'No students found for this selection.' :
                 'Select an option above to filter students.'}
              </div>
            ) : category === 'custom' && search.length < 2 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#9C8E7C', fontSize: 13 }}>
                Type at least 2 characters to search
              </div>
            ) : null}
          </div>

          {/* Notification Composer */}
          <div className={s.card}>
            <h3 className={s.cardTitle}>
              <span className={s.cardTitleIcon}><LuSend /></span>
              Compose Notification
            </h3>

            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Title */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B5E4E', display: 'block', marginBottom: 4 }}>Title *</label>
                <input
                  type="text"
                  placeholder="Notification title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                    border: '1px solid #E7D7BE', background: '#FDFBF7', color: '#2D1406',
                    fontFamily: "'Inter', sans-serif", outline: 'none',
                  }}
                />
              </div>

              {/* Message */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B5E4E', display: 'block', marginBottom: 4 }}>Message *</label>
                <textarea
                  placeholder="Write your notification message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                    border: '1px solid #E7D7BE', background: '#FDFBF7', color: '#2D1406',
                    fontFamily: "'Inter', sans-serif", outline: 'none', resize: 'vertical',
                    minHeight: 90,
                  }}
                />
              </div>

              {/* Type + Priority + Attachments */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6B5E4E', display: 'block', marginBottom: 4 }}>Type</label>
                  <select
                    value={notifType}
                    onChange={(e) => setNotifType(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                      border: '1px solid #E7D7BE', background: '#FDFBF7', color: '#2D1406',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {NOTIF_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6B5E4E', display: 'block', marginBottom: 4 }}>Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                      border: '1px solid #E7D7BE', background: '#FDFBF7', color: '#2D1406',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6B5E4E', display: 'block', marginBottom: 4 }}>URL (optional)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                      border: '1px solid #E7D7BE', background: '#FDFBF7', color: '#2D1406',
                      fontFamily: "'Inter', sans-serif", outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6B5E4E', display: 'block', marginBottom: 4 }}>Internal Route (optional)</label>
                  <input
                    type="text"
                    placeholder="/studentdashboard?tab=..."
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                      border: '1px solid #E7D7BE', background: '#FDFBF7', color: '#2D1406',
                      fontFamily: "'Inter', sans-serif", outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Live Preview */}
              <div style={{
                background: '#F8F4EC', borderRadius: 12, padding: '14px 16px',
                border: '1px solid #E7D7BE',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9C8E7C', marginBottom: 8 }}>
                  Preview
                </div>
                <div style={{
                  background: '#fff', borderRadius: 10, padding: 14,
                  border: '1px solid #E7D7BE',
                  borderLeft: `3px solid ${priorityColor}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: (TYPE_META[notifType] || TYPE_META.general).color, display: 'flex' }}>
                      {(TYPE_META[notifType] || TYPE_META.general).icon}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: '#2D1406', flex: 1 }}>
                      {title || 'Notification Title'}
                    </span>
                    <span style={{
                      fontSize: 9.5, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                      background: `${priorityColor}18`, color: priorityColor,
                    }}>
                      {PRIORITIES.find((p) => p.value === priority)?.label || 'Normal'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12.5, color: '#6B5E4E', lineHeight: 1.5, margin: 0 }}>
                    {message || 'Your notification message will appear here...'}
                  </p>
                  <div style={{ fontSize: 10, color: '#9C8E7C', marginTop: 6 }}>
                    Pragya Yoga · {NOTIF_TYPES.find((t) => t.value === notifType)?.label || 'General'}
                  </div>
                </div>
              </div>

              {/* Send button */}
              <button
                type="submit"
                disabled={!canSend}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                  border: 'none', cursor: canSend ? 'pointer' : 'not-allowed',
                  background: canSend ? 'linear-gradient(135deg, #2E7D5B, #E67300)' : '#D4C9B8',
                  color: canSend ? '#fff' : '#9C8E7C',
                  fontFamily: "'Inter', sans-serif",
                  transition: 'all 0.15s',
                }}
              >
                <LuSend size={16} />
                {sending ? 'Sending...' : `Send Notification${selectedIds.size > 0 ? ` (${selectedIds.size} recipients)` : ''}`}
              </button>
            </form>
          </div>
        </div>

        {/* ── RIGHT: Recent Notifications ── */}
        <div>
          <div className={s.card} style={{ marginBottom: 16 }}>
            <h3 className={s.cardTitle}>
              <span className={s.cardTitleIcon}><LuBell /></span>
              Recent Notifications
              <button type="button" onClick={loadAll}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9C8E7C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: "'Inter', sans-serif" }}>
                <LuRefreshCw size={13} /> Refresh
              </button>
            </h3>

            {loading ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: '#9C8E7C', fontSize: 13 }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: '#9C8E7C', fontSize: 13 }}>
                No notifications sent yet. Compose your first one.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {notifications.slice(0, 15).map((n) => {
                  const meta = TYPE_META[n.type] || TYPE_META.general;
                  const isSelected = selectedNotif === n._id;
                  return (
                    <div key={n._id}>
                      <div
                        onClick={() => handleViewDetail(n._id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                          borderRadius: 10, cursor: 'pointer',
                          background: isSelected ? 'rgba(249,115,22,0.06)' : 'transparent',
                          border: `1px solid ${isSelected ? 'rgba(249,115,22,0.2)' : 'transparent'}`,
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#F8F4EC'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ color: meta.color, flexShrink: 0 }}>{meta.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12.5, color: '#2D1406', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {n.title}
                          </div>
                          <div style={{ fontSize: 11, color: '#9C8E7C', display: 'flex', gap: 6 }}>
                            <span>{n.recipientCount || 0} recipients</span>
                            <span>·</span>
                            <span>{relativeTime(n.createdAt)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 12,
                            background: n.readCount > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(156,142,124,0.1)',
                            color: n.readCount > 0 ? '#10B981' : '#9C8E7C',
                          }}>
                            {n.readCount || 0}/{n.recipientCount || 0} read
                          </span>
                          <LuChevronDown size={12} style={{ color: '#9C8E7C', transform: isSelected ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isSelected && selectedNotifDetail && (
                        <div style={{
                          margin: '6px 0 6px 28px', padding: '12px 14px',
                          background: '#FDFBF7', borderRadius: 10, border: '1px solid #E7D7BE',
                          fontSize: 13,
                        }}>
                          <div style={{ fontWeight: 600, color: '#2D1406', marginBottom: 4 }}>{selectedNotifDetail.notification?.title}</div>
                          <p style={{ color: '#6B5E4E', margin: '0 0 8px', fontSize: 12.5 }}>{selectedNotifDetail.notification?.message}</p>

                          {selectedNotifDetail.stats && (
                            <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                              <div style={{ textAlign: 'center', flex: 1, background: '#F8F4EC', borderRadius: 8, padding: '6px 8px' }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#2D1406' }}>{selectedNotifDetail.stats.total}</div>
                                <div style={{ fontSize: 10, color: '#9C8E7C' }}>Total</div>
                              </div>
                              <div style={{ textAlign: 'center', flex: 1, background: 'rgba(16,185,129,0.08)', borderRadius: 8, padding: '6px 8px' }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#10B981' }}>{selectedNotifDetail.stats.read}</div>
                                <div style={{ fontSize: 10, color: '#9C8E7C' }}>Read</div>
                              </div>
                              <div style={{ textAlign: 'center', flex: 1, background: 'rgba(220,38,38,0.06)', borderRadius: 8, padding: '6px 8px' }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#DC2626' }}>{selectedNotifDetail.stats.unread}</div>
                                <div style={{ fontSize: 10, color: '#9C8E7C' }}>Unread</div>
                              </div>
                              <div style={{ textAlign: 'center', flex: 1, background: 'rgba(249,115,22,0.08)', borderRadius: 8, padding: '6px 8px' }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#F97316' }}>{selectedNotifDetail.stats.readPercent}%</div>
                                <div style={{ fontSize: 10, color: '#9C8E7C' }}>Read rate</div>
                              </div>
                            </div>
                          )}

                          {selectedNotifDetail.recipients?.length > 0 && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#9C8E7C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                                Recipients
                              </div>
                              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                {selectedNotifDetail.recipients.map((r) => (
                                  <div key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #F0EBE3' }}>
                                    <div style={{
                                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                      background: 'linear-gradient(135deg, #2E7D5B, #81B29A)', color: '#fff',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 9, fontWeight: 700,
                                    }}>
                                      {r.student?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                                    </div>
                                    <div style={{ flex: 1, fontSize: 12, color: '#2D1406' }}>{r.student?.name || 'Unknown'}</div>
                                    <div style={{ fontSize: 10, color: '#9C8E7C' }}>{r.student?.email || ''}</div>
                                    <span style={{
                                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                      background: r.isRead ? '#10B981' : '#DC2626',
                                    }} />
                                    <span style={{ fontSize: 10, color: '#9C8E7C' }}>
                                      {r.isRead ? 'Read' : 'Unread'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
