import React, { useRef } from "react";
import { motion } from "framer-motion";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import { RESTORE_TREATMENTS } from "../config/siteContent";
import SomaCTA from "../components/soma/SomaCTA";

const signatures = [
  { name: "STILLNESS", sub: "The deep calm ritual", desc: "Restorative yoga, guided meditation, 60-min relaxation massage + herbal tea", len: "2 hrs", price: "11,000", img: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop" },
  { name: "THE ACACIA", sub: "Our premium journey", desc: "Private yoga, meditation, 60-min massage, body treatment, refreshments + unhurried rest", len: "2.5 hrs", price: "18,500", img: "https://images.unsplash.com/photo-1600334089648-bd6e2a7a65a8?q=80&w=800&auto=format&fit=crop" },
  { name: "FOR TWO", sub: "A journey for two", desc: "Couple yoga/stretch, massage for two, herbal tea + quiet time together", len: "2 hrs", price: "22,500", per: "per couple", img: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=800&auto=format&fit=crop" },
];

const Restore = () => {
  const scrollRef = useRef(null);
  return (
    <div style={{ background: "var(--soma-cream)" }}>
      <SomaPageHeader
        eyebrow="Restore · Massage · Meditation · Rituals"
        title="Rest is not a reward.<br /><em>It’s a practice.</em>"
        subtitle="From 1,800 meditation to 11,000 Stillness. Premium, unhurried, sensory — not clinical. Tell us about pregnancy, surgery or heart concerns before treatment."
        image="https://images.unsplash.com/photo-1596178065887-1198b6148b2b?q=80&w=900&auto=format&fit=crop"
      />

      {/* Treatments - editorial list */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "32px clamp(20px,4vw,40px) 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24, alignItems: "start" }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400, color: "var(--soma-forest)" }}>Massage & meditation</h3>
            <p style={{ fontSize: 13, color: "#5a6b63", marginTop: 6 }}>Meditation classes included for AMANI/UZIMA/FAMILY. Steam & wellness rituals on request.</p>
            <div style={{ marginTop: 16, background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px", gap: 0, background: "var(--soma-forest)", color: "#fff", padding: "12px 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                <span>Treatment</span><span style={{ textAlign: "right" }}>Length</span><span style={{ textAlign: "right" }}>Price</span>
              </div>
              {RESTORE_TREATMENTS.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px", gap: 12, padding: "14px 16px", fontSize: 13, borderTop: i ? "1px solid var(--soma-line-light)" : "none", background: i%2?"var(--soma-ivory)":"#fff" }}>
                  <span>{t.name}</span><span style={{ textAlign: "right", color: "#5a6b63" }}>{t.len}</span><span style={{ textAlign: "right", fontWeight: 700, color: "var(--soma-forest)" }}>{t.price}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <div style={{ background: "var(--soma-forest)", color: "#fff", borderRadius: 18, padding: 20, position: "sticky", top: 88 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.7 }}>The Six-Week Reset</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, marginTop: 8 }}>Six weeks to rebuild</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.9, marginTop: 8 }}>Opening assessment · 12 yoga · 6 meditation/Nidra · 2 sixty-min massages · home plan · closing review</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 16 }}>32,000 <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>KES</span></div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>Mats, oils, tea & water at reception. Gift vouchers 12 months.</div>
            <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop" alt="Reset" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 12, marginTop: 16 }} loading="lazy" />
          </div>
        </div>
      </section>

      {/* Signature - horizontal scroll unique */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "32px clamp(20px,4vw,40px) 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400, color: "var(--soma-forest)" }}>Signature experiences</h3>
            <p style={{ fontSize: 12, color: "#5a6b63" }}>Half a morning or an afternoon, one journey. Mon–Fri 10:00–15:00 · Weekends 20% surcharge · Swipe →</p>
          </div>
          <div style={{ fontSize: 11, color: "var(--soma-warm-gray)" }}>Drag / scroll horizontally</div>
        </div>
        <div ref={scrollRef} style={{ display: "flex", gap: 16, overflowX: "auto", scrollSnapType: "x mandatory", padding: "16px 0 8px", scrollbarWidth: "none" }}>
          {signatures.map((s) => (
            <motion.div key={s.name} whileHover={{ y: -4 }} style={{ minWidth: 340, flex: "0 0 340px", background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 18, overflow: "hidden", scrollSnapAlign: "start" }}>
              <div style={{ height: 200, overflow: "hidden", background: "#ddd" }}><img src={s.img} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" /></div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--soma-gold)" }}>{s.len} · {s.price} KES {s.per || ""}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--soma-forest)", marginTop: 6 }}>{s.name}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#5a6b63", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.sub}</div>
                <div style={{ fontSize: 13, color: "#5a6b63", marginTop: 8, lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits & safety */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "24px clamp(20px,4vw,40px) 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { t: "Deep calm, not sedation", d: "Restorative yoga + Nidra + massage to down-regulate, not just relax." },
            { t: "Premium, unhurried", d: "2–2.5 hrs, tea, rest, no rushing. Real recovery, not a quick spa slot." },
            { t: "Safe & medical-aware", d: "Tell us about pregnancy, surgery, pain or heart concerns. Clearance respected." },
          ].map((b) => (
            <div key={b.t} style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 700, color: "var(--soma-forest)", fontSize: 13 }}>{b.t}</div>
              <div style={{ fontSize: 12, color: "#5a6b63", marginTop: 6, lineHeight: 1.5 }}>{b.d}</div>
            </div>
          ))}
        </div>
      </section>

      <SomaCTA />
      <style>{`@media(max-width:900px){div[style*="gridTemplateColumns: 1.2fr 0.8fr"]{grid-template-columns:1fr !important;} div[style*="position: sticky"]{position:relative !important; top:0 !important;}}`}</style>
    </div>
  );
};
export default Restore;
