import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { EASE } from "../lib/motion";
import styles from "./Events.module.css";

const API = import.meta.env.VITE_API_URL || "";
const HERO_IMG = "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2000&auto=format&fit=crop";
const FALLBACK_IMG = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop";

const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const todayKey = () => dayKey(new Date());
const fmtDay = (d) =>
  new Date(d).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
const fmtMonth = (y, m) =>
  new Date(y, m, 1).toLocaleDateString("en-KE", { month: "long", year: "numeric" });

const statusOf = (ev, today) => {
  const k = dayKey(ev.date);
  if (k === today) return "ongoing";
  return new Date(ev.date) > new Date(`${today}T23:59:59`) ? "upcoming" : "completed";
};

const SectionHead = ({ eyebrow, title, titleEm, desc }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.6, ease: EASE }}
    className={styles.sectionHead}
  >
    <p className={styles.eyebrow}>{eyebrow}</p>
    <h2 className={styles.sectionTitle}>{title} <em>{titleEm}</em></h2>
    {desc && <p className={styles.sectionDesc}>{desc}</p>}
  </motion.div>
);

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registeredIds, setRegisteredIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState("upcoming");
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState("");
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(todayKey());

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/api/public/events?past=1`);
        if (!res.ok) throw new Error("events unavailable");
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.events || [];
        if (alive) setEvents(list.filter((e) => e.isPublished !== false));
      } catch {
        if (alive) setEvents([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/api/student/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const ids = new Set([
          ...(data.registered || []).map((e) => String(e._id)),
          ...((data.available || []).filter((e) => e.registered).map((e) => String(e._id))),
        ]);
        if (alive) setRegisteredIds(ids);
      } catch { /* guest mode */ }
    })();
    return () => { alive = false; };
  }, [token]);

  const today = todayKey();
  const grouped = useMemo(() => {
    const g = { ongoing: [], upcoming: [], completed: [] };
    [...events]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach((e) => g[statusOf(e, today)].push(e));
    return g;
  }, [events, today]);

  const byDay = useMemo(() => {
    const m = {};
    events.forEach((e) => {
      const k = dayKey(e.date);
      (m[k] = m[k] || []).push(e);
    });
    return m;
  }, [events]);

  // Calendar cells
  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < startOffset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    return arr;
  }, [viewYear, viewMonth]);

  const stepMonth = (dir) => {
    const d = new Date(viewYear, viewMonth + dir, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const reserve = async (ev) => {
    setNotice("");
    if (!token) {
      navigate(`/login?redirectTo=${encodeURIComponent("/events")}`);
      return;
    }
    setBusyId(ev._id);
    try {
      const res = await fetch(`${API}/api/student/events/${ev._id}/register`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Reservation failed");
      setRegisteredIds((prev) => new Set(prev).add(String(ev._id)));
      setEvents((prev) =>
        prev.map((e) => (String(e._id) === String(ev._id)
          ? { ...e, totalRegistrations: (e.totalRegistrations || 0) + 1 }
          : e))
      );
      setNotice(`Seat reserved — ${ev.title}. See you there.`);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const seatsLeft = (ev) => {
    if (!ev.capacity || ev.capacity <= 0) return null;
    return Math.max(0, ev.capacity - (ev.totalRegistrations || 0));
  };

  const Card = ({ ev, index }) => {
    const st = statusOf(ev, today);
    const left = seatsLeft(ev);
    const isFull = left === 0;
    const isReg = registeredIds.has(String(ev._id));
    const fill = ev.capacity > 0 ? Math.min(100, ((ev.totalRegistrations || 0) / ev.capacity) * 100) : 0;
    return (
      <motion.article
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.2), ease: EASE }}
      >
        <div className={styles.cardMedia}>
          <img src={ev.image || FALLBACK_IMG} alt={ev.title} loading="lazy" />
          <span className={styles.dateBadge}>
            <strong>{new Date(ev.date).getDate()}</strong>
            {new Date(ev.date).toLocaleDateString("en-KE", { month: "short" })}
          </span>
          <span className={styles.statusPill + " " + styles[st]}>{st}</span>
        </div>
        <div className={styles.cardBody}>
          <h3 className={styles.cardTitle}>{ev.title}</h3>
          <p className={styles.cardMeta}>
            {[fmtDay(ev.date), ev.startTime && `${ev.startTime}${ev.endTime ? `–${ev.endTime}` : ""}`]
              .filter(Boolean).join(" · ")}
          </p>
          {(ev.location || ev.instructor) && (
            <p className={styles.cardMetaDim}>
              {[ev.location, ev.instructor].filter(Boolean).join(" · ")}
            </p>
          )}
          {ev.description && <p className={styles.cardDesc}>{String(ev.description).slice(0, 130)}{String(ev.description).length > 130 ? "…" : ""}</p>}
          {ev.capacity > 0 && (
            <div className={styles.seats}>
              <div className={styles.seatBar}><span style={{ width: `${fill}%` }} /></div>
              <span className={styles.seatText}>
                {isFull ? "Sold out" : left !== null ? `${left} of ${ev.capacity} seats left` : ""}
              </span>
            </div>
          )}
          <div className={styles.cardFooter}>
            {st === "completed" ? (
              <span className={styles.doneLabel}>Completed ✓</span>
            ) : isReg ? (
              <span className={styles.regLabel}>Reserved ✓</span>
            ) : isFull ? (
              <button type="button" className={styles.ctaBtn} disabled>Full</button>
            ) : (
              <button
                type="button"
                className={styles.ctaBtn}
                disabled={busyId === ev._id}
                onClick={() => reserve(ev)}
              >
                {busyId === ev._id ? "Reserving…" : token ? "Reserve seat" : "Login to reserve"}
              </button>
            )}
          </div>
        </div>
      </motion.article>
    );
  };

  const tabs = [
    { id: "ongoing", label: `Ongoing (${grouped.ongoing.length})` },
    { id: "upcoming", label: `Upcoming (${grouped.upcoming.length})` },
    { id: "completed", label: `Completed (${grouped.completed.length})` },
  ];

  const dayEvents = (byDay[selectedDay] || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <img src={HERO_IMG} alt="" />
          <div className={styles.heroVeil} />
        </div>
        <motion.div
          className={styles.heroInner}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <p className={styles.heroEyebrow}>Gatherings</p>
          <h1 className={styles.heroTitle}>Events & <em>experiences</em></h1>
          <p className={styles.heroSub}>
            Workshops, wellness days and community rituals. Browse the calendar,
            pick your moment, reserve your seat.
          </p>
        </motion.div>
      </section>

      {notice && (
        <div className={styles.notice} role="status">
          <div className={styles.noticeInner}>{notice}
            <button type="button" onClick={() => setNotice("")} aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}

      {/* Calendar */}
      <section className={styles.calSection}>
        <div className={styles.container}>
          <SectionHead eyebrow="Calendar" title="Find your" titleEm="moment" desc="Every published gathering, live from the studio calendar. Select a day to see what's on." />
          <div className={styles.calGrid}>
            <motion.div
              className={styles.calCard}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <div className={styles.calHead}>
                <button type="button" onClick={() => stepMonth(-1)} aria-label="Previous month">‹</button>
                <strong>{fmtMonth(viewYear, viewMonth)}</strong>
                <button type="button" onClick={() => stepMonth(1)} aria-label="Next month">›</button>
              </div>
              <div className={styles.weekRow}>
                {["M", "T", "W", "T", "F", "S", "S"].map((w, i) => (
                  <span key={i}>{w}</span>
                ))}
              </div>
              <div className={styles.dayGrid}>
                {loading ? (
                  <div className={styles.calLoading}>Loading calendar…</div>
                ) : cells.map((key, i) => {
                  if (!key) return <span key={`e${i}`} className={styles.dayEmpty} />;
                  const list = byDay[key] || [];
                  const isToday = key === today;
                  const isSel = key === selectedDay;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDay(key)}
                      className={styles.day + (isToday ? " " + styles.dayToday : "") + (isSel ? " " + styles.daySel : "")}
                    >
                      <span className={styles.dayNum}>{Number(key.slice(8))}</span>
                      {list.length > 0 && (
                        <span className={styles.dots}>
                          {list.slice(0, 3).map((e) => (
                            <i key={e._id} className={styles.dot + " " + styles[statusOf(e, today)]} />
                          ))}
                          {list.length > 3 && <em>+{list.length - 3}</em>}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className={styles.todayBtn}
                onClick={() => {
                  const n = new Date();
                  setViewYear(n.getFullYear());
                  setViewMonth(n.getMonth());
                  setSelectedDay(todayKey());
                }}
              >
                Back to today
              </button>
            </motion.div>

            <div className={styles.dayPanel}>
              <p className={styles.dayTitle}>
                {new Date(`${selectedDay}T12:00:00`).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              {dayEvents.length === 0 ? (
                <div className={styles.dayEmptyState}>
                  <p>Nothing scheduled this day.</p>
                  <p className={styles.dim}>Pick a dotted date — or explore all upcoming below.</p>
                </div>
              ) : (
                <div className={styles.dayList}>
                  <AnimatePresence mode="popLayout">
                    {dayEvents.map((ev) => (
                      <motion.button
                        key={ev._id}
                        type="button"
                        layout
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        className={styles.dayItem}
                        onClick={() => {
                          setActiveTab(statusOf(ev, today));
                          document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        <span className={styles.dayItemTime}>
                          {ev.startTime || fmtDay(ev.date)}{ev.endTime ? `–${ev.endTime}` : ""}
                        </span>
                        <span className={styles.dayItemTitle}>{ev.title}</span>
                        <span className={styles.dayItemGo}>→</span>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Browse by status */}
      <section id="browse" className={styles.browseSection}>
        <div className={styles.container}>
          <SectionHead eyebrow="Browse" title="Ongoing, upcoming" titleEm="& completed" desc="Reserve upcoming seats in one tap. Everything here is published by the studio — past journeys stay visible as our archive." />
          <div className={styles.tabs} role="tablist" aria-label="Event status">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={activeTab === t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={styles.tab + (activeTab === t.id ? " " + styles.tabActive : "")}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className={styles.loading}>Loading events…</div>
          ) : grouped[activeTab].length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>
                {activeTab === "ongoing" && "Nothing on today"}
                {activeTab === "upcoming" && "No upcoming events"}
                {activeTab === "completed" && "Archive is empty"}
              </p>
              <p className={styles.emptyDesc}>
                {activeTab === "completed"
                  ? "Past gatherings will appear here once the studio publishes them."
                  : "New gatherings are added regularly — check the calendar or contact the studio."}
              </p>
              <Link to="/contact" className={styles.btnDark}>Contact the studio →</Link>
            </div>
          ) : (
            <motion.div layout className={styles.grid}>
              <AnimatePresence mode="popLayout">
                {grouped[activeTab].map((ev, i) => (
                  <Card key={ev._id} ev={ev} index={i} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>

      <section className={styles.ctaSection}>
        <motion.div
          className={styles.ctaBox}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className={styles.ctaBg} aria-hidden="true">
            <img src="https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1600&auto=format&fit=crop" alt="" />
            <div className={styles.ctaVeil} />
          </div>
          <div className={styles.ctaInner}>
            <p className={styles.ctaEyebrow}>Bespoke gatherings</p>
            <h3 className={styles.ctaTitle}>Planning something <em>of your own?</em></h3>
            <p className={styles.ctaDesc}>Private celebrations, corporate wellness days and bespoke rituals — hosted at Spring Valley or your venue.</p>
            <div className={styles.ctaRow}>
              <Link to="/contact" className={styles.ctaSolid}>Plan with us →</Link>
              <a href="tel:+254702080070" className={styles.ctaLine}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                +254 702 080 070
              </a>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
};

export default Events;
