import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import c from "./ListCards.module.css";
import {
  Stagger, Panel, Pill, EmptyState, PrimaryButton,
  GhostButton, PageHeader,
} from "./widgets/DashboardWidgets";
import { getEvents, registerEvent } from "../api/StudentServices.js";

const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
};

const fmtDateTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleString("en-KE", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
};

const fid = (ev) => ev?._id || ev?.id;

const isPast = (d) => {
  if (!d) return false;
  const dt = new Date(d); const now = new Date();
  now.setHours(0, 0, 0, 0); dt.setHours(0, 0, 0, 0);
  return dt < now;
};

export default function EventsPage() {
  const [registered, setRegistered] = useState([]);
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [msg, setMsg] = useState("");
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getEvents();
      setRegistered(data.registered || []);
      setAvailable(data.available || []);
    } catch (err) {
      setMsg(err.message || "Could not load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRegister(ev) {
    const id = fid(ev);
    if (!id) return;
    setBusyId(id);
    setMsg("");
    try {
      await registerEvent(id);
      await load();
      setMsg(`You're registered for "${ev.title}".`);
      setDetail(null);
    } catch (err) {
      setMsg(err.message || "Could not register. Please try again.");
    } finally {
      setBusyId("");
    }
  }

  const deadlinePassed = (ev) => ev.registrationDeadline && new Date(ev.registrationDeadline) < new Date();
  const isFull = (ev) => typeof ev.remainingSeats === "number" && ev.remainingSeats <= 0;

  const renderRow = (ev, i, isReg) => (
    <motion.div
      key={fid(ev) || i}
      className={c.apptRow}
      style={{ cursor: "pointer" }}
      onClick={() => setDetail(ev)}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 26 }}
    >
      <span className={c.dateChip}>
        {fmtDate(ev.date)}
        {ev.startTime && <><br /><small>{ev.startTime}</small></>}
      </span>
      <div className={c.apptBody}>
        <span className={c.apptName}>{ev.title}</span>
        <div className={c.apptBadges}>
          {ev.location && <Pill tone="neutral" icon="ti-map-pin">{ev.location}</Pill>}
          {ev.instructor && <Pill tone="neutral" icon="ti-user">{ev.instructor}</Pill>}
          {isReg ? (
            <Pill tone="green" icon="ti-circle-check">Registered</Pill>
          ) : (
            <>
              {isFull(ev) && <Pill tone="amber" icon="ti-users">Full</Pill>}
              {!isFull(ev) && typeof ev.remainingSeats === "number" && ev.remainingSeats <= 10 && (
                <Pill tone="amber" icon="ti-users">Only {ev.remainingSeats} left!</Pill>
              )}
            </>
          )}
        </div>
      </div>
      <div className={c.apptAction}>
        {isReg ? (
          <GhostButton icon="ti-arrow-right" onClick={(e) => { e.stopPropagation(); setDetail(ev); }}>
            Details
          </GhostButton>
        ) : (
          <PrimaryButton
            onClick={(e) => { e.stopPropagation(); handleRegister(ev); }}
            disabled={busyId === fid(ev) || isFull(ev) || deadlinePassed(ev)}
          >
            {busyId === fid(ev) ? "Registering…" : "Register"}
          </PrimaryButton>
        )}
      </div>
    </motion.div>
  );

  return (
    <>
      <PageHeader title="Events" />

      <Stagger>
        {msg && (
          <div className={c.list} style={{ marginBottom: 8 }}>
            <Pill tone="green" icon="ti-info-circle">{msg}</Pill>
          </div>
        )}

        {registered.length > 0 && (
          <Panel title="My registered events" icon="ti-ticket">
            <div className={c.list}>
              {registered.map((ev, i) => renderRow(ev, i, true))}
            </div>
          </Panel>
        )}

        <Panel title="Upcoming events" icon="ti-confetti">
          {loading ? (
            <EmptyState compact icon="ti-calendar-event" title="Loading events…" />
          ) : available.length === 0 ? (
            <EmptyState compact icon="ti-calendar-event" title="No upcoming events right now." />
          ) : (
            <div className={c.list}>
              {available.map((ev, i) => renderRow(ev, i, false))}
            </div>
          )}
        </Panel>
      </Stagger>

      {/* Detail Modal */}
      <AnimatePresence>
        {detail && (
          <motion.div
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(45, 20, 6, 0.55)",
              backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "20px",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDetail(null)}
          >
            <motion.div
              style={{
                background: "#fff", borderRadius: "24px",
                maxWidth: "640px", width: "100%", maxHeight: "90vh",
                overflow: "hidden", display: "flex", flexDirection: "column",
                boxShadow: "0 24px 50px -16px rgba(45,20,6,0.3)",
              }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              {detail.image ? (
                <div style={{ height: "180px", background: `url(${detail.image}) center/cover no-repeat`, flexShrink: 0 }} />
              ) : (
                <div style={{
                  height: "100px",
                  background: "linear-gradient(135deg, rgba(46,125,91,0.12), rgba(129,178,154,0.12))",
                  flexShrink: 0, display: "grid", placeItems: "center", fontSize: 40, color: "#2E7D5B",
                }}>
                  <i className="ti ti-confetti" />
                </div>
              )}

              <div style={{ padding: "24px 28px", overflowY: "auto", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h2 style={{
                      fontFamily: "'Outfit', 'Inter', sans-serif", fontSize: 22, fontWeight: 700,
                      color: "#2D1406", margin: 0, letterSpacing: "-0.02em",
                    }}>{detail.title}</h2>
                    {detail.instructor && (
                      <p style={{ fontSize: 13.5, color: "#7C6A58", marginTop: 6, marginBottom: 0 }}>
                        <i className="ti ti-user" style={{ marginRight: 6 }} />{detail.instructor}
                      </p>
                    )}
                  </div>
                  <span style={{
                    padding: "5px 12px", borderRadius: 20,
                    background: detail.registered ? "rgba(22,163,74,0.13)" : "rgba(46,125,91,0.12)",
                    color: detail.registered ? "#16A34A" : "#2E7D5B",
                    fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                  }}>
                    {detail.registered ? "Registered" : "Available"}
                  </span>
                </div>

                {detail.description && (
                  <p style={{ fontSize: 13.5, color: "#7C6A58", lineHeight: 1.7, marginBottom: 20, marginTop: 0 }}>
                    {detail.description}
                  </p>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: 20 }}>
                  <InfoTile icon="ti-calendar" label="Date" value={fmtDate(detail.date)} />
                  {detail.startTime && (
                    <InfoTile icon="ti-clock" label="Time"
                      value={`${detail.startTime}${detail.endTime ? ` – ${detail.endTime}` : ""}`} />
                  )}
                  {detail.location && <InfoTile icon="ti-map-pin" label="Location" value={detail.location} />}
                  {typeof detail.remainingSeats === "number" && (
                    <InfoTile icon="ti-users" label="Seats"
                      value={`${detail.remainingSeats} / ${detail.capacity} remaining`} />
                  )}
                  {detail.registrationDeadline && (
                    <InfoTile icon="ti-calendar-x" label="Reg. Deadline" value={fmtDate(detail.registrationDeadline)} />
                  )}
                  {detail.registered && detail.myRegistration?.registeredAt && (
                    <InfoTile icon="ti-check-circle" label="Registered On" value={fmtDateTime(detail.myRegistration.registeredAt)} />
                  )}
                </div>

                {!detail.registered && (
                  <PrimaryButton
                    onClick={() => handleRegister(detail)}
                    disabled={busyId === fid(detail) || isFull(detail) || deadlinePassed(detail)}
                    style={{ width: "100%", textAlign: "center" }}
                  >
                    {busyId === fid(detail)
                      ? "Registering…"
                      : isFull(detail) ? "Event Full"
                      : deadlinePassed(detail) ? "Registration Closed"
                      : "Register Now"}
                  </PrimaryButton>
                )}

                {detail.registered && (
                  <div style={{
                    background: "#F8F4EC", borderRadius: 12, border: "1px solid rgba(45,20,6,0.08)",
                    padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <i className="ti ti-circle-check" style={{ color: "#16A34A", fontSize: 20 }} />
                    <span style={{ fontSize: 13.5, color: "#2D1406", fontWeight: 600 }}>
                      {isPast(detail.date)
                        ? "This event has taken place. Thanks for joining!"
                        : "You're all set! We'll see you at the event."}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ padding: "20px 28px", textAlign: "right", borderTop: "1px solid rgba(231,215,190,0.25)" }}>
                <button
                  onClick={() => setDetail(null)}
                  style={{
                    padding: "10px 18px", borderRadius: 10, border: "1px solid #f3ebdd",
                    background: "#F8F4EC", color: "#7C6A58", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function InfoTile({ icon, label, value }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 12, background: "#F8F4EC", border: "1px solid rgba(45,20,6,0.08)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#7C6A58", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        <i className={`ti ${icon}`} style={{ marginRight: 5, fontSize: 12 }} />{label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#2D1406" }}>{value}</div>
    </div>
  );
}
