import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchSomaDashboard } from '../../lib/somaApi.js';
import { formatKES } from '../../lib/currency.js';
import { EASE } from '../../lib/motion.js';
import {
  Stagger, Item, Panel, Pill, EmptyState, PageHeader,
} from "./widgets/DashboardWidgets";

const STUDIO = {
  name: "SomaWellness",
  tagline: "Wellness, thoughtfully experienced — movement, restoration and mindfulness under one roof.",
  address: "48 Shanzu Road, Spring Valley, Nairobi",
  phone: "+254 702 080 070",
  phoneHref: "+254702080070",
  email: "somawellnesslimited@gmail.com",
  hours: "Mon–Sat · 6:00 AM – 8:00 PM",
  image: "https://images.unsplash.com/photo-1545389336-cf090694435e?q=80&w=1600&auto=format&fit=crop",
};

const QUICK = [
  { to: "/studentdashboard?tab=classes", icon: "ti-yoga", label: "Book a class" },
  { to: "/studentdashboard?tab=browsePlans", icon: "ti-cash", label: "Membership" },
  { to: "/studentdashboard?tab=consultations", icon: "ti-stethoscope", label: "Consultation" },
  { to: "/studentdashboard?tab=events", icon: "ti-calendar-event", label: "Events" },
];

function Row({ left, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--color-border-light)", fontSize: 13 }}>
      <span style={{ color: "var(--color-text-secondary)" }}>{left}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{right}</span>
    </div>
  );
}

export default function SomaDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    fetchSomaDashboard().then(setData).catch((e) => setErr(e.message));
  }, []);
  if (err) return <div style={{ padding: 20, color: '#b00020' }}>{err}</div>;
  if (!data) return <div style={{ padding: 20 }}>Loading your overview…</div>;
  const { membership, allowances, passes, giftVouchers, appointments, upcomingBookings, resetProgress, packages } = data;

  const passCount = (passes || []).length;
  const bookingCount = (upcomingBookings || []).length;

  return (
    <Stagger>
      <Item>
        <PageHeader
          title="Your SomaWellness"
          sub="Your membership, bookings and studio — all in one place."
        />
      </Item>

      {/* ── Membership hero ── */}
      <Item>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{
            position: "relative", overflow: "hidden", borderRadius: 22,
            background: "linear-gradient(120deg, #0e241b 0%, #1a4d35 60%, #2E7D5B 100%)",
            color: "#fff", padding: "clamp(26px, 4vw, 40px)",
            boxShadow: "0 24px 60px rgba(12,31,23,0.25)",
          }}
        >
          <div aria-hidden="true" style={{
            position: "absolute", top: -70, right: -70, width: 220, height: 220,
            borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)",
          }} />
          <div aria-hidden="true" style={{
            position: "absolute", bottom: -50, right: 60, width: 130, height: 130,
            borderRadius: "50%", border: "1px solid rgba(244,180,0,0.2)",
          }} />
          <div style={{ position: "relative" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#b8d4c8", marginBottom: 10 }}>
              {membership ? "Member since" : "Welcome"} · SomaWellness
            </p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 3.4vw, 36px)", fontWeight: 400, marginBottom: 8 }}>
              {membership
                ? <>{membership.tier || membership.planType || "Membership"}</>
                : <>Begin your <em style={{ color: "#cfe3d7" }}>practice</em></>}
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 20 }}>
              {membership
                ? `${membership.termMonths || membership.planMonths} months · ${formatKES(membership.price)} · ${membership.status}${membership.isFounding ? " · Founding" : ""}`
                : "Join a plan to unlock classes, passes and member rates."}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: allowances.length ? 20 : 0 }}>
              <Link to="/studentdashboard?tab=classes" style={{ padding: "12px 26px", borderRadius: 12, background: "#F5EFE2", color: "#0e241b", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                Book a class
              </Link>
              {!membership && (
                <Link to="/studentdashboard?tab=browsePlans" style={{ padding: "12px 26px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                  View plans
                </Link>
              )}
            </div>
            {allowances.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {allowances.map((a) => (
                  <span key={a.key} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.16)", padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{a.key}: {a.display}</span>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </Item>

      {/* ── Stat tiles ── */}
      <Item>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {[
            { icon: "ti-ticket", label: "Class passes", value: passCount },
            { icon: "ti-package", label: "Packages", value: (packages || []).length },
            { icon: "ti-calendar-event", label: "Upcoming", value: bookingCount },
            { icon: "ti-gift", label: "Vouchers", value: (giftVouchers || []).length },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06 * i, ease: EASE }}
              style={{ background: "#fff", border: "1px solid var(--color-border-light)", borderRadius: 16, padding: "18px" }}
            >
              <i className={`ti ${s.icon}`} style={{ fontSize: 20, color: "var(--color-primary)" }} aria-hidden="true" />
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </Item>

      {/* ── Quick actions ── */}
      <Item>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {QUICK.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "15px 16px",
                background: "#fff", border: "1px solid var(--color-border-light)", borderRadius: 16,
                textDecoration: "none", color: "var(--color-text)", fontSize: 13.5, fontWeight: 600,
                transition: "transform 0.25s ease, box-shadow 0.25s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(24,61,45,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
            >
              <i className={`ti ${q.icon}`} style={{ fontSize: 18, color: "var(--color-primary)" }} aria-hidden="true" />
              {q.label}
            </Link>
          ))}
        </div>
      </Item>

      {/* ── Studio banner ── */}
      <Item>
        <Panel title={`Visit ${STUDIO.name}`} icon="ti-map-pin">
          <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 14, height: 170 }}>
            <img src={STUDIO.image} alt={STUDIO.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--color-text-secondary)", margin: "0 0 10px" }}>
            {STUDIO.tagline}
          </p>
          <Row left="Visit" right={STUDIO.address} />
          <Row left="Call / WhatsApp" right={<a href={`tel:${STUDIO.phoneHref}`} style={{ color: "var(--color-primary)", fontWeight: 700, textDecoration: "none" }}>{STUDIO.phone}</a>} />
          <Row left="Email" right={<a href={`mailto:${STUDIO.email}`} style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none", wordBreak: "break-all" }}>{STUDIO.email}</a>} />
          <Row left="Open hours" right={STUDIO.hours} />
        </Panel>
      </Item>

      {/* ── Passes + packages ── */}
      <Item>
        <Panel title="Class passes" icon="ti-ticket">
          {passes?.length ? passes.map((p) => (
            <Row key={p._id}
              left={`${p.label} — ${p.remainingClasses}/${p.totalClasses} left`}
              right={`${p.status}${p.daysLeft != null ? ` · ${p.daysLeft}d left` : ""}`} />
          )) : <EmptyState compact icon="ti-ticket" title="No passes" sub="5 classes for 11K · 10 for 21K." />}
        </Panel>
      </Item>

      <Item>
        <Panel title="Active packages" icon="ti-package">
          {packages?.length ? packages.slice(0, 5).map((p) => (
            <Row key={p._id}
              left={`${p.serviceName} · ${p.status}`}
              right={`${p.remainingSessions ?? "—"} left · ${p.daysLeft ?? "—"} days`} />
          )) : <EmptyState compact icon="ti-package" title="No packages" sub="Packages count down from first use." />}
        </Panel>
      </Item>

      <Item>
        <Panel title="SOMA RESET — 6-week tracker" icon="ti-refresh">
          {resetProgress?.length ? resetProgress.map((r) => (
            <div key={r._id} style={{ fontSize: 13, lineHeight: 1.8 }}>
              <div>Movement {r.yogaSessionsUsed}/{r.yogaSessionsTotal} · Mindfulness {r.meditationUsed}/{r.meditationTotal} · Massages {r.massagesUsed}/{r.massagesTotal}</div>
              <div style={{ color: "var(--color-text-secondary)" }}>
                Assessment {r.assessmentDone ? "✓" : "—"} · Home plan {r.homePlanDelivered ? "✓" : "—"} · Review {r.closingReviewDone ? "✓" : "—"} · {r.progressPct ?? ""}%
              </div>
            </div>
          )) : <EmptyState compact icon="ti-refresh" title="No active RESET" sub="32,000 KES · 12 movement + 6 mindfulness + 2 massages + plan + review." />}
        </Panel>
      </Item>

      <Item>
        <Panel title="Gift vouchers" icon="ti-gift">
          {giftVouchers?.length ? giftVouchers.map((v) => (
            <Row key={v._id}
              left={`${v.code} · ${formatKES(v.balance)} / ${formatKES(v.amount)}`}
              right={`${v.status} · exp ${new Date(v.expiresAt).toLocaleDateString()}`} />
          )) : <EmptyState compact icon="ti-gift" title="No vouchers" sub="Any value, valid 12 months." />}
        </Panel>
      </Item>

      <Item>
        <Panel title="Upcoming bookings" icon="ti-calendar-event">
          {upcomingBookings?.length ? upcomingBookings.map((a) => (
            <Row key={a._id}
              left={`${a.type} · ${new Date(a.slotStart).toLocaleString()} · ${formatKES(a.finalPrice)}`}
              right="Cancel ≥12h free; <12h 50%; no-show 100%" />
          )) : (
            <EmptyState compact icon="ti-calendar-event" title="No upcoming bookings" sub={appointments?.length ? `${appointments.length} total bookings.` : "Book a class to see it here."} />
          )}
        </Panel>
      </Item>
    </Stagger>
  );
}
