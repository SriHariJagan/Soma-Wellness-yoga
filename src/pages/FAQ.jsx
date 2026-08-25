import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import { FAQ_ITEMS } from "../config/siteContent";
import SomaCTA from "../components/soma/SomaCTA";
import SomaGuarantee from "../components/soma/SomaGuarantee";

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
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "24px clamp(20px,4vw,40px) 0" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} style={{ padding: "8px 14px", borderRadius: 9999, border: `1px solid ${cat===c.id?"var(--soma-forest)":"var(--soma-line)"}`, background: cat===c.id?"var(--soma-forest)":"#fff", color: cat===c.id?"#fff":"var(--soma-forest)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{c.label}</button>
          ))}
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions — e.g. prenatal, booking, therapy" style={{ width: "100%", maxWidth: 520, padding: "12px 16px", borderRadius: 9999, border: "1px solid var(--soma-line)", background: "#fff", fontSize: 13 }} />
        </div>
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.length ? filtered.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 14, overflow: "hidden" }}>
                <button onClick={() => setOpen(isOpen?-1:i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 18px", textAlign: "left", background: isOpen?"var(--soma-forest)":"#fff", color: isOpen?"#fff":"var(--soma-forest)", transition: "all 0.2s" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 500 }}>{item.q}</span>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${isOpen?"rgba(255,255,255,0.3)":"var(--soma-line)"}`, flexShrink: 0 }}>{isOpen?"−":"+"}</span>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24 }}>
                      <div style={{ padding: "14px 18px 16px", fontSize: 13, lineHeight: 1.7, color: "#5a6b63", borderTop: "1px solid var(--soma-line-light)" }}>{item.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }) : (
            <div style={{ textAlign: "center", padding: 24, background: "#fff", borderRadius: 12, border: "1px solid var(--soma-line-light)", fontSize: 13, color: "#5a6b63" }}>No matching questions. Try “booking” or “prenatal”.</div>
          )}
        </div>
        <div style={{ marginTop: 20, background: "var(--soma-ivory)", border: "1px solid var(--soma-line)", borderRadius: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--soma-forest)" }}>Still have a question?</div>
          <div style={{ fontSize: 12, color: "#5a6b63", marginTop: 6 }}>Our team will guide you to the most suitable service or package. Call <strong>+254 700 000 000</strong> · Spring Valley, Nairobi</div>
        </div>
      </section>
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "20px clamp(20px,4vw,40px) 32px" }}>
        <SomaGuarantee />
      </section>
      <SomaCTA />
    </div>
  );
};
export default FAQ;
