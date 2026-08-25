import React from "react";
import { motion } from "framer-motion";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import { ACADEMY, CORPORATE } from "../config/siteContent";
import SomaCTA from "../components/soma/SomaCTA";
import { Link } from "react-router-dom";

const faculty = [
  { name: "Amina J.", role: "Therapy & Breath Lead", img: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=400&auto=format&fit=crop" },
  { name: "Daniel K.", role: "Movement & Anatomy", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop" },
  { name: "Zawadi M.", role: "Meditation & Philosophy", img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400&auto=format&fit=crop" },
];

const YTTC = () => {
  return (
    <div style={{ background: "var(--soma-cream)" }}>
      <SomaPageHeader
        eyebrow="Learn & Partner · SOMA Academy · Nairobi"
        title="Teach from<br /><em>lived practice.</em>"
        subtitle="Foundations 25h · 100h · 200h. Early 200h 145K KES, instalments. Corporate wellness for teams across Nairobi — at your offices or Spring Valley."
        image="https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=900&auto=format&fit=crop"
      />
      {/* Bento academy */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "32px clamp(20px,4vw,40px) 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr", gap: 16, alignItems: "stretch" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {ACADEMY.map((c, i) => (
              <motion.div key={c.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }} style={{ background: i===2?"var(--soma-forest)":"#fff", color: i===2?"#fff":"var(--soma-charcoal)", border: `1px solid ${i===2?"var(--soma-forest)":"var(--soma-line-light)"}`, borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 8, position: "relative", overflow: "hidden" }}>
                {i===2 && <span style={{ position: "absolute", top: 12, right: 12, background: "var(--soma-gold)", color: "var(--soma-forest)", fontSize: 9, fontWeight: 800, padding: "6px 8px", borderRadius: 9999 }}>POPULAR</span>}
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: i===2?"rgba(255,247,230,0.7)":"var(--soma-primary)" }}>{c.len}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: i===2?"#fff":"var(--soma-forest)", lineHeight: 1.2 }}>{c.name}</div>
                {c.note && <div style={{ fontSize: 11, color: i===2?"rgba(255,247,230,0.7)":"#5a6b63" }}>{c.note}</div>}
                <div style={{ marginTop: "auto", fontSize: 20, fontWeight: 800, color: i===2?"#fff":"var(--soma-forest)" }}>{c.price}<span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}> KES</span></div>
              </motion.div>
            ))}
            <div style={{ gridColumn: "1 / -1", background: "var(--soma-ivory)", border: "1px solid var(--soma-line)", borderRadius: 12, padding: 12, fontSize: 11, color: "var(--soma-warm-gray)", textAlign: "center" }}>Payment by instalment available. 200h early enrolment 145,000 saves 20K.</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <img src="https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?q=80&w=800&auto=format&fit=crop" alt="Academy" style={{ width: "100%", height: 180, objectFit: "cover" }} loading="lazy" />
            <div style={{ padding: 18 }}>
              <h4 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--soma-forest)" }}>Why SOMA Academy?</h4>
              <ul style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#5a6b63" }}>
                <li>✓ Small cohort, mentorship, not mass-produced</li>
                <li>✓ Lineage + anatomy + hands-on practicum</li>
                <li>✓ Spring Valley premium container</li>
                <li>✓ Corporate track: teach teams, not just studios</li>
              </ul>
              <Link to="/contact" style={{ display: "inline-flex", marginTop: 14, background: "var(--soma-forest)", color: "#fff", padding: "10px 16px", borderRadius: 9999, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Check next intake →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Faculty */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "24px clamp(20px,4vw,40px) 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {faculty.map((f, i) => (
            <motion.div key={f.name} initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i*0.06 }} whileHover={{ y: -4 }} style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ height: 200, overflow: "hidden" }}><img src={f.img} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" /></div>
              <div style={{ padding: 14 }}>
                <div style={{ fontWeight: 600, color: "var(--soma-forest)", fontSize: 13 }}>{f.name}</div>
                <div style={{ fontSize: 11, color: "var(--soma-primary)", fontWeight: 600 }}>{f.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Corporate */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "24px clamp(20px,4vw,40px) 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16, alignItems: "start" }}>
          <div style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, padding: 18 }}>
            <h4 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--soma-forest)" }}>Corporate Wellness</h4>
            <p style={{ fontSize: 12, color: "#5a6b63", marginTop: 6 }}>For companies, NGOs, embassies, schools, hotels — at your offices or Spring Valley.</p>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {CORPORATE.map((c) => (
                <div key={c.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--soma-line-light)" }}>
                  <div><div style={{ fontWeight: 600, fontSize: 12, color: "var(--soma-forest)" }}>{c.name}</div><div style={{ fontSize: 11, color: "#5a6b63" }}>{c.desc}</div></div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "var(--soma-primary)", whiteSpace: "nowrap" }}>{c.price}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#5a6b63", marginTop: 10 }}>Quotes on numbers, venue, travel, facilitators, equipment.</div>
          </div>
          <div style={{ background: "var(--soma-ivory)", border: "1px solid var(--soma-line)", borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--soma-gold)" }}>Alumni love</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 15, lineHeight: 1.5, color: "var(--soma-forest)", marginTop: 8 }}>"SOMA 200 gave me confidence to teach real people, not just poses. Small cohort, real mentorship."</div>
            <div style={{ fontSize: 11, color: "#5a6b63", marginTop: 8 }}>— Alumni 2024, now teaching in Westlands</div>
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, textAlign: "center" }}>
              <div style={{ background: "#fff", padding: 10, borderRadius: 10, border: "1px solid var(--soma-line-light)" }}><strong style={{ color: "var(--soma-forest)" }}>100%</strong><br /><span style={{ color: "#5a6b63" }}>practicum hours</span></div>
              <div style={{ background: "#fff", padding: 10, borderRadius: 10, border: "1px solid var(--soma-line-light)" }}><strong style={{ color: "var(--soma-forest)" }}>12 max</strong><br /><span style={{ color: "#5a6b63" }}>per cohort</span></div>
            </div>
          </div>
        </div>
      </section>
      <SomaCTA />
      <style>{`@media(max-width:900px){div[style*="gridTemplateColumns: 1.4fr 0.9fr"],div[style*="gridTemplateColumns: 1.1fr 0.9fr"]{grid-template-columns:1fr !important;}}`}</style>
    </div>
  );
};
export default YTTC;
