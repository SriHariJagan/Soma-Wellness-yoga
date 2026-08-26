import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import { LIFE_STAGES } from "../config/siteContent";
import SomaCTA from "../components/soma/SomaCTA";
import PageFAQSection from "../components/soma/PageFAQSection";
import { PAGE_FAQS } from "../config/siteContent";
import { EASE, usePrefersReducedMotion } from "../lib/motion";

const tabs = [
  { id: "mama", label: "SOMA MAMA", sub: "Pregnancy", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=900&auto=format&fit=crop", bullets: ["Gentle movement, breathing, relaxation", "Medical clearance respected", "Props, modifications, rest anytime"], price: "4·12,000 · 8·22,000 · Single 3,500 · Private 5,500" },
  { id: "mamaplus", label: "SOMA MAMA+", sub: "After birth", img: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=900&auto=format&fit=crop", bullets: ["Gradual recovery, mobility, core", "Reconnect with body, breath", "6 weeks+ postpartum, clearance as needed"], price: "4·11,500 · 8·21,000" },
  { id: "young", label: "SOMA YOUNG", sub: "5 to 17", img: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=900&auto=format&fit=crop", bullets: ["Playful, age-grouped 5-12 & 13-17", "Balance, focus, body awareness", "Holiday camp 3d 9K / 5d 14K"], price: "4·7,000 · 8·12,000" },
  { id: "agewell", label: "SOMA AGE WELL", sub: "Seniors", img: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=900&auto=format&fit=crop", bullets: ["Gentle, chair-supported, assisted", "Balance, fall-prevention, independence", "Breathing, meditation, community"], price: "4·7,000 · 8·12,000" },
];

const LifeStages = () => {
  const [active, setActive] = useState("mama");
  const reduced = usePrefersReducedMotion();
  const cur = tabs.find((t) => t.id === active);
  return (
    <div style={{ background: "var(--soma-cream)" }}>
      <SomaPageHeader
        eyebrow="Life Stages · For every season"
        title="Programmes shaped<br /><em>around you.</em>"
        subtitle="Everything sells as block 4 or 8. Children grouped by age. Pregnancy screening & medical clearance respected."
        image="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=900&auto=format&fit=crop"
      />
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "28px clamp(20px,4vw,40px) 0" }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}
        >
          {tabs.map((t) => {
            const isActive = active === t.id;
            return (
              <motion.button
                key={t.id}
                onClick={() => setActive(t.id)}
                whileHover={reduced ? {} : { y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: "11px 16px",
                  borderRadius: 9999,
                  border: `1px solid ${isActive ? "var(--soma-forest)" : "rgba(255,255,255,0.62)"}`,
                  background: isActive ? "linear-gradient(135deg, #183D2D 0%, #1e4d3a 100%)" : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.88) 100%)",
                  color: isActive ? "#fff" : "var(--soma-forest)",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  boxShadow: isActive ? "0 8px 22px rgba(24,61,45,0.18), inset 0 1px 0 rgba(255,255,255,0.14)" : "0 4px 14px rgba(24,61,45,0.06), inset 0 1px 0 rgba(255,255,255,0.72)",
                  backdropFilter: "blur(8px)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {!isActive && <span style={{ position: "absolute", inset: 0, background: "linear-gradient(112deg, transparent 40%, rgba(255,255,255,0.18) 48%, transparent 60%)", pointerEvents: "none", opacity: 0.9 }} aria-hidden="true" />}
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? "var(--soma-gold)" : "var(--soma-primary)", boxShadow: isActive ? "0 0 8px rgba(244,180,0,0.32)" : "0 0 0 4px rgba(46,125,91,0.08)", flexShrink: 0 }} aria-hidden="true" />
                {t.label} <span style={{ opacity: isActive ? 0.72 : 0.6, fontWeight: 600 }}>· {t.sub}</span>
              </motion.button>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.42, ease: EASE }}
            style={{
              marginTop: 20,
              background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 100%)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.62)",
              borderRadius: 22,
              overflow: "hidden",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              height: 460,
              boxShadow: "0 16px 44px rgba(24,61,45,0.08), inset 0 1px 0 rgba(255,255,255,0.72)",
              position: "relative",
            }}
            className="lifeGrid"
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(244,180,0,0.32), transparent)", pointerEvents: "none", zIndex: 2 }} aria-hidden="true" />
            <div style={{ padding: 26, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--soma-gold)", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", boxShadow: "0 0 8px rgba(244,180,0,0.32)", flexShrink: 0 }} aria-hidden="true" /> {cur.label} — {cur.sub}
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 300, color: "var(--soma-forest)", marginTop: 10, lineHeight: 0.92, letterSpacing: "-0.02em" }}>
                Care that <em style={{ fontStyle: "italic", color: "var(--soma-primary)" }}>meets</em> your season.
              </h3>
              <motion.ul
                initial="hidden"
                animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
                style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "#5a6b63" }}
              >
                {cur.bullets.map((b) => (
                  <motion.li key={b} variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } } }} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--soma-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span> {b}
                  </motion.li>
                ))}
              </motion.ul>
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 0.2, ease: EASE }} style={{ marginTop: 18, fontSize: 12, fontWeight: 800, color: "var(--soma-forest)", background: "linear-gradient(135deg, var(--soma-ivory) 0%, #FFF7E6 100%)", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(38,51,44,0.08)", display: "inline-flex", alignItems: "center", gap: 8, transformOrigin: "left", letterSpacing: "-0.01em" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", flexShrink: 0 }} aria-hidden="true" /> {cur.price}
              </motion.div>
              <div style={{ marginTop: 12, fontSize: 11, color: "var(--soma-warm-gray)", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--soma-line-strong)", flexShrink: 0 }} aria-hidden="true" /> All prices KES, VAT included. Blocks from first use.
              </div>
            </div>
            <div style={{ background: "#eee", position: "relative", overflow: "hidden", height: "100%" }}>
              <motion.img
                src={cur.img}
                alt={cur.label}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }}
                loading="lazy"
                initial={{ scale: 1.06 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.9, ease: EASE }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 42%, rgba(24,61,45,0.12) 100%)", pointerEvents: "none" }} aria-hidden="true" />
              <div style={{ position: "absolute", inset: 12, border: "1px solid rgba(255,255,255,0.42)", borderRadius: 12, pointerEvents: "none" }} aria-hidden="true" />
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: EASE }} style={{ position: "absolute", left: 14, right: 14, bottom: 14, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", borderRadius: 14, padding: 14, border: "1px solid rgba(255,255,255,0.72)", boxShadow: "0 10px 28px rgba(24,61,45,0.10)" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--soma-forest)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-primary)", flexShrink: 0 }} aria-hidden="true" /> Attractive, age-appropriate, safe
                </div>
                <div style={{ fontSize: 11, color: "#5a6b63", marginTop: 4, lineHeight: 1.5 }}>Medical-aware teachers, props, modifications, rest anytime.</div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Bento pricing — premium */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "22px clamp(20px,4vw,40px) 32px" }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.08, delayChildren: reduced ? 0 : 0.12 } } }}
          style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}
        >
          {LIFE_STAGES.map((p) => (
            <motion.div
              key={p.name}
              variants={{ hidden: { opacity: 0, y: 16, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } } }}
              whileHover={reduced ? {} : { y: -5, scale: 1.015 }}
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.90) 100%)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.62)", borderRadius: 18, padding: 18, textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "0 10px 32px rgba(24,61,45,0.06), inset 0 1px 0 rgba(255,255,255,0.72)" }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(244,180,0,0.28), transparent)", pointerEvents: "none" }} aria-hidden="true" />
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--soma-primary)", display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--soma-gold)", flexShrink: 0 }} aria-hidden="true" /> {p.name}
              </div>
              <div style={{ fontSize: 11, color: "#5a6b63", marginTop: 4, fontWeight: 500 }}>{p.for}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
                <motion.div whileHover={reduced ? {} : { scale: 1.03 }} style={{ background: "linear-gradient(180deg, var(--soma-cream) 0%, #FFF7E6 100%)", border: "1px solid rgba(38,51,44,0.06)", borderRadius: 12, padding: 12, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5a6b63" }}>4 sess</div>
                  <div style={{ fontWeight: 800, color: "var(--soma-forest)", fontSize: 15, marginTop: 4, letterSpacing: "-0.01em" }}>{p.four}</div>
                </motion.div>
                <motion.div whileHover={reduced ? {} : { scale: 1.03 }} style={{ background: "linear-gradient(135deg, #183D2D 0%, #1e4d3a 100%)", borderRadius: 12, padding: 12, color: "#fff", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 6px 18px rgba(24,61,45,0.14)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.72 }}>8 sess</div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4, letterSpacing: "-0.01em" }}>{p.eight}</div>
                </motion.div>
              </div>
              <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }} style={{ display: "block", height: 1, background: "linear-gradient(90deg, transparent, var(--soma-gold), transparent)", marginTop: 12, transformOrigin: "center", opacity: 0.32 }} aria-hidden="true" />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Trust for parents/seniors — premium + NEW safety */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 clamp(20px,4vw,40px) 8px" }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-30px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.10 } } }}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          {[
            { label: "For parents", quote: "“My 9-year-old loves Young — playful but teaches focus. Teachers group by age, so she’s with peers, not lost in adult class.”", name: "Faith, SOMA YOUNG parent", icon: "♥" },
            { label: "For seniors", quote: "“Gentle, chair-supported. I feel stronger getting up, breathing calmer. No pressure to perform.”", name: "Margaret, 68, AGE WELL", icon: "✦" },
          ].map((t) => (
            <motion.div
              key={t.label}
              variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
              whileHover={reduced ? {} : { y: -3 }}
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.90) 100%)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.62)", borderRadius: 18, padding: 18, boxShadow: "0 8px 24px rgba(24,61,45,0.06), inset 0 1px 0 rgba(255,255,255,0.72)", position: "relative", overflow: "hidden" }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(244,180,0,0.28), transparent)", pointerEvents: "none" }} aria-hidden="true" />
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #183D2D 0%, #2E7D5B 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{t.icon}</div>
              <div style={{ fontWeight: 700, color: "var(--soma-forest)", fontSize: 13, marginTop: 10 }}>{t.label}</div>
              <div style={{ fontSize: 12.5, color: "#5a6b63", marginTop: 8, lineHeight: 1.6, fontStyle: "italic" }}>{t.quote}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--soma-warm-gray)", marginTop: 8 }}>— {t.name}</div>
            </motion.div>
          ))}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE }} style={{ textAlign: "center", fontSize: 11, color: "var(--soma-warm-gray)", marginTop: 14, background: "var(--soma-ivory)", border: "1px solid var(--soma-line-light)", padding: "10px 14px", borderRadius: 9999, display: "inline-flex", gap: 8, alignItems: "center", marginLeft: "50%", transform: "translateX(-50%)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-primary)", flexShrink: 0 }} aria-hidden="true" /> Safety: screening, clearance, props, modifications, rest anytime. Not replacement for medical care.
        </motion.div>
      </section>

      {/* NEW — Safety & props where thin */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "22px clamp(20px,4vw,40px) 32px" }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.08 } } }}
          style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}
        >
          {[
            { t: "Props for every body", d: "Chairs, bolsters, belts, blocks — support without strain. Rest anytime, no pressure.", icon: "◯" },
            { t: "Medical-aware", d: "Screening + clearance respected. We adapt for pregnancy, injury, or limitations.", icon: "✓" },
            { t: "Grouped by age", d: "5-12 & 13-17 separated. Pregnancy, postnatal, seniors — each held appropriately.", icon: "✦" },
          ].map((b) => (
            <motion.div key={b.t} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }} whileHover={reduced ? {} : { y: -4 }} style={{ background: "linear-gradient(180deg, #fff 0%, #FFFBF8 100%)", border: "1px solid var(--soma-line-light)", borderRadius: 16, padding: 18, boxShadow: "0 6px 20px rgba(24,61,45,0.04)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)", pointerEvents: "none" }} aria-hidden="true" />
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--soma-ivory)", border: "1px solid var(--soma-line-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--soma-primary)", fontWeight: 700 }}>{b.icon}</div>
              <div style={{ fontWeight: 700, color: "var(--soma-forest)", fontSize: 13.5, marginTop: 12 }}>{b.t}</div>
              <div style={{ fontSize: 12.5, color: "#5a6b63", marginTop: 6, lineHeight: 1.6 }}>{b.d}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <PageFAQSection title="Life Stages — common questions" questions={PAGE_FAQS.lifeStages} />

      <SomaCTA />
      <style>{`@media(max-width:900px){div[style*="gridTemplateColumns: 1fr 1fr"]{grid-template-columns:1fr !important; height:auto !important;} .lifeGrid{height:auto !important;} .lifeGrid > div:last-child{height:280px !important;}}`}</style>
    </div>
  );
};
export default LifeStages;
