import { useState, useEffect, useRef } from "react";
import { getTrialSessionDetail } from "../api/StudentServices.js";
import Badge from "../Admin/Badge";
import styles from "./TrialSessionModal.module.css";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-KE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

const STATUS_LABEL = {
  cancelled: 'Cancelled', rescheduled: 'Rescheduled', completed: 'Completed',
  missed: 'Missed', live: 'Live Now', pending_attendance: 'Pending Attendance', upcoming: 'Upcoming',
};

export default function TrialSessionModal({ sessionId, onClose }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(null);
  const overlayRef = useRef();
  const timerRef = useRef();

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const data = await getTrialSessionDetail(sessionId);
        if (!cancelled) {
          setSession(data);
          setCountdown(data.countdown);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load session");
          setLoading(false);
        }
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => {
    if (!session) return;
    if (session.computedStatus !== "upcoming" && session.computedStatus !== "live") return;
    timerRef.current = setInterval(async () => {
      try {
        const data = await getTrialSessionDetail(sessionId);
        setSession(data);
        setCountdown(data.countdown);
        if (data.computedStatus === "live" || data.computedStatus === "completed" || data.computedStatus === "missed") {
          clearInterval(timerRef.current);
        }
      } catch {}
    }, 15000);
    return () => clearInterval(timerRef.current);
  }, [session, sessionId]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") onClose();
  }

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, []);

  const s = session;

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <i className="ti ti-x" />
        </button>

        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading session details…</p>
          </div>
        )}

        {error && (
          <div className={styles.errorState}>
            <i className="ti ti-alert-circle" style={{ fontSize: 32, color: "var(--color-danger)" }} />
            <p>{error}</p>
            <button className={styles.primaryBtn} onClick={onClose}>Close</button>
          </div>
        )}

        {!loading && !error && s && (
          <>
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <div className={styles.headerIcon}><i className="ti ti-yoga" /></div>
                <div>
                  <h2 className={styles.title}>{s.title}</h2>
                  <span style={{ display: 'inline-block', marginTop: 4 }}>
                    <Badge label={STATUS_LABEL[s.computedStatus] || 'Upcoming'} />
                  </span>
                </div>
              </div>
            </div>

            {s.computedStatus === "upcoming" && countdown && (
              <div className={styles.countdownBar}>
                <i className="ti ti-clock" />
                <span>{countdown.text}</span>
              </div>
            )}

            {s.computedStatus === "live" && (
              <div className={styles.liveBar}>
                <span className={styles.liveDot} />
                <span>Session is live — you can join now</span>
              </div>
            )}

            {s.description && (
              <div className={styles.notesSection}>
                <h3 className={styles.sectionTitle}>
                  <i className="ti ti-align-left" style={{ marginRight: 6 }} /> Description
                </h3>
                <p className={styles.notesText}>{s.description}</p>
              </div>
            )}

            <div className={styles.grid}>
              <div className={styles.infoCard}>
                <div className={styles.infoIcon}><i className="ti ti-calendar-event" /></div>
                <div>
                  <div className={styles.infoLabel}>Date</div>
                  <div className={styles.infoValue}>{formatDate(s.date)}</div>
                </div>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoIcon}><i className="ti ti-clock" /></div>
                <div>
                  <div className={styles.infoLabel}>Time</div>
                  <div className={styles.infoValue}>
                    {s.startTime || "—"}
                    {s.endTime ? ` – ${s.endTime}` : ""}
                    {s.duration ? ` (${s.duration} min)` : ""}
                  </div>
                </div>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoIcon}><i className="ti ti-user" /></div>
                <div>
                  <div className={styles.infoLabel}>Instructor</div>
                  <div className={styles.infoValue}>{s.instructor || "TBD"}</div>
                </div>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoIcon}><i className="ti ti-device-laptop" /></div>
                <div>
                  <div className={styles.infoLabel}>Platform</div>
                  <div className={styles.infoValue}>{s.meetingPlatform || "Zoom"}</div>
                </div>
              </div>
            </div>

            {s.notes && (
              <div className={styles.notesSection}>
                <h3 className={styles.sectionTitle}>
                  <i className="ti ti-notes" style={{ marginRight: 6 }} /> Session Notes
                </h3>
                <p className={styles.notesText}>{s.notes}</p>
              </div>
            )}

            {s.adminNotes && (
              <div className={styles.notesSection} style={{ background: 'rgba(46,125,91,0.04)', borderColor: 'rgba(46,125,91,0.12)' }}>
                <h3 className={styles.sectionTitle} style={{ color: '#B45309' }}>
                  <i className="ti ti-message" style={{ marginRight: 6 }} /> Admin Remarks
                </h3>
                <p className={styles.notesText} style={{ color: '#92400E' }}>{s.adminNotes}</p>
              </div>
            )}

            {s.location && (
              <div className={styles.notesSection}>
                <h3 className={styles.sectionTitle}>
                  <i className="ti ti-map-pin" style={{ marginRight: 6 }} /> Location
                </h3>
                <p className={styles.notesText}>{s.location}</p>
              </div>
            )}

            <div className={styles.footer}>
              {s.meetingLink ? (
                <a href={s.meetingLink} target="_blank" rel="noreferrer"
                  className={`${styles.primaryBtn} ${s.computedStatus === 'live' ? styles.pulseBtn : ''}`}>
                  <i className="ti ti-video" />
                  {s.computedStatus === 'live' ? 'Join Session Now' : 'Join Session'}
                </a>
              ) : s.computedStatus === "completed" ? (
                <div className={styles.statusMsg}>
                  <i className="ti ti-circle-check" style={{ color: "var(--color-success)" }} />
                  You attended this session
                </div>
              ) : s.computedStatus === "missed" ? (
                <div className={styles.statusMsg} style={{ color: "var(--color-danger)" }}>
                  <i className="ti ti-circle-x" />
                  You missed this session
                </div>
              ) : s.computedStatus === "cancelled" ? (
                <div className={styles.statusMsg} style={{ color: "var(--color-text-muted)" }}>
                  <i className="ti ti-slash" />
                  This session was cancelled
                  {s.cancelReason ? `: ${s.cancelReason}` : ""}
                </div>
              ) : s.computedStatus === "rescheduled" ? (
                <div className={styles.statusMsg} style={{ color: "#B45309" }}>
                  <i className="ti ti-refresh" />
                  This session was rescheduled
                </div>
              ) : s.computedStatus === "pending_attendance" ? (
                <div className={styles.statusMsg} style={{ color: "var(--color-text-muted)" }}>
                  <i className="ti ti-hourglass" />
                  Awaiting attendance confirmation
                </div>
              ) : (
                <div className={styles.statusMsg} style={{ color: "var(--color-text-muted)" }}>
                  <i className="ti ti-clock" />
                  Session has not started yet
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
