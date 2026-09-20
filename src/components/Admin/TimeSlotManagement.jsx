import { useState, useEffect, useRef } from "react";
import s from "./YogaAdmin.module.css";
import Badge from "./Badge";
import { PageHeader } from "./ui/Primitives";
import { timeSlotsApi, getSettings, updateSettings } from "../api/AdminServices.js";
import {
  LuRefreshCw, LuPlus, LuTrash2, LuClock, LuCalendarDays,
  LuCheck, LuX, LuChevronLeft, LuChevronRight,
} from "react-icons/lu";

const GROUP_CLASS_TIMES = ["07:00", "08:30", "17:30", "18:30"];
const PRESET_TIMES = [
  "06:00", "07:00", "08:00", "08:30", "09:00", "10:00", "11:00",
  "14:00", "15:00", "16:00", "17:00", "17:30", "18:00", "18:30", "19:00",
];

const toISODate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shiftDate = (iso, days) => {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
};
const prettyDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" });
};
const prettyTime = (t) => {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};
const partOfDay = (t) => {
  const h = Number(t.split(":")[0]);
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
};

export default function TimeSlotManagement() {
  const [slots, setSlots] = useState([]);
  const [weekMap, setWeekMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
  const [feedback, setFeedback] = useState({ message: "", type: "" });
  const [busy, setBusy] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const datePickerRef = useRef(null);
  const [horizon, setHorizon] = useState(2);
  const [horizonDraft, setHorizonDraft] = useState(2);
  const [savingHorizon, setSavingHorizon] = useState(false);

  const todayISO = toISODate(new Date());
  // Admin manage window: today + next 6 days (7 days total)
  const maxManageISO = (() => { const d = new Date(); d.setDate(d.getDate() + 6); return toISODate(d); })();
  const clampToWindow = (iso) => {
    if (iso < todayISO) return todayISO;
    if (iso > maxManageISO) return maxManageISO;
    return iso;
  };
  const weekStart = (() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const dow = (dt.getDay() + 6) % 7; // Monday-first
    dt.setDate(dt.getDate() - dow);
    return dt;
  })();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(weekStart);
    dt.setDate(dt.getDate() + i);
    return toISODate(dt);
  });

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
      setSlots((data || []).slice().sort((a, b) => a.time.localeCompare(b.time)));
      // Week overview in the background (best-effort, never blocks the day view)
      Promise.all(
        weekDays.map((day) =>
          timeSlotsApi.list({ date: day }).then(
            (list) => ({ day, list: list || [] }),
            () => ({ day, list: null }),
          )
        )
      ).then((results) => {
        setWeekMap((prev) => {
          const next = { ...prev };
          results.forEach(({ day, list }) => { if (list) next[day] = list; });
          return next;
        });
      }).catch(() => {});
    } catch (err) {
      setError(err.message || "Could not load time slots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSlots(); }, [selectedDate]);

  useEffect(() => {
    getSettings().then((st) => {
      const h = Math.max(1, Math.min(30, Number(st?.bookingHorizonDays) || 2));
      setHorizon(h);
      setHorizonDraft(h);
    }).catch(() => {});
  }, []);

  const saveHorizon = async () => {
    const n = Math.max(1, Math.min(30, Number(horizonDraft) || 2));
    setSavingHorizon(true);
    try {
      await updateSettings({ bookingHorizonDays: n });
      setHorizon(n);
      setHorizonDraft(n);
      flash(`Members can now book ${n} day${n === 1 ? "" : "s"} ahead`);
    } catch (err) {
      flash(err.message || "Could not save", "error");
    } finally {
      setSavingHorizon(false);
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    setBusy(true);
    try {
      await timeSlotsApi.update(id, { isActive: !currentActive });
      flash(`Slot ${currentActive ? "disabled — members won't see it" : "enabled — members can book it"}`);
      fetchSlots();
    } catch (err) {
      flash(err.message || "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id, time) => {
    if (!window.confirm(`Delete the ${prettyTime(time)} slot? Bookings on it stay untouched.`)) return;
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
      flash(`${selectedTimes.length} slot${selectedTimes.length !== 1 ? "s" : ""} opened for booking`);
      setSelectedTimes([]);
      setShowAddPanel(false);
      fetchSlots();
    } catch (err) {
      flash(err.message || "Bulk create failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const activeCount = slots.filter((sl) => sl.isActive).length;
  const groups = ["Morning", "Afternoon", "Evening"]
    .map((g) => ({ label: g, items: slots.filter((sl) => partOfDay(sl.time) === g) }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      {feedback.message && (
        <div className={`${s.banner} ${feedback.type === "error" ? s.bannerErr : s.bannerOk}`}>
          {feedback.message}
        </div>
      )}

      <PageHeader title="Time Slots" subtitle="Open bookable times per day — members can only book what you open here">
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className={`${s.btn} ${s.btnSm}`} onClick={fetchSlots}>
            <LuRefreshCw size={14} /> Refresh
          </button>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setShowAddPanel((v) => !v)}>
            {showAddPanel ? <LuX size={14} /> : <LuPlus size={14} />}
            {showAddPanel ? " Close" : " Add Slots"}
          </button>
        </div>
      </PageHeader>

      {/* Premium day navigator — past days can never be scheduled */}
      <div className={s.card} style={{ marginBottom: 16, padding: "18px 22px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", background: "linear-gradient(120deg, #0e241b 0%, #1a4d35 100%)", border: "none" }}>
        <button type="button" aria-label="Previous day" disabled={selectedDate <= todayISO}
          onClick={() => setSelectedDate((d) => clampToWindow(shiftDate(d, -1)))}
          style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: selectedDate <= todayISO ? "default" : "pointer", opacity: selectedDate <= todayISO ? 0.35 : 1, display: "grid", placeItems: "center" }}>
          <LuChevronLeft size={17} />
        </button>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#b8d4c8" }}>
            {selectedDate === todayISO ? "Today · " : ""}Managing slots for
          </div>
          <div style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: 26, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>
            {prettyDate(selectedDate)}
          </div>
        </div>
        {selectedDate !== todayISO && (
          <button type="button" onClick={() => setSelectedDate(todayISO)}
            style={{ padding: "9px 18px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.25)", background: "transparent", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            Today
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            const el = datePickerRef.current;
            if (!el) return;
            try {
              if (typeof el.showPicker === "function") el.showPicker();
              else { el.focus(); el.click(); }
            } catch { el.focus(); }
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 999, border: "none", background: "#F5EFE2", color: "#0e241b", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
        >
          <LuCalendarDays size={15} /> Pick date
        </button>
        <input
          ref={datePickerRef}
          type="date" value={selectedDate}
          onChange={(e) => e.target.value && setSelectedDate(clampToWindow(e.target.value))}
          min={todayISO} max={maxManageISO}
          aria-hidden="true" tabIndex={-1}
          style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
        />
        <button type="button" aria-label="Next day" disabled={selectedDate >= maxManageISO}
          onClick={() => setSelectedDate((d) => clampToWindow(shiftDate(d, 1)))}
          style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: selectedDate >= maxManageISO ? "default" : "pointer", opacity: selectedDate >= maxManageISO ? 0.35 : 1, display: "grid", placeItems: "center" }}>
          <LuChevronRight size={17} />
        </button>
      </div>

      {/* Week overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 16 }}>
        {weekDays.map((day) => {
          const list = weekMap[day];
          const open = list ? list.filter((sl) => sl.isActive).length : null;
          const total = list ? list.length : null;
          const isSel = day === selectedDate;
          const isToday = day === todayISO;
          const [, m, d] = day.split("-").map(Number);
          const wd = new Date(+day.slice(0, 4), m - 1, d).toLocaleDateString("en-KE", { weekday: "narrow" });
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDate(day)}
              style={{
                borderRadius: 14, cursor: "pointer", padding: "10px 4px",
                border: isSel ? "1.5px solid #2E7D5B" : "1px solid var(--line)",
                background: isSel ? "rgba(46,125,91,0.08)" : "#fff",
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: isToday ? "#2E7D5B" : "var(--text-3)" }}>
                {isToday ? "Today" : wd}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)", margin: "2px 0" }}>{d}</div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: total ? "var(--text-2)" : "var(--text-3)" }}>
                {list == null ? "· · ·" : total === 0 ? "Closed" : `${open}/${total} open`}
              </div>
              {list != null && total > 0 && (
                <div style={{ height: 4, borderRadius: 4, background: "rgba(38,51,44,0.08)", marginTop: 6, overflow: "hidden" }}>
                  <div style={{ width: `${(open / total) * 100}%`, height: "100%", background: open === 0 ? "#DC2626" : "#16A34A" }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Day summary */}
      <div className={s.card} style={{ marginBottom: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span className={s.cardTitleIcon}><LuClock /></span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{prettyDate(selectedDate)}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>
            {slots.length === 0
              ? "No slots opened yet"
              : <><strong style={{ color: "var(--text-1)" }}>{activeCount}</strong> open for booking · {slots.length - activeCount} disabled</>}
          </div>
        </div>
      </div>

      {/* Member visibility horizon */}
      <div className={s.card} style={{ marginBottom: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span className={s.cardTitleIcon}><LuCalendarDays /></span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Members can book ahead</div>
          <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>
            Currently <strong style={{ color: "var(--text-1)" }}>{horizon} day{horizon === 1 ? "" : "s"}</strong> — you manage 7 days, members see only this window.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" className={`${s.btn} ${s.btnSm}`} aria-label="Fewer days"
            onClick={() => setHorizonDraft((n) => Math.max(1, (Number(n) || 2) - 1))}>−</button>
          <span style={{ fontSize: 16, fontWeight: 800, minWidth: 56, textAlign: "center" }}>
            {horizonDraft} day{Number(horizonDraft) === 1 ? "" : "s"}
          </span>
          <button type="button" className={`${s.btn} ${s.btnSm}`} aria-label="More days"
            onClick={() => setHorizonDraft((n) => Math.min(30, (Number(n) || 2) + 1))}>+</button>
          <button
            type="button" className={`${s.btn} ${s.btnSm} ${s.btnPrimary}`}
            disabled={savingHorizon || Number(horizonDraft) === horizon}
            onClick={saveHorizon}
          >
            {savingHorizon ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {showAddPanel && (
        <div className={s.card} style={{ marginBottom: 16 }}>
          <h3 className={s.cardTitle}>
            <span className={s.cardTitleIcon}><LuPlus /></span>
            Open slots for {prettyDate(selectedDate)}
          </h3>
          <p className={s.cardDesc} style={{ marginBottom: 12 }}>
            Group class times are starred ★ — tap to select, then create. Anything already open is greyed out.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {PRESET_TIMES.map((time) => {
              const exists = slots.some((sl) => sl.time === time);
              const selected = selectedTimes.includes(time);
              const isGroup = GROUP_CLASS_TIMES.includes(time);
              return (
                <button
                  key={time}
                  type="button"
                  disabled={exists}
                  onClick={() => toggleTimeSelection(time)}
                  title={isGroup ? "Group class time" : prettyTime(time)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 10,
                    border: `1.5px solid ${selected ? "#2E7D5B" : exists ? "#eee" : "var(--line)"}`,
                    background: selected ? "rgba(46,125,91,0.1)" : exists ? "#f7f7f7" : "#fff",
                    color: exists ? "#bbb" : selected ? "#2E7D5B" : "var(--text-1)",
                    cursor: exists ? "not-allowed" : "pointer",
                    fontWeight: selected ? 700 : 400,
                    fontSize: 13,
                    transition: "all 0.15s",
                  }}
                >
                  {prettyTime(time)}{isGroup && !exists && " ★"}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>
              {selectedTimes.length > 0 ? `${selectedTimes.length} selected` : "Nothing selected yet"}
            </span>
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              onClick={handleBulkCreate}
              disabled={busy || selectedTimes.length === 0}
            >
              <LuCheck size={14} /> Open {selectedTimes.length > 0 ? selectedTimes.length : ""} Slot{selectedTimes.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className={s.card}><div style={{ padding: 6 }}>{[...Array(4)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} />)}</div></div>
      ) : error ? (
        <div className={`${s.card} ${s.emptyState} ${s.stateError}`}>
          {error}<br />
          <button className={`${s.btn} ${s.btnSm}`} style={{ marginTop: 12 }} onClick={fetchSlots}>Retry</button>
        </div>
      ) : slots.length === 0 ? (
        <div className={s.emptyState}>
          <LuClock size={40} opacity={0.3} />
          <p><strong>{prettyDate(selectedDate)}</strong> has no open slots — members can't book this day yet.</p>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setShowAddPanel(true)}>
            <LuPlus size={14} /> Open Slots
          </button>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.label} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 8 }}>
              {g.label} · {g.items.filter((i) => i.isActive).length}/{g.items.length} open
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
              {g.items.map((slot) => (
                <div
                  key={slot._id}
                  className={s.card}
                  style={{
                    padding: "14px 16px", margin: 0,
                    opacity: slot.isActive ? 1 : 0.65,
                    borderLeft: `3px solid ${slot.isActive ? "#16A34A" : "#DC2626"}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700 }}>{prettyTime(slot.time)}</div>
                      <div style={{ marginTop: 4 }}>
                        <Badge label={slot.isActive ? "Open" : "Disabled"} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className={`${s.btn} ${s.btnSm}`}
                        onClick={() => handleToggleActive(slot._id, slot.isActive)}
                        disabled={busy}
                        title={slot.isActive ? "Disable booking for this time" : "Open booking for this time"}
                      >
                        {slot.isActive ? "Disable" : "Enable"}
                      </button>
                      <button
                        className={`${s.btn} ${s.btnSm} ${s.btnDanger}`}
                        onClick={() => handleDelete(slot._id, slot.time)}
                        disabled={busy}
                        title="Delete slot"
                      >
                        <LuTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
