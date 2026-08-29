import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import s from './YogaAdmin.module.css';
import { PageHeader, KpiCard, Avatar } from './ui/Primitives';
import Badge from './Badge';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  classInvitesApi, getBatches, servicesApi, coursesApi, workshopsApi,
  getStudents,
} from '../api/AdminServices.js';
import {
  LuMail, LuUser, LuCalendar, LuClock, LuX, LuSearch, LuCheck, LuLoader,
  LuPlus, LuChevronLeft, LuLink, LuUsers, LuSend, LuCopy, LuTrash2, LuBell,
  LuEye, LuRefreshCw, LuCircleAlert, LuVideo, LuMapPin, LuFileText,
  LuCopyPlus, LuArrowLeft, LuChevronDown, LuCopyCheck,
  LuLock, LuCircleCheck, LuCircle,
  LuFilter, LuHash, LuDownload, LuCalendarDays,
  LuClock3, LuClock4, LuBookOpen, LuGraduationCap,
  LuSparkles, LuLayers, LuTarget, LuClipboardList,
} from 'react-icons/lu';

const C = {
  primary: '#2E7D5B', primary2: '#81B29A', primarySoft: 'rgba(46,125,91,0.10)',
  primaryLine: 'rgba(46,125,91,0.22)', success: '#16A34A', danger: '#DC2626',
  warning: '#D97706', text1: '#2D1406', text2: '#7C6A58', text3: '#9C8B78',
  line: 'rgba(45,20,6,0.08)', line2: 'rgba(45,20,6,0.05)', surface: '#FFFFFF',
  surface2: '#FDFBF7', surface3: '#F8F4EC', grad: 'linear-gradient(135deg, #2E7D5B 0%, #81B29A 100%)',
};

const SINGLE_SESSION_SERVICES = ['Abhyanga', 'Shirodhara'];

function isSingleSessionService(name) {
  if (!name) return false;
  const normalized = name.toLowerCase().replace(/[^a-z]/g, '');
  return SINGLE_SESSION_SERVICES.some(s => normalized.includes(s.toLowerCase().replace(/[^a-z]/g, '')));
}

const EMPTY_FORM = {
  title: '', description: '', date: '', startTime: '', endTime: '',
  duration: 60, instructor: '', platform: 'Zoom', meetingLink: '',
  meetingPassword: '', notes: '', attachments: '',
  recipientType: '', batchId: '', serviceId: '', courseId: '', workshopId: '',
  reminderEnabled: false,
};

/* ── Local date/time helpers ── */
function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(str) {
  if (!str) return '';
  const d = parseLocalDate(str);
  if (!d) return '';
  return d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDisplayDateLong(str) {
  if (!str) return '';
  const d = parseLocalDate(str);
  if (!d) return '';
  return d.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function parseTimeInput(val) {
  if (!val || typeof val !== 'string') return '';
  let s = val.trim().toLowerCase().replace(/\s+/g, ' ');

  const ampm = s.includes('am') || s.includes('pm');
  let am = s.includes('am');
  let pm = s.includes('pm');
  s = s.replace(/[^0-9:]/g, '');

  if (!s) return '';

  let h = 0, m = 0;
  if (s.includes(':')) {
    const parts = s.split(':');
    h = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
  } else if (s.length <= 2) {
    h = parseInt(s, 10);
    m = 0;
  } else if (s.length === 3) {
    h = parseInt(s.slice(0, 1), 10);
    m = parseInt(s.slice(1), 10);
  } else {
    h = parseInt(s.slice(0, 2), 10);
    m = parseInt(s.slice(2), 10);
  }

  if (isNaN(h) || isNaN(m) || h < 0 || m < 0 || m > 59) return '';
  if (ampm) {
    if (h < 1 || h > 12) return '';
    if (pm && h < 12) h += 12;
    if (am && h === 12) h = 0;
  } else {
    if (h > 23) return '';
  }

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function validateTime(str) {
  if (!str) return false;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(str);
}

function formatTimeDisplay(str) {
  if (!str || !validateTime(str)) return str || '';
  const [h, m] = str.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function calcDurationMinutes(start, end) {
  if (!start || !end || !validateTime(start) || !validateTime(end)) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  return endMin > startMin ? endMin - startMin : 0;
}

const RECIPIENT_OPTIONS = [
  { value: 'all_members', label: 'Membership Plans', icon: <LuUsers size={14} /> },
  { value: 'service_members', label: 'Services', icon: <LuSparkles size={14} /> },
  { value: 'batch', label: 'Batches', icon: <LuLayers size={14} /> },
  { value: 'course', label: 'Courses', icon: <LuGraduationCap size={14} /> },
  { value: 'trial', label: 'Trial Students', icon: <LuTarget size={14} /> },
  { value: 'workshop', label: 'Workshop Participants', icon: <LuBookOpen size={14} /> },
  { value: 'custom', label: 'Custom Selection', icon: <LuFilter size={14} /> },
];

const PLATFORM_OPTIONS = [
  { value: 'Zoom', icon: <LuVideo size={14} />, color: '#2D8CFF' },
  { value: 'Google Meet', icon: <LuVideo size={14} />, color: '#34A853' },
  { value: 'Microsoft Teams', icon: <LuVideo size={14} />, color: '#6264A7' },
  { value: 'Offline', icon: <LuMapPin size={14} />, color: '#7C6A58' },
  { value: 'Custom', icon: <LuLink size={14} />, color: '#2E7D5B' },
];

function FloatingInput({ label, icon, value, onChange, type = 'text', placeholder, error, helperText, required, readOnly, ...rest }) {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== '' && value != null;
  return (
    <div style={{ position: 'relative', marginBottom: 4 }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span style={{ position: 'absolute', left: 14, zIndex: 2, color: focused || hasValue ? C.primary : C.text3, transition: 'color 0.2s', display: 'grid', placeItems: 'center' }}>{icon}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || ' '}
          readOnly={readOnly}
          required={required}
          style={{
            width: '100%', height: 52, padding: icon ? '22px 14px 6px 44px' : '22px 14px 6px 14px',
            border: `1.5px solid ${error ? C.danger : focused ? C.primary : C.line}`,
            borderRadius: 11, background: focused ? C.surface : C.surface2,
            color: C.text1, fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif",
            outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
            boxShadow: focused ? `0 0 0 3px ${C.primarySoft}` : 'inset 0 1px 2px rgba(0,0,0,0.03)',
          }}
          {...rest}
        />
      </div>
      <label style={{
        position: 'absolute', left: icon ? 44 : 14, top: focused || hasValue ? 6 : 16,
        fontSize: focused || hasValue ? 10 : 13.5, fontWeight: focused || hasValue ? 700 : 500,
        color: error ? C.danger : focused ? C.primary : C.text3,
        pointerEvents: 'none', transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
        textTransform: focused || hasValue ? 'uppercase' : 'none',
        letterSpacing: focused || hasValue ? '0.04em' : 'normal',
        lineHeight: 1.2,
      }}>
        {label}{required && ' *'}
      </label>
      {(error || helperText) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, paddingLeft: icon ? 44 : 14, fontSize: 11.5, fontWeight: 500, color: error ? C.danger : C.text3 }}>
          {error && <LuCircleAlert size={11} />}
          <span>{error || helperText}</span>
        </div>
      )}
    </div>
  );
}

function FloatingTextarea({ label, icon, value, onChange, placeholder, error, helperText, required, ...rest }) {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);
  const hasValue = value !== '' && value != null;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div style={{ position: 'relative', marginBottom: 4 }}>
      {icon && (
        <span style={{ position: 'absolute', left: 14, top: 18, zIndex: 2, color: focused || hasValue ? C.primary : C.text3, transition: 'color 0.2s', display: 'grid', placeItems: 'center' }}>{icon}</span>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder || ' '}
        required={required}
        style={{
          width: '100%', minHeight: 80, padding: icon ? '28px 14px 10px 44px' : '28px 14px 10px 14px',
          border: `1.5px solid ${error ? C.danger : focused ? C.primary : C.line}`,
          borderRadius: 11, background: focused ? C.surface : C.surface2,
          color: C.text1, fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif",
          outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
          boxShadow: focused ? `0 0 0 3px ${C.primarySoft}` : 'inset 0 1px 2px rgba(0,0,0,0.03)',
          resize: 'none', overflow: 'hidden', lineHeight: 1.6,
        }}
        {...rest}
      />
      <label style={{
        position: 'absolute', left: icon ? 44 : 14, top: focused || hasValue ? 6 : 18,
        fontSize: focused || hasValue ? 10 : 13.5, fontWeight: focused || hasValue ? 700 : 500,
        color: error ? C.danger : focused ? C.primary : C.text3,
        pointerEvents: 'none', transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
        textTransform: focused || hasValue ? 'uppercase' : 'none',
        letterSpacing: focused || hasValue ? '0.04em' : 'normal',
        lineHeight: 1.2,
      }}>
        {label}{required && ' *'}
      </label>
      {(error || helperText) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, paddingLeft: 14, fontSize: 11.5, fontWeight: 500, color: error ? C.danger : C.text3 }}>
          {error && <LuCircleAlert size={11} />}
          <span>{error || helperText}</span>
        </div>
      )}
    </div>
  );
}

const CALENDAR_THEME_ID = 'py-cal-theme';
const CALENDAR_THEME = `
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar {
    border: none;
    font-family: 'Inter', system-ui, sans-serif;
    width: 100%;
    line-height: 1.2;
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__navigation {
    display: flex;
    align-items: center;
    margin-bottom: 6px;
    height: 40px;
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__navigation button {
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #2D1406;
    min-width: 36px;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__navigation button:enabled:hover {
    background: rgba(46,125,91,0.10);
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__navigation button:disabled {
    opacity: 0.3;
    cursor: default;
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__navigation__label {
    flex: 1;
    font-weight: 700;
    font-size: 14px;
    letter-spacing: -0.02em;
    pointer-events: none;
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__navigation__arrow {
    font-size: 18px;
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__month-view__weekdays {
    text-align: center;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #7C6A58;
    margin-bottom: 2px;
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__month-view__weekdays abbr {
    text-decoration: none;
    border: none;
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__month-view__weekdays__weekday {
    padding: 6px 0;
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__tile {
    border-radius: 8px;
    font-size: 13px;
    padding: 8px 6px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: center;
    transition: background 0.12s, color 0.12s;
    font-family: 'Inter', system-ui, sans-serif;
    line-height: 1.3;
    color: #2D1406;
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__tile:enabled:hover {
    background: rgba(46,125,91,0.10);
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__tile--active {
    background: linear-gradient(135deg, #2E7D5B, #81B29A) !important;
    color: #ffffff !important;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(46,125,91,0.3);
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__tile--now {
    background: rgba(46,125,91,0.10);
    font-weight: 700;
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__tile--active.react-calendar__tile--now {
    background: linear-gradient(135deg, #2E7D5B, #81B29A) !important;
    color: #fff !important;
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__tile:disabled {
    opacity: 0.3;
    cursor: default;
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__month-view__days__day--neighboringMonth {
    opacity: 0.35;
  }
  #${CALENDAR_THEME_ID}.py-cal-popup .react-calendar__viewContainer {
    margin-top: 2px;
  }
`;

const SCHEDULE_STYLE_ID = 'py-schedule-grid';
const SCHEDULE_STYLES = `
  #${SCHEDULE_STYLE_ID}.py-schedule .s-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  #${SCHEDULE_STYLE_ID}.py-schedule .d-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
  @media (min-width: 769px) and (max-width: 1024px) {
    #${SCHEDULE_STYLE_ID}.py-schedule .s-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 768px) {
    #${SCHEDULE_STYLE_ID}.py-schedule .s-grid { grid-template-columns: 1fr; }
  }
`;

function PickerTrigger({ open, error, focused, onClick, children }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, height: 52,
        padding: '0 14px', cursor: 'pointer', userSelect: 'none',
        border: `1.5px solid ${error ? '#DC2626' : open ? '#2E7D5B' : 'rgba(45,20,6,0.08)'}`,
        borderRadius: 11,
        background: open || focused ? '#FFFFFF' : '#FDFBF7',
        transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
        boxShadow: open || focused
          ? '0 0 0 3px rgba(46,125,91,0.10)'
          : 'inset 0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      {children}
    </div>
  );
}

function PickerLabel({ label, required, error }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.04em', marginBottom: 6, display: 'block',
      color: error ? '#DC2626' : '#7C6A58',
    }}>
      {label}{required && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
    </div>
  );
}

function DatePicker({ value, onChange, label, error, required }) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);
  const popupRef = useRef(null);
  const [calValue, setCalValue] = useState(value ? parseLocalDate(value) : null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        ref.current && !ref.current.contains(e.target) &&
        popupRef.current && !popupRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const formatted = formatDisplayDate(value);

  const triggerRef = useRef(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopupPos({ top: rect.bottom + 6, left: rect.left });
    }
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 4 }}>
      <PickerLabel label={label} required={required} error={error} />
      <div ref={triggerRef}>
        <PickerTrigger
          open={open}
          error={error}
          focused={focused}
          onClick={() => { setOpen(v => !v); setFocused(true); }}
        >
          <span style={{
            flex: 1, fontSize: 13.5, lineHeight: 1.3,
            color: value ? '#2D1406' : '#9C8B78',
            fontWeight: value ? 500 : 400,
          }}>
            {formatted || 'Select date'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <LuCalendarDays size={16} style={{ color: value ? '#2E7D5B' : '#7C6A58' }} />
            <LuChevronDown size={13} style={{ color: '#7C6A58', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : '' }} />
          </span>
        </PickerTrigger>
      </div>
      {open && createPortal(
        <div
          ref={popupRef}
          id={CALENDAR_THEME_ID}
          className="py-cal-popup"
          style={{
            position: 'fixed', top: popupPos.top, left: popupPos.left,
            zIndex: 9999, width: 300,
            background: '#FFFFFF', borderRadius: 14,
            border: '1px solid rgba(45,20,6,0.08)',
            boxShadow: '0 18px 40px -12px rgba(45,20,6,0.2), 0 6px 14px -8px rgba(45,20,6,0.1)',
            padding: 12,
          }}
        >
          <style>{CALENDAR_THEME}</style>
          <Calendar
            value={calValue}
            onChange={(d) => { setCalValue(d); onChange(toLocalDateStr(d)); setOpen(false); }}
            minDate={new Date()}
            prev2Label={null}
            next2Label={null}
            showNeighboringMonth={false}
          />
        </div>,
        document.body
      )}
    </div>
  );
}

function SmartTimeInput({ value, onChange, label, error, required }) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(value ? formatTimeDisplay(value) : '');
  const [localError, setLocalError] = useState('');
  const ref = useRef(null);

  const displayValue = focused ? raw : (value ? formatTimeDisplay(value) : '');

  const commit = (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
      setRaw('');
      setLocalError('');
      onChange('');
      return;
    }
    const normalized = parseTimeInput(trimmed);
    if (!normalized) {
      setLocalError('Invalid time');
      return;
    }
    setLocalError('');
    setRaw(formatTimeDisplay(normalized));
    onChange(normalized);
  };

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 4 }}>
      <PickerLabel label={label} required={required} error={error || localError} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{
          position: 'absolute', left: 14, zIndex: 2,
          color: focused || value ? C.primary : C.text3,
          transition: 'color 0.2s', display: 'grid', placeItems: 'center',
        }}>
          <LuClock size={16} />
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={(e) => { setRaw(e.target.value); if (localError) setLocalError(''); }}
          onFocus={() => { setFocused(true); setRaw(value ? formatTimeDisplay(value) : ''); }}
          onBlur={() => { setFocused(false); commit(raw); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
          placeholder="e.g. 7:00 AM"
          style={{
            width: '100%', height: 52, padding: '0 14px 0 44px',
            border: `1.5px solid ${error || localError ? '#DC2626' : focused ? '#2E7D5B' : 'rgba(45,20,6,0.08)'}`,
            borderRadius: 11, background: focused ? '#FFFFFF' : '#FDFBF7',
            color: '#2D1406', fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif",
            outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
            boxShadow: focused ? '0 0 0 3px rgba(46,125,91,0.10)' : 'inset 0 1px 2px rgba(0,0,0,0.03)',
            caretColor: '#2E7D5B',
          }}
        />
      </div>
      {(error || localError) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, paddingLeft: 44, fontSize: 11.5, fontWeight: 500, color: '#DC2626' }}>
          <LuCircleAlert size={11} />
          <span>{localError || error}</span>
        </div>
      )}
    </div>
  );
}

function ChipSelect({ options, value, onChange, label }) {
  return (
    <div style={{ marginBottom: 4 }}>
      {label && <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.text2, marginBottom: 8 }}>{label}</div>}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map(opt => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${isActive ? C.primaryLine : C.line}`,
                background: isActive ? C.primarySoft : C.surface,
                color: isActive ? C.primary : C.text2,
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'Inter', system-ui, sans-serif",
                transition: 'all 0.16s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: isActive ? '0 2px 8px rgba(46,125,91,0.15)' : 'none',
                transform: isActive ? 'translateY(-1px)' : 'none',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = C.primaryLine; e.currentTarget.style.color = C.text1; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = C.line; e.currentTarget.style.color = C.text2; } }}
            >
              {opt.icon && <span style={{ color: isActive ? C.primary : opt.color || C.text3 }}>{opt.icon}</span>}
              {opt.label}
              {isActive && <LuCheck size={12} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CollapsibleCard({ title, icon, defaultOpen = true, children, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16,
      marginBottom: 16, boxShadow: '0 1px 2px rgba(45,20,6,0.04), 0 2px 10px rgba(45,20,6,0.05)',
      overflow: 'hidden', transition: 'box-shadow 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 18px rgba(45,20,6,0.07), 0 20px 48px rgba(45,20,6,0.12)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 2px rgba(45,20,6,0.04), 0 2px 10px rgba(45,20,6,0.05)'}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '16px 18px', border: 'none', background: 'none',
          cursor: 'pointer', fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
          fontSize: 14.5, fontWeight: 700, color: C.text1, letterSpacing: '-0.02em',
          textAlign: 'left', gap: 10,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ color: C.primary, display: 'grid', placeItems: 'center', fontSize: 17 }}>{icon}</span>
          {title}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {badge}
          <span style={{ color: C.text3, display: 'grid', placeItems: 'center', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : '' }}>
            <LuChevronDown size={16} />
          </span>
        </span>
      </button>
      <div style={{
        maxHeight: open ? 2000 : 0, overflow: 'hidden',
        transition: 'max-height 0.35s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ padding: '0 18px 18px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function StickyCard({ title, icon, children, accent }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16,
      marginBottom: 16, overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(45,20,6,0.04), 0 2px 10px rgba(45,20,6,0.05)',
      ...(accent ? { borderTop: `3px solid ${C.primary}` } : {}),
    }}>
      {title && (
        <div style={{ padding: '16px 18px 8px', display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ color: C.primary, display: 'grid', placeItems: 'center', fontSize: 16 }}>{icon}</span>
          <span style={{ fontFamily: "'Outfit', 'Inter', system-ui, sans-serif", fontSize: 14, fontWeight: 700, color: C.text1, letterSpacing: '-0.02em' }}>{title}</span>
        </div>
      )}
      <div style={{ padding: title ? '8px 18px 18px' : '18px' }}>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ open, onClose, onConfirm, title, message, confirmText, confirmIcon, loading, danger }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(45,20,6,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.surface, borderRadius: 24, padding: '34px 30px',
          width: 420, maxWidth: '92vw', border: `1px solid ${C.line}`,
          textAlign: 'center', boxShadow: '0 18px 40px -12px rgba(45,20,6,0.16)',
          animation: 'modalScale 0.24s cubic-bezier(0.22,1,0.36,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          width: 58, height: 58, borderRadius: 16, margin: '0 auto 16px',
          display: 'grid', placeItems: 'center', fontSize: 26,
          background: danger ? 'rgba(220,38,38,0.12)' : C.primarySoft,
          color: danger ? C.danger : C.primary,
        }}>
          {confirmIcon || <LuSend size={24} />}
        </div>
        <h3 style={{ fontFamily: "'Outfit', 'Inter', system-ui, sans-serif", fontSize: 19, color: C.text1, margin: '0 0 8px', fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</h3>
        <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '11px 16px', border: `1px solid ${C.line}`,
              background: C.surface3, borderRadius: 11, cursor: 'pointer',
              fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
              color: C.text1, fontWeight: 600, transition: 'background 0.18s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = C.surface2}
            onMouseLeave={e => e.currentTarget.style.background = C.surface3}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: '11px 16px', border: 'none',
              background: danger ? C.danger : C.grad,
              color: '#fff', borderRadius: 11, cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700, opacity: loading ? 0.7 : 1,
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: 'filter 0.18s, transform 0.1s',
              boxShadow: danger ? 'none' : '0 4px 14px rgba(46,125,91,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.07)'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.filter = 'none'; }}
          >
            {loading ? <><LuLoader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Sending…</> : confirmText || 'Send Invitation'}
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes modalScale { from { opacity: 0; transform: scale(0.94) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function ClassInvites() {
  const [invites, setInvites] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [activeView, setActiveView] = useState('overview');
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [form, setForm] = useState(EMPTY_FORM);
  const [recipientCandidates, setRecipientCandidates] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [singleSessionData, setSingleSessionData] = useState(null);
  const submittingRef = useRef(false);

  const [batches, setBatches] = useState([]);
  const [services, setServices] = useState([]);
  const [courses, setCourses] = useState([]);
  const [workshopList, setWorkshopList] = useState([]);

  const flash = useCallback((message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  const loadInvites = useCallback(async () => {
    try {
      const params = { limit: 50 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      const [d, st] = await Promise.all([
        classInvitesApi.list(params),
        classInvitesApi.stats().catch(() => null),
      ]);
      setInvites(d.invites || []);
      setStats(st);
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, flash]);

  const loadFilterData = useCallback(async () => {
    try {
      const [b, sv, co, wk] = await Promise.all([
        getBatches().catch(() => []),
        servicesApi.list().catch(() => []),
        coursesApi.list().catch(() => []),
        workshopsApi.list().catch(() => []),
      ]);
      setBatches(Array.isArray(b) ? b : []);
      setServices(Array.isArray(sv) ? sv : []);
      setCourses(Array.isArray(co) ? co : []);
      setWorkshopList(Array.isArray(wk) ? wk : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadInvites(); loadFilterData(); }, []);

  const fetchRecipients = useCallback(async (type) => {
    setLoadingRecipients(true);
    setSelectedIds([]);
    setSelectAll(false);
    setSingleSessionData(null);
    try {
      const params = { type };
      if (type === 'batch' && form.batchId) params.batchId = form.batchId;
      if (type === 'service_members' && form.serviceId) {
        params.serviceId = form.serviceId;
        const svc = services.find(s => s._id === form.serviceId);
        if (svc && isSingleSessionService(svc.name)) {
          const data = await classInvitesApi.getServiceEligibleStudents(form.serviceId);
          setSingleSessionData(data);
          setRecipientCandidates(data.students || []);
          setLoadingRecipients(false);
          return;
        }
      }
      if (type === 'course' && form.courseId) params.courseId = form.courseId;
      if (type === 'workshop' && form.workshopId) params.workshopId = form.workshopId;
      const data = await classInvitesApi.recipients(params);
      setRecipientCandidates(Array.isArray(data) ? data : []);
    } catch (err) {
      flash(err.message, 'error');
      setRecipientCandidates([]);
    } finally {
      setLoadingRecipients(false);
    }
  }, [form.batchId, form.serviceId, form.courseId, form.workshopId, flash, services]);

  useEffect(() => {
    if (form.recipientType && form.recipientType !== 'custom') {
      fetchRecipients(form.recipientType);
    } else {
      setRecipientCandidates([]);
      setSingleSessionData(null);
      if (form.recipientType !== 'custom') setSelectedIds([]);
    }
  }, [form.recipientType, form.batchId, form.serviceId, form.courseId, form.workshopId, fetchRecipients]);

  const handleCustomSearch = useCallback(async (query) => {
    setRecipientSearch(query);
    if (!query || query.length < 2) {
      if (!query) setRecipientCandidates([]);
      return;
    }
    setLoadingRecipients(true);
    try {
      const data = await getStudents(query);
      const list = Array.isArray(data) ? data : data?.students || [];
      setRecipientCandidates(list);
    } catch {
      setRecipientCandidates([]);
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  const toggleStudent = useCallback((id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    setSelectAll(false);
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      setSelectedIds(recipientCandidates.map(s => s._id).filter(Boolean));
      setSelectAll(true);
    }
  }, [selectAll, recipientCandidates]);

  const filteredCandidates = useMemo(() => {
    if (!recipientSearch) return recipientCandidates;
    const q = recipientSearch.toLowerCase();
    return recipientCandidates.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q)
    );
  }, [recipientCandidates, recipientSearch]);

  const getRecipientCount = useCallback(() => {
    if (form.recipientType === 'custom') return selectedIds.length;
    if (form.recipientType === 'service_members' && singleSessionData?.isSingleSession) return selectedIds.length;
    if (form.recipientType === 'all_members') return recipientCandidates.length || 0;
    if (form.recipientType === 'trial') return recipientCandidates.length || 0;
    return recipientCandidates.length || 0;
  }, [form.recipientType, selectedIds.length, recipientCandidates.length, singleSessionData]);

  const update = useCallback((patch) => setForm(prev => ({ ...prev, ...patch })), []);

  useEffect(() => {
    if (form.startTime && form.endTime) {
      const mins = calcDurationMinutes(form.startTime, form.endTime);
      if (mins > 0) {
        setForm(prev => ({ ...prev, duration: mins }));
      }
    }
  }, [form.startTime, form.endTime]);

  const validationErrors = useMemo(() => {
    const errors = [];
    if (!form.title) errors.push('Class title is required');
    if (!form.date) errors.push('Date is required');
    if (!form.startTime) errors.push('Start time is required');
    if (!form.recipientType) errors.push('Select a recipient type');
    if (form.recipientType === 'custom' && selectedIds.length === 0) errors.push('Select at least one student');
    if (form.recipientType === 'service_members' && singleSessionData?.isSingleSession) {
      if (recipientCandidates.length === 0 && selectedIds.length === 0) {
        errors.push('No active students are available for this service.');
      } else if (selectedIds.length === 0) {
        errors.push('Select at least one student.');
      }
    }
    if (recipientCandidates.length === 0 && form.recipientType && form.recipientType !== 'custom') {
      if (!(form.recipientType === 'service_members' && singleSessionData?.isSingleSession)) {
        errors.push('No recipients found for the selected criteria');
      }
    }
    return errors;
  }, [form.title, form.date, form.startTime, form.recipientType, selectedIds.length, recipientCandidates.length, singleSessionData]);

  const canSubmit = validationErrors.length === 0 && !saving;

  // Resolve entity display name for badge from the form state
  function resolveEntityMeta() {
    const rt = form.recipientType;
    if (rt === 'all_members') return { entityType: 'membership', entityName: 'Membership Plan', entityLabel: 'Membership' };
    if (rt === 'service_members') {
      const svc = services.find(s => s._id === form.serviceId);
      return { entityType: 'service', entityId: form.serviceId || null, entityName: svc?.name || 'Service', entityLabel: svc?.name || 'Service' };
    }
    if (rt === 'batch') {
      const b = batches.find(b => b._id === form.batchId);
      return { entityType: 'batch', entityId: form.batchId || null, entityName: b?.name || 'Batch', entityLabel: b?.name || 'Batch' };
    }
    if (rt === 'course') {
      const c = courses.find(c => c._id === form.courseId);
      return { entityType: 'course', entityId: form.courseId || null, entityName: c?.title || 'Course', entityLabel: c?.title || 'Course' };
    }
    if (rt === 'workshop') {
      const w = workshopList.find(w => w._id === form.workshopId);
      return { entityType: 'workshop', entityId: form.workshopId || null, entityName: w?.name || 'Workshop', entityLabel: w?.name || 'Workshop' };
    }
    if (rt === 'trial') return { entityType: 'trial', entityName: 'Free Trial', entityLabel: 'Free Trial' };
    return { entityType: 'none', entityId: null, entityName: '', entityLabel: '' };
  }

  async function handleCreate() {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    try {
      const entityMeta = resolveEntityMeta();
      const payload = {
        title: form.title,
        description: form.description || undefined,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime || undefined,
        duration: Number(form.duration) || 60,
        instructor: form.instructor || undefined,
        platform: form.platform || 'Zoom',
        meetingLink: form.meetingLink || undefined,
        meetingPassword: form.meetingPassword || undefined,
        notes: form.notes || undefined,
        attachments: form.attachments || undefined,
        recipientType: form.recipientType,
        recipientFilter: {
          batchId: form.batchId || undefined,
          serviceId: form.serviceId || undefined,
          courseId: form.courseId || undefined,
          workshopId: form.workshopId || undefined,
        },
        ...entityMeta,
        reminderConfig: form.reminderEnabled
          ? { enabled: true, reminders: [1440, 60, 15] }
          : { enabled: false, reminders: [] },
        studentIds: form.recipientType === 'custom' || singleSessionData?.isSingleSession ? selectedIds : undefined,
      };
      const result = await classInvitesApi.create(payload);
      flash(`Invitation sent to ${result.invite?.totalRecipients || 0} students.`);
      setForm(EMPTY_FORM);
      setSelectedIds([]);
      setRecipientCandidates([]);
      setSingleSessionData(null);
      setRecipientSearch('');
      setConfirmOpen(false);
      setActiveView('overview');
      await loadInvites();
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      setSaving(false);
      submittingRef.current = false;
    }
  }

  function goToCreate() {
    setForm(EMPTY_FORM);
    setSelectedIds([]);
    setRecipientCandidates([]);
    setSingleSessionData(null);
    setRecipientSearch('');
    setActiveView('create');
  }

  function goBack() {
    setSelectedInvite(null);
    setActiveView('overview');
  }

  function saveDraft() {
    try {
      localStorage.setItem('classInviteDraft', JSON.stringify({ form, selectedIds, recipientType: form.recipientType }));
      flash('Draft saved locally.');
    } catch {
      flash('Could not save draft.', 'error');
    }
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem('classInviteDraft');
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.form) setForm(draft.form);
        if (draft.selectedIds) setSelectedIds(draft.selectedIds);
        flash('Draft restored.');
      }
    } catch { /* ignore */ }
  }

  if (loading && invites.length === 0) {
    return (
      <div>
        <PageHeader title="Class Invitations" subtitle="Send and manage class invitations for students." />
        <div className={s.statsGrid}>
          {[...Array(4)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelCard}`} />)}
        </div>
        <div className={s.card}>
          {[...Array(5)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} style={{ marginBottom: 10 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {feedback && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', marginBottom: 18, borderRadius: 11,
          fontSize: 13, fontWeight: 500,
          border: '1px solid transparent',
          background: feedback.type === 'error' ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.12)',
          color: feedback.type === 'error' ? C.danger : C.success,
          borderColor: feedback.type === 'error' ? 'rgba(220,38,38,0.25)' : 'rgba(22,163,74,0.25)',
          animation: 'slideDown 0.3s ease',
        }}>
          <span style={{ fontSize: 16, display: 'grid', placeItems: 'center' }}>
            {feedback.type === 'error' ? <LuCircleAlert size={16} /> : <LuCircleCheck size={16} />}
          </span>
          <span>{feedback.message}</span>
        </div>
      )}

      {activeView === 'overview' && (
        <Overview
          invites={invites}
          stats={stats}
          loading={loading}
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onRefresh={loadInvites}
          onCreate={goToCreate}
          onOpenDetail={(inv) => { setSelectedInvite(inv); setActiveView('detail'); }}
          flash={flash}
        />
      )}

      {activeView === 'create' && (
        <CreateView
          form={form}
          update={update}
          recipientCandidates={recipientCandidates}
          filteredCandidates={filteredCandidates}
          selectedIds={selectedIds}
          selectAll={selectAll}
          recipientSearch={recipientSearch}
          onRecipientSearchChange={handleCustomSearch}
          loadingRecipients={loadingRecipients}
          toggleStudent={toggleStudent}
          toggleSelectAll={toggleSelectAll}
          batches={batches}
          services={services}
          courses={courses}
          workshops={workshopList}
          saving={saving}
          getRecipientCount={getRecipientCount}
          onSend={() => setConfirmOpen(true)}
          onBack={goBack}
          canSubmit={canSubmit}
          validationErrors={validationErrors}
          onSaveDraft={saveDraft}
          singleSessionData={singleSessionData}
        />
      )}

      {activeView === 'detail' && selectedInvite && (
        <DetailView
          inviteId={selectedInvite._id}
          onBack={goBack}
          onRefresh={loadInvites}
          flash={flash}
        />
      )}

      <ConfirmModal
        open={confirmOpen}
        onClose={() => { if (!saving) setConfirmOpen(false); }}
        onConfirm={handleCreate}
        title="Send Class Invitation?"
        message={singleSessionData?.isSingleSession
          ? `This invitation will be sent to ${selectedIds.length || 0} selected student(s) for their ${singleSessionData.serviceName || ''} session. They will receive a notification with all the class details.`
          : `This invitation will be sent to ${getRecipientCount() || 0} student(s). They will receive a notification with all the class details.`}
        confirmText="Send Invitation"
        confirmIcon={<LuSend size={24} />}
        loading={saving}
      />
      <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   OVERVIEW
   ═══════════════════════════════════════════════════════════════ */
function Overview({ invites, stats, loading, search, onSearchChange, statusFilter, onStatusFilterChange, onRefresh, onCreate, onOpenDetail, flash }) {
  return (
    <>
      <PageHeader
        title="Class Invitations"
        subtitle="Send and manage class invitations for students."
      >
        <div className={s.pageHeaderActions}>
          <button className={`${s.btn} ${s.btnSm}`} onClick={onRefresh} disabled={loading}>
            <LuRefreshCw size={13} className={loading ? s.spin : ''} /> Refresh
          </button>
          <button className={`${s.btnPrimary} ${s.btnSm}`} onClick={onCreate}>
            <LuPlus size={14} /> New Invitation
          </button>
        </div>
      </PageHeader>

      {stats && (
        <div className={s.statsGrid}>
          <KpiCard icon={<LuSend />} label="Total Sent" value={stats.total || 0} />
          <KpiCard icon={<LuUsers />} accent="blue" label="Total Recipients" value={stats.totalRecipients || 0} />
          <KpiCard icon={<LuEye />} accent="green" label="Total Read" value={stats.totalRead || 0} />
          <KpiCard icon={<LuCalendarDays />} accent="amber" label="Upcoming Classes" value={stats.upcoming || 0} />
        </div>
      )}

      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <div className={s.searchWrapper} style={{ maxWidth: 320 }}>
            <LuSearch size={14} className={s.searchIcon} />
            <input
              className={s.searchInput}
              placeholder="Search by title or instructor..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
            />
            {search && (
              <button className={s.searchClear} onClick={() => onSearchChange('')}>
                <LuX size={12} />
              </button>
            )}
          </div>
          <div className={s.segment}>
            {['all', 'active', 'cancelled'].map(st => (
              <button
                key={st}
                className={`${s.segBtn} ${statusFilter === st ? s.segActive : ''}`}
                onClick={() => onStatusFilterChange(st)}
              >
                {st === 'all' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
                <tr>
                  <th>Class Title</th>
                  <th>Entity</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Instructor</th>
                  <th>Platform</th>
                  <th>Recipients</th>
                  <th>Read</th>
                  <th>Status</th>
                  <th style={{ width: 100 }}></th>
                </tr>
            </thead>
            <tbody>
              {invites.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className={s.emptyState}>
                      <div className={s.emptyIcon}><LuSend size={40} /></div>
                      No invitations sent yet.
                      <div style={{ marginTop: 8 }}>
                        <button className={`${s.btnPrimary} ${s.btnSm}`} onClick={onCreate}>
                          <LuPlus size={13} /> Create your first invitation
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : invites.map(inv => {
                const isActive = inv.status === 'active';
                const isPast = new Date(inv.date) < new Date();
                return (
                  <tr
                    key={inv._id}
                    className={s.rowClickable}
                    onClick={() => onOpenDetail(inv)}
                  >
                    <td style={{ fontWeight: 600 }}>{inv.title}</td>
                    <td>
                      {inv.entityLabel ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 700,
                          background: inv.entityType === 'service' ? 'rgba(22,163,74,0.12)'
                            : inv.entityType === 'membership' ? 'rgba(46,125,91,0.12)'
                            : inv.entityType === 'course' ? 'rgba(124,58,237,0.12)'
                            : inv.entityType === 'trial' ? 'rgba(217,119,6,0.12)'
                            : inv.entityType === 'workshop' ? 'rgba(37,99,235,0.12)'
                            : inv.entityType === 'batch' ? 'rgba(8,145,178,0.12)'
                            : 'rgba(124,106,88,0.12)',
                          color: inv.entityType === 'service' ? '#16A34A'
                            : inv.entityType === 'membership' ? '#2E7D5B'
                            : inv.entityType === 'course' ? '#7C3AED'
                            : inv.entityType === 'trial' ? '#D97706'
                            : inv.entityType === 'workshop' ? '#2563EB'
                            : inv.entityType === 'batch' ? '#0891B2'
                            : '#7C6A58',
                          letterSpacing: '0.01em',
                        }}>
                          {inv.entityLabel}
                        </span>
                      ) : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td className={s.tdMuted}>
                      {inv.date
                        ? new Date(inv.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
                        : '—'}
                    </td>
                    <td className={s.tdMuted}>{inv.startTime ? formatTimeDisplay(inv.startTime) : '—'}</td>
                    <td className={s.tdMuted}>{inv.instructor || '—'}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: C.primarySoft, color: C.primary,
                      }}>
                        <LuVideo size={10} /> {inv.platform || 'Zoom'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{inv.totalRecipients || 0}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: C.text1 }}>
                        {inv.readCount || 0}
                        <span style={{ color: C.text3, fontWeight: 400 }}>/{inv.totalRecipients || 0}</span>
                      </span>
                    </td>
                    <td>
                      <Badge
                        label={
                          inv.status === 'active'
                            ? isPast ? 'Completed' : 'Active'
                            : inv.status === 'cancelled' ? 'Cancelled' : inv.status
                        }
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }} onClick={e => e.stopPropagation()}>
                        <button className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} onClick={() => onOpenDetail(inv)}>
                          <LuEye size={11} />
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
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CREATE VIEW
   ═══════════════════════════════════════════════════════════════ */
function CreateView({
  form, update, recipientCandidates, filteredCandidates,
  selectedIds, selectAll, recipientSearch, onRecipientSearchChange,
  loadingRecipients, toggleStudent, toggleSelectAll,
  batches, services, courses, workshops,
  saving, getRecipientCount, onSend, onBack, canSubmit, validationErrors, onSaveDraft,
  singleSessionData,
}) {
  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 22, gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <button
              onClick={onBack}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', color: C.text3, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif",
                padding: 0, transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.primary}
              onMouseLeave={e => e.currentTarget.style.color = C.text3}
            >
              <LuChevronLeft size={14} /> Back to Invitations
            </button>
          </div>
          <h2 style={{ fontFamily: "'Outfit', 'Inter', system-ui, sans-serif", fontSize: 24, fontWeight: 800, color: C.text1, margin: 0, letterSpacing: '-0.03em' }}>
            <LuMail size={20} style={{ marginRight: 10, color: C.primary, verticalAlign: 'middle' }} />
            New Class Invitation
          </h2>
          <p style={{ fontSize: 13, color: C.text2, marginTop: 4 }}>Create and send a class invitation to students.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onBack}
            className={`${s.btn} ${s.btnSm}`}
          >
            <LuArrowLeft size={14} /> Back
          </button>
          <button
            onClick={onSaveDraft}
            className={`${s.btn} ${s.btnSm}`}
          >
            <LuDownload size={13} /> Save Draft
          </button>
          <button
            onClick={onSend}
            className={`${s.btnPrimary} ${s.btnSm}`}
            disabled={!canSubmit}
          >
            <LuSend size={13} /> Send Invitation
          </button>
        </div>
      </div>

      <div className={s.gridDash}>
        {/* ── LEFT COLUMN ── */}
        <div>
          <CollapsibleCard title="Class Details" icon={<LuCalendar size={17} />}>
            <FloatingInput label="Class Title" icon={<LuMail size={15} />} value={form.title} onChange={e => update({ title: e.target.value })} required helperText="e.g. Morning Hatha Yoga Flow" />
            <div style={{ height: 8 }} />
            <FloatingInput label="Instructor Name" icon={<LuUser size={15} />} value={form.instructor} onChange={e => update({ instructor: e.target.value })} helperText="Acharya / instructor name" />
            <div style={{ height: 8 }} />
            <FloatingTextarea label="Description" icon={<LuFileText size={15} />} value={form.description} onChange={e => update({ description: e.target.value })} helperText="Brief description of the class (optional)" />
          </CollapsibleCard>

          <CollapsibleCard title="Schedule" icon={<LuClock size={17} />}>
            <div id={SCHEDULE_STYLE_ID} className="py-schedule">
              <style>{SCHEDULE_STYLES}</style>
              <div className="s-grid">
                <DatePicker label="Class Date" value={form.date} onChange={v => update({ date: v })} required />
                <SmartTimeInput label="Start Time" value={form.startTime} onChange={v => update({ startTime: v })} required />
                <SmartTimeInput label="End Time" value={form.endTime} onChange={v => update({ endTime: v })} />
              </div>
            </div>
            <div style={{ height: 8 }} />
            <div className="d-grid">
              <FloatingInput label="Duration (min)" type="number" min={15} max={300} step={5} icon={<LuClock4 size={15} />} value={form.duration} onChange={e => update({ duration: Number(e.target.value) })} />
            </div>
          </CollapsibleCard>

          <CollapsibleCard title="Meeting Settings" icon={<LuVideo size={17} />}>
            <ChipSelect label="Platform" options={PLATFORM_OPTIONS} value={form.platform} onChange={v => update({ platform: v })} />
            <div style={{ height: 10 }} />
            <FloatingInput label="Meeting Link" icon={<LuLink size={15} />} value={form.meetingLink} onChange={e => update({ meetingLink: e.target.value })} helperText="Zoom, Google Meet, or other link" />
            <div style={{ height: 8 }} />
            <FloatingInput label="Meeting Password" icon={<LuLock size={15} />} value={form.meetingPassword} onChange={e => update({ meetingPassword: e.target.value })} type="password" />
          </CollapsibleCard>

          <CollapsibleCard title="Notes & Reminders" icon={<LuBell size={17} />} defaultOpen={false}>
            <FloatingTextarea label="Notes for Students" icon={<LuFileText size={15} />} value={form.notes} onChange={e => update({ notes: e.target.value })} helperText="What students should know before the class" />
            <div style={{ height: 8 }} />
            <FloatingInput label="Attachments URL" icon={<LuLink size={15} />} value={form.attachments} onChange={e => update({ attachments: e.target.value })} helperText="Link to any materials, handouts, or resources" />
            <div style={{ height: 12 }} />
            <div
              onClick={() => update({ reminderEnabled: !form.reminderEnabled })}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                borderRadius: 11, cursor: 'pointer',
                background: form.reminderEnabled ? 'rgba(22,163,74,0.08)' : C.surface3,
                border: `1px solid ${form.reminderEnabled ? 'rgba(22,163,74,0.2)' : C.line}`,
                transition: 'all 0.2s',
              }}
            >
              <span style={{ color: form.reminderEnabled ? C.success : C.text3, display: 'grid', placeItems: 'center', fontSize: 18 }}>
                {form.reminderEnabled ? <LuBell size={18} /> : <LuBell size={18} />}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>Automatic Reminders</div>
                <div style={{ fontSize: 11.5, color: C.text3, marginTop: 1 }}>Send reminders 24h, 1h, and 15min before class</div>
              </div>
              <div style={{
                width: 42, height: 24, borderRadius: 12,
                background: form.reminderEnabled ? C.grad : C.text3,
                position: 'relative', transition: 'background 0.2s',
                boxShadow: form.reminderEnabled ? '0 2px 6px rgba(22,163,74,0.3)' : 'none',
                flexShrink: 0,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3, left: form.reminderEnabled ? 21 : 3,
                  transition: 'left 0.2s cubic-bezier(0.22,1,0.36,1)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }} />
              </div>
            </div>
          </CollapsibleCard>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ position: 'sticky', top: 90 }}>
          <StickyCard title="Recipients" icon={<LuUsers size={16} />} accent>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
              {RECIPIENT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 11px', borderRadius: 20,
                    border: `1.5px solid ${form.recipientType === opt.value ? C.primaryLine : C.line}`,
                    background: form.recipientType === opt.value ? C.primarySoft : C.surface2,
                    color: form.recipientType === opt.value ? C.primary : C.text2,
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    transition: 'all 0.15s',
                  }}
                  onClick={() => update({ recipientType: opt.value, batchId: '', serviceId: '', courseId: '', workshopId: '' })}
                  onMouseEnter={e => { if (form.recipientType !== opt.value) { e.currentTarget.style.borderColor = C.primaryLine; e.currentTarget.style.color = C.text1; } }}
                  onMouseLeave={e => { if (form.recipientType !== opt.value) { e.currentTarget.style.borderColor = C.line; e.currentTarget.style.color = C.text2; } }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Filter selectors */}
            {form.recipientType === 'batch' && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.text2, marginBottom: 5 }}>Select Batch</div>
                <select
                  value={form.batchId}
                  onChange={e => update({ batchId: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', border: `1.5px solid ${C.line}`,
                    borderRadius: 10, background: C.surface2, color: C.text1,
                    fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
                    outline: 'none', cursor: 'pointer',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = C.primary}
                  onBlur={e => e.currentTarget.style.borderColor = C.line}
                >
                  <option value="">-- Choose Batch --</option>
                  {batches.map(b => (
                    <option key={b._id} value={b._id}>{b.name} ({b.timing})</option>
                  ))}
                </select>
              </div>
            )}

            {form.recipientType === 'service_members' && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.text2, marginBottom: 5 }}>Select Service</div>
                <select
                  value={form.serviceId}
                  onChange={e => update({ serviceId: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', border: `1.5px solid ${C.line}`,
                    borderRadius: 10, background: C.surface2, color: C.text1,
                    fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
                    outline: 'none', cursor: 'pointer',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = C.primary}
                  onBlur={e => e.currentTarget.style.borderColor = C.line}
                >
                  <option value="">-- All Active Services --</option>
                  {services.map(sv => (
                    <option key={sv._id} value={sv._id}>{sv.name}</option>
                  ))}
                </select>
              </div>
            )}

            {form.recipientType === 'course' && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.text2, marginBottom: 5 }}>Select Course</div>
                <select
                  value={form.courseId}
                  onChange={e => update({ courseId: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', border: `1.5px solid ${C.line}`,
                    borderRadius: 10, background: C.surface2, color: C.text1,
                    fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
                    outline: 'none', cursor: 'pointer',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = C.primary}
                  onBlur={e => e.currentTarget.style.borderColor = C.line}
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map(c => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>
              </div>
            )}

            {form.recipientType === 'workshop' && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.text2, marginBottom: 5 }}>Select Workshop</div>
                <select
                  value={form.workshopId}
                  onChange={e => update({ workshopId: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', border: `1.5px solid ${C.line}`,
                    borderRadius: 10, background: C.surface2, color: C.text1,
                    fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
                    outline: 'none', cursor: 'pointer',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = C.primary}
                  onBlur={e => e.currentTarget.style.borderColor = C.line}
                >
                  <option value="">-- Choose Workshop --</option>
                  {workshops.filter(w => w.isPublished).map(w => (
                    <option key={w._id} value={w._id}>{w.name} ({new Date(w.date).toLocaleDateString('en-KE')})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom search */}
            {form.recipientType === 'custom' && (
              <div>
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <LuSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.text3, zIndex: 1 }} />
                  <input
                    placeholder="Search by name, email, or phone..."
                    value={recipientSearch}
                    onChange={e => onRecipientSearchChange(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 36px 10px 38px',
                      border: `1.5px solid ${C.line}`, borderRadius: 10,
                      background: C.surface2, color: C.text1, fontSize: 13,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${C.primarySoft}`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = C.line; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  {recipientSearch && (
                    <button
                      onClick={() => onRecipientSearchChange('')}
                      style={{
                        position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                        width: 24, height: 24, border: 'none', borderRadius: 6,
                        background: C.surface3, cursor: 'pointer', display: 'grid', placeItems: 'center',
                        color: C.text2, transition: 'background 0.15s, color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.12)'; e.currentTarget.style.color = C.danger; }}
                      onMouseLeave={e => { e.currentTarget.style.background = C.surface3; e.currentTarget.style.color = C.text2; }}
                    >
                      <LuX size={11} />
                    </button>
                  )}
                </div>

                <div style={{
                  maxHeight: 280, overflow: 'auto',
                  border: `1px solid ${C.line}`, borderRadius: 11, marginBottom: 8,
                }}>
                  {loadingRecipients ? (
                    <div style={{ padding: 24, textAlign: 'center', color: C.text3, fontSize: 13 }}>
                      <LuLoader size={16} style={{ animation: 'spin 0.8s linear infinite', marginRight: 6, verticalAlign: 'middle' }} /> Loading students...
                    </div>
                  ) : filteredCandidates.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: C.text3, fontSize: 13 }}>
                      {recipientSearch ? 'No students match your search.' : 'Type at least 2 characters to search students.'}
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: `1px solid ${C.line2}` }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, color: C.text2, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectAll && filteredCandidates.length > 0}
                            onChange={toggleSelectAll}
                            style={{ accentColor: C.primary, width: 15, height: 15 }}
                          />
                          Select All
                        </label>
                        <span style={{ fontSize: 11, color: C.text3, fontWeight: 600 }}>{selectedIds.length} selected</span>
                      </div>
                      {filteredCandidates.map(st => {
                        const isSelected = selectedIds.includes(st._id);
                        return (
                          <div
                            key={st._id}
                            onClick={() => toggleStudent(st._id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '8px 12px', cursor: 'pointer',
                              background: isSelected ? C.primarySoft : 'transparent',
                              borderBottom: `1px solid ${C.line2}`,
                              transition: 'background 0.12s',
                            }}
                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = C.surface3; }}
                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleStudent(st._id)}
                              style={{ accentColor: C.primary, width: 15, height: 15, flexShrink: 0 }}
                            />
                            <Avatar name={st.name} size={s.avatarSm} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text1 }}>{st.name || 'Unknown'}</div>
                              <div style={{ fontSize: 10.5, color: C.text3 }}>{st.email}</div>
                            </div>
                            {st.batch && (
                              <span style={{
                                fontSize: 9.5, fontWeight: 700, padding: '1px 6px',
                                borderRadius: 4, background: C.primarySoft, color: C.primary,
                                whiteSpace: 'nowrap',
                              }}>
                                Batch
                              </span>
                            )}
                            {st.planMonths > 0 && (
                              <span style={{
                                fontSize: 9.5, fontWeight: 700, padding: '1px 6px',
                                borderRadius: 4, background: 'rgba(22,163,74,0.1)', color: C.success,
                                whiteSpace: 'nowrap',
                              }}>
                                Plan
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedIds.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {selectedIds.slice(0, 5).map(id => {
                      const st = recipientCandidates.find(s => s._id === id);
                      return st ? (
                        <div key={id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 8px 3px 4px', borderRadius: 20,
                          background: C.primarySoft, border: `1px solid ${C.primaryLine}`,
                          fontSize: 10.5,
                        }}>
                          <Avatar name={st.name} size={s.avatarSm} />
                          <span style={{ fontWeight: 600, color: C.primary, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {st.name}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleStudent(id); }}
                            style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.color = C.danger}
                            onMouseLeave={e => e.currentTarget.style.color = C.text3}
                          >
                            <LuX size={11} />
                          </button>
                        </div>
                      ) : null;
                    })}
                    {selectedIds.length > 5 && (
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: C.text3 }}>+{selectedIds.length - 5} more</span>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: C.text2 }}>
                  <span style={{ fontWeight: 600, color: C.primary }}>{selectedIds.length} selected</span>
                  {selectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { toggleSelectAll(); if (selectAll) { toggleSelectAll(); } }}
                      style={{
                        background: 'none', border: 'none', color: C.danger,
                        cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Info for all_members / trial */}
            {(form.recipientType === 'all_members' || form.recipientType === 'trial') && (
              <div style={{ fontSize: 12.5, color: C.text2, lineHeight: 1.6 }}>
                <p style={{ margin: 0 }}>
                  {form.recipientType === 'all_members'
                    ? 'All students with an active membership will receive this invitation.'
                    : 'All students with an active free trial will receive this invitation.'}
                </p>
                {loadingRecipients ? (
                  <div style={{ marginTop: 8, color: C.text3, fontSize: 12 }}>
                    <LuLoader size={12} style={{ animation: 'spin 0.8s linear infinite', marginRight: 4 }} /> Loading count...
                  </div>
                ) : recipientCandidates.length > 0 && (
                  <div style={{
                    marginTop: 8, padding: '6px 10px', background: C.primarySoft,
                    borderRadius: 8, fontSize: 12, color: C.primary, fontWeight: 600,
                  }}>
                    {recipientCandidates.length} eligible students found
                  </div>
                )}
              </div>
            )}

            {form.recipientType === 'service_members' && !loadingRecipients && singleSessionData?.isSingleSession && (
              <div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 6 }}>
                    Eligible Students: <span style={{ color: C.primary }}>{recipientCandidates.length}</span> &middot; Selected: <span style={{ color: C.primary }}>{selectedIds.length}</span>
                    {recipientCandidates.length > 0 && (
                      <span style={{ marginLeft: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: C.text2, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectAll && recipientCandidates.length > 0}
                            onChange={toggleSelectAll}
                            style={{ accentColor: C.primary, width: 14, height: 14, marginRight: 4 }}
                          />
                          Select All
                        </label>
                      </span>
                    )}
                  </div>
                </div>

                {recipientCandidates.length > 0 ? (
                  <div style={{
                    maxHeight: 260, overflow: 'auto',
                    border: `1px solid ${C.line}`, borderRadius: 11, marginBottom: 8,
                  }}>
                    {recipientCandidates.map(st => {
                      const isSelected = selectedIds.includes(st._id);
                      return (
                        <div
                          key={st._id}
                          onClick={() => toggleStudent(st._id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', cursor: 'pointer',
                            background: isSelected ? C.primarySoft : 'transparent',
                            borderBottom: `1px solid ${C.line2}`,
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = C.surface3; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleStudent(st._id)}
                            style={{ accentColor: C.primary, width: 15, height: 15, flexShrink: 0 }}
                          />
                          <Avatar name={st.name} size={s.avatarSm} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text1 }}>{st.name || 'Unknown'}</div>
                            <div style={{ fontSize: 10.5, color: C.text3 }}>{st.email}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: C.primary }}>
                              {st.remainingSessions ?? '-'} session{st.remainingSessions !== 1 ? 's' : ''}
                            </div>
                            {st.expiryDate && (
                              <div style={{ fontSize: 9.5, color: C.text3 }}>
                                expires {new Date(st.expiryDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    padding: '12px 14px', background: C.surface3,
                    borderRadius: 10, fontSize: 12, color: C.text2, textAlign: 'center',
                  }}>
                    No active students are available for this service.
                  </div>
                )}

                {selectedIds.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {selectedIds.slice(0, 5).map(id => {
                      const st = recipientCandidates.find(s => s._id === id);
                      return st ? (
                        <div key={id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 8px 3px 4px', borderRadius: 20,
                          background: C.primarySoft, border: `1px solid ${C.primaryLine}`,
                          fontSize: 10.5,
                        }}>
                          <Avatar name={st.name} size={s.avatarSm} />
                          <span style={{ fontWeight: 600, color: C.primary, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {st.name}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleStudent(id); }}
                            style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.color = C.danger}
                            onMouseLeave={e => e.currentTarget.style.color = C.text3}
                          >
                            <LuX size={11} />
                          </button>
                        </div>
                      ) : null;
                    })}
                    {selectedIds.length > 5 && (
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: C.text3 }}>+{selectedIds.length - 5} more</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {form.recipientType === 'service_members' && !loadingRecipients && !singleSessionData?.isSingleSession && recipientCandidates.length > 0 && (
              <div style={{
                marginTop: 8, padding: '6px 10px', background: C.primarySoft,
                borderRadius: 8, fontSize: 12, color: C.primary, fontWeight: 600,
              }}>
                {recipientCandidates.length} eligible students
              </div>
            )}

            {!form.recipientType && (
              <div style={{
                padding: '12px 14px', background: C.surface3,
                borderRadius: 10, fontSize: 12, color: C.text2, textAlign: 'center',
              }}>
                Select a recipient type above
              </div>
            )}
          </StickyCard>

          {/* ── Invitation Summary ── */}
          <StickyCard title="Invitation Summary" icon={<LuClipboardList size={16} />}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div style={{
                padding: 12, background: C.surface2, borderRadius: 10,
                border: `1px solid ${C.line}`, textAlign: 'center',
              }}>
                <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Recipients</div>
                <div style={{
                  fontSize: 24, fontWeight: 800, color: C.primary,
                  fontFamily: "'Outfit', 'Inter', system-ui, sans-serif", marginTop: 2,
                }}>
                  {getRecipientCount() || '—'}
                </div>
              </div>
              <div style={{
                padding: 12, background: C.surface2, borderRadius: 10,
                border: `1px solid ${C.line}`, textAlign: 'center',
              }}>
                <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Duration</div>
                <div style={{
                  fontSize: 24, fontWeight: 800, color: C.text1,
                  fontFamily: "'Outfit', 'Inter', system-ui, sans-serif", marginTop: 2,
                }}>
                  {form.duration || '—'} <span style={{ fontSize: 12, fontWeight: 600, color: C.text3 }}>min</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {form.title && (
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text1 }}>{form.title}</div>
              )}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {form.date && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: C.text2 }}>
                    <LuCalendarDays size={12} style={{ color: C.primary }} />
                    {formatDisplayDate(form.date)}
                  </span>
                )}
                {form.startTime && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: C.text2 }}>
                    <LuClock size={12} style={{ color: C.primary }} />
                    {formatTimeDisplay(form.startTime)}{form.endTime ? ` - ${formatTimeDisplay(form.endTime)}` : ''}
                  </span>
                )}
              </div>
              {form.platform && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: C.text2 }}>
                  <LuVideo size={12} style={{ color: C.primary }} />
                  {form.platform}
                </span>
              )}
              {form.meetingPassword && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: C.text2 }}>
                  <LuLock size={12} style={{ color: C.primary }} />
                  Password: {form.meetingPassword}
                </span>
              )}
            </div>

            {/* Reminder toggle display */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20,
              background: form.reminderEnabled ? 'rgba(22,163,74,0.1)' : C.surface3,
              color: form.reminderEnabled ? C.success : C.text3,
              fontSize: 10.5, fontWeight: 600, marginBottom: 12,
            }}>
              <LuBell size={10} />
              {form.reminderEnabled ? 'Reminders: 24h, 1h, 15min' : 'No reminders'}
            </div>

            {/* Validation warnings */}
            {validationErrors.length > 0 && (
              <div style={{
                padding: '8px 12px', background: 'rgba(220,38,38,0.08)',
                borderRadius: 10, fontSize: 12, color: C.danger, marginBottom: 12,
                lineHeight: 1.6,
              }}>
                {validationErrors.map((err, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <LuCircleAlert size={11} /> {err}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={onSend}
              disabled={!canSubmit}
              style={{
                width: '100%', padding: '13px 20px', border: 'none',
                background: canSubmit ? C.grad : C.surface3,
                color: canSubmit ? '#fff' : C.text3, borderRadius: 12,
                fontSize: 14, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
                fontFamily: "'Inter', system-ui, sans-serif",
                transition: 'all 0.2s, transform 0.1s',
                boxShadow: canSubmit ? '0 4px 14px rgba(46,125,91,0.35)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={e => { if (canSubmit) e.currentTarget.style.filter = 'brightness(1.07)'; }}
              onMouseLeave={e => { if (canSubmit) e.currentTarget.style.filter = 'none'; }}
            >
              <LuSend size={15} /> Send Invitation
            </button>
          </StickyCard>

          {/* ── Live Preview ── */}
          <StickyCard title="Live Preview" icon={<LuEye size={16} />}>
            <div style={{
              padding: 16, background: C.surface2, borderRadius: 12,
              border: `1px solid ${C.line}`,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                paddingBottom: 10, borderBottom: `1px solid ${C.line}`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: C.grad, color: '#fff', display: 'grid',
                  placeItems: 'center', fontSize: 16, flexShrink: 0,
                }}>
                  <LuMail size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>
                    {form.title || 'Class Invitation'}
                  </div>
                   <div style={{ fontSize: 10.5, color: C.text3 }}>From: Soma Wellness Studio</div>
                </div>
              </div>
              {form.description && (
                <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.6, margin: '0 0 10px' }}>
                  {form.description}
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: C.text2 }}>
                {form.date && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LuCalendarDays size={12} style={{ color: C.primary }} />
                    <span>{formatDisplayDateLong(form.date)}</span>
                  </div>
                )}
                {form.startTime && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LuClock size={12} style={{ color: C.primary }} />
                    <span>{formatTimeDisplay(form.startTime)}{form.endTime ? ` - ${formatTimeDisplay(form.endTime)}` : ''}</span>
                  </div>
                )}
                {form.duration && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LuClock4 size={12} style={{ color: C.primary }} />
                    <span>{form.duration} minutes</span>
                  </div>
                )}
                {form.platform && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LuVideo size={12} style={{ color: C.primary }} />
                    <span>{form.platform}</span>
                  </div>
                )}
                {form.instructor && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LuUser size={12} style={{ color: C.primary }} />
                    <span>{form.instructor}</span>
                  </div>
                )}
              </div>
              {form.meetingLink && (
                <div style={{
                  marginTop: 10, padding: '8px 10px', background: C.surface,
                  borderRadius: 8, border: `1px solid ${C.line}`,
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 11.5, color: C.primary,
                  wordBreak: 'break-all',
                }}>
                  <LuLink size={11} style={{ flexShrink: 0 }} />
                  <span>{form.meetingLink}</span>
                </div>
              )}
              {form.meetingPassword && (
                <div style={{
                  marginTop: 6, padding: '8px 10px', background: C.surface,
                  borderRadius: 8, border: `1px solid ${C.line}`,
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 11.5, color: C.text1,
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                  <LuLock size={11} style={{ flexShrink: 0, color: C.primary }} />
                  <span>Password: <strong>{form.meetingPassword}</strong></span>
                </div>
              )}
              {form.notes && (
                <div style={{
                  marginTop: 10, padding: 8, background: 'rgba(46,125,91,0.06)',
                  borderRadius: 8, border: `1px solid ${C.primaryLine}`, fontSize: 12,
                  color: C.text2,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.primary, marginBottom: 3 }}>Notes</div>
                  {form.notes}
                </div>
              )}
              <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                <span style={{
                  flex: 1, padding: '8px 0', borderRadius: 8,
                  background: C.grad, color: '#fff', fontSize: 12, fontWeight: 700,
                  textAlign: 'center', display: 'block',
                  boxShadow: '0 2px 8px rgba(46,125,91,0.25)',
                }}>
                  Join Class
                </span>
              </div>
            </div>
          </StickyCard>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DETAIL VIEW
   ═══════════════════════════════════════════════════════════════ */
function DetailView({ inviteId, onBack, onRefresh, flash }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await classInvitesApi.get(inviteId);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) flash(err.message, 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [inviteId, flash]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Invitation Details" subtitle="Loading..." />
        <div className={s.card}>
          <div className={`${s.skel} ${s.skelRow}`} style={{ marginBottom: 10 }} />
          <div className={`${s.skel} ${s.skelRow}`} style={{ marginBottom: 10 }} />
          <div className={`${s.skel} ${s.skelRow}`} />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div>
        <PageHeader title="Invitation Details" subtitle="Not found">
          <button className={`${s.btn} ${s.btnSm}`} onClick={onBack}>
            <LuChevronLeft size={14} /> Back
          </button>
        </PageHeader>
        <div className={s.card}>
          <div className={s.emptyState}>Failed to load invitation details.</div>
        </div>
      </div>
    );
  }

  const isPast = new Date(detail.date) < new Date();
  const statusLabel = detail.status === 'active'
    ? isPast ? 'Completed' : 'Active'
    : detail.status === 'cancelled' ? 'Cancelled' : detail.status;
  const isActive = detail.status === 'active' && !isPast;

  const handleCancel = async () => {
    const reason = window.prompt('Reason for cancellation (optional):');
    try {
      await classInvitesApi.cancel(inviteId, reason || '');
      flash('Invitation cancelled. Students notified.');
      await onRefresh();
      setDetail(prev => prev ? { ...prev, status: 'cancelled', cancelReason: reason || '', cancelledAt: new Date() } : null);
    } catch (err) {
      flash(err.message, 'error');
    }
  };

  const handleResend = async () => {
    try {
      const result = await classInvitesApi.resend(inviteId);
      flash(`Resent to ${result.sentCount || 0} pending students.`);
      await onRefresh();
    } catch (err) {
      flash(err.message, 'error');
    }
  };

  const handleDuplicate = async () => {
    try {
      await classInvitesApi.duplicate(inviteId);
      flash('Invitation duplicated.');
      await onRefresh();
    } catch (err) {
      flash(err.message, 'error');
    }
  };

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 22, gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <button
              onClick={onBack}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', color: C.text3, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif",
                padding: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.primary}
              onMouseLeave={e => e.currentTarget.style.color = C.text3}
            >
              <LuChevronLeft size={14} /> Back to Invitations
            </button>
          </div>
          <h2 style={{ fontFamily: "'Outfit', 'Inter', system-ui, sans-serif", fontSize: 22, fontWeight: 800, color: C.text1, margin: 0, letterSpacing: '-0.03em' }}>
            {detail.title}
          </h2>
          <p style={{ fontSize: 13, color: C.text2, marginTop: 4 }}>
            Sent {new Date(detail.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className={`${s.btn} ${s.btnSm}`} onClick={onBack}>
            <LuArrowLeft size={14} /> Back
          </button>
          {isActive && (
            <>
              <button className={`${s.btn} ${s.btnSm}`} onClick={handleResend}>
                <LuSend size={13} /> Resend
              </button>
              <button className={`${s.btn} ${s.btnSm}`} onClick={handleDuplicate}>
                <LuCopyPlus size={13} /> Duplicate
              </button>
              <button className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} onClick={handleCancel}>
                <LuTrash2 size={13} /> Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className={s.gridDash}>
        <div>
          <div className={s.card}>
            <h3 className={s.cardTitle}>
              <span className={s.cardTitleIcon}><LuCalendarDays /></span>
              Class Details
            </h3>
            <div className={s.grid3} style={{ marginBottom: 14 }}>
              <div>
                <div className={s.statLabel}>Date</div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>
                  {new Date(detail.date).toLocaleDateString('en-KE', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </div>
              </div>
              <div>
                <div className={s.statLabel}>Time</div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>
                  {formatTimeDisplay(detail.startTime)}{detail.endTime && detail.endTime !== 'undefined' ? ` - ${formatTimeDisplay(detail.endTime)}` : ''}
                </div>
              </div>
              <div>
                <div className={s.statLabel}>Duration</div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{detail.duration} min</div>
              </div>
            </div>
            <div className={s.grid3} style={{ marginBottom: 14 }}>
              <div>
                <div className={s.statLabel}>Instructor</div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{detail.instructor || '—'}</div>
              </div>
              <div>
                <div className={s.statLabel}>Platform</div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{detail.platform}</div>
              </div>
              <div>
                <div className={s.statLabel}>Status</div>
                <div style={{ marginTop: 4 }}><Badge label={statusLabel} /></div>
              </div>
            </div>
            {detail.meetingLink && (
              <div style={{ marginBottom: 12 }}>
                <div className={s.statLabel}>Meeting Link</div>
                <a href={detail.meetingLink} target="_blank" rel="noopener noreferrer" style={{
                  color: C.primary, fontSize: 13, wordBreak: 'break-all', marginTop: 4,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  <LuLink size={13} /> {detail.meetingLink}
                </a>
              </div>
            )}
            {detail.meetingPassword && (
              <div style={{ marginBottom: 12 }}>
                <div className={s.statLabel}>Meeting Password</div>
                <div style={{ marginTop: 4, fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>{detail.meetingPassword}</div>
              </div>
            )}
            {detail.description && (
              <div style={{ marginBottom: 12 }}>
                <div className={s.statLabel}>Description</div>
                <div style={{ marginTop: 4, fontSize: 13, color: C.text2, lineHeight: 1.6 }}>{detail.description}</div>
              </div>
            )}
            {detail.notes && (
              <div style={{
                padding: 12, background: C.primarySoft, borderRadius: 11,
                border: `1px solid ${C.primaryLine}`, marginBottom: 12,
              }}>
                <div className={s.statLabel} style={{ color: C.primary }}>Notes for Students</div>
                <div style={{ marginTop: 4, fontSize: 13, color: C.text2 }}>{detail.notes}</div>
              </div>
            )}
            {detail.reminderConfig?.enabled && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20,
                background: 'rgba(22,163,74,0.1)', color: C.success,
                fontSize: 11, fontWeight: 600,
              }}>
                <LuBell size={11} /> Reminders: {detail.reminderConfig.reminders?.map(
                  m => m >= 1440 ? `${m / 1440}d` : m >= 60 ? `${m / 60}h` : `${m}min`
                ).join(', ') || 'None'}
              </div>
            )}
          </div>

          <div className={s.card}>
            <h3 className={s.cardTitle}>
              <span className={s.cardTitleIcon}><LuUsers /></span>
              Recipient Info
            </h3>
            <div className={s.healthRow}>
              <span className={s.healthLabel}>Sent to</span>
              <Badge label={detail.recipientType?.replace(/_/g, ' ') || 'Custom'} />
            </div>
            {detail.entityLabel && (
              <div className={s.healthRow}>
                <span className={s.healthLabel}>Entity</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                  background: detail.entityType === 'service' ? 'rgba(22,163,74,0.12)'
                    : detail.entityType === 'membership' ? 'rgba(46,125,91,0.12)'
                    : detail.entityType === 'course' ? 'rgba(124,58,237,0.12)'
                    : detail.entityType === 'trial' ? 'rgba(217,119,6,0.12)'
                    : detail.entityType === 'workshop' ? 'rgba(37,99,235,0.12)'
                    : detail.entityType === 'batch' ? 'rgba(8,145,178,0.12)'
                    : 'rgba(124,106,88,0.12)',
                  color: detail.entityType === 'service' ? '#16A34A'
                    : detail.entityType === 'membership' ? '#2E7D5B'
                    : detail.entityType === 'course' ? '#7C3AED'
                    : detail.entityType === 'trial' ? '#D97706'
                    : detail.entityType === 'workshop' ? '#2563EB'
                    : detail.entityType === 'batch' ? '#0891B2'
                    : '#7C6A58',
                }}>
                  {detail.entityLabel}
                </span>
              </div>
            )}
            {detail.createdBy && (
              <div className={s.healthRow}>
                <span className={s.healthLabel}>Created by</span>
                <span style={{ fontWeight: 600 }}>{detail.createdBy?.name || 'Admin'}</span>
              </div>
            )}
            <div className={s.healthRow} style={{ borderBottom: 'none' }}>
              <span className={s.healthLabel}>Sent at</span>
              <span style={{ fontWeight: 600 }}>
                {new Date(detail.createdAt).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className={s.card}>
            <h3 className={s.cardTitle}>
              <span className={s.cardTitleIcon}><LuUsers /></span>
              Recipients ({detail.totalRecipients})
            </h3>
            <div className={s.grid2} style={{ gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Delivered', value: detail.deliveredCount || 0, color: C.primary },
                { label: 'Read', value: detail.readCount || 0, color: C.success },
                { label: 'Pending', value: detail.pendingCount || 0, color: C.warning },
                { label: 'Total', value: detail.totalRecipients || 0, color: C.text1 },
              ].map(stat => (
                <div key={stat.label} style={{
                  padding: '10px 12px', background: C.surface2, borderRadius: 10,
                  border: `1px solid ${C.line}`, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: stat.color, fontFamily: "'Outfit', 'Inter', system-ui, sans-serif", marginTop: 2 }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ maxHeight: 320, overflow: 'auto', border: `1px solid ${C.line}`, borderRadius: 10 }}>
              {detail.recipients?.length > 0 ? (
                <table className={s.table} style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>Student</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                      <th style={{ padding: '8px 12px' }}>Read At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.recipients.map((r, i) => (
                      <tr key={r.user?._id || i}>
                        <td style={{ padding: '7px 12px' }}>
                          <div className={s.cellUser}>
                            <Avatar name={r.user?.name || r.name} size={s.avatarSm} />
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 500 }}>{r.user?.name || r.name || 'Unknown'}</div>
                              <div style={{ fontSize: 10.5, color: C.text3 }}>{r.user?.email || r.email || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          <span className={`${s.badge} ${
                            r.status === 'read' || r.status === 'joined'
                              ? s.badgeGreen
                              : r.status === 'delivered' ? s.badgeBlue : s.badgeAmber
                          }`}>
                            {r.status === 'joined' ? 'Joined' : r.status}
                          </span>
                        </td>
                        <td style={{ padding: '7px 12px', fontSize: 11, color: C.text2 }}>
                          {r.readAt
                            ? new Date(r.readAt).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 20, textAlign: 'center', color: C.text3, fontSize: 13 }}>No recipient data.</div>
              )}
            </div>
          </div>

          {detail.history?.length > 0 && (
            <div className={s.card}>
              <h3 className={s.cardTitle}>
                <span className={s.cardTitleIcon}><LuClock /></span>
                Activity History
              </h3>
              <div className={s.timeline}>
                {detail.history.map((h, i) => (
                  <div key={i} className={s.timeItem}>
                    <div className={`${s.timeIcon} ${
                      h.action === 'created' ? s.timeIconGreen
                      : h.action === 'cancelled' ? s.timeIconAmber
                      : s.timeIconBlue
                    }`}>
                      {h.action === 'created' ? <LuCheck size={14} />
                      : h.action === 'cancelled' ? <LuX size={14} />
                      : h.action === 'resent' ? <LuSend size={14} />
                      : <LuClock size={14} />}
                    </div>
                    <div className={s.timeBody}>
                      <div className={s.timeTitle}>
                        {h.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </div>
                      {h.note && <div className={s.timeMeta}>{h.note}</div>}
                      <div className={s.timeMeta}>
                        {h.at ? new Date(h.at).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}