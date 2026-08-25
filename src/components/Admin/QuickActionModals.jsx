import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import s from './YogaAdmin.module.css';
import {
  createStudent, createLead, createBatch, createPayment,
  getStudents,
} from '../api/AdminServices.js';
import {
  LuX, LuUserPlus, LuRadioTower, LuFilter, LuCreditCard,
  LuLoader, LuCheck, LuTriangleAlert, LuUser, LuMail, LuPhone,
  LuMapPin, LuCalendar, LuHeart, LuUsers, LuBookOpen,
  LuActivity, LuClock, LuVideo, LuTag, LuIndianRupee, LuWallet,
  LuFileText, LuStickyNote, LuTarget, LuZap, LuTrendingUp,
  LuGlobe, LuDollarSign, LuReceipt,
} from 'react-icons/lu';

/* ── Design system constants ────────────────────────────── */
const CARD = {
  background: '#ffffff',
  borderRadius: '20px',
  border: '1px solid var(--color-border-light, rgba(45,20,6,0.05))',
  padding: '24px',
  boxShadow: '0 1px 2px rgba(45,20,6,0.04), 0 2px 10px rgba(45,20,6,0.05)',
};

const FIELD = {
  display: 'flex', alignItems: 'center', gap: '13px',
  padding: '14px 16px',
  borderRadius: '14px',
  background: 'var(--color-bg-tertiary, #FFF9F0)',
  border: '1px solid var(--color-border-light, rgba(45,20,6,0.05))',
};

const ICON_BOX = {
  width: '38px', height: '38px', flexShrink: 0,
  borderRadius: '10px',
  background: 'rgba(46,125,91,0.10)',
  color: '#2E7D5B',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '18px',
};

const INPUT = {
  width: '100%', padding: '10px 12px',
  border: '1.5px solid var(--color-border, rgba(45,20,6,0.08))',
  borderRadius: '10px',
  background: '#ffffff',
  fontSize: '14px', fontWeight: 500,
  color: '#2D1406',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  fontFamily: 'var(--font-body, Inter, sans-serif)',
};

const BTN_PRIMARY = {
  display: 'inline-flex', alignItems: 'center', gap: '8px',
  padding: '12px 24px',
  borderRadius: '10px',
  border: 'none',
  background: 'linear-gradient(135deg, #2E7D5B, #81B29A)',
  color: '#fff',
  fontFamily: 'var(--font-heading, Outfit, sans-serif)',
  fontSize: '14px', fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 6px 18px rgba(46,125,91,0.32), inset 0 1px 0 rgba(255,255,255,0.6)',
  transition: 'transform 0.15s, filter 0.15s',
};

const BTN_GHOST = {
  display: 'inline-flex', alignItems: 'center', gap: '8px',
  padding: '12px 24px',
  borderRadius: '10px',
  border: '1.5px solid var(--color-border, rgba(45,20,6,0.08))',
  background: '#ffffff',
  color: '#7C6A58',
  fontFamily: 'var(--font-heading, Outfit, sans-serif)',
  fontSize: '14px', fontWeight: 600,
  cursor: 'pointer',
  transition: 'border-color 0.15s, color 0.15s, background 0.15s',
};

/* ── Premium Drawer Shell ───────────────────────────────── */
function QuickDrawer({ open, onClose, title, icon, subtitle, children }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          key="quick-drawer-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(45,20,6,0.5)', backdropFilter: 'blur(3px)',
            display: 'flex', justifyContent: 'flex-end',
          }}
        >
          <motion.div
            key="quick-drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '780px', maxWidth: '100vw', height: '100%',
              background: '#ffffff',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '-8px 0 32px rgba(45,20,6,0.10)',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '20px 28px',
              borderBottom: '1px solid rgba(45,20,6,0.06)',
              flexShrink: 0,
            }}>
              <span style={ICON_BOX}>{icon}</span>
              <div style={{ flex: 1 }}>
                <h2 style={{
                  fontFamily: 'var(--font-heading, Outfit, sans-serif)',
                  fontSize: '17px', fontWeight: 700, margin: 0,
                  color: '#2D1406', letterSpacing: '-0.02em',
                }}>{title}</h2>
                {subtitle && (
                  <p style={{
                    fontSize: '13px', color: '#7C6A58', margin: '2px 0 0',
                    fontFamily: 'var(--font-body, Inter, sans-serif)',
                  }}>{subtitle}</p>
                )}
              </div>
              <button type="button" onClick={onClose} className={s.drawerClose}>
                <LuX size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '28px',
              background: '#F8F4EC',
            }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ── Reusable section card ──────────────────────────────── */
function SectionCard({ icon, title, children, col = '1' }) {
  return (
    <div style={{ ...CARD, marginBottom: '18px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        marginBottom: '18px',
      }}>
        <span style={ICON_BOX}>{icon}</span>
        <h3 style={{
          fontFamily: 'var(--font-heading, Outfit, sans-serif)',
          fontSize: '15px', fontWeight: 600, margin: 0,
          color: '#2D1406',
        }}>{title}</h3>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: col === '1' ? '1fr' : '1fr 1fr',
        gap: '12px',
      }}>
        {children}
      </div>
    </div>
  );
}

/* ── Field wrapper (premium) ────────────────────────────── */
function FieldGroup({ icon, label, required, children, fullWidth }) {
  return (
    <div style={{
      ...FIELD,
      flexDirection: fullWidth ? 'column' : 'row',
      alignItems: fullWidth ? 'stretch' : 'center',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '13px',
        width: fullWidth ? '100%' : 'auto',
      }}>
        <span style={ICON_BOX}>{icon}</span>
        <label style={{
          fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
          textTransform: 'uppercase', color: '#7C6A58',
          whiteSpace: 'nowrap',
        }}>
          {label}{required && <span style={{ color: '#DC2626' }}> *</span>}
        </label>
      </div>
      <div style={{ flex: 1, width: fullWidth ? '100%' : 'auto' }}>
        {children}
      </div>
    </div>
  );
}

/* ── Feedback row ───────────────────────────────────────── */
function FeedbackRow({ message, type }) {
  if (!message) return null;
  const isOk = type === 'success';
  const colors = isOk
    ? { bg: 'rgba(34,197,94,0.10)', text: '#15803d', icon: <LuCheck size={18} /> }
    : { bg: 'rgba(239,68,68,0.10)', text: '#b91c1c', icon: <LuTriangleAlert size={18} /> };
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '14px 18px', borderRadius: '14px', marginBottom: '18px',
        fontSize: '13.5px', fontWeight: 600,
        background: colors.bg, color: colors.text,
        display: 'flex', alignItems: 'center', gap: '10px',
      }}
    >
      {colors.icon}{message}
    </motion.div>
  );
}

/* ── Input / Select helpers ─────────────────────────────── */
function FocusInput(props) {
  const ref = useRef(null);
  return (
    <input
      ref={ref}
      {...props}
      onFocus={(e) => { e.currentTarget.style.borderColor = '#2E7D5B'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(46,125,91,0.10)'; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border, rgba(45,20,6,0.08))'; e.currentTarget.style.boxShadow = 'none'; }}
      style={{ ...INPUT, ...props.style }}
    />
  );
}

function FocusSelect(props) {
  return (
    <select
      {...props}
      onFocus={(e) => { e.currentTarget.style.borderColor = '#2E7D5B'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(46,125,91,0.10)'; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border, rgba(45,20,6,0.08))'; e.currentTarget.style.boxShadow = 'none'; }}
      style={{ ...INPUT, cursor: 'pointer', ...props.style }}
    />
  );
}

function FocusTextarea(props) {
  return (
    <textarea
      {...props}
      onFocus={(e) => { e.currentTarget.style.borderColor = '#2E7D5B'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(46,125,91,0.10)'; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border, rgba(45,20,6,0.08))'; e.currentTarget.style.boxShadow = 'none'; }}
      style={{ ...INPUT, resize: 'vertical', minHeight: '60px', fontFamily: 'var(--font-body, Inter, sans-serif)', ...props.style }}
    />
  );
}

/* ── Footer action bar ──────────────────────────────────── */
function DrawerFooter({ onCancel, onSubmit, saving, submitText, submitIcon, disabled }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-end', gap: '12px',
      paddingTop: '8px',
    }}>
      <button type="button" onClick={onCancel}
        style={BTN_GHOST}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2E7D5B'; e.currentTarget.style.color = '#255f47'; e.currentTarget.style.background = 'rgba(46,125,91,0.06)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border, rgba(45,20,6,0.08))'; e.currentTarget.style.color = '#7C6A58'; e.currentTarget.style.background = '#ffffff'; }}
      >
        Cancel
      </button>
      <button type="submit" onClick={onSubmit}
        style={{ ...BTN_PRIMARY, opacity: saving || disabled ? 0.65 : 1, cursor: saving || disabled ? 'not-allowed' : 'pointer' }}
        disabled={saving || disabled}
        onMouseEnter={(e) => { if (!saving && !disabled) { e.currentTarget.style.filter = 'brightness(1.07)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
        onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
      >
        {saving ? <><LuLoader size={16} style={{ animation: 'spin 1s linear infinite' }} /> {submitText || 'Saving…'}</> : <>{submitIcon}{submitText}</>}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ADD STUDENT DRAWER
   ══════════════════════════════════════════════════════════ */
export function AddStudentModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', city: '', gender: '', dateOfBirth: '',
    emergencyContact: '', style: 'Hatha', level: 'Beginner',
    membership: 'Monthly Pass', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      setFeedback({ message: 'Name, Email, and Phone are required.', type: 'error' });
      return;
    }
    setSaving(true);
    setFeedback({ message: '', type: '' });
    try {
      const planMonths = form.membership === 'Annual Pass' ? 12 : form.membership === 'Quarterly Pass' ? 3 : 1;
      await createStudent({
        name: form.name, email: form.email, phone: form.phone,
        city: form.city || undefined, style: form.style, level: form.level,
        planMonths, planType: form.membership,
      });
      setFeedback({ message: `Student "${form.name}" created successfully.`, type: 'success' });
      setTimeout(() => { onSuccess?.(); onClose(); }, 1200);
    } catch (err) {
      setFeedback({ message: err.message || 'Failed to create student.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <QuickDrawer
      open
      onClose={onClose}
      title="Register New Student"
      subtitle="Add a student to the Pragya Yoga community"
      icon={<LuUserPlus size={20} />}
    >
      <FeedbackRow {...feedback} />
      <form onSubmit={handleSubmit}>
        {/* Personal Details */}
        <SectionCard icon={<LuUser size={18} />} title="Personal Details" col="2">
          <FieldGroup icon={<LuUser size={15} />} label="Full Name" required>
            <FocusInput value={form.name} onChange={set('name')} placeholder="e.g. Ananya Sharma" />
          </FieldGroup>
          <FieldGroup icon={<LuMail size={15} />} label="Email" required>
            <FocusInput type="email" value={form.email} onChange={set('email')} placeholder="student@example.com" />
          </FieldGroup>
          <FieldGroup icon={<LuPhone size={15} />} label="Phone" required>
            <FocusInput value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
          </FieldGroup>
          <FieldGroup icon={<LuMapPin size={15} />} label="City">
            <FocusInput value={form.city} onChange={set('city')} placeholder="e.g. Pune" />
          </FieldGroup>
        </SectionCard>

        {/* Yoga Profile */}
        <SectionCard icon={<LuHeart size={18} />} title="Yoga Profile" col="2">
          <FieldGroup icon={<LuActivity size={15} />} label="Style">
            <FocusSelect value={form.style} onChange={set('style')}>
              <option>Hatha</option><option>Vinyasa</option><option>Ashtanga</option><option>Kundalini</option><option>Yin</option>
            </FocusSelect>
          </FieldGroup>
          <FieldGroup icon={<LuTrendingUp size={15} />} label="Level">
            <FocusSelect value={form.level} onChange={set('level')}>
              <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
            </FocusSelect>
          </FieldGroup>
          <FieldGroup icon={<LuBookOpen size={15} />} label="Membership Plan">
            <FocusSelect value={form.membership} onChange={set('membership')}>
              <option value="">No Plan</option>
              <option value="Monthly Pass">Monthly Pass</option>
              <option value="Quarterly Pass">Quarterly Pass</option>
              <option value="Annual Pass">Annual Pass</option>
            </FocusSelect>
          </FieldGroup>
        </SectionCard>

        {/* Notes */}
        <SectionCard icon={<LuStickyNote size={18} />} title="Notes" col="1">
          <FieldGroup icon={<LuFileText size={15} />} label="Notes & Remarks" fullWidth>
            <FocusTextarea value={form.notes} onChange={set('notes')} placeholder="Optional notes about this student…" />
          </FieldGroup>
        </SectionCard>

        <DrawerFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          saving={saving}
          submitText="Register Student"
          submitIcon={<LuUserPlus size={16} />}
        />
      </form>
    </QuickDrawer>
  );
}

/* ══════════════════════════════════════════════════════════
   ADD LEAD DRAWER
   ══════════════════════════════════════════════════════════ */
export function AddLeadModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', interestType: 'General Yoga', source: 'Website', notes: '' });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.name) { setFeedback({ message: 'Lead name is required.', type: 'error' }); return; }
    setSaving(true);
    setFeedback({ message: '', type: '' });
    try {
      await createLead({ ...form, stage: 'New' });
      setFeedback({ message: `Lead "${form.name}" added to pipeline.`, type: 'success' });
      setForm({ name: '', phone: '', email: '', interestType: 'General Yoga', source: 'Website', notes: '' });
      setTimeout(() => { onSuccess?.(); onClose(); }, 1200);
    } catch (err) {
      setFeedback({ message: err.message || 'Failed to add lead.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <QuickDrawer
      open
      onClose={onClose}
      title="Add New Lead"
      subtitle="Track a prospective student through the pipeline"
      icon={<LuFilter size={20} />}
    >
      <FeedbackRow {...feedback} />
      <form onSubmit={handleSubmit}>
        {/* Lead Details */}
        <SectionCard icon={<LuTarget size={18} />} title="Lead Details" col="2">
          <FieldGroup icon={<LuUser size={15} />} label="Full Name" required>
            <FocusInput value={form.name} onChange={set('name')} placeholder="e.g. Rahul Verma" />
          </FieldGroup>
          <FieldGroup icon={<LuPhone size={15} />} label="Phone">
            <FocusInput value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
          </FieldGroup>
          <FieldGroup icon={<LuMail size={15} />} label="Email">
            <FocusInput type="email" value={form.email} onChange={set('email')} placeholder="lead@example.com" />
          </FieldGroup>
        </SectionCard>

        {/* Source & Interest */}
        <SectionCard icon={<LuZap size={18} />} title="Source & Interest" col="2">
          <FieldGroup icon={<LuGlobe size={15} />} label="Source">
            <FocusSelect value={form.source} onChange={set('source')}>
              <option>Website</option><option>Referral</option><option>Instagram</option>
              <option>Google</option><option>Walk-in</option><option>Event</option><option>Other</option>
            </FocusSelect>
          </FieldGroup>
          <FieldGroup icon={<LuHeart size={15} />} label="Interest Type">
            <FocusSelect value={form.interestType} onChange={set('interestType')}>
              <option>General Yoga</option><option>Hatha Yoga</option><option>Vinyasa Flow</option>
              <option>Ashtanga</option><option>Meditation</option><option>YTTC</option><option>Workshop</option>
            </FocusSelect>
          </FieldGroup>
        </SectionCard>

        {/* Notes */}
        <SectionCard icon={<LuStickyNote size={18} />} title="Notes" col="1">
          <FieldGroup icon={<LuFileText size={15} />} label="Lead Notes" fullWidth>
            <FocusTextarea value={form.notes} onChange={set('notes')} placeholder="Any notes about this lead — interests, conversation summary, etc." />
          </FieldGroup>
        </SectionCard>

        <DrawerFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          saving={saving}
          submitText="Add to Pipeline"
          submitIcon={<LuFilter size={16} />}
        />
      </form>
    </QuickDrawer>
  );
}

/* ══════════════════════════════════════════════════════════
   NEW BATCH DRAWER
   ══════════════════════════════════════════════════════════ */
export function NewBatchModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', timing: '', trainer: '', zoomLink: '', capacity: '', status: 'Active' });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.name || !form.timing || !form.trainer) {
      setFeedback({ message: 'Batch name, timings, and instructor are required.', type: 'error' });
      return;
    }
    setSaving(true);
    setFeedback({ message: '', type: '' });
    try {
      await createBatch({
        name: form.name, timing: form.timing, trainer: form.trainer,
        zoomLink: form.zoomLink || undefined, status: form.status,
      });
      setFeedback({ message: `Batch "${form.name}" created!`, type: 'success' });
      setTimeout(() => { onSuccess?.(); onClose(); }, 1200);
    } catch (err) {
      setFeedback({ message: err.message || 'Failed to create batch.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <QuickDrawer
      open
      onClose={onClose}
      title="Deploy New Batch"
      subtitle="Launch a new yoga batch track"
      icon={<LuRadioTower size={20} />}
    >
      <FeedbackRow {...feedback} />
      <form onSubmit={handleSubmit}>
        {/* Batch Information */}
        <SectionCard icon={<LuRadioTower size={18} />} title="Batch Information" col="2">
          <FieldGroup icon={<LuTag size={15} />} label="Batch Name" required>
            <FocusInput value={form.name} onChange={set('name')} placeholder="e.g. Morning Vinyasa Flow" />
          </FieldGroup>
          <FieldGroup icon={<LuActivity size={15} />} label="Status">
            <FocusSelect value={form.status} onChange={set('status')}>
              <option value="Active">Active</option>
              <option value="Upcoming">Upcoming</option>
            </FocusSelect>
          </FieldGroup>
        </SectionCard>

        {/* Schedule & Instructor */}
        <SectionCard icon={<LuClock size={18} />} title="Schedule & Instructor" col="2">
          <FieldGroup icon={<LuClock size={15} />} label="Timings" required>
            <FocusInput value={form.timing} onChange={set('timing')} placeholder="e.g. 06:00 AM – 07:15 AM" />
          </FieldGroup>
          <FieldGroup icon={<LuUsers size={15} />} label="Instructor" required>
            <FocusInput value={form.trainer} onChange={set('trainer')} placeholder="Acharya name" />
          </FieldGroup>
        </SectionCard>

        {/* Streaming */}
        <SectionCard icon={<LuVideo size={18} />} title="Streaming & Capacity" col="2">
          <FieldGroup icon={<LuVideo size={15} />} label="Zoom Link">
            <FocusInput type="url" value={form.zoomLink} onChange={set('zoomLink')} placeholder="https://zoom.us/j/..." />
          </FieldGroup>
        </SectionCard>

        <DrawerFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          saving={saving}
          submitText="Create Batch"
          submitIcon={<LuRadioTower size={16} />}
        />
      </form>
    </QuickDrawer>
  );
}

/* ══════════════════════════════════════════════════════════
   RECORD PAYMENT DRAWER
   ══════════════════════════════════════════════════════════ */
export function RecordPaymentModal({ onClose, onSuccess }) {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ studentId: '', amount: '', label: '', method: 'UPI' });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  useEffect(() => {
    getStudents().then(setStudents).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const selectedStudent = students.find(s => s._id === form.studentId);
  const amountNum = Number(form.amount) || 0;
  const tax = Math.round(amountNum * 0.18);
  const finalAmount = amountNum + tax;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.studentId || amountNum <= 0) {
      setFeedback({ message: 'Select a student and enter a valid amount.', type: 'error' });
      return;
    }
    setSaving(true);
    setFeedback({ message: '', type: '' });
    try {
      const label = form.label || `${selectedStudent?.name || 'Student'} membership`;
      await createPayment({
        user: form.studentId, label,
        amount: amountNum, method: form.method, status: 'paid',
      });
      setFeedback({ message: `₹${amountNum.toLocaleString('en-IN')} payment recorded for ${selectedStudent?.name || 'student'}. Invoice # generated.`, type: 'success' });
      setTimeout(() => { onSuccess?.(); onClose(); }, 1400);
    } catch (err) {
      setFeedback({ message: err.message || 'Failed to record payment.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <QuickDrawer
      open
      onClose={onClose}
      title="Record Payment"
      subtitle="Log a payment and generate an invoice automatically"
      icon={<LuCreditCard size={20} />}
    >
      <FeedbackRow {...feedback} />
      <form onSubmit={handleSubmit}>
        {/* Student Selection */}
        <SectionCard icon={<LuUser size={18} />} title="Student" col="1">
          <FieldGroup icon={<LuUsers size={15} />} label="Select Student" required fullWidth>
            <FocusSelect value={form.studentId} onChange={set('studentId')} style={{ maxHeight: 220 }}>
              <option value="">— Choose a student —</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.email || s.phone})</option>)}
            </FocusSelect>
          </FieldGroup>
        </SectionCard>

        {/* Payment Details */}
        <SectionCard icon={<LuDollarSign size={18} />} title="Payment Details" col="2">
          <FieldGroup icon={<LuIndianRupee size={15} />} label="Amount (₹)" required>
            <FocusInput type="number" min="1" step="1" value={form.amount} onChange={set('amount')} placeholder="e.g. 2500" />
          </FieldGroup>
          <FieldGroup icon={<LuWallet size={15} />} label="Method">
            <FocusSelect value={form.method} onChange={set('method')}>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
            </FocusSelect>
          </FieldGroup>
          <FieldGroup icon={<LuFileText size={15} />} label="Description" fullWidth>
            <FocusInput value={form.label} onChange={set('label')} placeholder="e.g. Monthly Pass - June 2026" />
          </FieldGroup>
        </SectionCard>

        {/* Invoice Summary */}
        {selectedStudent && amountNum > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ ...CARD, marginBottom: '18px', background: 'linear-gradient(135deg, #FFF9F0, #F8F4EC)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={ICON_BOX}><LuReceipt size={18} /></span>
              <h3 style={{ fontFamily: 'var(--font-heading, Outfit, sans-serif)', fontSize: '15px', fontWeight: 600, margin: 0, color: '#2D1406' }}>Invoice Preview</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '14px' }}>
              {[
                ['Student', selectedStudent.name],
                ['Plan', form.label || 'Membership'],
                ['Subtotal', `₹${amountNum.toLocaleString('en-IN')}`],
                ['GST (18%)', `₹${tax.toLocaleString('en-IN')}`],
              ].map(([l, v]) => (
                <div key={l} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid rgba(45,20,6,0.06)',
                }}>
                  <span style={{ color: '#7C6A58' }}>{l}</span>
                  <span style={{ fontWeight: 600, color: '#2D1406' }}>{v}</span>
                </div>
              ))}
              <div style={{
                gridColumn: 'span 2',
                display: 'flex', justifyContent: 'space-between',
                padding: '12px 0', marginTop: '4px',
                borderTop: '2px solid rgba(46,125,91,0.2)',
                fontFamily: 'var(--font-heading, Outfit, sans-serif)',
                fontSize: '16px', fontWeight: 700, color: '#2D1406',
              }}>
                <span>Final Amount</span>
                <span style={{ color: '#2E7D5B' }}>₹{finalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </motion.div>
        )}

        <DrawerFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          saving={saving}
          submitText="Record & Generate Invoice"
          submitIcon={<LuCreditCard size={16} />}
          disabled={!form.studentId || amountNum <= 0}
        />
      </form>
    </QuickDrawer>
  );
}
