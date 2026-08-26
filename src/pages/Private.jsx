import React from "react";
import { motion } from "framer-motion";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import { PRIVATE_RATES } from "../config/siteContent";
import SomaCTA from "../components/soma/SomaCTA";
import SomaGuarantee from "../components/soma/SomaGuarantee";
import PageFAQSection from "../components/soma/PageFAQSection";
import { PAGE_FAQS } from "../config/siteContent";
import { Link } from "react-router-dom";

const steps = [
  { n: "01", title: "Assessment", desc: "75 min · 6,500 KES. We listen — movement, pain history, lifestyle, goals. No rushing. You leave with a clear plan, not a sales pitch.", img: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop" },
  { n: "02", title: "Your plan", desc: "5 or 10 sessions recommended. Same rates for yoga & therapy. We match you to the right teacher — Amina (therapy), Daniel (mobility), Zawadi (rest).", img: "https://images.unsplash.com/photo-1591343395082-e120087004b4?q=80&w=800&auto=format&fit=crop" },
  { n: "03", title: "The sessions", desc: "60 min, fully personal. Props, adjustments, breath and homework. Tracked — so you see progress, not just sweat.", img: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=800&auto=format&fit=crop" },
];

const Private = () => {
  return (
    <div style={{ background: "var(--soma-cream)" }}>
      <SomaPageHeader
        eyebrow="One-to-One · Private Yoga & Therapy"
        title="Personal attention,<br /><em>your pace, your body.</em>"
        subtitle="Same rates for yoga & therapy. Therapy starts with a 75-min assessment — we understand how you move, what hurts and what you want. No performative wellness, just honest, personal care."
        image="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=900&auto=format&fit=crop"
      />

      {/* Sticky story */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "32px clamp(20px,4vw,40px) 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 32, alignItems: "start" }}>
          <div style={{ position: "sticky", top: 88, borderRadius: 20, overflow: "hidden", height: 520, background: "#ddd" }}>
            <img src="https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=800&auto=format&fit=crop" alt="Private yoga attractive" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(24,61,45,0.55) 100%)" }} />
            <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(10px)", borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--soma-primary)" }}>Why private?</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--soma-forest)", marginTop: 2 }}>12 max in groups is small. One-to-one is intimate. For injury, pregnancy, anxiety or simply privacy — you’re fully held.</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {steps.map((s, i) => (
              <motion.div key={s.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: i * 0.08 }} style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 18, overflow: "hidden", display: "grid", gridTemplateColumns: "140px 1fr" }}>
                <div style={{ height: 160, background: "#eee" }}><img src={s.img} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" /></div>
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "var(--soma-gold)" }}>{s.n}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--soma-forest)", marginTop: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: "#5a6b63", marginTop: 6 }}>{s.desc}</div>
                </div>
              </motion.div>
            ))}
            <div style={{ background: "var(--soma-forest)", color: "#fff", borderRadius: 16, padding: 18 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7 }}>What’s different at SOMA?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12, fontSize: 12, lineHeight: 1.5 }}>
                <div><strong style={{ color: "var(--soma-gold)" }}>Group (12 max)</strong><br />Community, rhythm, hands-on only with consent. Great for regular practice.</div>
                <div><strong style={{ color: "var(--soma-gold)" }}>Private (you)</strong><br />Fully tailored, props, homework, tracked. For injury, goals or privacy.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "24px clamp(20px,4vw,40px) 32px" }}>
        <div style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px", gap: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: "var(--soma-forest)", color: "#fff", padding: "14px 16px" }}>
            <span>Service</span><span style={{ textAlign: "right" }}>Length</span><span style={{ textAlign: "right" }}>Price</span>
          </div>
          {PRIVATE_RATES.map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px", gap: 12, padding: "14px 16px", fontSize: 13, borderTop: i ? "1px solid var(--soma-line-light)" : "none", background: i%2?"var(--soma-ivory)":"#fff" }}>
              <span>{r.service}</span><span style={{ textAlign: "right", color: "#5a6b63" }}>{r.len}</span><span style={{ textAlign: "right", fontWeight: 700, color: "var(--soma-forest)" }}>{r.price}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--soma-warm-gray)", marginTop: 10, textAlign: "center" }}>Members 15% off · Home/hotel from 9,500 quoted on distance/group/duration · Therapy complements medical care, clearance may be required · 12h cancel (half), no-show full.</p>
      </section>

      {/* Private testimonials - unique */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 clamp(20px,4vw,40px) 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { q: "After my knee surgery, one-to-one therapy brought me back to walking without fear. Amina’s assessment was thorough, not rushed. I felt safe.", n: "Patricia W.", r: "Therapy · 10 sessions" },
            { q: "I travel for work. Private at my hotel at 6am — Daniel meets me where I am. No gym energy, just breath and focus.", n: "Brian O.", r: "Private · Executive" },
          ].map((t) => (
            <div key={t.n} style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, padding: 18 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 15, lineHeight: 1.5, color: "var(--soma-forest)" }}>"{t.q}"</div>
              <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: "var(--soma-forest)" }}>{t.n} <span style={{ fontWeight: 400, color: "#5a6b63" }}>· {t.r}</span></div>
            </div>
          ))}
        </div>
      </section>

      <SomaGuarantee />

      <PageFAQSection title="Private Yoga & Therapy — common questions" questions={PAGE_FAQS.private} />

      <SomaCTA />
      <style>{`@media(max-width:900px){div[style*="gridTemplateColumns: 0.9fr 1.1fr"]{grid-template-columns:1fr !important;} div[style*="position: sticky"]{position:relative !important; top:0 !important; height:360px !important;}}`}</style>
    </div>
  );
};
export default Private;
