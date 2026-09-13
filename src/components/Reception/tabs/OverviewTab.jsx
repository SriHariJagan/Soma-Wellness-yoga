import React from 'react';
import {
  LuUsers, LuCalendarCheck, LuMail, LuActivity,
  LuClock, LuUserPlus, LuBookOpen, LuTrendingUp,
  LuArrowRight, LuCalendarDays, LuLogIn, LuPencil,
} from 'react-icons/lu';
import { useAuth } from '../../../context/AuthContext';
import s from '../../Admin/YogaAdmin.module.css';

const STAT_COLORS = [
  { bg: 'rgba(46,125,91,0.10)', fg: '#2E7D5B', border: 'rgba(46,125,91,0.18)' },
  { bg: 'rgba(249,115,22,0.10)', fg: '#EA580C', border: 'rgba(249,115,22,0.18)' },
  { bg: 'rgba(244,180,0,0.12)', fg: '#B45309', border: 'rgba(244,180,0,0.22)' },
  { bg: 'rgba(45,122,219,0.10)', fg: '#2563EB', border: 'rgba(45,122,219,0.18)' },
];

const ACTIVITY_STYLES = {
  login: { icon: <LuLogIn size={14} />, bg: 'rgba(46,125,91,0.12)', color: '#2E7D5B' },
  register: { icon: <LuUserPlus size={14} />, bg: 'rgba(22,163,74,0.12)', color: '#16A34A' },
  edit: { icon: <LuPencil size={14} />, bg: 'rgba(45,122,219,0.12)', color: '#2563EB' },
  attendance: { icon: <LuCalendarCheck size={14} />, bg: 'rgba(249,115,22,0.12)', color: '#EA580C' },
  invite: { icon: <LuMail size={14} />, bg: 'rgba(244,180,0,0.14)', color: '#B45309' },
  booking: { icon: <LuBookOpen size={14} />, bg: 'rgba(244,180,0,0.14)', color: '#B45309' },
  default: { icon: <LuActivity size={14} />, bg: 'rgba(46,125,91,0.08)', color: '#2E7D5B' },
};

function activityCategory(action = '') {
  const a = String(action).toLowerCase();
  if (a.includes('login')) return 'login';
  if (a.includes('register') || a.startsWith('added student')) return 'register';
  if (a.includes('edited student') || a.includes('status') || a.includes('password')) return 'edit';
  if (a.includes('marked') || a.includes('attendance') || a.includes('locked') || a.includes('reset attendance')) return 'attendance';
  if (a.includes('invite')) return 'invite';
  if (a.includes('booking')) return 'booking';
  return 'default';
}

// Turn a raw log action ("user_login", "Added student: foo@bar.com",
// "Marked present for …") into a professional { verb, subject } pair.
// The subject prefers the populated target user's name over raw emails/ids.
function describeActivity(log) {
  const action = String(log?.action || '');
  const targetName = log?.targetUser && typeof log.targetUser === 'object' ? log.targetUser.name : null;

  const prettifyKey = (key) => String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  let m = action.match(/^Added student:\s*(.+)$/i);
  if (m) return { verb: 'added student', subject: targetName || m[1].trim() };
  m = action.match(/^Edited student:\s*(.+)$/i);
  if (m) return { verb: 'updated student', subject: targetName || m[1].trim() };
  m = action.match(/^Set status=(\w+)\s+for\s+(.+)$/i);
  if (m) return { verb: `set status to ${m[1]}`, subject: targetName || m[2].trim() };
  m = action.match(/^Marked\s+(present|absent|late|zoom)\s+for\s+/i);
  if (m) {
    const status = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    return { verb: 'marked attendance', subject: targetName ? `${targetName} · ${status}` : status };
  }
  if (/^Bulk marked/i.test(action)) {
    const n = action.match(/(\d+)/)?.[1];
    return { verb: 'bulk-marked attendance', subject: n ? `${n} records` : null };
  }
  m = action.match(/^Marked all present\s*\((\d+)\)/i);
  if (m) return { verb: 'marked everyone present', subject: `${m[1]} students` };
  if (action === 'user_login') return { verb: 'signed in', subject: null };
  if (action === 'user_registered') return { verb: 'registered', subject: targetName };
  if (action === 'password_changed') return { verb: 'changed password', subject: null };
  // Already-human sentences (invites, resets, locks…) read fine as-is.
  if (/\s/.test(action)) return { verb: action.charAt(0).toLowerCase() + action.slice(1), subject: null };
  return { verb: prettifyKey(action).charAt(0).toLowerCase() + prettifyKey(action).slice(1), subject: null };
}

function getInitial(name) {
  return (name || '?')[0].toUpperCase();
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function OverviewTab({ overview, activityLog, overviewError, onNavigate }) {
  const { user, hasAnyPermission } = useAuth();
  const canViewCustomers = hasAnyPermission('customers.view', 'users.view');
  const canCreateCustomers = hasAnyPermission('customers.create', 'users.create');
  const metrics = overview?.metrics || {};
  const recentStudents = overview?.recentStudents || [];
  const todayClassesCount = Array.isArray(overview?.todaySchedule)
    ? overview.todaySchedule.length
    : (metrics.todayClasses ?? 0);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const stats = [
    { label: 'Total Students', value: metrics.totalStudents ?? 0, icon: <LuUsers size={22} /> },
    { label: "Today's Classes", value: todayClassesCount, icon: <LuCalendarCheck size={22} /> },
    { label: 'Pending Bookings', value: metrics.pendingBookings ?? 0, icon: <LuMail size={22} /> },
    { label: 'New This Month', value: metrics.newThisMonth ?? 0, icon: <LuTrendingUp size={22} /> },
  ];

  if (!overview) {
    return (
      <div className={s.receptionOverview}>
        <div className={s.receptionWelcome}>
          <div className={s.receptionWelcomeText}>
            <div className={s.receptionWelcomeGreeting}>{greeting}</div>
            <h2 className={s.receptionWelcomeTitle}>
              Welcome back, <span style={{ color: '#FFD54F' }}>{(user?.name || 'there').split(' ')[0]}</span>
            </h2>
            <p className={s.receptionWelcomeSub}>
              {overviewError || 'Overview is loading or unavailable.'}{' '}
              Contact an admin to grant access (customers.view, bookings.view or attendance.view).
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.receptionOverview}>
      {/* Welcome Banner */}
      <div className={s.receptionWelcome}>
        <div className={s.receptionWelcomeText}>
          <div className={s.receptionWelcomeGreeting}>{greeting}</div>
          <h2 className={s.receptionWelcomeTitle}>
            Welcome back, <span style={{ color: '#FFD54F' }}>{(user?.name || 'there').split(' ')[0]}</span>
          </h2>
          <p className={s.receptionWelcomeSub}>Here's what's happening at SomaWellness today.</p>
        </div>
          <div className={s.receptionWelcomeRight}>
            <div className={s.receptionWelcomeTime}>
              <LuClock size={14} />
              <span>{now.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            {(canViewCustomers || canCreateCustomers) && (
              <button
                type="button"
                className={s.receptionWelcomeQuickAction}
                onClick={() => onNavigate?.('customers', canCreateCustomers ? 'create' : 'list')}
                title={canCreateCustomers ? 'Add a new student' : 'View customers'}
                style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}
              >
                <LuUserPlus size={15} />
                <span>New Student</span>
              </button>
            )}
          </div>
      </div>

      {/* Stat Cards */}
      <div className={s.receptionStatsGrid}>
        {stats.map((stat, i) => (
          <div key={stat.label} className={s.receptionStatCard}>
            <div className={s.receptionStatAccent} style={{ background: STAT_COLORS[i].fg }} />
            <div className={s.receptionStatIcon} style={{ background: STAT_COLORS[i].bg, color: STAT_COLORS[i].fg, borderColor: STAT_COLORS[i].border }}>
              {stat.icon}
            </div>
            <div className={s.receptionStatBody}>
              <div className={s.receptionStatValue}>{stat.value}</div>
              <div className={s.receptionStatLabel}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column */}
      <div className={s.receptionTwoCol}>
        {/* Recent Registrations */}
        <div className={s.receptionPanel}>
          <div className={s.receptionPanelHeader}>
            <h3 className={s.receptionPanelTitle}>
              <LuUserPlus size={16} /> Recent Registrations
            </h3>
            {recentStudents.length > 0 && canViewCustomers && (
              <button
                type="button"
                className={s.receptionPanelLink}
                onClick={() => onNavigate?.('customers', 'list')}
                style={{ cursor: 'pointer', border: 'none', background: 'none', font: 'inherit' }}
              >
                View all <LuArrowRight size={13} />
              </button>
            )}
          </div>
          <div className={s.receptionPanelBody}>
            {recentStudents.length === 0 ? (
              <div className={s.receptionEmpty}>
                <div className={s.receptionEmptyIcon}>
                  <LuUsers size={28} />
                </div>
                <p className={s.receptionEmptyText}>No recent registrations</p>
                <p className={s.receptionEmptyHint}>New students will appear here once they register.</p>
              </div>
            ) : (
              <div className={s.receptionStudentList}>
                {recentStudents.slice(0, 5).map((st, i) => (
                  <div key={st._id} className={s.receptionStudentRow}>
                    <div className={`${s.receptionStudentAvatar} ${s[`av${i % 6}`]}`}>
                      {getInitial(st.name)}
                    </div>
                    <div className={s.receptionStudentInfo}>
                      <span className={s.receptionStudentName}>{st.name}</span>
                      <span className={s.receptionStudentEmail}>{st.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className={s.receptionPanel}>
          <div className={s.receptionPanelHeader}>
            <h3 className={s.receptionPanelTitle}>
              <LuActivity size={16} /> Recent Activity
            </h3>
            {activityLog.length > 0 && (
              <span className={s.receptionActivityCount}>{activityLog.length} events</span>
            )}
          </div>
          <div className={s.receptionPanelBody}>
            {activityLog.length === 0 ? (
              <div className={s.receptionEmpty}>
                <div className={s.receptionEmptyIcon}>
                  <LuActivity size={28} />
                </div>
                <p className={s.receptionEmptyText}>No recent activity</p>
                <p className={s.receptionEmptyHint}>Activity from your team will show up here.</p>
              </div>
            ) : (
              <div className={s.receptionActivityFeed}>
                {activityLog.slice(0, 6).map((entry, i) => {
                  const ai = ACTIVITY_STYLES[activityCategory(entry.action)] || ACTIVITY_STYLES.default;
                  const { verb, subject } = describeActivity(entry);
                  const actor = entry?.performedBy && typeof entry.performedBy === 'object'
                    ? (entry.performedBy.name || entry.performedBy.email || 'Someone')
                    : (user?.name || 'Someone');
                  return (
                    <div key={entry._id} className={s.receptionActivityItem}>
                      <div className={`${s.receptionStudentAvatar} ${s[`av${i % 6}`]}`} title={actor}>
                        {getInitial(actor)}
                      </div>
                      <div className={s.receptionActivityContent}>
                        <span className={s.receptionActivityAction}>
                          <strong>{actor}</strong> {verb}
                          {subject ? (<> <strong>{subject}</strong></>) : null}
                        </span>
                        <span className={s.receptionActivityTime} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span
                            className={s.receptionActivityDot}
                            style={{ background: ai.bg, color: ai.color, width: 20, height: 20, borderRadius: 6 }}
                          >
                            {ai.icon}
                          </span>
                          {timeAgo(entry.createdAt)}
                        </span>
                      </div>
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
