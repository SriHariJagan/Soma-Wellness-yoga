import { useState, useEffect } from "react";
import s from "./YogaAdmin.module.css";
import { PageHeader } from "./ui/Primitives";
import { timeSlotsApi } from "../api/AdminServices.js";
import {
  LuRefreshCw, LuPlus, LuTrash2, LuToggleLeft, LuToggleRight, LuClock, LuCalendarDays,
  LuCheck, LuX, LuSave,
} from "react-icons/lu";

const PRESET_TIMES = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
];

export default function TimeSlotManagement() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [feedback, setFeedback] = useState({ message: "", type: "" });
  const [busy, setBusy] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [selectedTimes, setSelectedTimes] = useState([]);

  const flash = (message, type = "success") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: "", type: "" }), 4000);
  };

  const fetchSlots = async () => {
    if (!selectedDate) return;
    setLoading(true);
    setError("");
    try {
      const data = await timeSlotsApi.list({ date: selectedDate });
      setSlots(data || []);
    } catch (err) {
      setError(err.message || "Could not load time slots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSlots(); }, [selectedDate]);

  const handleToggleActive = async (id, currentActive) => {
    setBusy(true);
    try {
      await timeSlotsApi.update(id, { isActive: !currentActive });
      flash(`Slot ${currentActive ? "disabled" : "enabled"}`);
      fetchSlots();
    } catch (err) {
      flash(err.message || "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this time slot?")) return;
    setBusy(true);
    try {
      await timeSlotsApi.remove(id);
      flash("Time slot deleted");
      fetchSlots();
    } catch (err) {
      flash(err.message || "Delete failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleTimeSelection = (time) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const handleBulkCreate = async () => {
    if (selectedTimes.length === 0) {
      flash("Select at least one time slot", "error");
      return;
    }
    setBusy(true);
    try {
      await timeSlotsApi.createBatch({ date: selectedDate, times: selectedTimes });
      flash(`${selectedTimes.length} time slots created`);
      setSelectedTimes([]);
      setShowAddPanel(false);
      fetchSlots();
    } catch (err) {
      flash(err.message || "Bulk create failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {feedback.message && (
        <div className={`${s.banner} ${feedback.type === "error" ? s.bannerErr : s.bannerOk}`}>
          {feedback.message}
        </div>
      )}

      <PageHeader title="Time Slot Management" subtitle="Create and manage consultation time slots for each date">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className={s.searchWrap} style={{ maxWidth: 220 }}>
            <LuCalendarDays className={s.searchIcon} />
            <input
              className={s.searchInput}
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <button className={`${s.btn} ${s.btnSm}`} onClick={fetchSlots}>
            <LuRefreshCw size={14} /> Refresh
          </button>
          <button
            className={`${s.btn} ${s.btnPrimary}`}
            onClick={() => setShowAddPanel((v) => !v)}
          >
            {showAddPanel ? <LuX size={14} /> : <LuPlus size={14} />}
            {showAddPanel ? " Cancel" : " Add Slots"}
          </button>
        </div>
      </PageHeader>

      {showAddPanel && (
        <div className={s.card} style={{ marginBottom: 20 }}>
          <h3 className={s.cardTitle}>
            <span className={s.cardTitleIcon}><LuClock /></span>
            Add Time Slots for {new Date(selectedDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {PRESET_TIMES.map((time) => {
              const exists = slots.some((s) => s.time === time);
              const selected = selectedTimes.includes(time);
              return (
                <button
                  key={time}
                  type="button"
                  disabled={exists}
                  onClick={() => toggleTimeSelection(time)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: `1.5px solid ${selected ? "#2E7D5B" : exists ? "#eee" : "var(--line)"}`,
                    background: selected ? "rgba(46,125,91,0.1)" : exists ? "#f9f9f9" : "#fff",
                    color: exists ? "#ccc" : selected ? "#2E7D5B" : "var(--text-1)",
                    cursor: exists ? "not-allowed" : "pointer",
                    fontWeight: selected ? 600 : 400,
                    fontSize: 13,
                    transition: "all 0.15s",
                  }}
                >
                  {time}
                  {exists && " (exists)"}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              onClick={handleBulkCreate}
              disabled={busy || selectedTimes.length === 0}
            >
              <LuPlus size={14} /> Create {selectedTimes.length} Slot{selectedTimes.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      <div className={`${s.card} ${s.cardNoPad}`}>
        {loading ? (
          <div style={{ padding: 22 }}>{[...Array(4)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} />)}</div>
        ) : error ? (
          <div className={`${s.emptyState} ${s.stateError}`}>
            {error}<br />
            <button className={`${s.btn} ${s.btnSm}`} style={{ marginTop: 12 }} onClick={fetchSlots}>Retry</button>
          </div>
        ) : slots.length === 0 ? (
          <div className={s.emptyState}>
            <LuClock size={40} opacity={0.3} />
            <p>No time slots for this date. Click "Add Slots" to create them.</p>
          </div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot._id}>
                    <td>
                      <div className={s.cellPrimary} style={{ fontWeight: 600, fontSize: 15 }}>
                        {slot.time}
                      </div>
                    </td>
                    <td>
                      {slot.isActive ? (
                        <span className={s.badge} style={{ background: "rgba(22,163,74,0.1)", color: "#16A34A" }}>Active</span>
                      ) : (
                        <span className={s.badge} style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}>Disabled</span>
                      )}
                    </td>
                    <td>
                      <div className={s.cellMeta}>
                        {slot.createdAt
                          ? new Date(slot.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                          : "—"}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className={`${s.btn} ${s.btnSm}`}
                          onClick={() => handleToggleActive(slot._id, slot.isActive)}
                          disabled={busy}
                          title={slot.isActive ? "Disable" : "Enable"}
                        >
                          {slot.isActive ? <LuToggleRight size={14} /> : <LuToggleLeft size={14} />}
                        </button>
                        <button
                          className={`${s.btn} ${s.btnSm} ${s.btnDanger}`}
                          onClick={() => handleDelete(slot._id)}
                          disabled={busy}
                          title="Delete"
                        >
                          <LuTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8, textAlign: "right" }}>
        {slots.filter((s) => s.isActive).length} active / {slots.length} total
      </div>
    </div>
  );
}
