import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import s from './YogaAdmin.module.css';
import Badge from './Badge';
import { Avatar } from './ui/Primitives';
import {
  getStudentDetail, updateStudent, deleteStudent,
  createPayment,
} from '../api/AdminServices.js';
import RenewPlanModal from './RenewPlanModal';
import UpgradePlanModal from './UpgradePlanModal';
import {
  LuX, LuUser, LuMail, LuPhone, LuMapPin, LuCalendar, LuDumbbell,
  LuActivity, LuCreditCard, LuClock, LuBookOpen, LuStickyNote,
  LuTrendingUp, LuTrendingDown, LuAward, LuPercent, LuUsers,
  LuChevronRight, LuPen, LuRefreshCw, LuCheck, LuCircleAlert, LuArrowUp,
  LuTrash2, LuSend, LuPlus, LuDownload, LuBadgeCheck, LuChartBar,
  LuZap, LuTarget, LuList, LuChevronDown, LuCalendarCheck, LuPlay,
  LuSearch, LuFilter, LuIndianRupee, LuFileText, LuLayers,
} from 'react-icons/lu';

/* ─── Design tokens ─────────────────────────────────────── */
const C = {
  cream: '#F8F4EC', card: '#FFFFFF', border: '#E7D7BE',
  primary: '#2E7D5B', primaryLight: '#81B29A',
  primaryBg: 'rgba(46,125,91,0.10)', primaryShadow: 'rgba(46,125,91,0.25)',
  dark: '#2D1406', text2: '#6B5E4E', text3: '#9C8E7C',
  green: '#16A34A', greenBg: 'rgba(22,163,74,0.10)',
  amber: '#D97706', amberBg: 'rgba(217,119,6,0.10)',
  blue: '#2563EB', blueBg: 'rgba(37,99,235,0.10)',
  red: '#DC2626', redBg: 'rgba(220,38,38,0.10)',
};

/* ─── Style helpers ─────────────────────────────────────── */
const row = { display: 'flex', alignItems: 'center', gap: 8 };
const flexCenter = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const cardSt = {
  background: C.card, borderRadius: 20, border: `1px solid ${C.border}`,
  padding: 24,
};
const iconBox = (bg = C.primaryBg) => ({
  width: 40, height: 40, borderRadius: 12, ...flexCenter, fontSize: 18, background: bg, flexShrink: 0,
});

/* ─── Drawer Shell ──────────────────────────────────────── */
function WorkspaceDrawer({ open, onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) { document.addEventListener('keydown', handler); document.body.style.overflow = 'hidden'; }
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', justifyContent: 'flex-end',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            style={{
              position: 'relative', width: 1020, maxWidth: '100vw', height: '100vh',
              background: C.cream, display: 'flex', flexDirection: 'column',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
            }}
          >
            <div style={{ flex: 1, overflow: 'hidden auto' }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ─── Overview Card ─────────────────────────────────────── */
function OverviewCard({ icon, value, label, trend, trendUp, color = C.primary }) {
  return (
    <div style={{
      ...cardSt, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16,
      transition: 'transform .15s, box-shadow .15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={iconBox(`${color}1A`)}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.dark, lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 12, color: C.text2, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      </div>
      {trend !== undefined && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ ...row, gap: 4, justifyContent: 'flex-end', color: trendUp ? C.green : C.red, fontSize: 13, fontWeight: 600 }}>
            {trendUp ? <LuTrendingUp size={14} /> : <LuTrendingDown size={14} />}
            {trend}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Section Card (for tab content) ────────────────────── */
function SectionCard({ icon, title, children, style: extraStyle }) {
  return (
    <div style={{ ...cardSt, marginBottom: 16, ...extraStyle }}>
      {title && (
        <div style={{ ...row, marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
          <div style={iconBox(C.primaryBg)}>{icon}</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{title}</div>
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Info Row (label + value pair) ─────────────────────── */
function InfoRow({ icon, label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
      borderBottom: '1px solid rgba(231,215,190,0.4)',
    }}>
      <div style={{ width: 18, color: C.primary, flexShrink: 0, ...flexCenter }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: C.dark, fontWeight: 500 }}>{value || '—'}</div>
      </div>
    </div>
  );
}

/* ─── Timeline Item ─────────────────────────────────────── */
function TimelineItem({ icon, time, title, meta, color = C.primary }) {
  return (
    <div style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: '1px solid rgba(231,215,190,0.3)' }}>
      <div style={{
        ...iconBox(`${color}1A`), width: 36, height: 36, fontSize: 15,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.dark }}>{title}</div>
        {meta && <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{meta}</div>}
      </div>
      {time && <div style={{ fontSize: 11, color: C.text3, whiteSpace: 'nowrap', flexShrink: 0 }}>{time}</div>}
    </div>
  );
}

/* ─── Mini Bar Chart ────────────────────────────────────── */
function MiniBar({ data = [], height = 80, color = C.primary }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1, background: color, borderRadius: '4px 4px 0 0',
          height: `${(v / max) * 100}%`, opacity: 0.7 + (i / data.length) * 0.3,
          transition: 'height .3s',
        }} />
      ))}
    </div>
  );
}

/* ─── Tab Button ────────────────────────────────────────── */
function TabBtn({ label, icon, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      ...row, gap: 6, padding: '10px 16px', border: 'none', borderRadius: 10,
      cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500,
      color: active ? C.primary : C.text2, background: active ? C.primaryBg : 'transparent',
      transition: 'all .15s', whiteSpace: 'nowrap',
    }}>
      {icon}
      {label}
    </button>
  );
}

/* ─── Form Input (styled for inline editing) ────────────── */
function FormInput({ label, value, onChange, type = 'text', placeholder, multiline }) {
  const shared = {
    width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px',
    fontSize: 13.5, color: C.dark, background: C.card, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color .15s',
    fontFamily: 'inherit',
  };
  return (
    <div>
      {label && <div style={{ fontSize: 11, color: C.text3, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>}
      {multiline ? (
        <textarea
          style={{ ...shared, resize: 'vertical', minHeight: 80 }}
          value={value} onChange={onChange} placeholder={placeholder}
          onFocus={e => e.target.style.borderColor = C.primary}
          onBlur={e => e.target.style.borderColor = C.border}
        />
      ) : (
        <input
          type={type} style={shared}
          value={value} onChange={onChange} placeholder={placeholder}
          onFocus={e => e.target.style.borderColor = C.primary}
          onBlur={e => e.target.style.borderColor = C.border}
        />
      )}
    </div>
  );
}

/* ─── Primary Button ────────────────────────────────────── */
function PrimaryBtn({ children, onClick, small, icon, disabled, danger }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      ...row, gap: 6, padding: small ? '8px 16px' : '11px 22px',
      border: 'none', borderRadius: 10, cursor: disabled ? 'default' : 'pointer',
      fontSize: small ? 12.5 : 13.5, fontWeight: 600,
      color: '#fff',
      background: danger
        ? C.red
        : `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
      boxShadow: disabled ? 'none' : danger ? 'none' : `0 4px 14px ${C.primaryShadow}`,
      opacity: disabled ? 0.5 : 1,
      transition: 'all .15s', whiteSpace: 'nowrap',
      fontFamily: 'inherit',
    }}>
      {icon}{children}
    </button>
  );
}

/* ─── Ghost Button ──────────────────────────────────────── */
function GhostBtn({ children, onClick, icon, small, danger }) {
  return (
    <button type="button" onClick={onClick} style={{
      ...row, gap: 6, padding: small ? '8px 16px' : '11px 22px',
      border: `1px solid ${danger ? C.red : C.border}`, borderRadius: 10,
      cursor: 'pointer', fontSize: small ? 12.5 : 13.5, fontWeight: 500,
      color: danger ? C.red : C.text2, background: C.card,
      transition: 'all .15s', whiteSpace: 'nowrap', fontFamily: 'inherit',
    }}>
      {icon}{children}
    </button>
  );
}

/* ─── Feedback banner ───────────────────────────────────── */
function FeedbackBanner({ message, type, onDismiss }) {
  if (!message) return null;
  const isErr = type === 'error';
  return (
    <div style={{
      padding: '12px 18px', borderRadius: 12, marginBottom: 16, ...row,
      background: isErr ? C.redBg : C.greenBg,
      color: isErr ? C.red : C.green,
      fontSize: 13, fontWeight: 500,
    }}>
      {isErr ? <LuCircleAlert size={18} /> : <LuCheck size={18} />}
      <span style={{ flex: 1 }}>{message}</span>
      <button type="button" onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 4 }}>
        <LuX size={16} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function StudentProfileWorkspace({ student, onClose, onRefresh }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [saving, setSaving] = useState(false);

  /* Notes state for the Notes tab */
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);

  /* Edit mode for inline editing on Profile tab */
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  /* Payment modal */
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', label: '', method: 'UPI', status: 'paid' });

  /* Premium Renew & Upgrade modals */
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const loadAll = useCallback(async () => {
    if (!student?._id) return;
    setLoading(true);
    setError(null);
    try {
      const det = await getStudentDetail(student._id);
      setDetail(det);
      if (det?.student?.notes) setNotes(det.student.notes);
    } catch (err) {
      setError(err.message || 'Failed to load student details');
    } finally {
      setLoading(false);
    }
  }, [student?._id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const closeFeedback = () => setFeedback({ message: '', type: '' });
  const flash = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(closeFeedback, 4000);
  };

  /* All data comes from the API response – never fall back to table row data */
  const sDetail = detail?.student;
  const membership = detail?.membership || null;
  const payments = detail?.payments || [];
  const attendance = detail?.attendanceRecords || [];
  const studentClasses = detail?.classSessions || [];
  const activityLogs = detail?.activityLogs || [];

  /* ─── Computed values ────────────────────────────────── */
  const presentCount = attendance.filter(a => a.status === 'present' || a.status === 'zoom').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const attendancePct = attendance.length
    ? Math.round((presentCount / attendance.length) * 100)
    : (sDetail?.stats?.attendancePct || 0);

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const pendingAmount = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);

  const daysLeft = membership?.daysLeft ?? (membership?.expiryDate
    ? Math.max(0, Math.ceil((new Date(membership.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : null);

  /* Monthly attendance labels + values from real attendance records */
  const monthlyLabels = [];
  const monthlyValues = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = m.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    monthlyLabels.push(label);
    monthlyValues.push(attendance.filter(a => {
      const d = new Date(a.date);
      return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
    }).length);
  }

  const upcomingClasses = studentClasses.filter(cs => cs.status === 'upcoming').slice(0, 5);
  const completedClasses = studentClasses.filter(cs => cs.status === 'completed').slice(0, 10);

  /* ─── Handlers ───────────────────────────────────────── */
  const handleDelete = async () => {
    if (!window.confirm(`Remove ${sDetail.name} from the system? This cannot be undone.`)) return;
    try {
      await deleteStudent(student._id);
      flash('Student deleted successfully');
      onRefresh?.();
      setTimeout(onClose, 800);
    } catch (err) {
      flash(err.message || 'Failed to delete', 'error');
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await updateStudent(student._id, editForm);
      flash('Profile updated successfully');
      setEditing(false);
      loadAll();
    } catch (err) {
      flash(err.message || 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await updateStudent(student._id, { notes });
      flash('Notes saved');
      setNotesDirty(false);
    } catch (err) {
      flash(err.message || 'Failed to save notes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      flash('Enter a valid amount', 'error'); return;
    }
    setSaving(true);
    try {
      await createPayment({
        user: student._id, label: paymentForm.label || 'Membership Payment',
        amount: Number(paymentForm.amount), method: paymentForm.method,
        status: paymentForm.status, date: new Date().toISOString(),
      });
      flash('Payment recorded successfully');
      setShowPaymentForm(false);
      setPaymentForm({ amount: '', label: '', method: 'UPI', status: 'paid' });
      loadAll();
    } catch (err) {
      flash(err.message || 'Failed to record payment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    setEditForm({
      name: sDetail.name || '', email: sDetail.email || '',
      phone: sDetail.phone || '', city: sDetail.city || '',
      style: sDetail.style || '', level: sDetail.level || '',
      gender: sDetail.gender || '', dateOfBirth: sDetail.dateOfBirth ? sDetail.dateOfBirth.slice(0, 10) : '',
      emergencyContact: sDetail.emergencyContact || '',
    });
    setEditing(true);
  };

  /* ─── Loading / Error states ─────────────────────────── */
  if (loading && !detail) {
    return (
      <WorkspaceDrawer open={true} onClose={onClose}>
        <div style={{ padding: 40, ...flexCenter, flexDirection: 'column', gap: 16, minHeight: 300 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.primary, animation: 'spin 0.8s linear infinite' }} />
          <div style={{ color: C.text2, fontSize: 14 }}>Loading student profile…</div>
        </div>
      </WorkspaceDrawer>
    );
  }

  if (error && !detail) {
    return (
      <WorkspaceDrawer open={true} onClose={onClose}>
        <div style={{ padding: 40, ...flexCenter, flexDirection: 'column', gap: 16, minHeight: 300 }}>
          <LuCircleAlert size={40} color={C.red} />
          <div style={{ color: C.red, fontSize: 14, textAlign: 'center' }}>{error}</div>
          <PrimaryBtn onClick={loadAll} icon={<LuRefreshCw />}>Retry</PrimaryBtn>
        </div>
      </WorkspaceDrawer>
    );
  }

  /* ─── Render tabs ────────────────────────────────────── */
  const tabs = [
    { key: 'profile',    icon: <LuUser size={15} />,        label: 'Profile' },
    { key: 'membership', icon: <LuAward size={15} />,       label: 'Membership' },
    { key: 'services',   icon: <LuLayers size={15} />,      label: 'Services' },
    { key: 'attendance', icon: <LuChartBar size={15} />,   label: 'Attendance' },
    { key: 'payments',   icon: <LuIndianRupee size={15} />, label: 'Payments' },
    { key: 'classes',    icon: <LuBookOpen size={15} />,    label: 'Classes' },
    { key: 'notes',      icon: <LuStickyNote size={15} />,  label: 'Notes' },
    { key: 'activity',   icon: <LuActivity size={15} />,    label: 'Activity' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfileTab();
      case 'membership': return renderMembershipTab();
      case 'services': return renderServicesTab();
      case 'attendance': return renderAttendanceTab();
      case 'payments': return renderPaymentsTab();
      case 'classes': return renderClassesTab();
      case 'notes': return renderNotesTab();
      case 'activity': return renderActivityTab();
      default: return null;
    }
  };

  /* ─── PROFILE TAB ────────────────────────────────────── */
  const renderProfileTab = () => {
    if (editing) {
      return (
        <div>
          <FeedbackBanner message={feedback.message} type={feedback.type} onDismiss={closeFeedback} />
          <SectionCard icon={<LuUser size={18} />} title="Personal Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormInput label="Full Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              <FormInput label="Email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
              <FormInput label="Phone" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
              <FormInput label="Gender" value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })} />
              <FormInput label="Date of Birth" type="date" value={editForm.dateOfBirth} onChange={e => setEditForm({ ...editForm, dateOfBirth: e.target.value })} />
              <FormInput label="City" value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} />
              <FormInput label="Yoga Style" value={editForm.style} onChange={e => setEditForm({ ...editForm, style: e.target.value })} />
              <FormInput label="Level" value={editForm.level} onChange={e => setEditForm({ ...editForm, level: e.target.value })} />
            </div>
          </SectionCard>
          <SectionCard icon={<LuPhone size={18} />} title="Emergency Contact">
            <FormInput label="Emergency Contact" value={editForm.emergencyContact} onChange={e => setEditForm({ ...editForm, emergencyContact: e.target.value })} />
          </SectionCard>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <GhostBtn onClick={() => setEditing(false)}>Cancel</GhostBtn>
            <PrimaryBtn onClick={handleSaveEdit} icon={<LuCheck size={16} />} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </PrimaryBtn>
          </div>
        </div>
      );
    }

    return (
      <div>
        <SectionCard icon={<LuUser size={18} />} title="Personal Information">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            <InfoRow icon={<LuUser size={14} />} label="Full Name" value={sDetail.name} />
            <InfoRow icon={<LuCalendar size={14} />} label="Date of Birth" value={sDetail.dateOfBirth ? new Date(sDetail.dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'} />
            <InfoRow icon={<LuActivity size={14} />} label="Gender" value={sDetail.gender || '—'} />
            <InfoRow icon={<LuCalendar size={14} />} label="Joined" value={sDetail.createdAt ? new Date(sDetail.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'} />
            <InfoRow icon={<LuActivity size={14} />} label="Status" value={sDetail.status || 'active'} />
            <InfoRow icon={<LuMapPin size={14} />} label="City" value={sDetail.city || '—'} />
          </div>
        </SectionCard>

        <SectionCard icon={<LuMail size={18} />} title="Contact & Emergency">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            <InfoRow icon={<LuMail size={14} />} label="Email" value={sDetail.email} />
            <InfoRow icon={<LuPhone size={14} />} label="Phone" value={sDetail.phone || '—'} />
            <InfoRow icon={<LuPhone size={14} />} label="Emergency Contact" value={sDetail.emergencyContact || '—'} />
          </div>
        </SectionCard>

        <SectionCard icon={<LuDumbbell size={18} />} title="Yoga Information">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            <InfoRow icon={<LuTarget size={14} />} label="Style" value={sDetail.style || 'Hatha'} />
            <InfoRow icon={<LuZap size={14} />} label="Level" value={sDetail.level || 'Beginner'} />
            <InfoRow icon={<LuChartBar size={14} />} label="Classes Attended" value={String(presentCount)} />
            <InfoRow icon={<LuAward size={14} />} label="Badges" value={Array.isArray(sDetail.badges) && sDetail.badges.length ? sDetail.badges.join(', ') : 'None'} />
          </div>
        </SectionCard>
      </div>
    );
  };

  /* ─── MEMBERSHIP TAB ─────────────────────────────────── */
  const renderMembershipTab = () => (
    <div>
      <SectionCard icon={<LuAward size={18} />} title="Current Plan">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          <InfoRow icon={<LuAward size={14} />} label="Plan Type" value={membership?.planType || 'Not Assigned'} />
          <InfoRow icon={<LuActivity size={14} />} label="Status" value={
            <Badge label={membership?.computedStatus || membership?.status || 'None'} />
          } />
          <InfoRow icon={<LuCalendar size={14} />} label="Start Date" value={membership?.startDate ? new Date(membership.startDate).toLocaleDateString('en-IN') : '—'} />
          <InfoRow icon={<LuCalendar size={14} />} label="Expiry Date" value={membership?.expiryDate ? new Date(membership.expiryDate).toLocaleDateString('en-IN') : '—'} />
          <InfoRow icon={<LuClock size={14} />} label="Remaining Days" value={daysLeft !== null ? String(daysLeft) : '—'} />
          <InfoRow icon={<LuIndianRupee size={14} />} label="Price" value={membership?.price ? `₹${membership.price.toLocaleString('en-IN')}` : '—'} />
        </div>
      </SectionCard>
      {membership?.isPaused && (
        <SectionCard icon={<LuClock size={18} />} title="Pause Information" tone="amber">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            <InfoRow icon={<LuCalendar size={14} />} label="Pause Started" value={membership.pauseStartedAt ? new Date(membership.pauseStartedAt).toLocaleDateString('en-IN') : '—'} />
            <InfoRow icon={<LuClock size={14} />} label="Current Duration" value={`${membership.currentPauseDuration || 0} day(s)`} />
            <InfoRow icon={<LuCalendar size={14} />} label="Expected Auto-Resume" value={membership.expectedResumeDate ? new Date(membership.expectedResumeDate).toLocaleDateString('en-IN') : '—'} />
            <InfoRow icon={<LuCalendar size={14} />} label="Updated Expiry" value={membership.expiryDate ? new Date(membership.expiryDate).toLocaleDateString('en-IN') : '—'} />
            <InfoRow icon={<LuClock size={14} />} label="Pause Days Used" value={String(membership.pauseDaysUsed || 0)} />
            <InfoRow icon={<LuClock size={14} />} label="Remaining Pause Days" value={String(membership.remainingPauseDays || 0)} />
          </div>
          {Array.isArray(membership.pauseHistory) && membership.pauseHistory.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border-light)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 8 }}>Pause History</div>
              {membership.pauseHistory.map((ph, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 0', fontSize: 12, borderBottom: '1px solid rgba(231,215,190,0.2)' }}>
                  <span style={{ color: 'var(--color-text-muted)', minWidth: 80 }}>
                    {ph.pauseStartedAt ? new Date(ph.pauseStartedAt).toLocaleDateString('en-IN') : '—'}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                  <span style={{ color: 'var(--color-text-muted)', minWidth: 80 }}>
                    {ph.pauseEndedAt ? new Date(ph.pauseEndedAt).toLocaleDateString('en-IN') : 'Ongoing'}
                  </span>
                  <span style={{ color: '#D97706', fontWeight: 700 }}>{ph.daysCounted || 0}d</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {Array.isArray(membership?.benefits) && membership.benefits.length > 0 && (
        <SectionCard icon={<LuList size={18} />} title="Benefits">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {membership.benefits.map((b, i) => (
              <div key={i} style={{ ...row, gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(231,215,190,0.3)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.primary }} />
                <span style={{ fontSize: 13.5, color: C.dark }}>{b}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {Array.isArray(membership?.history) && membership.history.length > 0 && (
        <SectionCard icon={<LuClock size={18} />} title="Membership History">
          {membership.history.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(231,215,190,0.3)' }}>
              <div style={{ fontSize: 12, color: C.text3, flexShrink: 0, minWidth: 80 }}>
                {h.at ? new Date(h.at).toLocaleDateString('en-IN') : '—'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, textTransform: 'capitalize' }}>{h.action || 'Updated'}</div>
                {h.note && <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{h.note}</div>}
              </div>
            </div>
          ))}
        </SectionCard>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <PrimaryBtn onClick={() => setShowRenewModal(true)} icon={<LuRefreshCw size={16} />}>
          Renew Plan
        </PrimaryBtn>
        <PrimaryBtn onClick={() => setShowUpgradeModal(true)} icon={<LuArrowUp size={16} />}>
          Upgrade Plan
        </PrimaryBtn>
      </div>
    </div>
  );

  /* ─── SERVICES TAB ───────────────────────────────────── */
  const renderServicesTab = () => {
    const servicesList = detail?.services || [];
    return (
      <div>
        {servicesList.length === 0 ? (
          <SectionCard icon={<LuLayers size={18} />} title="Active Services">
            <div style={{ color: C.text3, fontSize: 13, padding: '12px 0', textAlign: 'center' }}>No services enrolled yet.</div>
          </SectionCard>
        ) : (
          servicesList.map((svc) => {
            const isActive = svc.isActive;
            const daysLeft = svc.daysLeft;
            const sessionPct = svc.totalSessions > 0 ? Math.round((svc.usedSessions / svc.totalSessions) * 100) : 0;
            return (
              <SectionCard key={svc._id} icon={<LuLayers size={18} />} title={svc.serviceName || 'Service'}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <InfoRow icon={<LuAward size={14} />} label="Status" value={
                    <Badge label={svc.status} />
                  } />
                  <InfoRow icon={<LuCreditCard size={14} />} label="Payment" value={
                    <Badge label={svc.paymentStatus} />
                  } />
                  {svc.instructorName && (
                    <InfoRow icon={<LuUser size={14} />} label="Instructor" value={svc.instructorName} />
                  )}
                  {svc.category && (
                    <InfoRow icon={<LuList size={14} />} label="Category" value={svc.category} />
                  )}
                  {svc.mode && (
                    <InfoRow icon={<LuDumbbell size={14} />} label="Mode" value={svc.mode} />
                  )}
                  <InfoRow icon={<LuClock size={14} />} label="Sessions" value={`${svc.usedSessions || 0} / ${svc.totalSessions || 0} (${sessionPct}%)`} />
                  <InfoRow icon={<LuCalendar size={14} />} label="Purchase Date" value={svc.purchaseDate ? new Date(svc.purchaseDate).toLocaleDateString('en-IN') : '—'} />
                  <InfoRow icon={<LuCalendar size={14} />} label="Activation" value={svc.activationDate ? new Date(svc.activationDate).toLocaleDateString('en-IN') : '—'} />
                  <InfoRow icon={<LuCalendar size={14} />} label="Expiry" value={svc.expiryDate ? new Date(svc.expiryDate).toLocaleDateString('en-IN') : '—'} />
                  <InfoRow icon={<LuClock size={14} />} label="Days Left" value={daysLeft != null ? String(daysLeft) : '—'} />
                  {svc.payment?.amount != null && (
                    <InfoRow icon={<LuIndianRupee size={14} />} label="Price" value={`₹${(svc.payment.amount || svc.price || 0).toLocaleString('en-IN')}`} />
                  )}
                  {svc.payment?.invoiceNo && (
                    <InfoRow icon={<LuFileText size={14} />} label="Invoice" value={svc.payment.invoiceNo} />
                  )}
                  {svc.transactionId && (
                    <InfoRow icon={<LuFileText size={14} />} label="Transaction" value={svc.transactionId} />
                  )}
                </div>
                {Array.isArray(svc.history) && svc.history.length > 0 && (
                  <>
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>History</div>
                    {svc.history.map((h, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(231,215,190,0.3)' }}>
                        <div style={{ fontSize: 12, color: C.text3, flexShrink: 0, minWidth: 80, textTransform: 'capitalize' }}>
                          {h.at ? new Date(h.at).toLocaleDateString('en-IN') : '—'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, textTransform: 'capitalize' }}>{h.action}</div>
                          {h.note && <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{h.note}</div>}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </SectionCard>
            );
          })
        )}
      </div>
    );
  };

  /* ─── ATTENDANCE TAB ─────────────────────────────────── */
  const renderAttendanceTab = () => (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
          <div style={{ ...cardSt, padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: attendancePct >= 75 ? C.green : C.amber }}>{attendancePct}%</div>
            <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>Attendance Rate</div>
          </div>
          <div style={{ ...cardSt, padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.green }}>{presentCount}</div>
            <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>Present</div>
          </div>
          <div style={{ ...cardSt, padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.red }}>{absentCount}</div>
            <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>Missed</div>
          </div>
        </div>

        {monthlyValues.some(v => v > 0) && (
          <SectionCard icon={<LuChartBar size={18} />} title="Monthly Attendance">
            <div style={{ height: 100, paddingTop: 10 }}>
              <MiniBar data={monthlyValues} height={80} color={C.primary} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {monthlyLabels.map((lbl, i) => (
                <div key={i} style={{ fontSize: 10, color: C.text3, flex: 1, textAlign: 'center' }}>{lbl}</div>
              ))}
            </div>
          </SectionCard>
        )}

        <SectionCard icon={<LuList size={18} />} title="Recent Sessions">
          {attendance.slice(0, 15).length === 0 ? (
            <div style={{ color: C.text3, fontSize: 13, padding: '12px 0', textAlign: 'center' }}>No attendance records yet</div>
          ) : (
            attendance.slice(0, 15).map((a, i) => (
              <div key={a._id || i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(231,215,190,0.3)', alignItems: 'center' }}>
                <div style={{ fontSize: 14, color: a.status === 'absent' ? C.red : C.green }}>
                  {a.status === 'absent' ? <LuX size={16} /> : <LuCheck size={16} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, textTransform: 'capitalize' }}>{a.status}</div>
                  <div style={{ fontSize: 11.5, color: C.text2 }}>{a.classType || 'General'} · {a.mode || 'offline'}</div>
                  {a.entityType && a.entityType !== 'none' && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 3,
                      padding: '1px 7px', borderRadius: 4, fontSize: 9.5, fontWeight: 700,
                      background: a.entityType === 'service' ? 'rgba(22,163,74,0.12)'
                        : a.entityType === 'membership' ? 'rgba(46,125,91,0.12)'
                        : a.entityType === 'course' ? 'rgba(124,58,237,0.12)'
                        : a.entityType === 'trial' ? 'rgba(217,119,6,0.12)'
                        : 'rgba(124,106,88,0.12)',
                      color: a.entityType === 'service' ? '#16A34A'
                        : a.entityType === 'membership' ? '#2E7D5B'
                        : a.entityType === 'course' ? '#7C3AED'
                        : a.entityType === 'trial' ? '#D97706'
                        : '#7C6A58',
                    }}>
                      {a.entityType}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.text3 }}>
                  {a.date ? new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                </div>
              </div>
            ))
          )}
        </SectionCard>
      </div>
    );

  /* ─── PAYMENTS TAB ───────────────────────────────────── */
  const renderPaymentsTab = () => {
    if (showPaymentForm) {
      return (
        <div>
          <FeedbackBanner message={feedback.message} type={feedback.type} onDismiss={closeFeedback} />
          <SectionCard icon={<LuIndianRupee size={18} />} title="Record Payment">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormInput label="Amount (₹)" type="number" value={String(paymentForm.amount)} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
              <FormInput label="Label" value={paymentForm.label} onChange={e => setPaymentForm({ ...paymentForm, label: e.target.value })} placeholder="e.g. Monthly Pass" />
              <FormInput label="Method" value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })} />
              <FormInput label="Status" value={paymentForm.status} onChange={e => setPaymentForm({ ...paymentForm, status: e.target.value })} />
            </div>
          </SectionCard>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <GhostBtn onClick={() => setShowPaymentForm(false)}>Cancel</GhostBtn>
            <PrimaryBtn onClick={handleRecordPayment} disabled={saving}>{saving ? 'Recording…' : 'Save Payment'}</PrimaryBtn>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 16 }}>
          <div style={{ ...cardSt, padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.green }}>₹{totalPaid.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>Total Paid</div>
          </div>
          <div style={{ ...cardSt, padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: pendingAmount > 0 ? C.red : C.text3 }}>₹{pendingAmount.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>Pending</div>
          </div>
        </div>

        {payments.length === 0 ? (
          <SectionCard icon={<LuList size={18} />} title="Payment History">
            <div style={{ color: C.text3, fontSize: 13, padding: '12px 0', textAlign: 'center' }}>No payments recorded</div>
          </SectionCard>
        ) : (
          <SectionCard icon={<LuList size={18} />} title="Payment History">
            {payments.map((p, i) => (
              <div key={p._id || i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(231,215,190,0.3)', alignItems: 'center' }}>
                <div style={{
                  ...iconBox(p.status === 'paid' ? C.greenBg : p.status === 'pending' ? C.amberBg : C.redBg),
                  width: 38, height: 38, fontSize: 16,
                }}>
                  {p.status === 'paid' ? <LuCheck size={16} /> : p.status === 'pending' ? <LuClock size={16} /> : <LuX size={16} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: C.dark }}>{p.label || 'Payment'}</div>
                  <div style={{ fontSize: 11.5, color: C.text2, marginTop: 1 }}>
                    {p.method || '—'} · <Badge label={p.status} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>₹{(p.amount || 0).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>
                    {p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </div>
                </div>
              </div>
            ))}
          </SectionCard>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <PrimaryBtn onClick={() => setShowPaymentForm(true)} icon={<LuPlus size={16} />}>Record Payment</PrimaryBtn>
        </div>
      </div>
    );
  };

  /* ─── CLASSES TAB ─────────────────────────────────────── */
  const renderClassesTab = () => (
    <div>
      <SectionCard icon={<LuBookOpen size={18} />} title="Upcoming Sessions">
        {upcomingClasses.length === 0 ? (
          <div style={{ color: C.text3, fontSize: 13, padding: '12px 0', textAlign: 'center' }}>No upcoming classes</div>
        ) : (
          upcomingClasses.map((cs, i) => (
            <div key={cs._id || i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(231,215,190,0.3)', alignItems: 'center' }}>
              <div style={{ ...iconBox(C.blueBg), width: 38, height: 38, fontSize: 16, color: C.blue }}>
                <LuPlay size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.dark }}>{cs.name}</div>
                <div style={{ fontSize: 11.5, color: C.text2, marginTop: 1 }}>
                  {cs.time || cs.mode || ''} · {cs.trainer || '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {cs.zoomUrl && (
                  <a href={cs.zoomUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, fontSize: 12, textDecoration: 'none' }}>Join</a>
                )}
                <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                  {cs.date ? new Date(cs.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                </div>
              </div>
            </div>
          ))
        )}
      </SectionCard>

      <SectionCard icon={<LuCheck size={18} />} title="Completed Sessions">
        {completedClasses.length === 0 ? (
          <div style={{ color: C.text3, fontSize: 13, padding: '12px 0', textAlign: 'center' }}>No completed sessions</div>
        ) : (
          completedClasses.map((cs, i) => (
            <div key={cs._id || i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(231,215,190,0.3)', alignItems: 'center' }}>
              <div style={{ ...iconBox(C.greenBg), width: 34, height: 34, fontSize: 14, color: C.green }}>
                <LuCheck size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.dark }}>{cs.name}</div>
                <div style={{ fontSize: 11, color: C.text2 }}>{cs.trainer || '—'}</div>
              </div>
              <div style={{ fontSize: 11, color: C.text3 }}>
                {cs.date ? new Date(cs.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
              </div>
            </div>
          ))
        )}
      </SectionCard>
    </div>
  );

  /* ─── NOTES TAB ───────────────────────────────────────── */
  const renderNotesTab = () => (
    <div>
      <FeedbackBanner message={feedback.message} type={feedback.type} onDismiss={closeFeedback} />
      <SectionCard icon={<LuStickyNote size={18} />} title="Private Notes">
        <textarea
          style={{
            width: '100%', minHeight: 200, border: `1px solid ${notesDirty ? C.primary : C.border}`,
            borderRadius: 14, padding: 16, fontSize: 13.5, color: C.dark, background: C.card,
            resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6,
            boxSizing: 'border-box',
          }}
          value={notes}
          onChange={e => { setNotes(e.target.value); setNotesDirty(true); }}
          placeholder="Add private notes about this student…"
          onFocus={e => e.target.style.borderColor = C.primary}
          onBlur={e => e.target.style.borderColor = notesDirty ? C.primary : C.border}
        />
        <div style={{ fontSize: 11.5, color: C.text3, marginTop: 8 }}>
          These notes are private and only visible to admins. Saved to MongoDB via bio field.
        </div>
      </SectionCard>
      {notesDirty && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <PrimaryBtn onClick={handleSaveNotes} icon={<LuCheck size={16} />} disabled={saving}>
            {saving ? 'Saving…' : 'Save Notes'}
          </PrimaryBtn>
        </div>
      )}
    </div>
  );

  /* ─── ACTIVITY TAB ────────────────────────────────────── */
  const renderActivityTab = () => {
    const logEntries = activityLogs.map(log => {
      let icon = <LuActivity size={15} />;
      let color = C.blue;
      const a = log.action || '';
      if (a.includes('payment') || a.includes('Payment') || a.includes('₹')) {
        icon = <LuIndianRupee size={15} />; color = C.green;
      } else if (a.includes('membership') || a.includes('Membership') || a.includes('plan') || a.includes('Plan')) {
        icon = <LuBadgeCheck size={15} />; color = C.primary;
      } else if (a.includes('attend') || a.includes('Attend') || a.includes('present') || a.includes('absent') || a.includes('mark')) {
        icon = <LuCalendarCheck size={15} />; color = C.green;
      } else if (a.includes('delete') || a.includes('Delete') || a.includes('Remove') || a.includes('remove')) {
        icon = <LuTrash2 size={15} />; color = C.red;
      } else if (a.includes('edit') || a.includes('Edit') || a.includes('update') || a.includes('Update')) {
        icon = <LuPen size={15} />; color = C.amber;
      } else if (a.includes('create') || a.includes('Create') || a.includes('add') || a.includes('Add')) {
        icon = <LuUser size={15} />; color = C.blue;
      }
      return {
        icon,
        time: log.createdAt ? new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
        title: a.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        meta: log.meta ? JSON.stringify(log.meta).slice(0, 80) : '',
        color,
      };
    });

    // Also add synthetic entries from membership creation, payments, attendance
    if (membership?.createdAt) {
      logEntries.push({
        icon: <LuBadgeCheck size={15} />,
        time: new Date(membership.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        title: 'Membership Activated',
        meta: `${membership.planType || 'Plan'} · ${membership.planMonths || '?'} months`,
        color: C.primary,
      });
    }
    for (const p of payments.slice(0, 5)) {
      logEntries.push({
        icon: <LuIndianRupee size={15} />,
        time: p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        title: `Payment ${p.status === 'paid' ? 'Received' : 'Pending'} — ₹${(p.amount || 0).toLocaleString('en-IN')}`,
        meta: p.label || p.method || 'Payment',
        color: p.status === 'paid' ? C.green : C.amber,
      });
    }
    for (const a of attendance.slice(0, 5)) {
      logEntries.push({
        icon: <LuCalendarCheck size={15} />,
        time: new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        title: `Class ${a.status === 'present' ? 'Attended' : a.status === 'zoom' ? 'Attended (Zoom)' : 'Missed'}`,
        meta: a.classType || 'General Class',
        color: a.status === 'absent' ? C.red : C.green,
      });
    }
    if (sDetail?.createdAt) {
      logEntries.push({
        icon: <LuUser size={15} />,
        time: new Date(sDetail.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        title: 'Student Profile Created',
        meta: 'Account registered in the system',
        color: C.blue,
      });
    }

    logEntries.sort((a, b) => new Date(b.time) - new Date(a.time));

    return (
      <div>
        <SectionCard icon={<LuActivity size={18} />} title="Activity Timeline">
          {logEntries.length === 0 ? (
            <div style={{ color: C.text3, fontSize: 13, padding: '12px 0', textAlign: 'center' }}>No activity recorded yet</div>
          ) : (
            logEntries.map((entry, i) => (
              <TimelineItem key={i} {...entry} />
            ))
          )}
        </SectionCard>
      </div>
    );
  };

  /* ════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════ */
  return (
    <WorkspaceDrawer open={true} onClose={onClose}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ─── HEADER ────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.cream}, ${C.card})`,
        borderBottom: `1px solid ${C.border}`, padding: '28px 32px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Avatar name={sDetail.name} size={s.avatarLg} />
              <div style={{
                position: 'absolute', bottom: 0, right: 0, width: 16, height: 16,
                borderRadius: '50%', background: C.green, border: `3px solid ${C.card}`,
              }} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: C.dark, margin: 0, letterSpacing: '-0.02em' }}>
                {sDetail.name}
              </h2>
              <div style={{ ...row, gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: C.text2 }}>
                  {sDetail.style || 'Yoga'} · {sDetail.level || 'Beginner'}
                </span>
                <Badge label={membership?.status === 'active' || sDetail.planMonths > 0 ? 'Active Member' : 'Pending'} />
                <Badge label={sDetail.status || 'active'} />
              </div>
              <div style={{ fontSize: 12, color: C.text3, marginTop: 6 }}>
                Joined {sDetail.createdAt ? new Date(sDetail.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" onClick={onClose} style={{
              ...flexCenter, width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.card, cursor: 'pointer', color: C.text2, fontSize: 18,
            }}>
              <LuX size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── OVERVIEW CARDS ────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '20px 32px', paddingBottom: 0,
      }}>
        <OverviewCard
          icon={<LuAward size={18} />}
          value={membership?.planType || 'No Plan'}
          label={membership?.status === 'active' ? `Active · ${daysLeft !== null ? `${daysLeft} days left` : ''}` : 'Not assigned'}
          trend={daysLeft !== null ? String(daysLeft) : '—'}
          trendUp={daysLeft !== null && daysLeft > 30}
          color={C.primary}
        />
        <OverviewCard
          icon={<LuPercent size={18} />}
          value={`${attendancePct}%`}
          label="Attendance Rate"
          trend={`${attendance.length} sessions`}
          trendUp={attendancePct >= 75}
          color={C.blue}
        />
        <OverviewCard
          icon={<LuUsers size={18} />}
          value={String(presentCount)}
          label="Classes Attended"
          trend={attendance.length > 0 ? `${attendance.length} total` : '—'}
          trendUp={presentCount > 0}
          color={C.green}
        />
        <OverviewCard
          icon={<LuIndianRupee size={18} />}
          value={`₹${totalPaid.toLocaleString('en-IN')}`}
          label="Total Payments"
          trend={`${payments.length} payments`}
          trendUp={totalPaid > 0}
          color={C.green}
        />
        <OverviewCard
          icon={<LuClock size={18} />}
          value={`₹${pendingAmount.toLocaleString('en-IN')}`}
          label="Outstanding Payments"
          trend={pendingAmount > 0 ? 'Due' : 'Clear'}
          trendUp={pendingAmount === 0}
          color={pendingAmount > 0 ? C.amber : C.green}
        />
        <OverviewCard
          icon={<LuCalendarCheck size={18} />}
          value={upcomingClasses.length > 0 ? upcomingClasses[0].name : '—'}
          label={upcomingClasses.length > 0 ? `Next: ${new Date(upcomingClasses[0].date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'No upcoming'}
          trend={String(upcomingClasses.length)}
          trendUp={upcomingClasses.length > 0}
          color={C.blue}
        />
      </div>

      {/* ─── QUICK ACTIONS ─────────────────────────────── */}
      <div style={{
        padding: '16px 32px', display: 'flex', gap: 10, flexWrap: 'wrap',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <PrimaryBtn small onClick={startEditing} icon={<LuPen size={14} />}>Edit</PrimaryBtn>
        <PrimaryBtn small onClick={() => setShowRenewModal(true)} icon={<LuRefreshCw size={14} />}>Renew</PrimaryBtn>
        <PrimaryBtn small onClick={() => setShowUpgradeModal(true)} icon={<LuArrowUp size={14} />}>Upgrade</PrimaryBtn>
        <PrimaryBtn small onClick={() => { setShowPaymentForm(true); setActiveTab('payments'); }} icon={<LuPlus size={14} />}>Payment</PrimaryBtn>
        <GhostBtn small icon={<LuTrash2 size={14} />} danger onClick={handleDelete}>Delete</GhostBtn>
      </div>

      {/* ─── TABS ──────────────────────────────────────── */}
      <div style={{
        padding: '16px 32px', display: 'flex', gap: 4, overflowX: 'auto',
        borderBottom: `1px solid ${C.border}`, background: C.card, position: 'sticky', top: 0, zIndex: 9,
      }}>
        {tabs.map(t => (
          <TabBtn key={t.key} label={t.label} icon={t.icon} active={activeTab === t.key} onClick={() => setActiveTab(t.key)} />
        ))}
      </div>

      {/* ─── TAB CONTENT ───────────────────────────────── */}
      <div style={{ padding: '20px 32px', paddingBottom: 40 }}>
        {renderTabContent()}
      </div>

      {showRenewModal && (
        <RenewPlanModal
          student={sDetail}
          membership={membership}
          onClose={() => setShowRenewModal(false)}
          onSuccess={() => { loadAll(); onRefresh?.(); }}
        />
      )}
      {showUpgradeModal && (
        <UpgradePlanModal
          student={sDetail}
          membership={membership}
          onClose={() => setShowUpgradeModal(false)}
          onSuccess={() => { loadAll(); onRefresh?.(); }}
        />
      )}
    </WorkspaceDrawer>
  );
}
