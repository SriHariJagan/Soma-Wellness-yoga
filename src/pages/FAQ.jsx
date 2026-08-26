import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import { FAQ_ITEMS } from "../config/siteContent";
import SomaCTA from "../components/soma/SomaCTA";
import SomaGuarantee from "../components/soma/SomaGuarantee";
import { EASE, usePrefersReducedMotion } from "../lib/motion";

const categories = [
  { id: "all", label: "All" },
  { id: "about", label: "About SOMA" },
  { id: "therapy", label: "Therapy & Care" },
  { id: "programs", label: "Programs" },
  { id: "practical", label: "Booking & Visit" },
];

const catMap = {
  "What is SOMA Wellness?": "about",
  "Where are you located?": "about",
  "What services do you offer?": "about",
  "Do I need yoga experience?": "therapy",
  "What is Yoga Therapy?": "therapy",
  "Are private sessions available?": "therapy",
  "Do you offer prenatal and postnatal yoga?": "programs",
  "Do you have programmes for children and seniors?": "programs",
  "Can I combine yoga, massage and meditation in one package?": "programs",
  "How do I book?": "practical",
  "What should I wear / bring?": "practical",
};

const FAQ = () => {
  const [open, setOpen] = useState(0);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const reduced = usePrefersReducedMotion();
  const filtered = FAQ_ITEMS.filter((it) => {
    const c = catMap[it.q] || "about";
    const okCat = cat === "all" || c === cat;
    const okQ = !q || it.q.toLowerCase().includes(q.toLowerCase()) || it.a.toLowerCase().includes(q.toLowerCase());
    return okCat && okQ;
  });
  return (
    <div style={{ background: "var(--soma-cream)" }}>
      <SomaPageHeader
        eyebrow="Soma Wellness Nairobi · Spring Valley · Guide"
        title="Frequently Asked<br /><em>Questions</em>"
        subtitle="Not a studio, gym or spa — but an integrated destination. Yoga · Therapy · Meditation · Recovery · Education. Find yourself below."
        image="https://images.unsplash.com/photo-1494172961521-33799ddd43a5?q=80&w=900&auto=format&fit=crop"
      />
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "28px clamp(20px,4vw,40px) 0" }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.06 } } }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}
        >
          {categories.map((c) => {
            const active = cat === c.id;
            return (
              <motion.button
                key={c.id}
                onClick={() => setCat(c.id)}
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
                whileHover={reduced ? {} : { y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: "9px 16px",
                  borderRadius: 9999,
                  border: `1px solid ${active ? "var(--soma-forest)" : "rgba(255,255,255,0.62)"}`,
                  background: active ? "linear-gradient(135deg, #183D2D 0%, #1e4d3a 100%)" : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.88) 100%)",
                  color: active ? "#fff" : "var(--soma-forest)",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  boxShadow: active ? "0 8px 22px rgba(24,61,45,0.16)" : "0 4px 14px rgba(24,61,45,0.06), inset 0 1px 0 rgba(255,255,255,0.72)",
                  backdropFilter: "blur(8px)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: active ? "var(--soma-gold)" : "var(--soma-primary)", boxShadow: active ? "0 0 8px rgba(244,180,0,0.28)" : "0 0 0 4px rgba(46,125,91,0.08)", flexShrink: 0 }} aria-hidden="true" />
                {c.label}
              </motion.button>
            );
          })}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE }} style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: 560 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--soma-warm-gray)", pointerEvents: "none" }}>⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search questions — e.g. prenatal, booking, therapy"
              style={{
                width: "100%",
                padding: "13px 16px 13px 38px",
                borderRadius: 9999,
                border: "1px solid rgba(38,51,44,0.10)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.90) 100%)",
                backdropFilter: "blur(10px)",
                fontSize: 13,
                boxShadow: "0 8px 24px rgba(24,61,45,0.06), inset 0 1px 0 rgba(255,255,255,0.72)",
                outline: "none",
                transition: "border-color 0.22s ease, box-shadow 0.22s ease",
              }}
              onFocus={(e) => { e.target.style.borderColor = "var(--soma-primary)"; e.target.style.boxShadow = "0 0 0 3px rgba(46,125,91,0.12), 0 8px 24px rgba(24,61,45,0.08)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(38,51,44,0.10)"; e.target.style.boxShadow = "0 8px 24px rgba(24,61,45,0.06), inset 0 1px 0 rgba(255,255,255,0.72)"; }}
            />
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-30px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.05 } } }}
          style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}
        >
          {filtered.length ? (
            filtered.map((item, i) => {
              const isOpen = open === i;
              return (
                <motion.div
                  key={item.q}
                  variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
                  whileHover={reduced ? {} : { y: -1 }}
                  style={{ background: isOpen ? "linear-gradient(135deg, #183D2D 0%, #1e4d3a 100%)" : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 100%)", border: `1px solid ${isOpen ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.62)"}`, borderRadius: 16, overflow: "hidden", boxShadow: isOpen ? "0 12px 32px rgba(24,61,45,0.14)" : "0 6px 20px rgba(24,61,45,0.06), inset 0 1px 0 rgba(255,255,255,0.72)", backdropFilter: "blur(10px)" }}
                >
                  <button onClick={() => setOpen(isOpen ? -1 : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 18px", textAlign: "left", background: "transparent", color: isOpen ? "#fff" : "var(--soma-forest)", cursor: "pointer", border: "none" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.3 }}>{item.q}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.24, ease: EASE }}
                      style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${isOpen ? "rgba(255,255,255,0.22)" : "rgba(38,51,44,0.10)"}`, background: isOpen ? "rgba(255,255,255,0.12)" : "var(--soma-ivory)", color: isOpen ? "#fff" : "var(--soma-forest)", flexShrink: 0, fontSize: 16, fontWeight: 300 }}
                    >
                      +
                    </motion.span>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: EASE }}>
                        <div style={{ padding: "14px 18px 18px", fontSize: 13, lineHeight: 1.7, color: isOpen ? "rgba(255,247,230,0.88)" : "#5a6b63", borderTop: `1px solid ${isOpen ? "rgba(255,255,255,0.10)" : "var(--soma-line-light)"}`, background: isOpen ? "rgba(0,0,0,0.08)" : "transparent" }}>{item.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", padding: 24, background: "linear-gradient(180deg, #fff 0%, #FFFBF8 100%)", borderRadius: 16, border: "1px solid var(--soma-line-light)", fontSize: 13, color: "#5a6b63", boxShadow: "0 6px 20px rgba(24,61,45,0.04)" }}>
              No matching questions. Try <em>booking</em> or <em>prenatal</em>.
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{ marginTop: 22, background: "linear-gradient(135deg, #183D2D 0%, #1c4a34 55%, #1e5c3f 100%)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 18, padding: 18, textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "0 16px 36px rgba(24,61,45,0.16), inset 0 1px 0 rgba(255,255,255,0.10)" }}
        >
          <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, border: "1px solid rgba(255,255,255,0.07)", borderRadius: "50%", pointerEvents: "none" }} aria-hidden="true" />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "#fff", letterSpacing: "-0.01em" }}>Still have a question?</div>
          <div style={{ fontSize: 12.5, color: "rgba(255,247,230,0.82)", marginTop: 6, lineHeight: 1.5 }}>Our team will guide you to the most suitable service or package. Call <strong style={{ color: "#F4B400" }}>+254 700 000 000</strong> · Spring Valley, Nairobi</div>
          <div style={{ marginTop: 12, display: "inline-flex", gap: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", padding: "8px 12px", borderRadius: 9999, fontSize: 11, color: "rgba(255,255,255,0.72)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F4B400", flexShrink: 0, marginTop: 4 }} aria-hidden="true" /> We reply within one working day
          </div>
        </motion.div>
      </section>
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "20px clamp(20px,4vw,40px) 32px" }}>
        <SomaGuarantee />
      </section>
      <SomaCTA />
    </div>
  );
};
export default FAQ;
