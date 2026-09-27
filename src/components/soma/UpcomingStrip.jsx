import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { EASE, usePrefersReducedMotion } from "../../lib/motion";

const API = import.meta.env.VITE_API_URL || "";

/**
 * UpcomingStrip — "Happening soon" premium editorial section.
 * Live data from existing public APIs (events + workshops).
 * No hardcoded events. Gracefully hides when empty/offline.
 * Single item renders as a wide feature card; 2–3 as a refined grid.
 */
export default function UpcomingStrip() {
  const reduced = usePrefersReducedMotion();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [evR, wkR] = await Promise.allSettled([
          fetch(`${API}/api/public/events?past=1`).then((r) => (r.ok ? r.json() : [])),
          fetch(`${API}/api/public/workshops`).then((r) => (r.ok ? r.json() : [])),
        ]);
        const ev = evR.status === "fulfilled" ? (Array.isArray(evR.value) ? evR.value : evR.value?.events || []) : [];
        const wk = wkR.status === "fulfilled" ? (Array.isArray(wkR.value) ? wkR.value : wkR.value?.workshops || []) : [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const norm = [];
        for (const e of ev) {
          if (e.isPublished === false) continue;
          const d = e.date ? new Date(e.date) : null;
          if (!d || Number.isNaN(d.getTime()) || d < now) continue;
          norm.push({
            id: `e-${e._id || e.title}`, kind: "Event", title: e.title, date: d,
            time: e.startTime || "",
            venue: e.location || "Spring Valley, Nairobi",
            online: /online|zoom|meet|virtual/i.test(`${e.location || ""}`),
            image: e.image || "", to: "/events",
          });
        }
        for (const w of wk) {
          if (w.isPublished === false || w.archived) continue;
          const d = w.date ? new Date(w.date) : null;
          if (!d || Number.isNaN(d.getTime()) || d < now) continue;
          norm.push({
            id: `w-${w._id || w.name}`, kind: "Workshop", title: w.name, date: d,
            time: w.startTime || "",
            venue: w.zoomLink ? "Online" : "Spring Valley, Nairobi",
            online: Boolean(w.zoomLink),
            image: w.image || "", to: "/offerings",
          });
        }
        norm.sort((a, b) => a.date - b.date);
        if (alive) setItems(norm.slice(0, 3));
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!loading && items.length === 0) return null;

  const dayNum = (d) => {
    try { return new Date(d).toLocaleDateString("en-KE", { day: "2-digit" }); } catch { return ""; }
  };
  const monthShort = (d) => {
    try { return new Date(d).toLocaleDateString("en-KE", { month: "short" }).toUpperCase(); } catch { return ""; }
  };
  const weekdayLong = (d) => {
    try { return new Date(d).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" }); } catch { return ""; }
  };

  const cardShadow = "0 18px 48px rgba(24,61,45,0.12), 0 4px 14px rgba(24,61,45,0.08)";

  const renderArt = (item, height, motifPx = 84) => (
    <div style={{ position: "relative", height, overflow: "hidden", background: "linear-gradient(135deg, #183D2D 0%, #1e4d3a 55%, #2E7D5B 100%)" }}>
      {item.image ? (
        <img
          src={item.image}
          alt=""
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true">
          <span style={{ fontFamily: "var(--font-display)", fontSize: motifPx, color: "rgba(255,247,230,0.28)", lineHeight: 1 }}>✦</span>
          <span style={{ position: "absolute", width: "70%", height: "70%", border: "1px solid rgba(255,247,230,0.16)", borderRadius: "50%" }} />
        </div>
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(24,61,45,0.06) 55%, rgba(24,61,45,0.42) 100%)", pointerEvents: "none" }} aria-hidden="true" />
      {item.date && (
        <div style={{
          position: "absolute", left: 16, bottom: 16, background: "rgba(255,255,255,0.94)",
          borderRadius: 12, padding: "8px 12px", textAlign: "center", minWidth: 58,
          boxShadow: "0 8px 22px rgba(24,61,45,0.22)", backdropFilter: "blur(6px)",
        }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--soma-forest)", lineHeight: 1 }}>{dayNum(item.date)}</div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "var(--soma-brass)", marginTop: 2 }}>{monthShort(item.date)}</div>
        </div>
      )}
      <span style={{
        position: "absolute", top: 14, left: 14, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "#FFF7E6", background: "rgba(24,61,45,0.62)",
        border: "1px solid rgba(255,255,255,0.22)", padding: "5px 11px", borderRadius: 9999,
        backdropFilter: "blur(6px)",
      }}>
        {item.kind}
      </span>
    </div>
  );

  const renderBody = (item, large = false) => (
    <div style={{ padding: large ? "28px 30px" : "20px 22px 22px", display: "flex", flexDirection: "column", gap: large ? 12 : 9, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, color: "var(--soma-warm-gray)" }}>
        <span style={{ fontWeight: 700, color: "var(--soma-primary)", letterSpacing: "0.02em" }}>{weekdayLong(item.date)}</span>
        {item.time && (
          <>
            <span aria-hidden="true" style={{ opacity: 0.4 }}>·</span>
            <span>{item.time}</span>
          </>
        )}
      </div>
      <h3 style={{
        margin: 0, fontFamily: "var(--font-display)", fontWeight: 500,
        fontSize: large ? "clamp(1.5rem, 2.6vw, 2rem)" : "1.25rem",
        letterSpacing: "-0.015em", lineHeight: 1.15, color: "var(--soma-forest)",
      }}>
        {item.title}
      </h3>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#5a6b63" }}>
        <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-brass)", flexShrink: 0 }} />
        <span>{item.venue}</span>
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
          padding: "3px 10px", borderRadius: 9999,
          background: item.online ? "var(--soma-soft-sage)" : "var(--soma-ivory)",
          border: "1px solid var(--soma-line-light)", color: "var(--soma-forest)",
        }}>
          {item.online ? "Online" : "In person"}
        </span>
      </div>
      <div style={{ marginTop: large ? 6 : 2 }}>
        <Link
          to={item.to}
          className="btn btn--primary"
          style={{ fontSize: 12, padding: large ? "14px 30px" : "12px 24px", textDecoration: "none" }}
          aria-label={`Reserve your place at ${item.title}`}
        >
          Reserve your place →
        </Link>
      </div>
    </div>
  );

  return (
    <section className="section" aria-label="Upcoming at Soma" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="section-header">
          <span className="eyebrow eyebrow--center">Gather With Us</span>
          <h2 className="display-title">Happening <em>soon</em></h2>
          <div className="divider--brass" style={{ marginTop: 18 }} aria-hidden="true" />
          <p style={{ color: "#5a6b63", marginTop: 14 }}>Live from our current schedule — curated gatherings at the studio and online.</p>
        </div>

        {loading ? (
          <div role="status" aria-label="Loading upcoming events" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="shimmer" style={{ height: 340, borderRadius: 20, background: "#F1EDE2" }} />
            ))}
          </div>
        ) : items.length === 1 ? (
          <motion.article
            initial={reduced ? {} : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="card--premium"
            style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", overflow: "hidden", maxWidth: 960, margin: "0 auto", boxShadow: cardShadow }}
          >
            <div style={{ flex: "1 1 340px", minHeight: 300 }}>
              {renderArt(items[0], "100%", 120)}
            </div>
            <div style={{ flex: "1.1 1 320px", display: "flex" }}>
              {renderBody(items[0], true)}
            </div>
          </motion.article>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, alignItems: "stretch" }}>
            {items.map((item, i) => (
              <motion.article
                key={item.id}
                initial={reduced ? {} : { opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: Math.min(i * 0.1, 0.25), ease: EASE }}
                whileHover={reduced ? {} : { y: -6 }}
                className="card--premium"
                style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}
              >
                {renderArt(item, 200)}
                {renderBody(item)}
              </motion.article>
            ))}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 28 }}>
          <Link to="/events" className="btn btn--secondary btn--sm">View all events</Link>
        </div>
      </div>
    </section>
  );
}
