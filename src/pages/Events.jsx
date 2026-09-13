import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SomaPageHeader from "../components/soma/SomaPageHeader";

const API = import.meta.env.VITE_API_URL || "";

const fmtDate = (d) => {
  if (!d) return "Date TBA";
  try {
    return new Date(d).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  } catch { return "Date TBA"; }
};

// Public events calendar — no sign-in required (view only).
// Guest registration is deferred; visitors contact the studio to book.
const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/api/public/events`);
        if (!res.ok) throw new Error("Could not load events");
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.events || [];
        if (alive) setEvents(list.filter((e) => e.isPublished !== false && (e.status || "available") === "available"));
      } catch (err) {
        if (alive) setError(err.message || "Could not load events");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const upcoming = useMemo(() => {
    const now = new Date();
    return [...events]
      .filter((e) => !e.date || new Date(e.date) >= new Date(now.toDateString()))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [events]);

  return (
    <main style={{ background: "var(--soma-cream)", minHeight: "70vh" }}>
      <SomaPageHeader
        eyebrow="Community"
        title="Upcoming events & calendar"
        subtitle="Open to everyone — no sign-in needed to view. Contact the studio to reserve your spot."
        image="/images/headers/events-gatherings.webp"
      />
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "32px clamp(20px,4vw,40px) 64px" }}>
        {loading && <p style={{ fontSize: 16, color: "var(--soma-warm-gray)" }}>Loading events…</p>}
        {!loading && error && (
          <div style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, padding: 24 }}>
            <p style={{ fontSize: 16, color: "var(--soma-charcoal)" }}>{error}</p>
            <p style={{ fontSize: 14, color: "var(--soma-warm-gray)", marginTop: 8 }}>
              Please check back soon or <Link to="/contact" style={{ color: "var(--soma-primary)", fontWeight: 700 }}>contact us</Link> for the latest schedule.
            </p>
          </div>
        )}
        {!loading && !error && upcoming.length === 0 && (
          <div style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, padding: 32, textAlign: "center" }}>
            <p style={{ fontSize: 18, color: "var(--soma-forest)", fontWeight: 600 }}>No upcoming events right now</p>
            <p style={{ fontSize: 16, color: "var(--soma-warm-gray)", marginTop: 8 }}>New gatherings are added regularly — check back soon.</p>
            <Link to="/contact" className="btn btn--primary btn--sm" style={{ marginTop: 16 }}>Contact the studio</Link>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {upcoming.map((ev) => (
            <article key={ev._id} style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {ev.image && <img src={ev.image} alt={ev.title} loading="lazy" style={{ width: "100%", height: 170, objectFit: "cover" }} />}
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--soma-primary)" }}>{fmtDate(ev.date)}{ev.startTime ? ` · ${ev.startTime}${ev.endTime ? `–${ev.endTime}` : ""}` : ""}</div>
                <h3 style={{ fontSize: 20 }}>{ev.title}</h3>
                {ev.location && <p style={{ fontSize: 14, color: "var(--soma-warm-gray)" }}>{ev.location}</p>}
                {ev.description && <p style={{ fontSize: 16, color: "#5a6b63", lineHeight: 1.6 }}>{String(ev.description).slice(0, 160)}{String(ev.description).length > 160 ? "…" : ""}</p>}
                <div style={{ marginTop: "auto", paddingTop: 12 }}>
                  <Link to="/contact" style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--soma-primary)" }}>Contact to book →</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Events;
