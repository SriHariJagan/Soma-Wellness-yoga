import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import c from "./ListCards.module.css";
import {
  Stagger, Item, Panel, Pill, EmptyState, PrimaryButton, GhostButton, PageHeader,
} from "./widgets/DashboardWidgets";
import { addToCart, cancelConsultation, getConsultationSlots } from "../api/StudentServices.js";

const FEE = 300;
const DURATION = 30;

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatTime(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

const C = {
  cream: "#F8F4EC", card: "#FFFFFF", border: "#E7D7BE",
  primary: "#2E7D5B", primaryLight: "#81B29A",
  primaryBg: "rgba(46,125,91,0.10)",
  dark: "#2D1406", text2: "#6B5E4E", text3: "#9C8E7C",
  green: "#16A34A", greenBg: "rgba(22,163,74,0.10)",
  amber: "#D97706", amberBg: "rgba(217,119,6,0.10)",
  red: "#DC2626", redBg: "rgba(220,38,38,0.10)",
};

const row = { display: "flex", alignItems: "center", gap: 8 };

function PremiumConsultationCard({ consultation, onCancel, busy }) {
  const hasMeetingLink = !!consultation.zoomUrl;
  const isActive = consultation.status === "upcoming" || consultation.status === "confirmed";
  const statusLabel = consultation.status === "confirmed" ? "Confirmed" : consultation.status === "upcoming" ? "Upcoming" : consultation.status;
  const statusColor = consultation.status === "confirmed" ? C.green : consultation.status === "upcoming" ? C.amber : C.text3;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      style={{
        background: C.card,
        borderRadius: 18,
        border: `1px solid ${C.border}`,
        boxShadow: "0 2px 8px rgba(45,20,6,0.06)",
        overflow: "hidden",
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
      whileHover={{ boxShadow: "0 6px 20px rgba(45,20,6,0.1)", transform: "translateY(-1px)" }}
    >
      <div style={{
        padding: "18px 22px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 10,
      }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: C.primaryBg, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, color: C.primary, flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.dark, ...row, gap: 8 }}>
              {consultation.doctor || "Pragya Wellness Team"}
              <span style={{
                fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                background: `${statusColor}1A`, color: statusColor,
              }}>
                {statusLabel}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: C.text2, marginTop: 2 }}>
              {consultation.topic || "General consultation"}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.dark }}>
            {formatDate(consultation.date)}
          </div>
          <div style={{ fontSize: 12, color: C.primary, fontWeight: 600 }}>
            {consultation.timeSlot ? `${consultation.timeSlot} · ${consultation.duration || 30} min` : ""}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
        {consultation.assignedGuru && (
          <div style={{ ...row, gap: 10, fontSize: 13 }}>
            <span style={{ color: C.text3 }}>Assigned Guru:</span>
            <span style={{ fontWeight: 600, color: C.dark }}>{consultation.assignedGuru}</span>
          </div>
        )}

        {isActive && (
          <div style={{
            padding: "12px 16px", borderRadius: 12,
            background: hasMeetingLink ? C.greenBg : C.amberBg,
            ...row, gap: 10,
          }}>
            {hasMeetingLink ? (
              <>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(22,163,74,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>Meeting Ready</div>
                  <div style={{ fontSize: 11.5, color: C.text2, marginTop: 1, wordBreak: "break-all" }}>
                    {consultation.zoomUrl}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(217,119,6,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.amber }}>Meeting details will be shared soon</div>
                  <div style={{ fontSize: 11.5, color: C.text2, marginTop: 1 }}>
                    You will receive the link once your consultant joins
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ ...row, gap: 14, fontSize: 12, color: C.text3 }}>
            {consultation.paymentStatus === "paid" && (
              <span style={{ ...row, gap: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                <span style={{ color: "#16A34A", fontWeight: 600 }}>Paid · ₹{consultation.price || 0}</span>
              </span>
            )}
            {consultation.paymentStatus === "pending" && (
              <span style={{ ...row, gap: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                </svg>
                <span style={{ color: "#D97706" }}>Payment pending</span>
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {hasMeetingLink && isActive && (
              <a href={consultation.zoomUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <button style={{
                  ...row, gap: 6, padding: "8px 18px",
                  border: "none", borderRadius: 10,
                  cursor: "pointer", fontSize: 13, fontWeight: 700,
                  color: "#fff",
                  background: `linear-gradient(135deg, #16A34A, #22C55E)`,
                  boxShadow: "0 3px 10px rgba(22,163,74,0.3)",
                  transition: "all 0.15s",
                  fontFamily: "inherit",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 5px 16px rgba(22,163,74,0.35)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 3px 10px rgba(22,163,74,0.3)"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  Join Consultation
                </button>
              </a>
            )}
            {isActive && (
              <button onClick={() => onCancel(consultation.id)} disabled={busy} style={{
                padding: "8px 14px",
                border: `1px solid ${C.red}40`,
                borderRadius: 10,
                cursor: "pointer", fontSize: 12, fontWeight: 500,
                color: C.red, background: C.redBg,
                transition: "all 0.15s", fontFamily: "inherit",
              }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PastConsultationCard({ consultation, onRebook }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      style={{
        background: C.card, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
        opacity: 0.75, transition: "opacity 0.2s",
      }}
      whileHover={{ opacity: 1 }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>
          {consultation.doctor} · {consultation.topic}
        </div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 2, ...row, gap: 6 }}>
          <span>{consultation.date}</span>
          {consultation.timeSlot && <><span>·</span><span>{consultation.timeSlot}</span></>}
          {consultation.paymentStatus === "paid" && (
            <><span>·</span><span style={{ color: C.green, fontWeight: 600 }}>₹{consultation.price || 0} paid</span></>
          )}
        </div>
      </div>
      <button onClick={onRebook} style={{
        padding: "7px 16px", border: `1px solid ${C.border}`, borderRadius: 8,
        cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: C.primary, background: C.card,
        transition: "all 0.15s", fontFamily: "inherit", whiteSpace: "nowrap",
      }}>
        Rebook
      </button>
    </motion.div>
  );
}

export default function ConsultationPage({ student, reload }) {
  const upcoming = student?.consultations?.upcoming ?? [];
  const past = student?.consultations?.past ?? [];

  const [step, setStep] = useState("list");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [slots, setSlots] = useState([]);
  const [fee, setFee] = useState(FEE);
  const [duration, setDuration] = useState(DURATION);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  function openBooking() {
    setStep("booking");
    setDate("");
    setTimeSlot("");
    setTopic("");
    setSlots([]);
    setMsg("");
  }

  async function fetchSlots(selectedDate) {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setTimeSlot("");
    try {
      const res = await getConsultationSlots(selectedDate);
      setSlots(res.slots || []);
      setFee(res.fee || FEE);
      setDuration(res.duration || DURATION);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleDateChange(e) {
    const val = e.target.value;
    setDate(val);
    setTimeSlot("");
    if (val) await fetchSlots(val);
  }

  async function submitBooking(e) {
    e.preventDefault();
    if (!date || !timeSlot) {
      setMsg("Please select a date and time slot.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const result = await addToCart("consultation", "new");
      await reload?.();
      setStep("list");
      setDate(""); setTimeSlot(""); setTopic("");
      setMsg("Consultation added to cart. Checkout to confirm.");
      window.dispatchEvent(new CustomEvent("app-toast", { detail: { message: "Consultation added to cart", type: "success" } }));
      window.dispatchEvent(new CustomEvent("cart-update", { detail: { count: result.cartCount } }));
    } catch (err) {
      setMsg(err.message || "Could not add to cart. Please try again.");
      window.dispatchEvent(new CustomEvent("app-toast", { detail: { message: err.message || "Could not add to cart", type: "error" } }));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel(id) {
    if (!id) return;
    setBusy(true);
    try {
      await cancelConsultation(id);
      await reload?.();
    } catch (err) {
      setMsg(err.message || "Could not cancel.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Consultations"
        actions={step !== "booking" ? (
          <PrimaryButton icon="ti-plus" onClick={openBooking}>Book</PrimaryButton>
        ) : undefined}
      />

      <Stagger>
        {msg && (
          <Item>
            <Pill tone="green" icon="ti-info-circle">{msg}</Pill>
          </Item>
        )}

        {step === "booking" && (
          <Item>
            <form onSubmit={submitBooking}>
              <div style={{ background: "#fff", borderRadius: 18, border: "1px solid var(--color-border-light)", boxShadow: "var(--shadow-card)", overflow: "hidden" }}>
                <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2E7D5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                  <span style={{ fontWeight: 600, fontSize: 15, color: "#2D1406" }}>Book a Consultation</span>
                </div>

                <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16, background: "rgba(46,125,91,0.05)", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 11, color: "#9C8B78", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Fee</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#2D1406" }}>₹{fee}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 11, color: "#9C8B78", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Duration</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#2D1406" }}>{duration} min</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 11, color: "#9C8B78", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Session</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#2D1406" }}>1-on-1</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#2D1406" }}>Select Date</label>
                    <input type="date" value={date} onChange={handleDateChange} required
                      min={new Date().toISOString().split("T")[0]}
                      style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--color-border)", fontSize: 14, background: "#fff" }} />
                  </div>

                  {loadingSlots && (
                    <div style={{ fontSize: 13, color: "#9C8B78", textAlign: "center", padding: 8 }}>Loading available slots...</div>
                  )}

                  {!loadingSlots && slots.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#2D1406" }}>Available Time Slots</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {slots.map((s) => (
                          <button key={s.time} type="button" disabled={!s.available}
                            onClick={() => setTimeSlot(s.time)}
                            style={{
                              padding: "8px 16px", borderRadius: 8,
                              border: `1.5px solid ${timeSlot === s.time ? "#2E7D5B" : s.available ? "var(--color-border)" : "#eee"}`,
                              background: timeSlot === s.time ? "rgba(46,125,91,0.1)" : s.available ? "#fff" : "#f9f9f9",
                              color: s.available ? "#2D1406" : "#ccc",
                              cursor: s.available ? "pointer" : "not-allowed",
                              fontWeight: timeSlot === s.time ? 600 : 400, fontSize: 14, transition: "all 0.15s",
                            }}>
                            {s.time}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!loadingSlots && date && slots.length === 0 && (
                    <div style={{ fontSize: 13, color: "#9C8B78", textAlign: "center", padding: 8 }}>No slots available for this date.</div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#2D1406" }}>Topic (optional)</label>
                    <input type="text" value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Stress management, flexibility goals"
                      style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--color-border)", fontSize: 14 }} />
                  </div>

                  <div style={{ background: "rgba(46,125,91,0.06)", borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#9C8B78" }}>Booking Summary</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#2D1406", marginTop: 2 }}>
                        {date ? formatDate(date) : "—"} · {timeSlot || "—"} · {duration} min
                      </div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#2E7D5B" }}>₹{fee}</div>
                  </div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <GhostButton icon="ti-arrow-left" onClick={() => setStep("list")} disabled={busy}>Back</GhostButton>
                    <PrimaryButton type="submit" disabled={busy || !date || !timeSlot}>
                      {busy ? "Booking..." : "Confirm Booking"}
                    </PrimaryButton>
                  </div>
                </div>
              </div>
            </form>
          </Item>
        )}

        <Panel title="Upcoming" icon="ti-calendar-time" actions={
          step !== "booking" ? <PrimaryButton icon="ti-plus" onClick={openBooking}>Book</PrimaryButton> : undefined
        }>
          {upcoming.length === 0 ? (
            <EmptyState compact icon="ti-stethoscope" title="No upcoming consultations." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <AnimatePresence mode="popLayout">
                {upcoming.map((cu) => (
                  <PremiumConsultationCard
                    key={cu.id}
                    consultation={cu}
                    onCancel={handleCancel}
                    busy={busy}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </Panel>

        {past.length > 0 && (
          <Panel title="Past consultations" icon="ti-history">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {past.map((cp) => (
                <PastConsultationCard key={cp.id} consultation={cp} onRebook={openBooking} />
              ))}
            </div>
          </Panel>
        )}
      </Stagger>
    </>
  );
}
