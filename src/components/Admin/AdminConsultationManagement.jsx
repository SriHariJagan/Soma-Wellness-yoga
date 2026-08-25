import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import s from "./YogaAdmin.module.css";
import Badge from "./Badge";
import { PageHeader, KpiCard, Avatar } from "./ui/Primitives";
import {
  getConsultations, getConsultationAnalytics, updateConsultation,
} from "../api/AdminServices.js";
import {
  LuRefreshCw, LuCalendarClock, LuClock, LuCircleCheck, LuCircleX,
  LuSearch, LuSave, LuX, LuStethoscope, LuIndianRupee, LuTrendingUp,
  LuUser, LuMail, LuPhone, LuMapPin, LuCalendar, LuStickyNote,
  LuPen, LuLink, LuAward, LuChevronRight, LuVideo, LuCheck,
  LuCircleAlert, LuTarget, LuBookOpen, LuLayers,
} from "react-icons/lu";

const STATUS_TABS = ["All", "Upcoming", "Confirmed", "Pending", "Completed", "Cancelled"];
const STATUS_OPTIONS = ["upcoming", "confirmed", "pending", "completed", "cancelled", "rescheduled"];

const C = {
  cream: "#F8F4EC", card: "#FFFFFF", border: "#E7D7BE",
  primary: "#2E7D5B", primaryLight: "#81B29A",
  primaryBg: "rgba(46,125,91,0.10)", primaryShadow: "rgba(46,125,91,0.25)",
  dark: "#2D1406", text2: "#6B5E4E", text3: "#9C8E7C",
  green: "#16A34A", greenBg: "rgba(22,163,74,0.10)",
  amber: "#D97706", amberBg: "rgba(217,119,6,0.10)",
  blue: "#2563EB", blueBg: "rgba(37,99,235,0.10)",
  red: "#DC2626", redBg: "rgba(220,38,38,0.10)",
};

const row = { display: "flex", alignItems: "center", gap: 8 };
const flexCenter = { display: "flex", alignItems: "center", justifyContent: "center" };
const cardSt = { background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, padding: 24 };
const iconBox = (bg = C.primaryBg) => ({
  width: 40, height: 40, borderRadius: 12, ...flexCenter, fontSize: 18, background: bg, flexShrink: 0,
});

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(231,215,190,0.4)" }}>
      <div style={{ width: 18, color: C.primary, flexShrink: 0, ...flexCenter }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: C.text3, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: C.dark, fontWeight: 500 }}>{value || "—"}</div>
      </div>
    </div>
  );
}

function SectionCard({ icon, title, children, extraStyle }) {
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

function FormField({ label, value, onChange, type = "text", placeholder, multiline, options }) {
  const shared = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px",
    fontSize: 13.5, color: C.dark, background: C.card, outline: "none",
    boxSizing: "border-box", transition: "border-color .15s", fontFamily: "inherit",
  };
  return (
    <div>
      {label && <div style={{ fontSize: 11, color: C.text3, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>}
      {multiline ? (
        <textarea style={{ ...shared, resize: "vertical", minHeight: 80 }} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={e => e.target.style.borderColor = C.primary} onBlur={e => e.target.style.borderColor = C.border} />
      ) : options ? (
        <select style={{ ...shared, cursor: "pointer" }} value={value} onChange={onChange}
          onFocus={e => e.target.style.borderColor = C.primary} onBlur={e => e.target.style.borderColor = C.border}>
          {options.map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
        </select>
      ) : (
        <input type={type} style={shared} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={e => e.target.style.borderColor = C.primary} onBlur={e => e.target.style.borderColor = C.border} />
      )}
    </div>
  );
}

function PrimaryBtn({ children, onClick, small, icon, disabled, danger }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      ...row, gap: 6, padding: small ? "8px 16px" : "11px 22px",
      border: "none", borderRadius: 10, cursor: disabled ? "default" : "pointer",
      fontSize: small ? 12.5 : 13.5, fontWeight: 600,
      color: "#fff",
      background: danger ? C.red : `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
      boxShadow: disabled ? "none" : danger ? "none" : `0 4px 14px ${C.primaryShadow}`,
      opacity: disabled ? 0.5 : 1, transition: "all .15s", whiteSpace: "nowrap", fontFamily: "inherit",
    }}>
      {icon}{children}
    </button>
  );
}

function GhostBtn({ children, onClick, icon, small, danger }) {
  return (
    <button type="button" onClick={onClick} style={{
      ...row, gap: 6, padding: small ? "8px 16px" : "11px 22px",
      border: `1px solid ${danger ? C.red : C.border}`, borderRadius: 10,
      cursor: "pointer", fontSize: small ? 12.5 : 13.5, fontWeight: 500,
      color: danger ? C.red : C.text2, background: C.card,
      transition: "all .15s", whiteSpace: "nowrap", fontFamily: "inherit",
    }}>
      {icon}{children}
    </button>
  );
}

function FeedbackBanner({ message, type, onDismiss }) {
  if (!message) return null;
  const isErr = type === "error";
  return (
    <div style={{
      padding: "12px 18px", borderRadius: 12, marginBottom: 16, ...row,
      background: isErr ? C.redBg : C.greenBg, color: isErr ? C.red : C.green,
      fontSize: 13, fontWeight: 500,
    }}>
      {isErr ? <LuCircleAlert size={18} /> : <LuCheck size={18} />}
      <span style={{ flex: 1 }}>{message}</span>
      <button type="button" onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 4 }}>
        <LuX size={16} />
      </button>
    </div>
  );
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function EditConsultationDrawer({ consultation, onClose, onSave }) {
  const [form, setForm] = useState({
    status: consultation?.status || "upcoming",
    assignedGuru: consultation?.assignedGuru || "",
    meetingLink: consultation?.meetingLink || "",
    adminNotes: consultation?.adminNotes || "",
    notes: consultation?.notes || "",
    topic: consultation?.topic || "",
    doctor: consultation?.doctor || "",
    timeSlot: consultation?.timeSlot || "",
    date: consultation?.date ? consultation.date.slice(0, 10) : "",
    duration: consultation?.duration || 30,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ message: "", type: "" });

  const flash = (msg, type = "success") => {
    setFeedback({ message: msg, type });
    setTimeout(() => setFeedback({ message: "", type: "" }), 3000);
  };

  const user = consultation?.user || {};
  const statusColors = {
    upcoming: C.amber, confirmed: C.green, completed: C.blue, cancelled: C.red, pending: C.text3,
  };
  const paymentColors = {
    paid: C.green, pending: C.amber, failed: C.red, refunded: C.text3,
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await updateConsultation(consultation._id, form);
      flash("Consultation updated successfully");
      setTimeout(() => { onSave?.(); onClose(); }, 600);
    } catch (err) {
      flash(err.message || "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel this consultation?")) return;
    setSaving(true);
    try {
      await updateConsultation(consultation._id, { status: "cancelled" });
      flash("Consultation cancelled");
      setTimeout(() => { onSave?.(); onClose(); }, 600);
    } catch (err) {
      flash(err.message || "Cancel failed", "error");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", justifyContent: "flex-end" }}
      >
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }} onClick={onClose} />
        <motion.div
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          style={{
            position: "relative", width: 760, maxWidth: "100vw", height: "100vh",
            background: C.cream, display: "flex", flexDirection: "column",
            boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
          }}
        >
          <div style={{ flex: 1, overflow: "hidden auto" }}>
            <FeedbackBanner message={feedback.message} type={feedback.type} onDismiss={() => setFeedback({ message: "", type: "" })} />

            <div style={{
              padding: "28px 32px 20px", borderBottom: `1px solid ${C.border}`,
              background: "linear-gradient(135deg, rgba(46,125,91,0.06), rgba(129,178,154,0.03))",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <Avatar name={user.name || "?"} size={s.avatarLg} />
                  <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.dark, display: "flex", alignItems: "center", gap: 8 }}>
                      {user.name || "Unknown Student"}
                      <Badge label={consultation.status ? consultation.status.charAt(0).toUpperCase() + consultation.status.slice(1) : "Pending"} />
                    </h2>
                    <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 13, color: C.text2 }}>
                      <span style={{ ...row, gap: 4 }}><LuMail size={13} /> {user.email || "—"}</span>
                      {user.phone && <span style={{ ...row, gap: 4 }}><LuPhone size={13} /> {user.phone}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 6, fontSize: 11.5, fontWeight: 600,
                        background: `${paymentColors[consultation.paymentStatus] || C.text3}1A`,
                        color: paymentColors[consultation.paymentStatus] || C.text3,
                        ...row, gap: 4,
                      }}>
                        <LuIndianRupee size={12} /> {consultation.paymentStatus || "pending"}
                      </span>
                      <span style={{ fontSize: 12, color: C.text3, ...row, gap: 4 }}>
                        <LuCalendar size={12} /> {formatDate(consultation.date)} {consultation.timeSlot ? `· ${consultation.timeSlot}` : ""}
                      </span>
                      <span style={{ fontSize: 12, color: C.text3, ...row, gap: 4 }}>
                        <LuClock size={12} /> {consultation.duration || 30} min
                      </span>
                      {consultation.price > 0 && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>₹{consultation.price}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.text3, padding: 4 }}>
                  <LuX size={22} />
                </button>
              </div>
            </div>

            <div style={{ padding: "24px 32px 40px" }}>
              <SectionCard icon={<LuStethoscope size={18} />} title="Consultation Details">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <FormField label="Consultation Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUS_OPTIONS} />
                  <FormField label="Topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Stress management" />
                  <FormField label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  <FormField label="Time Slot" value={form.timeSlot} onChange={(e) => setForm({ ...form, timeSlot: e.target.value })} placeholder="e.g. 09:00" />
                  <FormField label="Duration (minutes)" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
                  <FormField label="Doctor / Specialist" value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })} placeholder="e.g. Dr. Kapil Kesari" />
                </div>
              </SectionCard>

              <SectionCard icon={<LuVideo size={18} />} title="Meeting Details">
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
                  <FormField label="Meeting Link (Zoom / Google Meet)" value={form.meetingLink} onChange={(e) => setForm({ ...form, meetingLink: e.target.value })} placeholder="https://zoom.us/j/..." />
                </div>
                {form.meetingLink && (
                  <div style={{ marginTop: 10, padding: "12px 16px", background: C.greenBg, borderRadius: 10, ...row, gap: 10 }}>
                    <LuCheck size={18} color={C.green} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>Meeting link active</div>
                      <div style={{ fontSize: 12, color: C.text2, wordBreak: "break-all" }}>{form.meetingLink}</div>
                    </div>
                  </div>
                )}
              </SectionCard>

              <SectionCard icon={<LuAward size={18} />} title="Assigned Guru">
                <FormField label="Yoga Guru / Instructor" value={form.assignedGuru} onChange={(e) => setForm({ ...form, assignedGuru: e.target.value })} placeholder="e.g. Guru Anand" />
              </SectionCard>

              <SectionCard icon={<LuStickyNote size={18} />} title="Admin Notes">
                <FormField label="Notes (visible to student)" multiline value={form.adminNotes} onChange={(e) => setForm({ ...form, adminNotes: e.target.value })} placeholder="Add notes visible to the student..." />
              </SectionCard>

              <SectionCard icon={<LuLayers size={18} />} title="Booking Information">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                  <InfoRow icon={<LuCalendar size={14} />} label="Booked On" value={consultation.createdAt ? formatDate(consultation.createdAt) : "—"} />
                  <InfoRow icon={<LuClock size={14} />} label="Last Updated" value={consultation.updatedAt ? formatDate(consultation.updatedAt) : "—"} />
                  <InfoRow icon={<LuIndianRupee size={14} />} label="Amount Paid" value={consultation.price > 0 ? `₹${consultation.price}` : "Free"} />
                  <InfoRow icon={<LuCheck size={14} />} label="Payment Status" value={consultation.paymentStatus || "pending"} />
                  <InfoRow icon={<LuLink size={14} />} label="Payment Ref" value={consultation.paymentRef?.transactionId || "—"} />
                </div>
              </SectionCard>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <GhostBtn onClick={handleCancel} icon={<LuCircleX size={16} />} danger>
                  Cancel Consultation
                </GhostBtn>
                <GhostBtn onClick={onClose}>Discard</GhostBtn>
                <PrimaryBtn onClick={handleSubmit} icon={<LuSave size={16} />} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </PrimaryBtn>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export default function AdminConsultationManagement({ onChanged } = {}) {
  const [consultations, setConsultations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [feedback, setFeedback] = useState({ message: "", type: "" });
  const [editingConsultation, setEditingConsultation] = useState(null);

  const flash = (message, type = "success") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: "", type: "" }), 4000);
  };

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== "All") params.status = statusFilter.toLowerCase();
      const [cons, anl] = await Promise.all([
        getConsultations(params).catch(() => []),
        getConsultationAnalytics().catch(() => null),
      ]);
      setConsultations(cons);
      setAnalytics(anl);
    } catch (err) {
      setError(err.message || "Could not load consultations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [search, statusFilter]);

  const filtered = statusFilter === "All" ? consultations : consultations.filter(c => c.status === statusFilter.toLowerCase());

  return (
    <div>
      {feedback.message && (
        <div className={`${s.banner} ${feedback.type === "error" ? s.bannerErr : s.bannerOk}`}>
          {feedback.message}
        </div>
      )}

      <PageHeader title="Consultation Bookings" subtitle="Manage student consultations, schedules, and payments">
        <button className={s.iconBtn} onClick={fetchAll} title="Refresh"><LuRefreshCw /></button>
      </PageHeader>

      <div className={s.statsRow} style={{ marginBottom: 20 }}>
        <KpiCard icon={<LuCalendarClock />} label="Total" value={analytics?.total ?? 0} accent="orange" />
        <KpiCard icon={<LuClock />} label="Upcoming" value={analytics?.upcoming ?? 0} accent="amber" />
        <KpiCard icon={<LuCircleCheck />} label="Completed" value={analytics?.completed ?? 0} accent="green" />
        <KpiCard icon={<LuCircleX />} label="Cancelled" value={analytics?.cancelled ?? 0} accent="blue" />
        <KpiCard icon={<LuIndianRupee />} label="Revenue" value={analytics?.revenue ?? 0} prefix="₹" accent="orange" />
        <KpiCard icon={<LuTrendingUp />} label="Paid" value={analytics?.paidCount ?? 0} accent="green" />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div className={s.topSearch} style={{ maxWidth: 380, height: 44 }}>
          <LuSearch size={17} />
          <input
            placeholder="Search by student name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${s.chip} ${statusFilter === tab ? s.chipActive : ""}`}
            onClick={() => setStatusFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={`${s.card} ${s.cardNoPad}`}>
        {loading ? (
          <div style={{ padding: 22 }}>{[...Array(5)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} />)}</div>
        ) : error ? (
          <div className={`${s.emptyState} ${s.stateError}`}>
            {error}<br />
            <button type="button" className={`${s.btn} ${s.btnSm}`} style={{ marginTop: 12 }} onClick={fetchAll}>Retry</button>
          </div>
        ) : consultations.length === 0 ? (
          <div className={s.emptyState}>
            <LuStethoscope size={40} opacity={0.3} />
            <p>No consultations found.</p>
          </div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Date / Time</th>
                  <th>Topic</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Guru</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {consultations.map((c) => (
                  <motion.tr
                    key={c._id}
                    className={s.rowClickable}
                    onClick={() => setEditingConsultation(c)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <td>
                      <div className={s.cellUser}>
                        <Avatar name={c.user?.name || "?"} size={s.avatarSm} />
                        <div>
                          <strong style={{ fontSize: 13.5 }}>{c.user?.name || "—"}</strong>
                          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{c.user?.email || ""}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-1)" }}>
                        {c.date ? formatDate(c.date) : "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                        {c.timeSlot || ""}
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--text-2)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.topic || "—"}
                    </td>
                    <td>
                      <Badge label={c.status ? c.status.charAt(0).toUpperCase() + c.status.slice(1) : "Pending"} />
                    </td>
                    <td>
                      {c.paymentStatus === "paid" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ color: "#16A34A", fontWeight: 700, fontSize: 14 }}>₹{c.price || 0}</span>
                          <Badge label="Paid" />
                        </div>
                      ) : (
                        <Badge label={c.paymentStatus ? c.paymentStatus.charAt(0).toUpperCase() + c.paymentStatus.slice(1) : "Pending"} />
                      )}
                    </td>
                    <td style={{ fontSize: 13, color: "var(--text-2)" }}>
                      {c.assignedGuru || (
                        <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>Not assigned</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className={`${s.btn} ${s.btnSm}`}
                        onClick={(e) => { e.stopPropagation(); setEditingConsultation(c); }}
                        style={{ fontSize: 12 }}
                      >
                        <LuPen size={13} /> Edit
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingConsultation && (
        <EditConsultationDrawer
          consultation={editingConsultation}
          onClose={() => setEditingConsultation(null)}
          onSave={() => { fetchAll(); if (onChanged) onChanged(); }}
        />
      )}
    </div>
  );
}
