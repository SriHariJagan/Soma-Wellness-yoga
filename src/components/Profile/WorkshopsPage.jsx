import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import c from "./ListCards.module.css";
import {
  Stagger, Panel, Pill, EmptyState, PrimaryButton,
  GhostButton, PageHeader,
} from "./widgets/DashboardWidgets";
import { addToCart, getWorkshopDetail } from "../api/StudentServices.js";

const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const fmtDateTime = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
};

const fid = (wk) => wk?._id || wk?.id;

export default function WorkshopsPage({ student, reload, workshopId: highlightId }) {
  const registered = student?.workshops?.registered ?? [];
  const available  = student?.workshops?.available  ?? [];
  const [busyId, setBusyId] = useState("");
  const [msg, setMsg] = useState("");
  const [detailWk, setDetailWk] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  useEffect(() => {
    if (highlightId) {
      openDetail(highlightId);
    }
  }, [highlightId]);

  async function openDetail(id) {
    if (!id) return;
    setDetailLoading(true);
    setDetailData(null);
    try {
      const data = await getWorkshopDetail(id);
      setDetailData(data);
      setDetailWk(id);
    } catch (err) {
      setMsg(err.message || "Could not load workshop details.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleRegister(wk) {
    const id = fid(wk);
    if (!id) return;
    setBusyId(id);
    setMsg("");
    try {
      const result = await addToCart("workshop", id);
      if (result.alreadyInCart) {
        setMsg(`Already in cart`);
        window.dispatchEvent(new CustomEvent("app-toast", { detail: { message: `Already in cart`, type: "info" } }));
      } else {
        setMsg(`${wk.name} added to cart!`);
        window.dispatchEvent(new CustomEvent("app-toast", { detail: { message: `${wk.name} added to cart`, type: "success" } }));
        window.dispatchEvent(new CustomEvent("cart-update", { detail: { count: result.cartCount } }));
      }
      await reload?.();
      setDetailWk(null);
      setDetailData(null);
    } catch (err) {
      setMsg(err.message || "Could not add to cart. Please try again.");
      window.dispatchEvent(new CustomEvent("app-toast", { detail: { message: err.message || "Could not add to cart", type: "error" } }));
    } finally {
      setBusyId("");
    }
  }

  const isPast = (d) => {
    if (!d) return false;
    const dt = new Date(d);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    dt.setHours(0, 0, 0, 0);
    return dt < now;
  };

  const isUpcoming = (d) => {
    if (!d) return true;
    return !isPast(d);
  };

  return (
    <>
      <PageHeader title="Workshops" />

      <Stagger>
        {msg && (
          <div className={c.list} style={{ marginBottom: 8 }}>
            <Pill tone="green" icon="ti-info-circle">{msg}</Pill>
          </div>
        )}

        {/* Registered Workshops */}
        {registered.length > 0 && (
          <Panel title="Registered" icon="ti-ticket">
            <div className={c.list}>
              {registered.map((wk, i) => (
                <motion.div
                  key={fid(wk) || i}
                  className={c.apptRow}
                  style={{ cursor: "pointer" }}
                  onClick={() => openDetail(fid(wk))}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 26 }}
                >
                  <span className={c.dateChip}>
                    {wk.date}
                    {wk.startTime && <><br /><small>{wk.startTime}</small></>}
                  </span>
                  <div className={c.apptBody}>
                    <span className={c.apptName}>{wk.name} · {wk.duration}</span>
                    <div className={c.apptBadges}>
                      {wk.instructor && <Pill tone="neutral" icon="ti-user">{wk.instructor}</Pill>}
                      <Pill tone="green" icon="ti-circle-check">Registered</Pill>
                      {wk.attended && (
                        <Pill tone="blue" icon="ti-check">Attended</Pill>
                      )}
                      {wk.planType && (
                        <Pill tone="amber" icon="ti-shield-check">{wk.planType}</Pill>
                      )}
                      {wk.remainingSeats >= 0 && (
                        <Pill tone="amber" icon="ti-users">{wk.remainingSeats} seats left</Pill>
                      )}
                    </div>
                  </div>
                  <div className={c.apptAction}>
                    <GhostButton
                      icon="ti-arrow-right"
                      onClick={(e) => { e.stopPropagation(); openDetail(fid(wk)); }}
                    >
                      Details
                    </GhostButton>
                  </div>
                </motion.div>
              ))}
            </div>
          </Panel>
        )}

        {/* Available Workshops */}
        <Panel title="Available workshops" icon="ti-confetti">
          {available.length === 0 ? (
            <EmptyState compact icon="ti-calendar-event" title="No workshops available right now." />
          ) : (
            <div className={c.list}>
              {available.map((wk, i) => (
                <motion.div
                  key={fid(wk) || i}
                  className={c.apptRow}
                  style={{ cursor: "pointer" }}
                  onClick={() => openDetail(fid(wk))}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 26 }}
                >
                  <span className={c.dateChip}>
                    {wk.date}
                    {wk.startTime && <><br /><small>{wk.startTime}</small></>}
                  </span>
                  <div className={c.apptBody}>
                    <span className={c.apptName}>{wk.name} · {wk.duration}</span>
                    <div className={c.apptBadges}>
                      {wk.instructor && <Pill tone="neutral" icon="ti-user">{wk.instructor}</Pill>}
                      {typeof wk.remainingSeats === "number" && wk.remainingSeats <= 10 && wk.remainingSeats > 0 && (
                        <Pill tone="amber" icon="ti-users">Only {wk.remainingSeats} left!</Pill>
                      )}
                      {wk.allowedPlans?.length > 0 && (
                        <Pill tone="blue" icon="ti-shield-check">Plan Access</Pill>
                      )}
                    </div>
                  </div>
                  <div className={c.apptAction}>
                    {wk.isPaid && <span className={c.price}>₹{wk.price?.toLocaleString("en-IN")}</span>}
                    <PrimaryButton
                      onClick={(e) => { e.stopPropagation(); handleRegister(wk); }}
                      disabled={busyId === fid(wk)}
                    >
                      {busyId === fid(wk) ? "Adding…" : "Add to Cart"}
                    </PrimaryButton>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Panel>
      </Stagger>

      {/* Workshop Detail Modal */}
      <AnimatePresence>
        {detailWk && (
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
            onClick={() => { setDetailWk(null); setDetailData(null); }}
          >
            <motion.div
              style={{
                background: "#fff",
                borderRadius: "24px",
                maxWidth: "640px",
                width: "100%",
                maxHeight: "90vh",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 24px 50px -16px rgba(45,20,6,0.3)",
              }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              {detailLoading ? (
                <div style={{ padding: "40px", textAlign: "center" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    border: "3px solid #f3ebdd", borderTopColor: "#2E7D5B",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto 16px",
                  }} />
                  <p style={{ color: "#7C6A58", fontSize: 14 }}>Loading workshop details…</p>
                </div>
              ) : detailData ? (
                <>
                  {/* Header image */}
                  {detailData.image && (
                    <div style={{
                      height: "180px",
                      background: `url(${detailData.image}) center/cover no-repeat`,
                      flexShrink: 0,
                    }} />
                  )}
                  {!detailData.image && (
                    <div style={{
                      height: "100px",
                      background: "linear-gradient(135deg, rgba(46,125,91,0.12), rgba(129,178,154,0.12))",
                      flexShrink: 0,
                      display: "grid", placeItems: "center",
                      fontSize: 40, color: "#2E7D5B",
                    }}>
                      <i className="ti ti-award" />
                    </div>
                  )}

                  {/* Scrollable body */}
                  <div style={{ padding: "24px 28px", overflowY: "auto", flex: 1 }}>
                    {/* Title + Instructor */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <h2 style={{
                          fontFamily: "'Outfit', 'Inter', sans-serif",
                          fontSize: 22, fontWeight: 700, color: "#2D1406",
                          margin: 0, letterSpacing: "-0.02em",
                        }}>{detailData.name}</h2>
                        {detailData.instructor && (
                          <p style={{ fontSize: 13.5, color: "#7C6A58", marginTop: 6, marginBottom: 0 }}>
                            <i className="ti ti-user" style={{ marginRight: 6 }} />
                            {detailData.instructor}
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        {detailData.isPaid && (
                          <span style={{
                            padding: "5px 12px", borderRadius: 20,
                            background: "rgba(46,125,91,0.12)", color: "#2E7D5B",
                            fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                            fontFamily: "'Outfit', 'Inter', sans-serif",
                          }}>
                            ₹{detailData.price?.toLocaleString("en-IN")}
                          </span>
                        )}
                        <span style={{
                          padding: "5px 12px", borderRadius: 20,
                          background: detailData.registered
                            ? "rgba(22,163,74,0.13)" : "rgba(46,125,91,0.12)",
                          color: detailData.registered ? "#16A34A" : "#2E7D5B",
                          fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                        }}>
                          {detailData.registered ? "Registered" : "Available"}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {detailData.description && (
                      <p style={{
                        fontSize: 13.5, color: "#7C6A58", lineHeight: 1.7,
                        marginBottom: 20, marginTop: 0,
                      }}>
                        {detailData.description}
                      </p>
                    )}

                    {/* Info Grid */}
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr",
                      gap: "12px", marginBottom: 20,
                    }}>
                      <InfoTile icon="ti-calendar" label="Date" value={fmtDate(detailData.date)} />
                      {detailData.startTime && (
                        <InfoTile icon="ti-clock" label="Time"
                          value={`${detailData.startTime}${detailData.endTime ? ` – ${detailData.endTime}` : ""}`} />
                      )}
                      {detailData.duration && (
                        <InfoTile icon="ti-hourglass" label="Duration" value={detailData.duration} />
                      )}
                      <InfoTile icon="ti-users" label="Seats"
                        value={`${detailData.remainingSeats} / ${detailData.capacity} remaining`} />
                      {detailData.registrationDeadline && (
                        <InfoTile icon="ti-calendar-x" label="Reg. Deadline" value={fmtDate(detailData.registrationDeadline)} />
                      )}
                      {detailData.totalRegistrations > 0 && (
                        <InfoTile icon="ti-ticket" label="Registered" value={`${detailData.totalRegistrations} students`} />
                      )}
                      {/* Enrollment details for registered students */}
                      {detailData.registered && detailData.myRegistration?.enrolledAt && (
                        <InfoTile icon="ti-check-circle" label="Enrolled At" value={fmtDateTime(detailData.myRegistration.enrolledAt)} />
                      )}
                      {detailData.registered && detailData.myRegistration?.planType && (
                        <InfoTile icon="ti-shield-check" label="Plan" value={detailData.myRegistration.planType} />
                      )}
                      {detailData.registered && detailData.myRegistration?.attended && (
                        <InfoTile icon="ti-check" label="Attendance" value="Attended" />
                      )}
                    </div>

                    {/* Plan Access */}
                    {detailData.allowedPlans?.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#7C6A58", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                          <i className="ti ti-shield-check" style={{ marginRight: 6 }} />
                          Eligible Plans
                        </p>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {detailData.allowedPlans.map((p) => (
                            <span key={p} style={{
                              padding: "4px 10px", borderRadius: 8,
                              background: "rgba(46,125,91,0.1)", color: "#2E7D5B",
                              fontSize: 11.5, fontWeight: 600, border: "1px solid rgba(46,125,91,0.18)",
                            }}>{p}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Register button for non-registered students */}
                    {!detailData.registered && (
                      <PrimaryButton
                        onClick={() => handleRegister(detailData)}
                        disabled={busyId === fid(detailData)}
                        style={{ width: "100%", textAlign: "center" }}
                      >
                        {busyId === fid(detailData) ? "Adding…" : "Add to Cart"}
                      </PrimaryButton>
                    )}

                    {/* Live Session Access - only for registered students */}
                    {detailData.registered && (
                      <div style={{
                        background: "#fff",
                        borderRadius: 16,
                        border: "1px solid #E7D7BE",
                        padding: 20,
                        marginBottom: 0,
                      }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 10,
                          marginBottom: 16, paddingBottom: 12,
                          borderBottom: "1px solid rgba(231,215,190,0.5)",
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(46,125,91,0.1)", color: "#2E7D5B",
                            fontSize: 16, flexShrink: 0,
                          }}>
                            <i className="ti ti-video" style={{ fontSize: 16 }} />
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#2D1406" }}>
                            Live Session Access
                          </div>
                          {isPast(detailData.date) ? (
                            <span style={{
                              marginLeft: "auto", padding: "3px 10px", borderRadius: 12,
                              fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap",
                              background: "rgba(156,142,124,0.1)", color: "#9C8E7C",
                              display: "inline-flex", alignItems: "center", gap: 4,
                            }}>
                              <i className="ti ti-check" style={{ fontSize: 10 }} />
                              Completed
                            </span>
                          ) : (
                            <span style={{
                              marginLeft: "auto", padding: "3px 10px", borderRadius: 12,
                              fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap",
                              background: "rgba(22,163,74,0.1)", color: "#16A34A",
                              display: "inline-flex", alignItems: "center", gap: 4,
                            }}>
                              <i className="ti ti-clock" style={{ fontSize: 10 }} />
                              Upcoming
                            </span>
                          )}
                        </div>

                        {/* Meeting info row */}
                        {detailData.zoomLink ? (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{
                              padding: "10px 14px", borderRadius: 10,
                              background: "#F8F4EC", border: "1px solid rgba(231,215,190,0.4)",
                              fontSize: 12.5, color: "#6B5E4E", wordBreak: "break-all",
                              display: "flex", alignItems: "center", gap: 8,
                            }}>
                              <i className="ti ti-link" style={{ color: "#2E7D5B", fontSize: 13 }} />
                              <span>{detailData.zoomLink}</span>
                            </div>
                            <div style={{
                              display: "flex", gap: 12, marginTop: 8, fontSize: 11.5, color: "#9C8E7C",
                            }}>
                              {detailData.date && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  <i className="ti ti-calendar" style={{ fontSize: 11 }} />
                                  {fmtDate(detailData.date)}
                                </span>
                              )}
                              {detailData.startTime && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  <i className="ti ti-clock" style={{ fontSize: 11 }} />
                                  {detailData.startTime}{detailData.endTime ? ` – ${detailData.endTime}` : ""}
                                </span>
                              )}
                              {detailData.duration && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  <i className="ti ti-hourglass" style={{ fontSize: 11 }} />
                                  {detailData.duration}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            padding: "14px 16px", borderRadius: 12,
                            background: "rgba(156,142,124,0.06)", border: "1px dashed #E7D7BE",
                            textAlign: "center", marginBottom: 14,
                          }}>
                            <i className="ti ti-clock" style={{ fontSize: 20, color: "#9C8E7C", marginBottom: 6, display: "block" }} />
                            <p style={{ margin: 0, fontSize: 13, color: "#9C8E7C", fontWeight: 500 }}>
                              Meeting link will be available soon.
                            </p>
                            <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#9C8E7C" }}>
                              The instructor will share the link before the session.
                            </p>
                          </div>
                        )}

                        {/* Join button */}
                        {detailData.zoomLink && (
                          <a
                            href={detailData.zoomLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                              width: "100%", padding: "13px 20px", borderRadius: 12,
                              background: isPast(detailData.date)
                                ? "rgba(156,142,124,0.15)"
                                : "linear-gradient(135deg, #2E7D5B, #81B29A)",
                              color: isPast(detailData.date) ? "#9C8E7C" : "#fff",
                              border: "none", fontSize: 14, fontWeight: 700,
                              cursor: isPast(detailData.date) ? "not-allowed" : "pointer",
                              textDecoration: "none",
                              boxShadow: isPast(detailData.date)
                                ? "none"
                                : "0 6px 18px rgba(46,125,91,0.32)",
                              pointerEvents: isPast(detailData.date) ? "none" : "auto",
                              transition: "all .15s",
                            }}
                          >
                            <i className={`ti ${isPast(detailData.date) ? "ti-check-circle" : "ti-video"}`} />
                            {isPast(detailData.date) ? "Workshop Completed" : "Join Workshop"}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Close button */}
                  <div style={{ padding: "20px 28px", textAlign: "right", borderTop: "1px solid rgba(231,215,190,0.25)" }}>
                    <button
                      onClick={() => { setDetailWk(null); setDetailData(null); }}
                      style={{
                        padding: "10px 18px", borderRadius: 10,
                        border: "1px solid #f3ebdd", background: "#F8F4EC",
                        color: "#7C6A58", fontSize: 13, fontWeight: 600,
                        cursor: "pointer", fontFamily: "'Inter', sans-serif",
                        transition: "all .15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#E7D7BE"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#F8F4EC"; e.currentTarget.style.borderColor = "#f3ebdd"; }}
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding: "40px", textAlign: "center", color: "#7C6A58" }}>
                  Could not load workshop details.
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

function InfoTile({ icon, label, value }) {
  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: 12,
      background: "#F8F4EC",
      border: "1px solid rgba(45,20,6,0.08)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#7C6A58", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        <i className={`ti ${icon}`} style={{ marginRight: 5, fontSize: 12 }} />
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#2D1406" }}>{value}</div>
    </div>
  );
}
