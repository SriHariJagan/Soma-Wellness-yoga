import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./FreeTrialPage.module.css";
import { Stagger, Item, PageHeader, EmptyState, PrimaryButton } from "./widgets/DashboardWidgets";
import {
  startFreeTrial, getMyTrial, getMyTrialSessions, getMyTrialNotifications,
  markTrialNotificationRead, markAllTrialNotificationsRead
} from "../api/StudentServices.js";
import Badge from "../Admin/Badge";
import TrialSessionModal from "./TrialSessionModal";
import { LuLink, LuBell, LuGift, LuSparkles, LuShieldCheck, LuClock, LuZap, LuCalendar, LuArrowRight, LuLoader } from "react-icons/lu";

function TrialStatusBadge({ status }) {
  const map = { active: "Active", expired: "Expired", converted: "Converted", cancelled: "Cancelled" };
  const cls = {
    active: styles.trialStatusActive,
    expired: styles.trialStatusExpired,
    converted: styles.trialStatusConverted,
    cancelled: styles.trialStatusCancelled,
  };
  return <span className={`${styles.trialStatus} ${cls[status] || ""}`}>{map[status] || status}</span>;
}

const STATUS_LABEL = {
  cancelled: 'Cancelled', rescheduled: 'Rescheduled', completed: 'Completed',
  missed: 'Missed', live: 'Live Now', pending_attendance: 'Pending Attendance', upcoming: 'Upcoming',
};

export default function FreeTrialPage({ student, reload }) {
  const navigate = useNavigate();
  const [trial, setTrial] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("sessions");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const pollRef = useRef();

  const hasActivePlan = student?.planActive && (student?.planMonths || 0) > 0;

  const fetchTrial = useCallback(async (isInitial) => {
    if (isInitial) setInitialLoading(true);
    else setRefreshing(true);
    setStartError("");
    try {
      const [t, sess, notif] = await Promise.all([
        getMyTrial().catch(() => null),
        getMyTrialSessions().catch(() => []),
        getMyTrialNotifications().catch(() => []),
      ]);
      const trialData = t?.trial || t || null;
      if (trialData && trialData.status === 'none') {
        setTrial(null);
      } else {
        setTrial(trialData);
      }
      setSessions(Array.isArray(sess) ? sess : sess?.sessions || []);
      setNotifications(Array.isArray(notif) ? notif : notif?.notifications || []);
    } catch {
      setTrial(null);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTrial(true); }, [fetchTrial]);

  useEffect(() => {
    if (!trial || trial.status !== 'active') return;
    pollRef.current = setInterval(() => { fetchTrial(false); }, 30000);
    return () => clearInterval(pollRef.current);
  }, [trial?.status, fetchTrial]);

  async function handleStart() {
    setStarting(true);
    setStartError("");
    try {
      await startFreeTrial();
      await fetchTrial(true);
      await reload?.();
    } catch (err) {
      setStartError(err.message || "Could not start trial. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  async function handleMarkRead(id) {
    try {
      await markTrialNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch {}
  }

  async function handleMarkAllRead() {
    try {
      await markAllTrialNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  }

  if (initialLoading) {
    return (
      <>
        <PageHeader title="Free Trial" />
        <div className={styles.loading}>Loading your trial information…</div>
      </>
    );
  }

  if (!trial) {
    const showPlanBlocked = hasActivePlan;
    const showUsedBlocked = !hasActivePlan;

    return (
      <Stagger>
        <Item>
          <PageHeader title="Free Trial" sub="Experience 7 days of yoga, absolutely free." />
        </Item>

        {showPlanBlocked && (
          <Item>
            <div className={styles.blockedCard}>
              <div className={styles.blockedIconWrap}>
                <LuShieldCheck size={28} />
              </div>
              <h3 className={styles.blockedTitle}>You Already Have an Active Plan</h3>
              <p className={styles.blockedText}>
                The 7-day free trial is only available for students without an active membership plan.
                Since you already have a <strong>{student.planMonths}-month plan</strong>, you can enjoy all the benefits
                included in your current membership.
              </p>
              <button
                onClick={() => navigate("/studentdashboard?tab=classes")}
                className={styles.blockedCta}
              >
                Browse Classes <LuArrowRight size={16} />
              </button>
            </div>
          </Item>
        )}

        {!showPlanBlocked && (
          <Item>
            <div className={styles.onboardCard}>
              <div className={styles.onboardGlow} />
              <div className={styles.onboardContent}>
                <div className={styles.onboardIconWrap}>
                  <LuGift size={28} />
                </div>
                <h2 className={styles.onboardTitle}>Start Your 7-Day Free Trial</h2>
                <p className={styles.onboardSubtitle}>
                  Unlock full access to all yoga classes, guided meditations, and wellness workshops —
                  zero commitment, no payment required.
                </p>

                <div className={styles.benefitsGrid}>
                  <div className={styles.benefitItem}>
                    <div className={styles.benefitIcon}><LuSparkles size={16} /></div>
                    <div>
                      <div className={styles.benefitLabel}>Unlimited Classes</div>
                      <div className={styles.benefitDesc}>Access all group yoga sessions</div>
                    </div>
                  </div>
                  <div className={styles.benefitItem}>
                    <div className={styles.benefitIcon}><LuCalendar size={16} /></div>
                    <div>
                      <div className={styles.benefitLabel}>7 Days Free</div>
                      <div className={styles.benefitDesc}>Full access, no charges</div>
                    </div>
                  </div>
                  <div className={styles.benefitItem}>
                    <div className={styles.benefitIcon}><LuZap size={16} /></div>
                    <div>
                      <div className={styles.benefitLabel}>7 Sessions Included</div>
                      <div className={styles.benefitDesc}>Try different class styles</div>
                    </div>
                  </div>
                  <div className={styles.benefitItem}>
                    <div className={styles.benefitIcon}><LuClock size={16} /></div>
                    <div>
                      <div className={styles.benefitLabel}>Cancel Anytime</div>
                      <div className={styles.benefitDesc}>No penalties, no questions</div>
                    </div>
                  </div>
                </div>

                <div className={styles.rulesCard}>
                  <div className={styles.rulesTitle}><LuShieldCheck size={14} /> Trial Rules</div>
                  <ul className={styles.rulesList}>
                    <li>One trial per account — cannot be repeated</li>
                    <li>Valid for 7 days from activation</li>
                    <li>Includes up to 7 class sessions</li>
                    <li>Cannot be used alongside an active membership plan</li>
                    <li>No automatic conversion to paid plan after trial</li>
                  </ul>
                </div>

                {startError && (
                  <div className={styles.errorBanner}>
                    <LuBell size={14} />
                    <span>{startError}</span>
                  </div>
                )}

                <button
                  onClick={handleStart}
                  disabled={starting}
                  className={styles.ctaButton}
                >
                  {starting ? (
                    <><LuLoader size={18} className={styles.spin} /> Activating Your Trial…</>
                  ) : (
                    <><LuZap size={18} /> Start Free Trial Now</>
                  )}
                </button>
              </div>
            </div>
          </Item>
        )}
      </Stagger>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const sessionsCompleted = trial.completedSessions || 0;
  const maxSessions = trial.maxSessions || 7;
  const sessionsLeft = trial.sessionsLeft ?? (maxSessions - sessionsCompleted);
  const sessionsProgressPct = trial.sessionsProgressPct || 0;
  const upcomingCount = sessions.filter(s => s.computedStatus === 'upcoming' || s.computedStatus === 'live').length;

  const card = {
    background: 'linear-gradient(135deg, #ffffff 0%, var(--color-bg-tertiary) 130%)',
    borderRadius: 16, border: '1px solid var(--color-border-light)',
    overflow: 'hidden',
  };
  const th = {
    padding: '10px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
    textTransform: 'uppercase', color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--color-border-light)', textAlign: 'left', whiteSpace: 'nowrap',
  };
  const td = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid var(--color-border-light)' };
  const muted = { color: 'var(--color-text-muted)' };

  const headerSub = trial.status === 'active'
    ? `${sessionsCompleted} of ${maxSessions} sessions completed`
    : trial.status === 'expired'
      ? 'Trial ended'
      : trial.status === 'converted'
        ? 'Trial converted to membership'
        : 'Trial cancelled';

  return (
    <Stagger>
      <Item>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <PageHeader title="Free Trial" sub={headerSub} />
          </div>
          <button onClick={() => fetchTrial(false)} disabled={refreshing} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-light)',
            color: 'var(--color-text-secondary)', transition: 'all 0.15s', opacity: refreshing ? 0.7 : 1,
          }}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </Item>

      <Item>
        <div style={{
          ...card, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          padding: '18px 22px',
        }}>
          <TrialStatusBadge status={trial.status} />

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div style={{
                flex: 1, height: 8, background: 'var(--color-bg-secondary)', borderRadius: 6,
                overflow: 'hidden', maxWidth: 300,
              }}>
                <div style={{
                  height: '100%', borderRadius: 6,
                  background: sessionsProgressPct >= 90 ? 'var(--color-error)' : sessionsProgressPct >= 70 ? 'var(--color-warning)' : 'var(--color-primary)',
                  width: `${sessionsProgressPct}%`, transition: 'width 0.6s ease',
                }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                {sessionsProgressPct}%
              </span>
            </div>
            <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--color-text-muted)' }}>
              <span><strong style={{ color: 'var(--color-text-secondary)' }}>{sessionsCompleted}</strong> / {maxSessions} sessions</span>
              <span><strong style={{ color: 'var(--color-text-secondary)' }}>{sessionsLeft}</strong> sessions left</span>
            </div>
          </div>

          {trial.status === 'active' && upcomingCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: 'rgba(22,163,74,0.1)', color: '#16A34A',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />
              {upcomingCount} upcoming
            </span>
          )}
        </div>
      </Item>

      <Item>
        <div style={{
          display: 'flex', gap: 0, borderBottom: '2px solid var(--color-border-light)',
          marginBottom: 0,
        }}>
          <button style={{
            padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: 'none', border: 'none',
            borderBottom: tab === 'sessions' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: tab === 'sessions' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            marginBottom: -2, transition: 'color 0.15s, border-color 0.15s',
          }} onClick={() => setTab("sessions")}>
            Sessions ({sessions.length})
          </button>
          <button style={{
            padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: 'none', border: 'none',
            borderBottom: tab === 'notifications' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: tab === 'notifications' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            marginBottom: -2, transition: 'color 0.15s, border-color 0.15s',
          }} onClick={() => setTab("notifications")}>
            Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </button>
        </div>
      </Item>

      {tab === "sessions" && (
        <Item key="sessions">
          {sessions.length === 0 ? (
            <EmptyState icon="ti-calendar" title="No sessions scheduled yet." sub="Your instructor will add sessions soon." />
          ) : (
            <div style={card}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
                  <thead>
                    <tr>
                      <th style={th}>Session Title</th>
                      <th style={th}>Date</th>
                      <th style={th}>Time</th>
                      <th style={th}>Instructor</th>
                      <th style={th}>Meeting Link</th>
                      <th style={th}>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((sess) => (
                      <tr
                        key={sess._id}
                        onClick={() => setSelectedSessionId(sess._id)}
                        style={{ cursor: 'pointer', transition: 'background 0.12s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = ''}
                      >
                        <td style={td}><strong>{sess.title}</strong></td>
                        <td style={{ ...td, ...muted }}>
                          {sess.date ? new Date(sess.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '—'}
                        </td>
                        <td style={{ ...td, ...muted }}>{sess.startTime || '—'}</td>
                        <td style={{ ...td, ...muted }}>{sess.instructor?.name || sess.instructor || '—'}</td>
                        <td style={td}>
                          {sess.meetingLink ? (
                            <a href={sess.meetingLink} target="_blank" rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: 'var(--color-primary)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <LuLink size={12} /> Join
                            </a>
                          ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                        </td>
                        <td style={td}>
                          <Badge label={STATUS_LABEL[sess.computedStatus] || 'Upcoming'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Item>
      )}

      {tab === "notifications" && (
        <Item key="notifications">
          {unreadCount > 0 && (
            <button style={{ marginBottom: 10, fontSize: 12, fontWeight: 600, background: "none", border: "none", color: "var(--color-primary)", cursor: "pointer" }} onClick={handleMarkAllRead}>
              Mark all as read
            </button>
          )}
          {notifications.length === 0 ? (
            <EmptyState icon="ti-bell-off" title="No notifications yet." />
          ) : (
            <div className={styles.notifList}>
              {notifications.map((n) => (
                <div
                  key={n._id}
                  className={`${styles.notifCard} ${!n.read ? styles.notifCardUnread : ""}`}
                  onClick={() => !n.read && handleMarkRead(n._id)}
                  style={{ cursor: !n.read ? "pointer" : "default" }}
                >
                  <div className={styles.notifIcon}><LuBell size={16} /></div>
                  <div className={styles.notifBody}>
                    <div className={styles.notifTitle}>{n.title}</div>
                    {n.body && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{n.body}</div>}
                    <div className={styles.notifTime}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Item>
      )}

      {selectedSessionId && (
        <TrialSessionModal sessionId={selectedSessionId} onClose={() => { setSelectedSessionId(null); fetchTrial(false); }} />
      )}
    </Stagger>
  );
}
