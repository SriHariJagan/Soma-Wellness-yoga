import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styles from "./ActivePlanPage.module.css";
import w from "./widgets/DashboardWidgets.module.css";
import { Stagger, Item, Panel, ProgressRing, Pill, PrimaryButton, GhostButton, PageHeader } from "./widgets/DashboardWidgets";
import { getActiveMembership, getEnrollmentProgress, cancelMembership, pauseMembership, resumeMembership } from "../api/StudentServices.js";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—";

const MODAL_OVERLAY = {
  position: "fixed", inset: 0, zIndex: 99999,
  background: "rgba(0,0,0,0.5)", display: "flex",
  alignItems: "center", justifyContent: "center",
  padding: 20,
};

const MODAL_CARD = {
  background: "#fff", borderRadius: 16, maxWidth: 440, width: "100%",
  padding: "28px 24px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  fontFamily: "'Inter', sans-serif",
};

export default function ActivePlanPage({ reload }) {
  const { t } = useTranslation();
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [barWidth, setBarWidth] = useState(0);
  const [enrollmentData, setEnrollmentData] = useState(null);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);

  useEffect(() => {
    Promise.all([getActiveMembership(), getEnrollmentProgress()])
      .then(([m, ep]) => {
        setMembership(m);
        setEnrollmentData(ep);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    if (!membership) return;
    const totalDays = membership.planMonths * 30;
    const daysLeft = membership.daysLeft || 0;
    const usedPct = totalDays > 0 ? Math.round(((totalDays - daysLeft) / totalDays) * 100) : 0;
    const t = setTimeout(() => setBarWidth(usedPct), 300);
    return () => clearTimeout(t);
  }, [membership]);

  async function handlePause() {
    setBusy("pause");
    setMsg("");
    setShowPauseModal(false);
    try {
      const res = await pauseMembership();
      setMembership(res.membership);
      await reload?.();
      setMsg(t("activePlan.pauseSuccess"));
    } catch (err) {
      setMsg(err.message || "Failed to pause membership.");
    } finally {
      setBusy("");
    }
  }

  async function handleResume() {
    setBusy("resume");
    setMsg("");
    setShowResumeModal(false);
    try {
      const res = await resumeMembership();
      setMembership(res.membership);
      await reload?.();
      setMsg(t("activePlan.resumeSuccess"));
    } catch (err) {
      setMsg(err.message || "Failed to resume membership.");
    } finally {
      setBusy("");
    }
  }

  async function handleCancel() {
    setBusy("cancel");
    setMsg("");
    try {
      await cancelMembership();
      await reload?.();
      setMembership(null);
      setMsg(t("activePlan.cancelSuccess"));
    } catch (err) {
      setMsg(err.message || "Failed to cancel membership.");
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Active Plan" />
        <div className={styles.overview} style={{ opacity: 0.5 }}>
          <div className={styles.overviewDeco} />
        </div>
      </div>
    );
  }

  if (!membership) {
    return (
      <>
        <PageHeader title="Active Plan" />
        <Stagger>
          <Item className={styles.overview}>
            <div className={styles.overviewDeco} aria-hidden="true" />
            <div style={{ flex: 1, textAlign: "center", padding: "40px 20px" }}>
              <i className="ti ti-shield-off" style={{ fontSize: 48, color: "var(--color-text-muted)", marginBottom: 12 }} />
              <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--color-text-secondary)", margin: "0 0 6px" }}>No Active Membership</h3>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
                Browse plans to find the perfect membership for your wellness journey.
              </p>
            </div>
          </Item>
        </Stagger>
      </>
    );
  }

  const months = membership.planMonths || 1;
  const startDate = membership.startDate;
  const expiry = membership.expiryDate;
  const daysLeft = membership.daysLeft || 0;
  const totalDays = months * 30;
  const usedPct = totalDays > 0 ? Math.round(((totalDays - daysLeft) / totalDays) * 100) : 0;
  const isActive = membership.isActive;
  const isPaused = membership.isPaused || false;
  const computedStatus = membership.computedStatus || membership.status;

  const memProgress = enrollmentData?.membership;
  const totalSessions = memProgress?.totalSessions;
  const completedSessions = memProgress?.completedSessions || 0;
  const remainingSessions = memProgress?.remainingSessions;
  const sessionsPct = memProgress?.sessionsProgressPct || 0;
  const sessionHistory = memProgress?.sessionHistory || [];
  const hasSessionTracking = totalSessions != null;
  const pauseHistory = membership.pauseHistory || [];

  const hasRemainingPauseDays = (membership.remainingPauseDays ?? 0) > 0;

  const dates = [
    { icon: "ti-calendar-plus", label: "Start date",     value: fmtDate(startDate), tone: "blue"  },
    { icon: "ti-calendar-off",  label: "Expiry date",    value: fmtDate(expiry),    tone: "amber" },
    { icon: "ti-clock-hour-4",  label: "Days remaining", value: `${daysLeft} days`,  tone: "green" },
  ];

  const currentPauseDuration = membership.currentPauseDuration || 0;
  const expectedResumeDate = membership.expectedResumeDate;

  function renderStatusPill() {
    if (isActive) return <Pill tone="green" icon="ti-circle-check">Active</Pill>;
    if (isPaused) return <Pill tone="amber" icon="ti-player-pause">Paused</Pill>;
    return <Pill tone="danger" icon="ti-circle-x">Expired</Pill>;
  }

  function renderPauseHistory() {
    if (!pauseHistory || pauseHistory.length === 0) return null;
    return (
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-clock" /> Pause History
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {pauseHistory.map((ph, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
              background: 'rgba(217,119,6,0.06)', borderRadius: 8, fontSize: 12,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: '#D97706' }} />
              <span style={{ flex: 1, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                {fmtDate(ph.pauseStartedAt)} – {ph.pauseEndedAt ? fmtDate(ph.pauseEndedAt) : 'Ongoing'}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                background: 'rgba(217,119,6,0.12)', color: '#D97706',
              }}>
                {ph.daysCounted || 0} day{ph.daysCounted !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Active Plan"
        actions={renderStatusPill()}
      />

      {msg && (
        <div className={`${styles.pauseBox} ${msg.includes("cancelled") ? styles.pauseRed : styles.pauseAmber}`} style={{ marginBottom: 16 }}>
          <i className="ti ti-info-circle" aria-hidden="true" />
          <span>{msg}</span>
        </div>
      )}

      {/* ── Pause Confirmation Modal ── */}
      {showPauseModal && (
        <div style={MODAL_OVERLAY} onClick={() => setShowPauseModal(false)}>
          <div style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#1C1917' }}>Pause Membership?</h3>
            <p style={{ fontSize: 13, color: '#57534E', lineHeight: 1.6, margin: '0 0 16px' }}>
              Your membership benefits will be temporarily suspended.
            </p>
            <ul style={{ fontSize: 13, color: '#57534E', lineHeight: 1.8, margin: '0 0 20px', paddingLeft: 20 }}>
              <li>Zoom access will be disabled</li>
              <li>You will stop receiving class invitations</li>
              <li>Membership countdown will stop</li>
              <li>Expiry date will be extended after resume</li>
            </ul>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <GhostButton onClick={() => setShowPauseModal(false)}>Cancel</GhostButton>
              <PrimaryButton onClick={handlePause} disabled={busy === "pause"}>
                {busy === "pause" ? "Pausing…" : "Pause Membership"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* ── Resume Confirmation Modal ── */}
      {showResumeModal && (
        <div style={MODAL_OVERLAY} onClick={() => setShowResumeModal(false)}>
          <div style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#1C1917' }}>Resume Membership?</h3>
            <p style={{ fontSize: 13, color: '#57534E', lineHeight: 1.6, margin: '0 0 20px' }}>
              Your membership will become active immediately.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <GhostButton onClick={() => setShowResumeModal(false)}>Cancel</GhostButton>
              <PrimaryButton onClick={handleResume} disabled={busy === "resume"}>
                {busy === "resume" ? "Resuming…" : "Resume"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      <Stagger>
        <Item className={styles.overview}>
          <div className={styles.overviewDeco} aria-hidden="true" />

          <div className={styles.ringSide}>
            {isPaused ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 120, height: 120, borderRadius: '50%', border: '4px solid #D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(217,119,6,0.08)' }}>
                  <i className="ti ti-player-pause" style={{ fontSize: 40, color: '#D97706' }} />
                </div>
                <span style={{ fontSize: 11, color: '#D97706', fontWeight: 700 }}>PAUSED</span>
              </div>
            ) : (
              <ProgressRing value={usedPct} size={150} stroke={13} tone="orange">
                <span className={styles.ringPct}>{usedPct}%</span>
                <span className={styles.ringSub}>used</span>
              </ProgressRing>
            )}
            {hasSessionTracking && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <ProgressRing value={sessionsPct} size={80} stroke={8} tone="green">
                  <span className={styles.ringPct} style={{ fontSize: 11 }}>{sessionsPct}%</span>
                </ProgressRing>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>sessions</div>
              </div>
            )}
          </div>

          <div className={styles.overviewBody}>
            <h2 className={styles.planName}>{membership.planType || `${months}-Month Membership`}</h2>
            <div className={styles.planBadges}>
              {renderStatusPill()}
            </div>

            <div className={styles.benefitRow}>
              <span className={styles.benefitLabel}><i className="ti ti-video" aria-hidden="true" />Zoom access</span>
              <Pill tone={isPaused ? "amber" : (isActive ? "green" : "danger")} icon={isPaused ? "ti-x" : (isActive ? "ti-check" : "ti-x")}>
                {isPaused ? "Suspended" : (isActive ? "Enabled" : "Disabled")}
              </Pill>
            </div>

            {membership.plan && membership.plan.description && (
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '8px 0 0', lineHeight: 1.5 }}>
                {membership.plan.description}
              </p>
            )}
          </div>
        </Item>

        <Item className={styles.dateGrid}>
          {dates.map(({ icon, label, value, tone }) => (
            <div key={label} className={`${styles.dateTile} ${styles[`tile_${tone}`]}`}>
              <span className={styles.dateIcon}><i className={`ti ${icon}`} aria-hidden="true" /></span>
              <div>
                <span className={styles.dateLabel}>{label}</span>
                <span className={styles.dateValue}>{value}</span>
              </div>
            </div>
          ))}
          <div className={`${styles.dateTile} ${styles.tile_green}`}>
            <span className={styles.dateIcon}><i className="ti ti-player-pause" aria-hidden="true" /></span>
            <div>
              <span className={styles.dateLabel}>Pause days</span>
              <span className={styles.dateValue}>{membership.remainingPauseDays ?? 0} / {membership.pauseDaysAllowed} left</span>
            </div>
          </div>
          {membership.isPaused && currentPauseDuration > 0 && (
            <div className={`${styles.dateTile} ${styles.tile_amber}`}>
              <span className={styles.dateIcon}><i className="ti ti-clock" aria-hidden="true" /></span>
              <div>
                <span className={styles.dateLabel}>Paused for</span>
                <span className={styles.dateValue}>{currentPauseDuration} day{currentPauseDuration !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
          {membership.isPaused && expectedResumeDate && (
            <div className={`${styles.dateTile} ${styles.tile_blue}`} style={{ gridColumn: 'span 2' }}>
              <span className={styles.dateIcon}><i className="ti ti-calendar-check" aria-hidden="true" /></span>
              <div>
                <span className={styles.dateLabel}>Expected auto-resume</span>
                <span className={styles.dateValue}>{fmtDate(expectedResumeDate)}</span>
              </div>
            </div>
          )}
          {(membership.benefits || []).length > 0 && (
            <div className={`${styles.dateTile} ${styles.tile_blue}`} style={{ gridColumn: 'span 2' }}>
              <span className={styles.dateIcon}><i className="ti ti-gift" aria-hidden="true" /></span>
              <div>
                <span className={styles.dateLabel}>Plan Benefits</span>
                <span className={styles.dateValue} style={{ fontSize: 11, fontWeight: 400 }}>
                  {(membership.benefits || []).slice(0, 4).join(" · ")}
                  {(membership.benefits || []).length > 4 ? ` +${membership.benefits.length - 4} more` : ""}
                </span>
              </div>
            </div>
          )}
        </Item>

        <Panel title="" icon="">
          <div className={styles.barWrap}>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${barWidth}%` }} />
            </div>
            <div className={styles.barLabels}>
              <span>Start</span>
              <span>{usedPct}% used</span>
              <span>End</span>
            </div>
          </div>

          <div className={`${styles.pauseBox} ${membership.pauseDaysAllowed === 0 ? styles.pauseRed : styles.pauseAmber}`}>
            <i className="ti ti-info-circle" aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>
              {membership.pauseDaysAllowed === 0
                ? "No pause option on this plan."
                : `Your plan allows ${membership.pauseDaysAllowed} pause days. ${membership.remainingPauseDays > 0 ? `${membership.remainingPauseDays} days remaining.` : "All pause days used."}`}
            </span>
          </div>

          {sessionHistory.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="ti ti-clock" /> Recent Sessions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sessionHistory.map((sh, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                    background: 'rgba(22,163,74,0.05)', borderRadius: 8, fontSize: 12,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: sh.attendance === 'present' || sh.attendance === 'zoom' ? '#16A34A' : '#DC2626',
                    }} />
                    <span style={{ flex: 1, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{sh.title || 'Class'}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {sh.date ? new Date(sh.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : ''}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                      background: sh.attendance === 'present' || sh.attendance === 'zoom'
                        ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                      color: sh.attendance === 'present' || sh.attendance === 'zoom' ? '#16A34A' : '#DC2626',
                    }}>
                      {sh.attendance || 'present'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {renderPauseHistory()}

          <div className={styles.btnRow}>
            {isActive && hasRemainingPauseDays && (
              <PrimaryButton icon="ti-player-pause" onClick={() => setShowPauseModal(true)} disabled={!!busy}>
                {busy === "pause" ? "Pausing…" : "Pause Membership"}
              </PrimaryButton>
            )}
            {isPaused && (
              <PrimaryButton icon="ti-player-play" onClick={() => setShowResumeModal(true)} disabled={!!busy}>
                {busy === "resume" ? "Resuming…" : "Resume Membership"}
              </PrimaryButton>
            )}
            {isActive && !hasRemainingPauseDays && membership.pauseDaysAllowed > 0 && (
              <GhostButton icon="ti-player-pause" disabled>
                No Pause Days Left
              </GhostButton>
            )}
            {isActive && (
              <GhostButton icon="ti-x" onClick={handleCancel} disabled={!!busy}>
                {busy === "cancel" ? "Cancelling…" : "Cancel Membership"}
              </GhostButton>
            )}
          </div>
        </Panel>
      </Stagger>
    </>
  );
}
