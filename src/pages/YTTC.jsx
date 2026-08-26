import React from "react";
import { motion } from "framer-motion";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import { ACADEMY, CORPORATE } from "../config/siteContent";
import SomaCTA from "../components/soma/SomaCTA";
import { Link } from "react-router-dom";
import { EASE, usePrefersReducedMotion } from "../lib/motion";

const faculty = [
  { name: "Amina J.", role: "Therapy & Breath Lead", img: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=400&auto=format&fit=crop" },
  { name: "Daniel K.", role: "Movement & Anatomy", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop" },
  { name: "Zawadi M.", role: "Meditation & Philosophy", img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400&auto=format&fit=crop" },
];

const YTTC = () => {
  const reduced = usePrefersReducedMotion();
  return (
    <div style={{ background: "var(--soma-cream)" }}>
      <SomaPageHeader
        eyebrow="Learn & Partner · SOMA Academy · Nairobi"
        title="Teach from<br /><em>lived practice.</em>"
        subtitle="Foundations 25h · 100h · 200h. Early 200h 145K KES, instalments. Corporate wellness for teams across Nairobi — at your offices or Spring Valley."
        image="https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=900&auto=format&fit=crop"
      />
      {/* Bento academy — premium */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "36px clamp(20px,4vw,40px) 0" }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.08, delayChildren: reduced ? 0 : 0.12 } } }}
          style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr", gap: 16, alignItems: "stretch" }}
        >
          <motion.div
            variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {ACADEMY.map((c, i) => (
              <motion.div
                key={c.name}
                variants={{ hidden: { opacity: 0, y: 16, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } } }}
                whileHover={reduced ? {} : { y: -6, scale: 1.015 }}
                style={{
                  background: i === 2 ? "linear-gradient(135deg, #183D2D 0%, #1c4a34 55%, #1e5c3f 100%)" : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.90) 100%)",
                  color: i === 2 ? "#fff" : "var(--soma-charcoal)",
                  border: `1px solid ${i === 2 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.62)"}`,
                  borderRadius: 18,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  position: "relative",
                  overflow: "hidden",
                  backdropFilter: "blur(10px)",
                  boxShadow: i === 2 ? "0 18px 44px rgba(24,61,45,0.22), inset 0 1px 0 rgba(255,255,255,0.12)" : "0 10px 32px rgba(24,61,45,0.07), inset 0 1px 0 rgba(255,255,255,0.72)",
                }}
              >
                <div style={{ position: "absolute", inset: 0, background: i === 2 ? "linear-gradient(112deg, transparent 38%, rgba(255,255,255,0.06) 48%, transparent 62%)" : "linear-gradient(112deg, transparent 38%, rgba(255,255,255,0.18) 48%, rgba(255,255,255,0.28) 50%, transparent 62%)", opacity: i === 2 ? 0.6 : 0, pointerEvents: "none" }} aria-hidden="true" />
                {i === 2 && (
                  <motion.span
                    initial={{ scale: 0.9, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3, ease: EASE }}
                    style={{ position: "absolute", top: 12, right: 12, background: "linear-gradient(135deg, #F4B400 0%, #FFD54F 100%)", color: "var(--soma-forest)", fontSize: 9, fontWeight: 900, padding: "6px 9px", borderRadius: 9999, boxShadow: "0 4px 14px rgba(244,180,0,0.24)" }}
                  >
                    POPULAR
                  </motion.span>
                )}
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: i === 2 ? "rgba(255,247,230,0.72)" : "var(--soma-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: i === 2 ? "var(--soma-gold)" : "var(--soma-primary)", flexShrink: 0, boxShadow: i === 2 ? "0 0 8px rgba(244,180,0,0.32)" : "0 0 0 4px rgba(46,125,91,0.08)" }} aria-hidden="true" /> {c.len}
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: i === 2 ? "#fff" : "var(--soma-forest)", lineHeight: 1.2 }}>{c.name}</div>
                {c.note && <div style={{ fontSize: 11, color: i === 2 ? "rgba(255,247,230,0.72)" : "#5a6b63", lineHeight: 1.4 }}>{c.note}</div>}
                <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 6, position: "relative" }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: i === 2 ? "#fff" : "var(--soma-forest)", letterSpacing: "-0.02em" }}>{c.price}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, letterSpacing: "0.06em" }}>KES</span>
                </div>
                <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 + i * 0.06, ease: EASE }} style={{ position: "absolute", left: 18, right: 18, bottom: 12, height: 1, background: i === 2 ? "linear-gradient(90deg, #FFD54F 0%, transparent 88%)" : "linear-gradient(90deg, var(--soma-gold) 0%, transparent 88%)", opacity: i === 2 ? 0.9 : 0.42, transformOrigin: "left" }} aria-hidden="true" />
              </motion.div>
            ))}
            <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }} style={{ gridColumn: "1 / -1", background: "linear-gradient(180deg, var(--soma-ivory) 0%, #FFF7E6 100%)", border: "1px solid rgba(38,51,44,0.07)", borderRadius: 14, padding: 12, fontSize: 11, color: "var(--soma-warm-gray)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-primary)", flexShrink: 0 }} aria-hidden="true" /> Payment by instalment available. 200h early enrolment 145,000 saves 20K.
            </motion.div>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
            whileHover={reduced ? {} : { y: -4 }}
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 100%)", border: "1px solid rgba(255,255,255,0.62)", borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column", backdropFilter: "blur(10px)", boxShadow: "0 12px 36px rgba(24,61,45,0.08), inset 0 1px 0 rgba(255,255,255,0.72)" }}
          >
            <div style={{ height: 180, overflow: "hidden", position: "relative" }}>
              <motion.img
                src="https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?q=80&w=800&auto=format&fit=crop"
                alt="Academy"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                loading="lazy"
                whileHover={reduced ? {} : { scale: 1.04 }}
                transition={{ duration: 0.7, ease: EASE }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 42%, rgba(24,61,45,0.14) 100%)", pointerEvents: "none" }} aria-hidden="true" />
              <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", padding: "6px 10px", borderRadius: 9999, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--soma-forest)", boxShadow: "0 4px 14px rgba(0,0,0,0.10)" }}>Spring Valley · Premium</div>
            </div>
            <div style={{ padding: 18 }}>
              <h4 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--soma-forest)", letterSpacing: "-0.015em" }}>Why SOMA Academy?</h4>
              <ul style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, color: "#5a6b63", lineHeight: 1.5 }}>
                {[
                  "Small cohort, mentorship, not mass-produced",
                  "Lineage + anatomy + hands-on practicum",
                  "Spring Valley premium container",
                  "Corporate track: teach teams, not just studios",
                ].map((li) => (
                  <li key={li} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", marginTop: 7, flexShrink: 0 }} aria-hidden="true" /> {li}
                  </li>
                ))}
              </ul>
              <Link to="/contact" style={{ display: "inline-flex", marginTop: 16, background: "linear-gradient(135deg, #183D2D 0%, #2E7D5B 100%)", color: "#fff", padding: "11px 16px", borderRadius: 9999, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", boxShadow: "0 8px 22px rgba(24,61,45,0.18)" }}>
                Check next intake <span style={{ marginLeft: 6 }}>→</span>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Faculty — premium 3D */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "32px clamp(20px,4vw,40px) 0" }}>
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }} style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 20px" }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--soma-primary)", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", boxShadow: "0 0 8px rgba(244,180,0,0.28)", flexShrink: 0 }} aria-hidden="true" /> Faculty — lineage & care
          </span>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 300, color: "var(--soma-forest)", marginTop: 8, letterSpacing: "-0.02em" }}>Teachers who <em style={{ fontStyle: "italic", color: "var(--soma-primary)" }}>hold</em> you.</h3>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.09, delayChildren: reduced ? 0 : 0.12 } } }}
          style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}
        >
          {faculty.map((f) => (
            <motion.div
              key={f.name}
              variants={{ hidden: { opacity: 0, y: 18, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } } }}
              whileHover={reduced ? {} : { y: -6, scale: 1.015 }}
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.90) 100%)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.62)", borderRadius: 18, overflow: "hidden", boxShadow: "0 10px 32px rgba(24,61,45,0.07), inset 0 1px 0 rgba(255,255,255,0.72)", position: "relative" }}
            >
              <div style={{ height: 220, overflow: "hidden", position: "relative", background: "#e8e2d4" }}>
                <motion.img
                  src={f.img}
                  alt={f.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  loading="lazy"
                  whileHover={reduced ? {} : { scale: 1.06 }}
                  transition={{ duration: 0.7, ease: EASE }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 48%, rgba(24,61,45,0.18) 100%)", pointerEvents: "none" }} aria-hidden="true" />
                <div style={{ position: "absolute", inset: 10, border: "1px solid rgba(255,255,255,0.42)", borderRadius: 12, pointerEvents: "none" }} aria-hidden="true" />
              </div>
              <div style={{ padding: 16, position: "relative" }}>
                <div style={{ position: "absolute", top: 0, left: 16, right: 16, height: 1, background: "linear-gradient(90deg, transparent, rgba(244,180,0,0.32), transparent)", pointerEvents: "none" }} aria-hidden="true" />
                <div style={{ fontWeight: 700, color: "var(--soma-forest)", fontSize: 14, letterSpacing: "-0.01em" }}>{f.name}</div>
                <div style={{ fontSize: 11, color: "var(--soma-primary)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 4 }}>{f.role}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Corporate — premium */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "28px clamp(20px,4vw,40px) 36px" }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-30px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.10, delayChildren: reduced ? 0 : 0.12 } } }}
          style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16, alignItems: "start" }}
        >
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
            whileHover={reduced ? {} : { y: -3 }}
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.90) 100%)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.62)", borderRadius: 18, padding: 20, boxShadow: "0 12px 36px rgba(24,61,45,0.07), inset 0 1px 0 rgba(255,255,255,0.72)", position: "relative", overflow: "hidden" }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)", pointerEvents: "none" }} aria-hidden="true" />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--soma-primary)", boxShadow: "0 0 0 5px rgba(46,125,91,0.10)", flexShrink: 0 }} aria-hidden="true" />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--soma-primary)" }}>Corporate Wellness</span>
            </div>
            <h4 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 400, color: "var(--soma-forest)", letterSpacing: "-0.015em" }}>For teams that <em style={{ fontStyle: "italic", color: "var(--soma-primary)" }}>move</em> together</h4>
            <p style={{ fontSize: 12.5, color: "#5a6b63", marginTop: 6, lineHeight: 1.6 }}>For companies, NGOs, embassies, schools, hotels — at your offices or Spring Valley.</p>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.06 } } }}
              style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 2 }}
            >
              {CORPORATE.map((c) => (
                <motion.div
                  key={c.name}
                  variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } } }}
                  whileHover={reduced ? {} : { x: 2, backgroundColor: "rgba(46,125,91,0.03)" }}
                  style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 10px", borderBottom: "1px solid var(--soma-line-light)", borderRadius: 8, transition: "background 0.22s ease" }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--soma-forest)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--soma-gold)", flexShrink: 0 }} aria-hidden="true" /> {c.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#5a6b63", marginTop: 3, marginLeft: 11 }}>{c.desc}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 12.5, color: "var(--soma-primary)", whiteSpace: "nowrap", background: "var(--soma-ivory)", border: "1px solid var(--soma-line-light)", padding: "6px 8px", borderRadius: 9999, alignSelf: "center" }}>{c.price}</div>
                </motion.div>
              ))}
            </motion.div>
            <div style={{ fontSize: 11, color: "var(--soma-warm-gray)", marginTop: 12, background: "var(--soma-ivory)", border: "1px solid var(--soma-line-light)", padding: "9px 10px", borderRadius: 10, textAlign: "center" }}>Quotes on numbers, venue, travel, facilitators, equipment.</div>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
            whileHover={reduced ? {} : { y: -3, scale: 1.01 }}
            style={{ background: "linear-gradient(180deg, #FFF7E6 0%, #F5EFE0 100%)", border: "1px solid rgba(244,180,0,0.14)", borderRadius: 18, padding: 20, position: "relative", overflow: "hidden", boxShadow: "0 12px 32px rgba(244,180,0,0.08), inset 0 1px 0 rgba(255,255,255,0.72)" }}
          >
            <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, border: "1px solid rgba(244,180,0,0.08)", borderRadius: "50%", pointerEvents: "none" }} aria-hidden="true" />
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--soma-gold)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", boxShadow: "0 0 8px rgba(244,180,0,0.28)", flexShrink: 0 }} aria-hidden="true" /> Alumni love
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, lineHeight: 1.5, color: "var(--soma-forest)", marginTop: 10, fontStyle: "italic", fontWeight: 400 }}>"SOMA 200 gave me confidence to teach real people, not just poses. Small cohort, real mentorship."</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--soma-warm-gray)", marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 28, height: 1, background: "var(--soma-line-strong)", flexShrink: 0 }} aria-hidden="true" /> — Alumni 2024, now teaching in Westlands
            </div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
              style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11, textAlign: "center" }}
            >
              <motion.div whileHover={reduced ? {} : { y: -2 }} style={{ background: "linear-gradient(180deg, #fff 0%, #FFFBF8 100%)", padding: 12, borderRadius: 12, border: "1px solid rgba(38,51,44,0.06)", boxShadow: "0 4px 14px rgba(24,61,45,0.04)" }}><strong style={{ color: "var(--soma-forest)", fontSize: 16, fontFamily: "var(--font-display)" }}>100%</strong><br /><span style={{ color: "#5a6b63", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 10 }}>practicum hours</span></motion.div>
              <motion.div whileHover={reduced ? {} : { y: -2 }} style={{ background: "linear-gradient(180deg, #fff 0%, #FFFBF8 100%)", padding: 12, borderRadius: 12, border: "1px solid rgba(38,51,44,0.06)", boxShadow: "0 4px 14px rgba(24,61,45,0.04)" }}><strong style={{ color: "var(--soma-forest)", fontSize: 16, fontFamily: "var(--font-display)" }}>12 max</strong><br /><span style={{ color: "#5a6b63", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 10 }}>per cohort</span></motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Curriculum + Application — NEW premium where thin */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "0 clamp(20px,4vw,40px) 32px" }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-30px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.10, delayChildren: reduced ? 0 : 0.12 } } }}
          style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 16, alignItems: "start" }}
        >
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.90) 100%)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.62)", borderRadius: 20, padding: 20, boxShadow: "0 12px 36px rgba(24,61,45,0.07), inset 0 1px 0 rgba(255,255,255,0.72)", position: "relative", overflow: "hidden" }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(244,180,0,0.42), transparent)", pointerEvents: "none" }} aria-hidden="true" />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--soma-primary)", boxShadow: "0 0 0 5px rgba(46,125,91,0.10)", flexShrink: 0 }} aria-hidden="true" />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--soma-primary)" }}>Curriculum timeline</span>
              <span style={{ fontSize: 10, background: "var(--soma-ivory)", border: "1px solid var(--soma-line-light)", padding: "4px 8px", borderRadius: 9999, color: "var(--soma-warm-gray)", fontWeight: 700 }}>200h · 6 months</span>
            </div>
            <div style={{ position: "relative", paddingLeft: 22 }}>
              <div style={{ position: "absolute", left: 6, top: 8, bottom: 8, width: 1, background: "linear-gradient(180deg, var(--soma-line-strong) 0%, rgba(244,180,0,0.22) 100%)", borderRadius: 999 }} aria-hidden="true" />
              {[
                { step: "01", title: "Foundations 25h", desc: "Weekend intensive · Breath, alignment, philosophy", meta: "30,000 KES · 3 days" },
                { step: "02", title: "SOMA 100 — Foundation Teacher", desc: "Anatomy, sequencing, hands-on adjustments, practicum", meta: "85,000 KES · 3 months" },
                { step: "03", title: "SOMA 200 — Teacher Training", desc: "Full certification · Mentorship, teaching labs, corporate track", meta: "165,000 KES · Early 145,000 · 6 months", accent: true },
              ].map((s, i) => (
                <motion.div
                  key={s.step}
                  variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } } }}
                  whileHover={reduced ? {} : { x: 3 }}
                  style={{ position: "relative", padding: "12px 0 12px 0", borderBottom: i < 2 ? "1px solid var(--soma-line-light)" : "none" }}
                >
                  <span style={{ position: "absolute", left: -22, top: 16, width: 10, height: 10, borderRadius: "50%", background: s.accent ? "var(--soma-gold)" : "var(--soma-primary)", border: "2px solid #fff", boxShadow: s.accent ? "0 0 0 6px rgba(244,180,0,0.14), 0 0 12px rgba(244,180,0,0.22)" : "0 0 0 4px rgba(46,125,91,0.10)", flexShrink: 0 }} aria-hidden="true" />
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: s.accent ? "var(--soma-gold)" : "var(--soma-primary)" }}>{s.step}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--soma-warm-gray)", background: "var(--soma-ivory)", padding: "3px 7px", borderRadius: 9999 }}>{s.meta}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, color: "var(--soma-forest)", marginTop: 6, letterSpacing: "-0.01em" }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "#5a6b63", marginTop: 4, lineHeight: 1.5 }}>{s.desc}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
            style={{ background: "linear-gradient(135deg, #183D2D 0%, #1c4a34 55%, #1e5c3f 100%)", color: "#fff", borderRadius: 20, padding: 20, position: "relative", overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 20px 48px rgba(24,61,45,0.18), inset 0 1px 0 rgba(255,255,255,0.10)" }}
          >
            <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, border: "1px solid rgba(255,255,255,0.07)", borderRadius: "50%", pointerEvents: "none" }} aria-hidden="true" />
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.72, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", boxShadow: "0 0 8px rgba(244,180,0,0.32)", flexShrink: 0 }} aria-hidden="true" /> How to apply
            </div>
            <h4 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 300, marginTop: 10, lineHeight: 0.95, letterSpacing: "-0.02em" }}>Three steps to <em style={{ fontStyle: "italic", color: "#F4B400" }}>begin.</em></h4>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { n: "01", t: "Enquire", d: "Tell us your background & goal. We reply within a day." },
                { n: "02", t: "Interview", d: "Short chat with lead teacher · 20 min · Online or Spring Valley." },
                { n: "03", t: "Enrol", d: "Secure with deposit · Instalments available · Cohort of 12 max." },
              ].map((s) => (
                <div key={s.n} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 12, backdropFilter: "blur(6px)" }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--soma-gold)", color: "var(--soma-forest)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{s.n}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12.5 }}>{s.t}</div>
                    <div style={{ fontSize: 11, opacity: 0.78, marginTop: 2, lineHeight: 1.4 }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/contact" style={{ display: "inline-flex", marginTop: 16, background: "#fff", color: "var(--soma-forest)", padding: "11px 16px", borderRadius: 9999, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", boxShadow: "0 8px 22px rgba(0,0,0,0.14)" }}>
              Start your application →
            </Link>
            <div style={{ fontSize: 11, opacity: 0.62, marginTop: 8 }}>Cohort capped · Instalments · Studio & corporate tracks</div>
          </motion.div>
        </motion.div>
      </section>
      <SomaCTA />
      <style>{`@media(max-width:900px){div[style*="gridTemplateColumns: 1.4fr 0.9fr"],div[style*="gridTemplateColumns: 1.1fr 0.9fr"],div[style*="gridTemplateColumns: 1.15fr 0.85fr"]{grid-template-columns:1fr !important;}}`}</style>
    </div>
  );
};
export default YTTC;
