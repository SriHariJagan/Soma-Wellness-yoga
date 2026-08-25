import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import { LIFE_STAGES } from "../config/siteContent";
import SomaCTA from "../components/soma/SomaCTA";

const tabs = [
  { id: "mama", label: "SOMA MAMA", sub: "Pregnancy", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=900&auto=format&fit=crop", bullets: ["Gentle movement, breathing, relaxation", "Medical clearance respected", "Props, modifications, rest anytime"], price: "4·12,000 · 8·22,000 · Single 3,500 · Private 5,500" },
  { id: "mamaplus", label: "SOMA MAMA+", sub: "After birth", img: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=900&auto=format&fit=crop", bullets: ["Gradual recovery, mobility, core", "Reconnect with body, breath", "6 weeks+ postpartum, clearance as needed"], price: "4·11,500 · 8·21,000" },
  { id: "young", label: "SOMA YOUNG", sub: "5 to 17", img: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=900&auto=format&fit=crop", bullets: ["Playful, age-grouped 5-12 & 13-17", "Balance, focus, body awareness", "Holiday camp 3d 9K / 5d 14K"], price: "4·7,000 · 8·12,000" },
  { id: "agewell", label: "SOMA AGE WELL", sub: "Seniors", img: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=900&auto=format&fit=crop", bullets: ["Gentle, chair-supported, assisted", "Balance, fall-prevention, independence", "Breathing, meditation, community"], price: "4·7,000 · 8·12,000" },
];

const LifeStages = () => {
  const [active, setActive] = useState("mama");
  const cur = tabs.find((t) => t.id === active);
  return (
    <div style={{ background: "var(--soma-cream)" }}>
      <SomaPageHeader
        eyebrow="Life Stages · For every season"
        title="Programmes shaped<br /><em>around you.</em>"
        subtitle="Everything sells as block 4 or 8. Children grouped by age. Pregnancy screening & medical clearance respected."
        image="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=900&auto=format&fit=crop"
      />
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "24px clamp(20px,4vw,40px) 0" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActive(t.id)} style={{ padding: "10px 16px", borderRadius: 9999, border: `1px solid ${active===t.id?"var(--soma-forest)":"var(--soma-line)"}`, background: active===t.id?"var(--soma-forest)":"#fff", color: active===t.id?"#fff":"var(--soma-forest)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.label} <span style={{ opacity: 0.7, fontWeight: 400 }}>· {t.sub}</span></button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={active} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} style={{ marginTop: 20, background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 20, overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 420 }}>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--soma-gold)" }}>{cur.label} — {cur.sub}</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 300, color: "var(--soma-forest)", marginTop: 8, lineHeight: 0.95 }}>Care that <em style={{ fontStyle: "italic", color: "var(--soma-primary)" }}>meets</em> your season.</h3>
              <ul style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#5a6b63" }}>{cur.bullets.map((b) => <li key={b}>✓ {b}</li>)}</ul>
              <div style={{ marginTop: 16, fontSize: 12, fontWeight: 700, color: "var(--soma-forest)", background: "var(--soma-cream)", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--soma-line-light)" }}>{cur.price}</div>
              <div style={{ marginTop: 14, fontSize: 11, color: "var(--soma-warm-gray)" }}>All prices KES, VAT included. Blocks from first use.</div>
            </div>
            <div style={{ background: "#eee", position: "relative", overflow: "hidden" }}>
              <img src={cur.img} alt={cur.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
              <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--soma-forest)" }}>Attractive, age-appropriate, safe</div>
                <div style={{ fontSize: 11, color: "#5a6b63" }}>Medical-aware teachers, props, modifications, rest anytime.</div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Bento pricing overview - unique */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "20px clamp(20px,4vw,40px) 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {LIFE_STAGES.map((p) => (
            <div key={p.name} style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--soma-primary)" }}>{p.name}</div>
              <div style={{ fontSize: 11, color: "#5a6b63", marginTop: 2 }}>{p.for}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                <div style={{ background: "var(--soma-cream)", borderRadius: 10, padding: 10 }}><div style={{ fontSize: 10, color: "#5a6b63" }}>4 sess</div><div style={{ fontWeight: 700, color: "var(--soma-forest)" }}>{p.four}</div></div>
                <div style={{ background: "var(--soma-forest)", borderRadius: 10, padding: 10, color: "#fff" }}><div style={{ fontSize: 10, opacity: 0.7 }}>8 sess</div><div style={{ fontWeight: 700 }}>{p.eight}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust for parents/seniors */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 clamp(20px,4vw,40px) 32px" }}>
        <div style={{ background: "var(--soma-ivory)", border: "1px solid var(--soma-line)", borderRadius: 16, padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div><div style={{ fontWeight: 700, color: "var(--soma-forest)", fontSize: 13 }}>For parents</div><div style={{ fontSize: 12, color: "#5a6b63", marginTop: 6 }}>“My 9-year-old loves Young — playful but teaches focus. Teachers group by age, so she’s with peers, not lost in adult class.” — Faith, SOMA YOUNG parent</div></div>
          <div><div style={{ fontWeight: 700, color: "var(--soma-forest)", fontSize: 13 }}>For seniors</div><div style={{ fontSize: 12, color: "#5a6b63", marginTop: 6 }}>“Gentle, chair-supported. I feel stronger getting up, breathing calmer. No pressure to perform.” — Margaret, 68, AGE WELL</div></div>
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: "var(--soma-warm-gray)", marginTop: 12 }}>Safety: screening, clearance, props, modifications, rest anytime. Not replacement for medical care.</div>
      </section>

      <SomaCTA />
      <style>{`@media(max-width:900px){div[style*="gridTemplateColumns: 1fr 1fr"]{grid-template-columns:1fr !important;}}`}</style>
    </div>
  );
};
export default LifeStages;
